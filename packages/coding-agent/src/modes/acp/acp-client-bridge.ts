/**
 * ACP-side `ClientBridge` implementation. Wraps `AgentSideConnection` so the
 * `read`/`write`/`bash`/`monitor`/`edit` tools (and the permission gate in
 * `AgentSession`) can route through the client when it advertises the
 * relevant capabilities at `initialize` time.
 */

import { randomUUID } from "node:crypto";
import type {
	PermissionOption as AcpPermissionOption,
	TerminalHandle as AcpTerminalHandle,
	AgentSideConnection,
	ClientCapabilities,
	RequestPermissionRequest,
	ToolCallUpdate,
} from "@agentclientprotocol/sdk";
import type {
	ClientBridge,
	ClientBridgeCapabilities,
	ClientBridgeCreateTerminalParams,
	ClientBridgePermissionOption,
	ClientBridgePermissionOutcome,
	ClientBridgePermissionToolCall,
	ClientBridgeProviderLeaseIdentity,
	ClientBridgeTerminalHandle,
} from "../../session/client-bridge";
import { resolveAcpPermissionMode } from "./permission-mode";

const ACP_TERMINAL_PUBLICATION_WAIT_MS = 500;

async function settleTerminalCleanup(operation: () => Promise<unknown>): Promise<boolean> {
	return await Promise.race([
		Promise.resolve()
			.then(operation)
			.then(
				() => true,
				() => false,
			),
		Bun.sleep(ACP_TERMINAL_PUBLICATION_WAIT_MS).then(() => false),
	]);
}

export { type AcpPermissionMode, resolveAcpPermissionMode } from "./permission-mode";

export function createAcpClientBridge(
	connection: AgentSideConnection,
	sessionId: string,
	clientCapabilities: ClientCapabilities | undefined,
): ClientBridge {
	const promptPermission = resolveAcpPermissionMode(clientCapabilities) === "prompt";
	const capabilities: ClientBridgeCapabilities = {
		readTextFile: clientCapabilities?.fs?.readTextFile === true,
		writeTextFile: clientCapabilities?.fs?.writeTextFile === true,
		terminal: clientCapabilities?.terminal === true,
		requestPermission: promptPermission,
	};

	const bridge: ClientBridge = { capabilities, deferAgentInitiatedTurns: true };
	const connectionId = `acp:${sessionId}`;
	const connectionGeneration = 1;
	const terminalProviderLeaseId = `${connectionId}:${randomUUID()}`;
	const terminalProviderIdentity: ClientBridgeProviderLeaseIdentity = {
		leaseId: terminalProviderLeaseId,
		connectionId,
		connectionGeneration,
		fence: randomUUID(),
	};

	if (capabilities.readTextFile) {
		bridge.readTextFile = async params => {
			const response = await connection.readTextFile({
				sessionId,
				path: params.path,
				...(typeof params.line === "number" ? { line: params.line } : {}),
				...(typeof params.limit === "number" ? { limit: params.limit } : {}),
			});
			return response.content;
		};
	}

	if (capabilities.writeTextFile) {
		bridge.writeTextFile = async params => {
			await connection.writeTextFile({
				sessionId,
				path: params.path,
				content: params.content,
			});
		};
	}

	if (capabilities.terminal) {
		let terminalPublicationFailed = false;
		bridge.quarantineProviderLease = async (providerLease, _reason) => {
			if (
				typeof providerLease === "string" ||
				providerLease.leaseId !== terminalProviderIdentity.leaseId ||
				providerLease.connectionId !== terminalProviderIdentity.connectionId ||
				providerLease.connectionGeneration !== terminalProviderIdentity.connectionGeneration ||
				providerLease.fence !== terminalProviderIdentity.fence
			)
				throw new Error("terminal provider lease mismatch");
			terminalPublicationFailed = true;
		};
		let terminalCreationTail = Promise.resolve();
		const withTerminalCreationAdmission = async <T>(operation: () => Promise<T>): Promise<T> => {
			const previous = terminalCreationTail;
			const release = Promise.withResolvers<void>();
			terminalCreationTail = previous.then(() => release.promise);
			await previous;
			try {
				return await operation();
			} finally {
				release.resolve();
			}
		};
		bridge.createTerminal = (params: ClientBridgeCreateTerminalParams) =>
			withTerminalCreationAdmission(async () => {
				if (terminalPublicationFailed) throw new Error("terminal provider quarantined after publication failure");
				const creationTimeout = AbortSignal.timeout(ACP_TERMINAL_PUBLICATION_WAIT_MS);
				const creationSignal = params.signal ? AbortSignal.any([params.signal, creationTimeout]) : creationTimeout;
				return await createTerminalHandle(
					connection,
					sessionId,
					params,
					creationSignal,
					terminalProviderIdentity,
					() => {
						terminalPublicationFailed = true;
					},
					() => {
						terminalPublicationFailed = true;
					},
				);
			});
	}

	if (promptPermission) {
		bridge.requestPermission = (toolCall, options, signal) =>
			requestPermission(connection, sessionId, toolCall, options, signal);
	}

	return bridge;
}

async function createTerminalHandle(
	connection: AgentSideConnection,
	sessionId: string,
	params: ClientBridgeCreateTerminalParams,
	creationSignal: AbortSignal,
	providerIdentity: ClientBridgeProviderLeaseIdentity,
	onCreationUncertain: () => void,
	onPublicationFailure: () => void,
): Promise<ClientBridgeTerminalHandle> {
	if (creationSignal.aborted) throw new Error("terminal creation aborted");
	const creation = Promise.resolve().then(() =>
		connection.createTerminal({
			sessionId,
			command: params.command,
			...(params.args ? { args: params.args } : {}),
			...(params.env ? { env: params.env } : {}),
			...(params.cwd ? { cwd: params.cwd } : {}),
			...(typeof params.outputByteLimit === "number" ? { outputByteLimit: params.outputByteLimit } : {}),
		}),
	);
	const creationAborted = Promise.withResolvers<"aborted">();
	const onCreationAbort = () => creationAborted.resolve("aborted");
	creationSignal.addEventListener("abort", onCreationAbort, { once: true });
	if (creationSignal.aborted) creationAborted.resolve("aborted");
	const creationOutcome = await Promise.race([
		creation.then(
			handle => ({ status: "created" as const, handle }),
			error => ({ status: "failed" as const, error }),
		),
		creationAborted.promise.then(() => ({ status: "aborted" as const })),
	]);
	creationSignal.removeEventListener("abort", onCreationAbort);
	if (creationOutcome.status === "aborted") {
		onCreationUncertain();
		void creation.then(
			async handle => {
				await settleTerminalCleanup(() => handle.kill());
				await settleTerminalCleanup(() => handle.release());
			},
			() => undefined,
		);
		throw new Error("terminal creation aborted");
	}
	if (creationOutcome.status === "failed") {
		onCreationUncertain();
		throw creationOutcome.error;
	}
	const handle = creationOutcome.handle;
	const publication = Promise.resolve().then(() =>
		connection.sessionUpdate({
			sessionId,
			update: {
				sessionUpdate: "tool_call_update",
				toolCallId: params.toolCallId,
				status: "in_progress",
				content: [{ type: "terminal", terminalId: handle.id }],
			},
		}),
	);
	const aborted = Promise.withResolvers<"aborted">();
	const onAbort = () => aborted.resolve("aborted");
	params.signal?.addEventListener("abort", onAbort, { once: true });
	if (params.signal?.aborted) aborted.resolve("aborted");
	const outcome = await Promise.race([
		publication.then(
			() => ({ status: "published" as const }),
			error => ({ status: "failed" as const, error }),
		),
		Bun.sleep(ACP_TERMINAL_PUBLICATION_WAIT_MS).then(() => ({ status: "timeout" as const })),
		aborted.promise.then(() => ({ status: "aborted" as const })),
	]);
	params.signal?.removeEventListener("abort", onAbort);
	if (outcome.status !== "published") {
		const killed = await settleTerminalCleanup(() => handle.kill());
		const released = await settleTerminalCleanup(() => handle.release());
		if (!params.signal?.aborted || !killed || !released) onPublicationFailure();
		if (outcome.status === "failed") throw outcome.error;
		throw new Error(
			outcome.status === "aborted"
				? "terminal publication aborted"
				: `terminal publication did not settle within ${ACP_TERMINAL_PUBLICATION_WAIT_MS}ms`,
		);
	}
	return wrapTerminalHandle(handle, providerIdentity.leaseId, providerIdentity);
}

function wrapTerminalHandle(
	handle: AcpTerminalHandle,
	providerLeaseId: string,
	providerLeaseIdentity: ClientBridgeProviderLeaseIdentity,
): ClientBridgeTerminalHandle {
	return {
		terminalId: handle.id,
		providerLeaseId,
		providerLeaseIdentity,
		async currentOutput() {
			const out = await handle.currentOutput();
			return {
				output: out.output,
				truncated: out.truncated,
				exitStatus: out.exitStatus ?? null,
			};
		},
		async waitForExit() {
			const status = await handle.waitForExit();
			return { exitCode: status.exitCode ?? null, signal: status.signal ?? null };
		},
		async kill() {
			await handle.kill();
		},
		async release() {
			await handle.release();
		},
	};
}

async function requestPermission(
	connection: AgentSideConnection,
	sessionId: string,
	toolCall: ClientBridgePermissionToolCall,
	options: ClientBridgePermissionOption[],
	signal: AbortSignal | undefined,
): Promise<ClientBridgePermissionOutcome> {
	const update: ToolCallUpdate = {
		toolCallId: toolCall.toolCallId,
		title: toolCall.title,
		...(toolCall.kind ? { kind: toolCall.kind as ToolCallUpdate["kind"] } : {}),
		...(toolCall.status ? { status: toolCall.status as ToolCallUpdate["status"] } : {}),
		...(toolCall.rawInput !== undefined ? { rawInput: toolCall.rawInput } : {}),
		...(toolCall.content ? { content: toolCall.content as ToolCallUpdate["content"] } : {}),
		...(toolCall.locations ? { locations: toolCall.locations } : {}),
	};
	const acpOptions: AcpPermissionOption[] = options.map(option => ({
		optionId: option.optionId,
		name: option.name,
		kind: option.kind,
	}));
	const request: RequestPermissionRequest = {
		sessionId,
		toolCall: update,
		options: acpOptions,
	};
	if (signal?.aborted) {
		return { outcome: "cancelled" };
	}
	const response = await connection.requestPermission(request);
	const outcome = response.outcome;
	if (outcome.outcome === "cancelled") {
		return { outcome: "cancelled" };
	}
	const matched = options.find(option => option.optionId === outcome.optionId);
	return {
		outcome: "selected",
		optionId: outcome.optionId,
		...(matched ? { kind: matched.kind } : {}),
	};
}
