import { createHash } from "node:crypto";

export type SessionLifecycleOperation =
	| "session.create"
	| "session.fork"
	| "session.resume"
	| "session.close"
	| "session.delete"
	| "session.list";

/** The capability required to submit one lifecycle operation. */
export type SessionLifecycleCapability = Exclude<SessionLifecycleOperation, "session.list"> | "session.list";

export interface SessionLifecycleActor {
	readonly id: string;
	readonly namespace: string;
}

export interface SessionLifecycleClientRequestOptions {
	readonly idempotencyKey?: string;
	readonly timeoutMs?: number;
}

/** The deliberately small client surface needed by the lifecycle facade. */
export interface SessionLifecycleClient {
	global(
		operation: SessionLifecycleOperation,
		input: Record<string, unknown>,
		options: SessionLifecycleClientRequestOptions,
	): Promise<unknown>;
}

export interface SessionLifecycleWorktreeTarget {
	readonly enabled: true;
	readonly name?: string;
}

export interface SessionLifecycleTranscriptIdentity {
	readonly dev: string;
	readonly ino: string;
	readonly size: number;
	readonly mtimeMs: number;
	readonly mtimeNs: string;
	readonly sha256: string;
}

export interface SessionLifecycleCoordinatorTarget {
	readonly coordinatorStateDir?: string;
	readonly coordinatorSessionId?: string;
	readonly coordinatorSessionBranch?: string;
}

export interface SessionCreateTarget extends SessionLifecycleCoordinatorTarget {
	readonly cwd: string;
	readonly stateRoot?: string;
	readonly body?: string;
	readonly modelPreset?: string;
	readonly mcpServers?: readonly Record<string, unknown>[];
	readonly worktree?: SessionLifecycleWorktreeTarget;
	readonly readiness?: "immediate" | "deferred";
	readonly readinessTimeoutMs?: number;
}

export interface SessionForkTarget extends SessionLifecycleCoordinatorTarget {
	readonly cwd: string;
	readonly stateRoot?: string;
	readonly sourceSessionId?: string;
	readonly sourceSessionPath?: string;
	readonly sourceSessionIdentity?: SessionLifecycleTranscriptIdentity;
	readonly body?: string;
	readonly modelPreset?: string;
	readonly mcpServers?: readonly Record<string, unknown>[];
	readonly worktree?: SessionLifecycleWorktreeTarget;
	readonly readinessTimeoutMs?: number;
}

export interface SessionResumeTarget extends SessionLifecycleCoordinatorTarget {
	readonly sessionId: string;
	readonly cwd?: string;
	readonly stateRoot?: string;
	readonly sessionPath?: string;
	readonly sessionIdentity?: SessionLifecycleTranscriptIdentity;
	readonly body?: string;
	readonly modelPreset?: string;
	readonly mcpServers?: readonly Record<string, unknown>[];
	readonly worktree?: SessionLifecycleWorktreeTarget;
	readonly readinessTimeoutMs?: number;
}

export interface SessionCloseTarget {
	readonly sessionId: string;
	readonly endpointGeneration?: number;
	readonly endpointIncarnation?: string;
}

export interface SessionDeleteTarget {
	readonly sessionId: string;
	readonly cwd?: string;
	readonly stateRoot?: string;
	readonly sessionPath?: string;
}

export interface SessionListTarget {
	readonly cwd?: string;
	readonly resolveSessionId?: string;
}

interface SessionLifecycleMutationRequestBase<
	TOperation extends Exclude<SessionLifecycleOperation, "session.list">,
	TTarget,
> {
	readonly operation: TOperation;
	readonly actor: SessionLifecycleActor;
	readonly capability: TOperation;
	readonly requestKey: string;
	readonly target: TTarget;
	readonly timeoutMs?: number;
}

export type SessionCreateRequest = SessionLifecycleMutationRequestBase<"session.create", SessionCreateTarget>;
export type SessionForkRequest = SessionLifecycleMutationRequestBase<"session.fork", SessionForkTarget>;
export type SessionResumeRequest = SessionLifecycleMutationRequestBase<"session.resume", SessionResumeTarget>;
export type SessionCloseRequest = SessionLifecycleMutationRequestBase<"session.close", SessionCloseTarget>;
export type SessionDeleteRequest = SessionLifecycleMutationRequestBase<"session.delete", SessionDeleteTarget>;
export interface SessionListRequest {
	readonly operation: "session.list";
	readonly actor: SessionLifecycleActor;
	readonly capability: "session.list";
	readonly target?: SessionListTarget;
	readonly timeoutMs?: number;
}

export type SessionLifecycleRequest = SessionLifecycleMutationRequest | SessionListRequest;

export type SessionLifecycleMutationRequest =
	| SessionCreateRequest
	| SessionForkRequest
	| SessionResumeRequest
	| SessionCloseRequest
	| SessionDeleteRequest;

export type SessionLifecycleCertainty = "terminal" | "retryable" | "cleanup_pending" | "uncertain";

export interface SessionLifecycleSessionResult {
	readonly sessionId: string;
	readonly cwd?: string;
	readonly endpointGeneration?: number;
	readonly reused?: boolean;
	readonly note?: string;
}

export interface SessionLifecycleListEntry {
	readonly sessionId: string;
	readonly live?: boolean;
	readonly endpointGeneration?: number;
	readonly terminalUncertain?: boolean;
	readonly repo?: string;
}

export interface SessionLifecycleListResult {
	readonly indexSeq: number;
	readonly sessions: readonly SessionLifecycleListEntry[];
	readonly warnings: readonly string[];
	readonly savedSession?: { readonly id: string; readonly path: string };
}

export interface SessionCreateResult {
	readonly ok: true;
	readonly operation: "session.create";
	readonly result: SessionLifecycleSessionResult;
}
export interface SessionForkResult {
	readonly ok: true;
	readonly operation: "session.fork";
	readonly result: SessionLifecycleSessionResult;
}
export interface SessionResumeResult {
	readonly ok: true;
	readonly operation: "session.resume";
	readonly result: SessionLifecycleSessionResult;
}
export interface SessionCloseResult {
	readonly ok: true;
	readonly operation: "session.close";
	readonly result: SessionLifecycleSessionResult;
}
export interface SessionDeleteResult {
	readonly ok: true;
	readonly operation: "session.delete";
	readonly result: SessionLifecycleSessionResult;
}
export interface SessionListSuccessResult {
	readonly ok: true;
	readonly operation: "session.list";
	readonly result: SessionLifecycleListResult;
}

export interface SessionLifecycleError {
	readonly code: string;
	readonly message: string;
}

export type SessionCreateFailure = {
	readonly ok: false;
	readonly operation: "session.create";
	readonly certainty: SessionLifecycleCertainty;
	readonly error: SessionLifecycleError;
};
export type SessionForkFailure = {
	readonly ok: false;
	readonly operation: "session.fork";
	readonly certainty: SessionLifecycleCertainty;
	readonly error: SessionLifecycleError;
};
export type SessionResumeFailure = {
	readonly ok: false;
	readonly operation: "session.resume";
	readonly certainty: SessionLifecycleCertainty;
	readonly error: SessionLifecycleError;
};
export type SessionCloseFailure = {
	readonly ok: false;
	readonly operation: "session.close";
	readonly certainty: SessionLifecycleCertainty;
	readonly error: SessionLifecycleError;
};
export type SessionDeleteFailure = {
	readonly ok: false;
	readonly operation: "session.delete";
	readonly certainty: SessionLifecycleCertainty;
	readonly error: SessionLifecycleError;
};
export type SessionListFailure = {
	readonly ok: false;
	readonly operation: "session.list";
	readonly certainty: SessionLifecycleCertainty;
	readonly error: SessionLifecycleError;
};

export type SessionCreateOutcome = SessionCreateResult | SessionCreateFailure;
export type SessionForkOutcome = SessionForkResult | SessionForkFailure;
export type SessionResumeOutcome = SessionResumeResult | SessionResumeFailure;
export type SessionCloseOutcome = SessionCloseResult | SessionCloseFailure;
export type SessionDeleteOutcome = SessionDeleteResult | SessionDeleteFailure;
export type SessionListOutcome = SessionListSuccessResult | SessionListFailure;
export type SessionLifecycleResult =
	| SessionCreateOutcome
	| SessionForkOutcome
	| SessionResumeOutcome
	| SessionCloseOutcome
	| SessionDeleteOutcome
	| SessionListOutcome;

const RETRYABLE_BROKER_ERRORS = new Set([
	"unavailable",
	"broker_restarting",
	"readiness_timeout",
	"startup_admission_timeout",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalJson(value: unknown): string {
	if (value === null) return "null";
	if (typeof value === "string" || typeof value === "boolean" || typeof value === "number")
		return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
	if (isRecord(value)) {
		return `{${Object.keys(value)
			.filter(key => value[key] !== undefined)
			.sort()
			.map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
			.join(",")}}`;
	}
	return JSON.stringify(String(value));
}

/** Returns the canonical target identity used for the service idempotency namespace. */
export function canonicalSessionLifecycleTarget(target: Readonly<Record<string, unknown>>): string {
	return canonicalJson(target);
}

/** Derives a stable Broker idempotency key without exposing caller identity to Broker inputs. */
export function deriveSessionLifecycleIdempotencyKey(
	actor: SessionLifecycleActor,
	requestKey: string,
	operation: SessionLifecycleOperation,
	target: Readonly<Record<string, unknown>>,
): string {
	const identity = {
		actorNamespace: actor.namespace,
		actorId: actor.id,
		requestKey,
		operation,
		target: canonicalSessionLifecycleTarget(target),
	};
	return createHash("sha256").update(canonicalJson(identity), "utf8").digest("hex");
}

function operationOf(value: unknown): SessionLifecycleOperation {
	if (
		value === "session.create" ||
		value === "session.fork" ||
		value === "session.resume" ||
		value === "session.close" ||
		value === "session.delete" ||
		value === "session.list"
	)
		return value;
	return "session.list";
}

function failure<TOperation extends SessionLifecycleOperation>(
	operation: TOperation,
	certainty: SessionLifecycleCertainty,
	code: string,
	message: string,
): {
	ok: false;
	operation: TOperation;
	certainty: SessionLifecycleCertainty;
	error: SessionLifecycleError;
} {
	return { ok: false, operation, certainty, error: { code, message } };
}

function validActor(actor: unknown): actor is SessionLifecycleActor {
	return (
		isRecord(actor) &&
		typeof actor.id === "string" &&
		actor.id.length > 0 &&
		typeof actor.namespace === "string" &&
		actor.namespace.length > 0
	);
}

function validRequestKey(requestKey: unknown): requestKey is string {
	return typeof requestKey === "string" && requestKey.length > 0;
}

function validTarget(target: unknown): target is Readonly<Record<string, unknown>> {
	return isRecord(target);
}

function certaintyForBrokerCode(code: string): SessionLifecycleCertainty {
	if (code === "terminal_uncertain") return "uncertain";
	if (code === "cleanup_pending") return "cleanup_pending";
	if (RETRYABLE_BROKER_ERRORS.has(code)) return "retryable";
	return "terminal";
}

function credentialFreeRecord(value: Record<string, unknown>): Record<string, unknown> {
	const output: Record<string, unknown> = {};
	for (const [key, nested] of Object.entries(value)) {
		if (key === "endpoint" || key === "token" || key === "url") continue;
		if (isRecord(nested)) output[key] = credentialFreeRecord(nested);
		else if (Array.isArray(nested))
			output[key] = nested.map(item => (isRecord(item) ? credentialFreeRecord(item) : item));
		else output[key] = nested;
	}
	return output;
}

function sessionResult(value: unknown, fallbackSessionId?: string): SessionLifecycleSessionResult | undefined {
	if (!isRecord(value) && fallbackSessionId === undefined) return undefined;
	const record: Record<string, unknown> = isRecord(value) ? credentialFreeRecord(value) : {};
	const sessionId = typeof record.sessionId === "string" ? record.sessionId : fallbackSessionId;
	if (!sessionId) return undefined;
	const result: {
		sessionId: string;
		cwd?: string;
		endpointGeneration?: number;
		reused?: boolean;
		note?: string;
	} = { sessionId };
	if (typeof record.cwd === "string") result.cwd = record.cwd;
	if (typeof record.endpointGeneration === "number") result.endpointGeneration = record.endpointGeneration;
	if (typeof record.reused === "boolean") result.reused = record.reused;
	if (typeof record.note === "string") result.note = record.note;
	return result;
}

function listResult(value: unknown): SessionLifecycleListResult | undefined {
	if (!isRecord(value) || !Array.isArray(value.sessions)) return undefined;
	const sessions: SessionLifecycleListEntry[] = [];
	for (const entry of value.sessions) {
		if (!isRecord(entry) || typeof entry.sessionId !== "string") return undefined;
		const item: {
			sessionId: string;
			live?: boolean;
			endpointGeneration?: number;
			terminalUncertain?: boolean;
			repo?: string;
		} = { sessionId: entry.sessionId };
		if (typeof entry.live === "boolean") item.live = entry.live;
		if (typeof entry.endpointGeneration === "number") item.endpointGeneration = entry.endpointGeneration;
		if (typeof entry.terminalUncertain === "boolean") item.terminalUncertain = entry.terminalUncertain;
		if (isRecord(entry.locator) && typeof entry.locator.repo === "string") item.repo = entry.locator.repo;
		sessions.push(item);
	}
	const indexSeq = typeof value.indexSeq === "number" ? value.indexSeq : 0;
	const warnings = Array.isArray(value.warnings)
		? value.warnings.filter((warning): warning is string => typeof warning === "string")
		: [];
	const savedSession = isRecord(value.savedSession)
		? typeof value.savedSession.id === "string" && typeof value.savedSession.path === "string"
			? { id: value.savedSession.id, path: value.savedSession.path }
			: undefined
		: undefined;
	return { indexSeq, sessions, warnings, ...(savedSession ? { savedSession } : {}) };
}

function brokerError(value: unknown): { code: string; message: string } | undefined {
	if (!isRecord(value) || value.ok !== false || !isRecord(value.error)) return undefined;
	if (typeof value.error.code !== "string" || typeof value.error.message !== "string") return undefined;
	return { code: value.error.code, message: value.error.message };
}

function brokerErrorFromThrown(value: unknown): { code: string; message: string } | undefined {
	if (!isRecord(value)) return undefined;
	const details = isRecord(value.details) ? value.details : undefined;
	const code =
		typeof details?.code === "string" ? details.code : typeof value.code === "string" ? value.code : undefined;
	if (!code) return undefined;
	const message =
		typeof details?.message === "string"
			? details.message
			: typeof value.message === "string"
				? value.message
				: "lifecycle broker request failed";
	return { code, message };
}

function brokerSuccess(value: unknown): unknown | undefined {
	if (!isRecord(value) || value.ok !== true) return undefined;
	return value.result;
}

export class SessionLifecycleService {
	readonly #client: SessionLifecycleClient;

	constructor(client: SessionLifecycleClient) {
		this.#client = client;
	}

	async execute(
		request: SessionLifecycleMutationRequest,
	): Promise<
		SessionCreateOutcome | SessionForkOutcome | SessionResumeOutcome | SessionCloseOutcome | SessionDeleteOutcome
	> {
		const operation = operationOf((request as { operation?: unknown }).operation);
		if (operation === "session.list")
			return failure("session.create", "terminal", "invalid_request", "lifecycle mutation operation is required");
		if (!validActor((request as { actor?: unknown }).actor))
			return failure(operation, "terminal", "unauthorized", "authenticated actor is required");
		if (!validRequestKey((request as { requestKey?: unknown }).requestKey))
			return failure(operation, "terminal", "invalid_request", "requestKey is required");
		if ((request as { capability?: unknown }).capability !== operation)
			return failure(operation, "terminal", "capability_denied", `capability does not authorize ${operation}`);
		const target = (request as { target?: unknown }).target;
		if (!validTarget(target)) return failure(operation, "terminal", "invalid_request", "target must be an object");

		const typedRequest = request as SessionLifecycleMutationRequest & { target: Readonly<Record<string, unknown>> };
		const idempotencyKey = deriveSessionLifecycleIdempotencyKey(
			typedRequest.actor,
			typedRequest.requestKey,
			operation,
			target,
		);
		let response: unknown;
		try {
			response = await this.#client.global(
				operation,
				{ ...target },
				{
					idempotencyKey,
					...(typedRequest.timeoutMs === undefined ? {} : { timeoutMs: typedRequest.timeoutMs }),
				},
			);
		} catch (thrown) {
			const error = brokerError(thrown) ?? brokerErrorFromThrown(thrown);
			return error
				? failure(operation, certaintyForBrokerCode(error.code), error.code, error.message)
				: failure(operation, "retryable", "unavailable", "lifecycle broker request was unavailable");
		}

		const error = brokerError(response);
		if (error) return failure(operation, certaintyForBrokerCode(error.code), error.code, error.message);
		if (!isRecord(response) || response.ok !== true)
			return failure(operation, "uncertain", "malformed_response", "lifecycle broker returned a malformed response");
		const fallbackSessionId =
			operation === "session.resume" || operation === "session.close" || operation === "session.delete"
				? typeof target.sessionId === "string"
					? target.sessionId
					: undefined
				: undefined;
		const parsed = sessionResult(brokerSuccess(response), fallbackSessionId);
		if (!parsed)
			return failure(
				operation,
				"uncertain",
				"malformed_response",
				"lifecycle broker returned a malformed session result",
			);
		return { ok: true, operation, result: parsed } as
			| SessionCreateOutcome
			| SessionForkOutcome
			| SessionResumeOutcome
			| SessionCloseOutcome
			| SessionDeleteOutcome;
	}

	async create(request: Omit<SessionCreateRequest, "operation">): Promise<SessionCreateOutcome> {
		return (await this.execute({ ...request, operation: "session.create" })) as SessionCreateOutcome;
	}

	async fork(request: Omit<SessionForkRequest, "operation">): Promise<SessionForkOutcome> {
		return (await this.execute({ ...request, operation: "session.fork" })) as SessionForkOutcome;
	}

	async resume(request: Omit<SessionResumeRequest, "operation">): Promise<SessionResumeOutcome> {
		return (await this.execute({ ...request, operation: "session.resume" })) as SessionResumeOutcome;
	}

	async close(request: Omit<SessionCloseRequest, "operation">): Promise<SessionCloseOutcome> {
		return (await this.execute({ ...request, operation: "session.close" })) as SessionCloseOutcome;
	}

	async delete(request: Omit<SessionDeleteRequest, "operation">): Promise<SessionDeleteOutcome> {
		return (await this.execute({ ...request, operation: "session.delete" })) as SessionDeleteOutcome;
	}

	async list(request: Omit<SessionListRequest, "operation">): Promise<SessionListOutcome> {
		if (!validActor((request as { actor?: unknown }).actor))
			return failure("session.list", "terminal", "unauthorized", "authenticated actor is required");
		if ((request as { capability?: unknown }).capability !== "session.list")
			return failure("session.list", "terminal", "capability_denied", "capability does not authorize session.list");
		const target = request.target ?? {};
		if (!validTarget(target))
			return failure("session.list", "terminal", "invalid_request", "target must be an object");
		let response: unknown;
		try {
			response = await this.#client.global(
				"session.list",
				{ ...target },
				{
					...(request.timeoutMs === undefined ? {} : { timeoutMs: request.timeoutMs }),
				},
			);
		} catch (thrown) {
			const error = brokerError(thrown) ?? brokerErrorFromThrown(thrown);
			return error
				? failure("session.list", certaintyForBrokerCode(error.code), error.code, error.message)
				: failure("session.list", "retryable", "unavailable", "lifecycle broker request was unavailable");
		}
		const error = brokerError(response);
		if (error) return failure("session.list", certaintyForBrokerCode(error.code), error.code, error.message);
		const parsed = isRecord(response) && response.ok === true ? listResult(brokerSuccess(response)) : undefined;
		return parsed
			? { ok: true, operation: "session.list", result: parsed }
			: failure(
					"session.list",
					"uncertain",
					"malformed_response",
					"lifecycle broker returned a malformed list result",
				);
	}
}
