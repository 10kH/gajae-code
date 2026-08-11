import * as fs from "node:fs/promises";
import { getAgentDir } from "@gajae-code/utils";
import { ensureBroker } from "../broker/ensure";
import { lifecycleRequestTimeoutMs } from "../broker/startup-budget";
import { SdkClientError } from "../client";
import { createBrokerSessionLifecycleService } from "../lifecycle/broker-client";
import type { SessionLifecycleMutationRequest, SessionLifecycleOperation } from "../lifecycle/service";
import { validateAdapterControl, validateAdapterSecretFields } from "../protocol/adapter-validation";
import { adapterDispositionError, findOperation, type OperationKind } from "../protocol/operation-registry";
import { type SessionAttachment, SessionRouter, SessionRouterError } from "../router";

export type SdkSessionCliAction = "list" | "control" | "query" | "global";

export interface SdkSessionCliArgs {
	action?: string;
	sessionId?: string;
	operation?: string;
	query?: string;
	jsonInput?: string;
	jsonInputFile?: string;
	idempotencyKey?: string;
	jsonInputStdin?: boolean;
	confirm?: boolean;
	cursor?: string;
	agentDir?: string;
}

type JsonRecord = Record<string, unknown>;
const SECRET_FIELD = /(?:secret|token|password|credential|authorization|api[_-]?key)/i;
const MAX_SESSION_LIST_PAGES = 10_000;

class SdkSessionCliError extends Error {
	constructor(
		readonly code: string,
		message: string,
		readonly exitCode: 1 | 2,
		readonly details?: unknown,
	) {
		super(message);
	}
}

function writeJson(value: unknown): void {
	process.stdout.write(`${JSON.stringify(value)}\n`);
}

function parseInput(raw: string | undefined, source: string): JsonRecord {
	if (raw === undefined) return {};
	try {
		const value: unknown = JSON.parse(raw);
		if (!value || typeof value !== "object" || Array.isArray(value))
			throw new SdkSessionCliError("invalid_input", `${source} must be a JSON object.`, 2);
		return value as JsonRecord;
	} catch (error) {
		if (error instanceof SdkSessionCliError) throw error;
		throw new SdkSessionCliError("invalid_json", `${source} must contain valid JSON.`, 2);
	}
}

function containsSecretField(value: unknown): boolean {
	if (Array.isArray(value)) return value.some(containsSecretField);
	if (!value || typeof value !== "object") return false;
	return Object.entries(value).some(([key, nested]) => SECRET_FIELD.test(key) || containsSecretField(nested));
}

function object(value: unknown): JsonRecord | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : undefined;
}

async function inputFromArgs(args: SdkSessionCliArgs): Promise<JsonRecord> {
	const sources = [
		args.jsonInput !== undefined,
		args.jsonInputFile !== undefined,
		args.jsonInputStdin === true,
	].filter(Boolean).length;
	if (sources > 1) throw new SdkSessionCliError("usage", "Use only one JSON input source.", 2);
	if (args.jsonInput !== undefined) {
		const input = parseInput(args.jsonInput, "--json-input");
		if (containsSecretField(input))
			throw new SdkSessionCliError(
				"secret_field_forbidden",
				"Secret values must use --json-input-file or --json-input-stdin.",
				2,
			);
		return input;
	}
	if (args.jsonInputFile !== undefined) {
		let stat: Awaited<ReturnType<typeof fs.stat>>;
		try {
			stat = await fs.stat(args.jsonInputFile);
		} catch {
			throw new SdkSessionCliError("input_file_unavailable", "Unable to read --json-input-file.", 2);
		}
		if (!stat.isFile() || (stat.mode & 0o077) !== 0)
			throw new SdkSessionCliError(
				"input_file_permissions",
				"--json-input-file must be a regular file with 0600 permissions.",
				2,
			);
		try {
			return parseInput(await fs.readFile(args.jsonInputFile, "utf8"), "--json-input-file");
		} catch (error) {
			if (error instanceof SdkSessionCliError) throw error;
			throw new SdkSessionCliError("input_file_unavailable", "Unable to read --json-input-file.", 2);
		}
	}
	return args.jsonInputStdin ? parseInput(await Bun.stdin.text(), "--json-input-stdin") : {};
}

function requireValue(value: string | undefined, flag: string): string {
	if (!value) throw new SdkSessionCliError("usage", `${flag} is required.`, 2);
	return value;
}

function isEndpointOperation(operation: string): boolean {
	return operation === "session.get_endpoint";
}

function cliOperationError(kind: OperationKind, operation: string): { code: string; message: string } | undefined {
	const row = findOperation(kind, operation);
	const error = adapterDispositionError("daemonCli", kind, operation);
	if (!error) return undefined;
	if (row?.adapterDispositions.daemonCli === "prohibited")
		return {
			code: error.code,
			message: `${operation} is unavailable through the ordinary CLI; provider mode is out of scope this phase.`,
		};
	return error;
}

const DAEMON_CLI_LIFECYCLE_ACTOR = { id: "gjc-daemon-session-cli", namespace: "sdk:daemon-cli" } as const;
const ROUTER_START_TIMEOUT_MS = 10_000;
const ROUTER_STOP_TIMEOUT_MS = 5_000;
type LifecycleMutationOperation = Exclude<SessionLifecycleOperation, "session.list">;

function isLifecycleOperation(operation: string): operation is LifecycleMutationOperation {
	return (
		operation === "session.create" ||
		operation === "session.fork" ||
		operation === "session.resume" ||
		operation === "session.close" ||
		operation === "session.delete"
	);
}

async function bounded<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
	let timer: NodeJS.Timeout | undefined;
	const timeout = Promise.withResolvers<never>();
	try {
		timer = setTimeout(() => timeout.reject(new SdkClientError("timeout", message)), timeoutMs);
		return await Promise.race([promise, timeout.promise]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}
function reportRouterCleanupFailure(error: unknown): void {
	const message = error instanceof Error ? error.message : String(error);
	process.stderr.write(`SDK session Router cleanup failed: ${message}\n`);
}

async function withRouter<T>(agentDir: string, action: (router: SessionRouter) => Promise<T>): Promise<T> {
	const router = new SessionRouter({ agentDir });
	let result!: T;
	let actionFailed = false;
	let actionError: unknown;
	try {
		await bounded(router.start(), ROUTER_START_TIMEOUT_MS, "SDK session Router startup timed out.");
		result = await action(router);
	} catch (error) {
		actionFailed = true;
		actionError = error;
	}
	try {
		await bounded(router.stop(), ROUTER_STOP_TIMEOUT_MS, "SDK session Router shutdown timed out.");
	} catch (error) {
		reportRouterCleanupFailure(error);
	}
	if (actionFailed) throw actionError;
	return result;
}

async function paginatedSessionList(
	router: SessionRouter,
	input: JsonRecord = {},
	requestKey = `${DAEMON_CLI_LIFECYCLE_ACTOR.namespace}:session.list`,
): Promise<unknown> {
	const aggregate: JsonRecord = {};
	const sessions: unknown[] = [];
	let firstResponse: JsonRecord | undefined;
	let cursor: string | undefined;
	for (let pageCount = 0; pageCount < MAX_SESSION_LIST_PAGES; pageCount++) {
		const response = object(
			await router.listBrokerSessions({ ...input, ...(cursor === undefined ? {} : { cursor }) }, requestKey),
		);
		firstResponse ??= response;
		if (response?.ok === false) {
			const failure = object(response.error);
			throw new SdkClientError(
				typeof failure?.code === "string" ? failure.code : "broker_error",
				typeof failure?.message === "string" ? failure.message : "session.list failed",
			);
		}
		const listing = object(response?.result) ?? response;
		if (listing) {
			for (const [key, value] of Object.entries(listing)) {
				if (key !== "sessions" && key !== "continuationCursor") aggregate[key] = value;
			}
			if (Array.isArray(listing.sessions)) sessions.push(...listing.sessions);
			const nextCursor =
				typeof listing.continuationCursor === "string" && listing.continuationCursor.length > 0
					? listing.continuationCursor
					: undefined;
			if (nextCursor) {
				cursor = nextCursor;
				continue;
			}
		}
		const result = { ...aggregate, sessions };
		return firstResponse && "result" in firstResponse ? { ...firstResponse, result } : result;
	}
	throw new SdkClientError("protocol_error", "session.list exceeded the page budget.");
}

async function runList(agentDir: string): Promise<unknown> {
	await ensureBroker({ agentDir });
	return await withRouter(agentDir, async router => await paginatedSessionList(router));
}

/** Runs the pure-SDK `gjc daemon session` command family. */
export async function runSdkSessionCli(
	args: SdkSessionCliArgs,
	writeOutput: (value: unknown) => void = writeJson,
	setExitCode: (exitCode: 1 | 2) => void = exitCode => {
		process.exitCode = exitCode;
	},
): Promise<void> {
	try {
		const action = args.action;
		if (action !== "list" && action !== "control" && action !== "query" && action !== "global")
			throw new SdkSessionCliError("usage", "Expected one of: list, control, query, global.", 2);
		const agentDir = args.agentDir ?? getAgentDir();
		if (action === "list") {
			writeOutput(await runList(agentDir));
			return;
		}
		const operation = action === "query" ? requireValue(args.query, "--query") : requireValue(args.operation, "--op");
		const kind: OperationKind = action === "query" ? "query" : action === "global" ? "global" : "control";
		const dispositionError = cliOperationError(kind, operation);
		if (dispositionError) throw new SdkSessionCliError(dispositionError.code, dispositionError.message, 1);
		if (isEndpointOperation(operation))
			throw new SdkSessionCliError(
				"endpoint_credential_forbidden",
				"session.get_endpoint is not available through the ordinary CLI.",
				1,
			);
		const input = await inputFromArgs(args);
		const secretError = validateAdapterSecretFields(operation, input);
		if (secretError) throw new SdkSessionCliError(secretError.code, secretError.message, 2);
		if (kind === "control") {
			const invalid = validateAdapterControl(operation, input);
			if (invalid) throw new SdkSessionCliError(invalid.code, invalid.message, 2);
		}
		if (action === "global") {
			const idempotencyKey = args.idempotencyKey;
			if (isLifecycleOperation(operation) && !idempotencyKey)
				throw new SdkSessionCliError("invalid_input", "--idempotency-key is required for lifecycle operations.", 2);
			if (operation === "session.list") {
				await ensureBroker({ agentDir });
				writeOutput(
					await withRouter(
						agentDir,
						async router =>
							await paginatedSessionList(router, input, `${DAEMON_CLI_LIFECYCLE_ACTOR.namespace}:session.list`),
					),
				);
			} else if (isLifecycleOperation(operation)) {
				const lifecycleService = createBrokerSessionLifecycleService(agentDir);
				const timeoutMs = lifecycleRequestTimeoutMs(operation, input);
				const response = await lifecycleService.execute({
					operation,
					actor: DAEMON_CLI_LIFECYCLE_ACTOR,
					capability: operation,
					requestKey: idempotencyKey!,
					target: input,
					...(timeoutMs === undefined ? {} : { timeoutMs }),
				} as unknown as SessionLifecycleMutationRequest);
				writeOutput(response);
				if (object(response)?.ok === false) setExitCode(1);
			}
			return;
		}
		const sessionId = requireValue(args.sessionId, "<sessionId>");
		writeOutput(
			await withRouter(agentDir, async router => {
				const attachment: SessionAttachment | null = router.attachment(sessionId);
				if (!attachment)
					throw new SdkSessionCliError(
						"session_unavailable",
						`SDK session ${sessionId} is unavailable through the session Router.`,
						1,
					);
				return await router.request(
					sessionId,
					action === "control"
						? { type: "control_request", operation, input, confirm: args.confirm === true }
						: {
								type: "query_request",
								query: operation,
								input,
								...(args.cursor === undefined ? {} : { cursor: args.cursor }),
							},
					attachment.generation,
					attachment,
				);
			}),
		);
	} catch (error) {
		const cliError =
			error instanceof SdkSessionCliError
				? error
				: error instanceof SessionRouterError
					? new SdkSessionCliError(error.phase, error.message, 1)
					: error instanceof SdkClientError
						? new SdkSessionCliError(
								error.code,
								error.message,
								1,
								(error.details as { details?: unknown } | undefined)?.details,
							)
						: new SdkSessionCliError(
								"operation_failed",
								error instanceof Error ? error.message : "SDK operation failed.",
								1,
							);
		writeOutput({
			ok: false,
			error: {
				code: cliError.code,
				message: cliError.message,
				...(cliError.details ? { details: cliError.details } : {}),
			},
		});
		setExitCode(cliError.exitCode);
	}
}
