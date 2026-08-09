import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { logger } from "@gajae-code/utils";
import type { IndexedSession, SessionIndex } from "../broker/session-index";
import { SessionIndex as DefaultSessionIndex } from "../broker/session-index";
import { lifecycleRequestTimeoutMs } from "../broker/startup-budget";
import { SdkClient } from "../client/client";
import { readSdkBrokerDiscovery, readSdkSessionEndpoint, type SdkSessionEndpoint } from "../client/discovery";
import {
	type ActivatedPreparedSession,
	type PreparedSessionActivationClient,
	requestPreparedSessionActivation,
	SessionActivationError,
} from "../session-activation";
import { ACP_SESSION_RECONNECT } from "../session-reconnect";

/** The only capability a provider may retain for an attached SDK session. */
export interface SessionAttachment {
	readonly sessionId: string;
	readonly generation: number;
	isCurrent(): boolean;
	send(frame: Record<string, unknown>): unknown;
}

/** The transport surface Router keeps private behind its attachment capabilities. */
export interface SessionRouterClient {
	onFrame(handler: (frame: Record<string, unknown>) => void): () => void;
	onReconnect?(handler: () => void): () => void;
	connect?(): Promise<void>;
	request(frame: Record<string, unknown>, options?: { timeoutMs?: number }): Promise<Record<string, unknown>>;
	close(): Promise<void>;
	send(frame: Record<string, unknown>): void;
}

/** One frame after the caller's envelope/payload identity correlation. */
export interface SessionRouterFrame {
	readonly body: Record<string, unknown>;
	readonly name: string | undefined;
	readonly sessionId: string | undefined;
	readonly generation: number | undefined;
	readonly publicationId?: string;
}

export type SessionRouterFrameCorrelator = (frame: Record<string, unknown>) => SessionRouterFrame | undefined;

export interface SessionRouterDeps {
	createClient?: (endpoint: SdkSessionEndpoint) => Promise<SessionRouterClient>;
	createIndex?: (agentDir: string) => SessionIndex;
	createBrokerClient?: (endpoint: { url: string; token: string }) => Promise<SessionRouterClient>;
	/** Receives only an opaque capability and correlated provider-neutral frames. */
	onFrame?: (attachment: SessionAttachment, frame: SessionRouterFrame) => Promise<void> | void;
	onAttachment?: (attachment: SessionAttachment) => Promise<void> | void;
	/** Called when the Broker index no longer reports an attached session as live. */
	onSessionRemoved?: (attachment: SessionAttachment) => Promise<void> | void;
	onReconciled?: () => void;
	setInterval?: typeof setInterval;
	clearInterval?: typeof clearInterval;
}

export interface SessionRouterOptions {
	agentDir: string;
	deps?: SessionRouterDeps;
	/** Runtime-specific identity validation; Router supplies a conservative fallback. */
	correlateFrame?: SessionRouterFrameCorrelator;
}

export type SessionRouterErrorPhase = "pre_send" | "ambiguous";

export class SessionRouterError extends Error {
	constructor(
		readonly phase: SessionRouterErrorPhase,
		message = "SDK session attachment is unavailable.",
	) {
		super(message);
		this.name = "SessionRouterError";
	}
}

type HeldFrame = Readonly<{ seq: number; frame: Record<string, unknown> }>;
type FrameOrigin = "live" | "ordered";
type ReplayBarrier = {
	held: HeldFrame[] | undefined;
	detached: boolean;
	failed: boolean;
};

type AttachedSession = {
	readonly id: string;
	readonly sessionId: string;
	readonly endpoint: SdkSessionEndpoint;
	readonly generation: number;
	readonly client: SessionRouterClient;
	readonly cursor: { seq: number };
	readonly barrier: ReplayBarrier;
	readonly capability: SessionAttachment;
	dispose: () => void;
};

const REPLAY_BARRIER_LIMIT = 1_024;
const REPLAY_RETRY_ATTEMPTS = 3;
const REPLAY_RETRY_BACKOFF_MS = 100;
const DELIVERY_ATTEMPT_LIMIT = 3;

function readGeneration(value: unknown): number | undefined {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function readSequence(value: unknown): number | undefined {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 1 ? value : undefined;
}

function fallbackCorrelation(frame: Record<string, unknown>): SessionRouterFrame | undefined {
	const payload =
		frame.type === "event" && frame.payload && typeof frame.payload === "object" && !Array.isArray(frame.payload)
			? (frame.payload as Record<string, unknown>)
			: undefined;
	const readSession = (value: unknown): string | undefined =>
		typeof value === "string" && value.length > 0 ? value : undefined;
	const readName = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);
	const outerSession = frame.sessionId;
	const innerSession = payload?.sessionId;
	const outerGeneration = frame.generation;
	const innerGeneration = payload?.generation;
	if (outerSession !== undefined && innerSession !== undefined && outerSession !== innerSession) return undefined;
	if (outerGeneration !== undefined && innerGeneration !== undefined && outerGeneration !== innerGeneration)
		return undefined;
	const sessionClaim = outerSession !== undefined ? outerSession : innerSession;
	const generationClaim = outerGeneration !== undefined ? outerGeneration : innerGeneration;
	const sessionId = readSession(sessionClaim);
	const generation = readGeneration(generationClaim);
	if (sessionClaim !== undefined && sessionId === undefined) return undefined;
	if (generationClaim !== undefined && generation === undefined) return undefined;
	const body = payload ?? frame;
	return {
		body,
		name: readName(frame.name) ?? readName(frame.kind) ?? readName(body.type),
		sessionId,
		generation,
	};
}

function readReplayGap(
	value: unknown,
):
	| Readonly<{ kind: "generation_reset"; toGeneration: number }>
	| Readonly<{ kind: "sequence_gap"; fromSeq: number; toSeq: number }>
	| undefined {
	if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
	const gap = value as Record<string, unknown>;
	if (gap.kind === "generation_reset") {
		const toGeneration = readGeneration(gap.toGeneration);
		return toGeneration === undefined ? undefined : { kind: "generation_reset", toGeneration };
	}
	if (gap.kind !== "sequence_gap") return undefined;
	const fromSeq = readSequence(gap.fromSeq);
	const toSeq = readSequence(gap.toSeq);
	if (fromSeq === undefined || toSeq === undefined || toSeq < fromSeq) return undefined;
	return { kind: "sequence_gap", fromSeq, toSeq };
}

/**
 * Broker-index-backed SDK attachment authority. Providers receive only opaque
 * attachment capabilities; endpoint records and SDK clients remain here.
 */
export class SessionRouter {
	readonly #agentDir: string;
	readonly #deps: SessionRouterDeps;
	readonly #correlateFrame: SessionRouterFrameCorrelator;
	readonly #index: SessionIndex;
	readonly #sessions = new Map<string, AttachedSession>();
	readonly #pending = new Set<Promise<void>>();
	readonly #frameTails = new Map<string, Promise<void>>();
	readonly #undelivered = new Map<string, { generation: number; seq: number; attempts: number }>();
	readonly #recoveredFrames = new Map<
		string,
		{ generation: number; frames: Array<{ seq: number; frame: Record<string, unknown> }> }
	>();
	readonly #reviving = new Set<string>();
	#stopTimer: (() => void) | undefined;
	#reconcileTail: Promise<void> = Promise.resolve();
	#ready = false;
	#started = false;
	#stopController = new AbortController();

	constructor(options: SessionRouterOptions) {
		this.#agentDir = options.agentDir;
		this.#deps = options.deps ?? {};
		this.#correlateFrame = options.correlateFrame ?? fallbackCorrelation;
		this.#index = this.#deps.createIndex?.(options.agentDir) ?? new DefaultSessionIndex(options.agentDir);
	}

	isReady(): boolean {
		return this.#ready;
	}

	/** Starts reconciliation and the index watcher. */
	async start(): Promise<void> {
		if (this.#started) return;
		this.#started = true;
		if (this.#stopController.signal.aborted) this.#stopController = new AbortController();
		try {
			await this.#serialReconcile();
			if (!this.#started) return;
			const timer = (this.#deps.setInterval ?? setInterval)(() => this.#schedule(this.#serialReconcile()), 2_000);
			this.#stopTimer = () => (this.#deps.clearInterval ?? clearInterval)(timer);
		} catch (error) {
			await this.stop();
			throw error;
		}
	}

	/** Exposed for deterministic callers and reconciliation tests. */
	reconcile(): Promise<void> {
		return this.#serialReconcile();
	}

	async stop(): Promise<void> {
		if (this.#stopTimer) this.#stopTimer();
		this.#stopTimer = undefined;
		this.#started = false;
		this.#stopController.abort();
		this.#ready = false;
		const shutdownTasks: Promise<void>[] = [];
		for (const [sessionId, attached] of this.#sessions) {
			this.#sessions.delete(sessionId);
			attached.dispose();
			shutdownTasks.push(
				(async () => await attached.client.close())(),
				(async () => await this.#deps.onSessionRemoved?.(attached.capability))(),
			);
		}
		const pending = Promise.allSettled([this.#reconcileTail, ...this.#pending, ...shutdownTasks]);
		const outcome = await Promise.race([
			pending.then(results => ({ kind: "settled" as const, results })),
			Bun.sleep(5_000).then(() => ({ kind: "timeout" as const })),
		]);
		if (outcome.kind === "timeout") {
			logger.warn(
				"SessionRouter shutdown exceeded 5000ms; authority is revoked and cleanup continues in background.",
			);
			return;
		}
		const errors = outcome.results
			.filter((result): result is PromiseRejectedResult => result.status === "rejected")
			.map(result => result.reason);
		if (errors.length > 0) throw new AggregateError(errors, "SessionRouter shutdown failed.");
	}

	/** Returns an opaque lease only while the exact attachment generation is live. */
	attachment(sessionId: string, expectedGeneration?: number): SessionAttachment | null {
		const attached = this.#sessions.get(sessionId);
		if (!attached || !this.#attachmentLive(attached)) return null;
		if (expectedGeneration !== undefined && expectedGeneration !== attached.generation) return null;
		return attached.capability;
	}

	/** Sends an SDK command through the current attachment without exposing its client. */
	async request(
		sessionId: string,
		frame: Record<string, unknown>,
		expectedGeneration?: number,
	): Promise<Record<string, unknown>> {
		await this.#serialReconcile();
		const attached = this.#sessions.get(sessionId);
		if (!attached || !this.#attachmentLive(attached)) throw new SessionRouterError("pre_send");
		if (expectedGeneration !== undefined && expectedGeneration !== attached.generation)
			throw new SessionRouterError("pre_send", "SDK session endpoint changed before command dispatch.");
		return await attached.client.request(frame);
	}

	/** Resolves the exact provider-neutral binding authority for operator adoption. */
	async bindingAuthority(sessionId: string): Promise<{ sessionId: string; endpointGeneration: number } | undefined> {
		const attached = this.#sessions.get(sessionId);
		if (!attached || !this.#attachmentLive(attached)) return undefined;
		let indexed: IndexedSession | undefined;
		try {
			await this.#index.refresh();
			const listing = this.#index.listSessions();
			if (listing.warnings.length > 0) return undefined;
			indexed = listing.sessions.find(candidate => candidate.sessionId === sessionId);
		} catch {
			return undefined;
		}
		if (!indexed?.live || indexed.terminalUncertain) return undefined;
		if (
			!Number.isSafeInteger(indexed.endpointGeneration) ||
			indexed.endpointGeneration <= 0 ||
			indexed.endpointGeneration !== attached.generation ||
			indexed.endpointMtimeMs === undefined
		)
			return undefined;
		if (!Number.isSafeInteger(indexed.pid) || indexed.pid <= 0) return undefined;
		const endpoint = await this.#readEndpoint(indexed).catch(() => null);
		if (!endpoint || endpoint.stale === true || endpoint.pid !== indexed.pid || !endpoint.token) return undefined;
		if (this.#sessions.get(sessionId) !== attached || !this.#attachmentLive(attached)) return undefined;
		return { sessionId, endpointGeneration: attached.generation };
	}

	/** Activates a prepared session through one Router-owned, one-shot SDK client. */
	async activatePreparedSession(sessionId: string): Promise<ActivatedPreparedSession> {
		let indexed: IndexedSession | undefined;
		try {
			await this.#index.open();
			await this.#index.refresh();
			const listing = this.#index.listSessions();
			if (listing.warnings.length > 0)
				throw new SessionActivationError(
					"session_not_live",
					"Session activation requires an intact session index.",
				);
			indexed = listing.sessions.find(candidate => candidate.sessionId === sessionId);
		} catch (error) {
			if (error instanceof SessionActivationError) throw error;
			throw new SessionActivationError(
				"session_not_live",
				"Session activation requires an exact live session endpoint.",
			);
		}
		if (
			!indexed?.live ||
			indexed.terminalUncertain ||
			!Number.isSafeInteger(indexed.endpointGeneration) ||
			indexed.endpointGeneration <= 0 ||
			!Number.isSafeInteger(indexed.pid) ||
			indexed.pid <= 0
		)
			throw new SessionActivationError(
				"session_not_live",
				"Session activation requires an exact live session endpoint.",
			);
		const endpoint = await this.#readEndpoint(indexed).catch(() => null);
		if (!endpoint || endpoint.stale === true || !endpoint.url || !endpoint.token || endpoint.pid !== indexed.pid)
			throw new SessionActivationError(
				"session_not_live",
				"Session activation requires a readable session discovery endpoint.",
			);

		let client: PreparedSessionActivationClient;
		try {
			client = await (this.#deps.createClient
				? this.#deps.createClient(endpoint)
				: connectPreparedSession(endpoint));
		} catch {
			throw new SessionActivationError("activation_unavailable", "The session endpoint could not be reached.");
		}
		try {
			return await requestPreparedSessionActivation(client, sessionId, indexed.endpointGeneration);
		} finally {
			await client.close().catch(() => undefined);
		}
	}

	/** Lists saved sessions through Router-owned Broker discovery without exposing credentials or mutation authority. */
	async listBrokerSessions(input: Record<string, unknown>, idempotencyKey: string): Promise<Record<string, unknown>> {
		const operation = "session.list";
		const discovery = await readSdkBrokerDiscovery(this.#agentDir);
		if (!discovery) throw new SessionRouterError("pre_send");
		let client: SessionRouterClient;
		try {
			client = await (
				this.#deps.createBrokerClient ?? (async endpoint => await SdkClient.connect(endpoint.url, endpoint.token))
			)({ url: discovery.url, token: discovery.token });
		} catch {
			throw new SessionRouterError("pre_send");
		}
		try {
			const timeoutMs = lifecycleRequestTimeoutMs(operation, input);
			return await client.request(
				{ type: "broker_request", operation, input, idempotencyKey },
				timeoutMs === undefined ? undefined : { timeoutMs },
			);
		} finally {
			await client.close();
		}
	}

	async #serialReconcile(): Promise<void> {
		const task = this.#reconcileTail
			.catch(() => undefined)
			.then(async () => {
				try {
					await this.#reconcile();
					if (!this.#started) return;
					this.#ready = true;
					this.#deps.onReconciled?.();
				} catch (error) {
					this.#ready = false;
					throw error;
				}
			});
		this.#reconcileTail = task;
		return await task;
	}

	async #reconcile(): Promise<void> {
		if (!this.#started) return;
		await this.#index.open();
		if (!this.#started) return;
		await this.#index.refresh();
		if (!this.#started) return;
		const indexed = this.#index.listSessions();
		const live =
			indexed.warnings.length === 0
				? indexed.sessions.filter(session => session.live && !session.terminalUncertain)
				: [];
		const liveIds = new Set(live.map(session => session.sessionId));
		const attachedIds = new Set<string>();
		for (const session of live) {
			if (!this.#started) break;
			try {
				if (await this.#attach(session)) attachedIds.add(session.sessionId);
			} catch {
				const failed = this.#sessions.get(session.sessionId);
				if (failed) {
					this.#sessions.delete(session.sessionId);
					failed.dispose();
					await failed.client.close().catch(() => undefined);
					try {
						await this.#deps.onSessionRemoved?.(failed.capability);
					} catch {
						// A failed attachment is already revoked; provider cleanup is best effort.
					}
				}
				logger.warn(
					`SDK session attachment failed for indexed session ${session.sessionId} at generation ${session.endpointGeneration}; the endpoint remains unauthorized.`,
				);
			}
		}
		if (!this.#started) return;
		const cleanupErrors: unknown[] = [];
		for (const [sessionId, attached] of this.#sessions) {
			if (attachedIds.has(sessionId)) continue;
			if (!liveIds.has(sessionId)) {
				this.#undelivered.delete(sessionId);
				this.#recoveredFrames.delete(sessionId);
			}
			this.#sessions.delete(sessionId);
			attached.dispose();
			try {
				await attached.client.close();
			} catch (error) {
				cleanupErrors.push(error);
			}
			try {
				await this.#deps.onSessionRemoved?.(attached.capability);
			} catch (error) {
				cleanupErrors.push(error);
			}
		}
		if (cleanupErrors.length > 0) throw new AggregateError(cleanupErrors, "SessionRouter stale cleanup failed.");
	}

	async #readEndpoint(indexed: IndexedSession): Promise<SdkSessionEndpoint | null> {
		const repo = path.resolve(indexed.locator.repo);
		const defaultStateRoot = path.join(repo, ".gjc", "state");
		const indexedStateRoot = path.resolve(indexed.locator.stateRoot);
		const scope =
			indexedStateRoot === defaultStateRoot
				? "default"
				: indexedStateRoot === path.join(defaultStateRoot, "chat")
					? "chat"
					: undefined;
		if (!scope || indexed.endpointMtimeMs === undefined) return null;
		const endpoint = await readSdkSessionEndpoint(repo, indexed.sessionId, scope);
		if (!endpoint || endpoint.stale) return null;
		const endpointStat = await fs.stat(endpoint.path).catch(() => undefined);
		if (!endpointStat || endpointStat.mtimeMs !== indexed.endpointMtimeMs) return null;
		return endpoint;
	}

	async #attach(indexed: IndexedSession): Promise<boolean> {
		if (!this.#started) return false;
		const endpoint = await this.#readEndpoint(indexed);
		if (!this.#started) return false;
		if (!endpoint) return false;
		const existing = this.#sessions.get(indexed.sessionId);
		const resumable =
			existing !== undefined &&
			existing.endpoint.url === endpoint.url &&
			existing.endpoint.token === endpoint.token &&
			existing.generation === indexed.endpointGeneration;
		if (existing && resumable && !existing.barrier.failed) {
			this.#reviveTransport(existing);
			return true;
		}
		const resumeSeq = existing && resumable ? existing.cursor.seq : 0;
		if (existing) {
			this.#sessions.delete(indexed.sessionId);
			existing.dispose();
			try {
				await existing.client.close();
			} catch (error) {
				logger.warn(
					`SDK session replacement transport cleanup failed for ${indexed.sessionId}; authority remains revoked (${String(error)}).`,
				);
			}
			if (!resumable) {
				this.#undelivered.delete(indexed.sessionId);
				this.#recoveredFrames.delete(indexed.sessionId);
			}
		}
		let client: SessionRouterClient;
		try {
			client = await (this.#deps.createClient ?? connectAttachedSession)(endpoint);
		} catch (error) {
			if (existing)
				try {
					await this.#deps.onSessionRemoved?.(existing.capability);
				} catch {
					// Replacement failure already revoked Router authority; provider cleanup remains best effort.
				}
			throw error;
		}
		if (!this.#started) {
			await client.close().catch(() => undefined);
			if (existing)
				try {
					await this.#deps.onSessionRemoved?.(existing.capability);
				} catch {
					// Router authority is already revoked; provider cleanup remains best effort.
				}
			return false;
		}
		let attached: AttachedSession | undefined;
		const barrier: ReplayBarrier = { held: undefined, detached: false, failed: false };
		const capability: SessionAttachment = Object.freeze({
			sessionId: indexed.sessionId,
			generation: indexed.endpointGeneration,
			isCurrent: () => attached !== undefined && this.#attachmentLive(attached),
			send: async (frame: Record<string, unknown>) => {
				await this.#serialReconcile();
				if (!attached || !this.#attachmentLive(attached))
					throw new SessionRouterError("pre_send", "SDK session attachment is stale.");
				attached.client.send(frame);
			},
		});
		const disposeFrames = client.onFrame(frame => {
			if (attached) this.#schedule(this.#enqueueFrame(attached, frame, "live"));
		});
		const disposeReconnect = client.onReconnect?.(() => {
			if (attached) this.#schedule(this.#replayAttachment(attached, attached.cursor.seq));
		});
		attached = {
			id: randomUUID(),
			sessionId: indexed.sessionId,
			endpoint,
			generation: indexed.endpointGeneration,
			client,
			cursor: { seq: resumeSeq },
			barrier,
			capability,
			dispose: () => {
				disposeFrames();
				disposeReconnect?.();
				barrier.detached = true;
				barrier.held = undefined;
			},
		};
		this.#sessions.set(indexed.sessionId, attached);
		await this.#deps.onAttachment?.(capability);
		if (!this.#started) {
			this.#sessions.delete(indexed.sessionId);
			attached.dispose();
			await attached.client.close().catch(() => undefined);
			try {
				await this.#deps.onSessionRemoved?.(capability);
			} catch {
				// Router authority is already revoked; provider cleanup remains best effort.
			}
			return false;
		}
		if (!(await this.#deliverRecoveredFrames(attached))) return false;
		await this.#replayAttachment(attached, attached.cursor.seq);
		return true;
	}

	#reviveTransport(attached: AttachedSession): void {
		const connect = attached.client.connect?.bind(attached.client);
		if (!connect || this.#reviving.has(attached.id)) return;
		this.#reviving.add(attached.id);
		void connect()
			.catch(() => undefined)
			.finally(() => this.#reviving.delete(attached.id));
	}

	#attachmentLive(attached: AttachedSession): boolean {
		return (
			this.#started &&
			!attached.barrier.detached &&
			!attached.barrier.failed &&
			this.#sessions.get(attached.sessionId) === attached
		);
	}

	#failBarrier(attached: AttachedSession, reason: string): void {
		if (attached.barrier.detached || attached.barrier.failed) return;
		attached.barrier.failed = true;
		attached.barrier.held = undefined;
		logger.warn(
			`chat daemon replay barrier failed (${reason}); rebuilding session ${attached.sessionId} at generation ${attached.generation} from seq ${attached.cursor.seq}.`,
		);
	}
	#failDelivery(attached: AttachedSession, seq: number, error: unknown): void {
		const previous = this.#undelivered.get(attached.sessionId);
		const attempts = previous?.generation === attached.generation && previous.seq === seq ? previous.attempts + 1 : 1;
		const reason = error instanceof Error ? error.message : String(error);
		if (attempts >= DELIVERY_ATTEMPT_LIMIT) {
			this.#undelivered.delete(attached.sessionId);
			this.#removeRecoveredFrame(attached.sessionId, attached.generation, seq);
			attached.cursor.seq = seq;
			logger.warn(
				`chat daemon conceded seq ${seq} of session ${attached.sessionId} at generation ${attached.generation} after ${attempts} refused publications (${reason}); delivery resumes above it.`,
			);
			return;
		}
		this.#undelivered.set(attached.sessionId, { generation: attached.generation, seq, attempts });
		this.#failBarrier(attached, `publication failed at seq ${seq} (${reason})`);
	}

	#rememberRecoveredFrame(attached: AttachedSession, seq: number, frame: Record<string, unknown>): void {
		let pending = this.#recoveredFrames.get(attached.sessionId);
		if (!pending || pending.generation !== attached.generation) {
			pending = { generation: attached.generation, frames: [] };
			this.#recoveredFrames.set(attached.sessionId, pending);
		}
		const existing = pending.frames.find(item => item.seq === seq);
		if (existing) existing.frame = frame;
		else {
			pending.frames.push({ seq, frame });
			pending.frames.sort((left, right) => left.seq - right.seq);
		}
	}

	#removeRecoveredFrame(sessionId: string, generation: number, seq: number): void {
		const pending = this.#recoveredFrames.get(sessionId);
		if (!pending || pending.generation !== generation) return;
		pending.frames = pending.frames.filter(item => item.seq !== seq);
		if (pending.frames.length === 0) this.#recoveredFrames.delete(sessionId);
	}

	async #deliverRecoveredFrames(attached: AttachedSession): Promise<boolean> {
		const pending = this.#recoveredFrames.get(attached.sessionId);
		if (!pending || pending.generation !== attached.generation) return true;
		for (const item of [...pending.frames]) {
			if (item.seq <= attached.cursor.seq) {
				this.#removeRecoveredFrame(attached.sessionId, attached.generation, item.seq);
				continue;
			}
			await this.#enqueueFrame(attached, item.frame, "ordered");
			if (attached.barrier.detached || attached.barrier.failed) return false;
		}
		return true;
	}

	#schedule(task: Promise<void>): void {
		this.#pending.add(task);
		void task.then(
			() => this.#pending.delete(task),
			() => this.#pending.delete(task),
		);
	}

	#enqueueFrame(attached: AttachedSession, frame: Record<string, unknown>, origin: FrameOrigin): Promise<void> {
		const previous = this.#frameTails.get(attached.sessionId) ?? Promise.resolve();
		const current = previous
			.catch(() => undefined)
			.then(async () => {
				if (!this.#attachmentLive(attached)) return;
				const correlated = this.#correlateFrame(frame);
				if (!correlated) return;
				const seq = typeof frame.seq === "number" && Number.isSafeInteger(frame.seq) ? frame.seq : undefined;
				if (correlated.sessionId !== undefined && correlated.sessionId !== attached.sessionId) return;
				if (correlated.generation !== undefined && correlated.generation !== attached.generation) return;
				if (seq !== undefined && correlated.generation === undefined) return;
				const ownsSequence =
					correlated.generation === attached.generation &&
					(correlated.sessionId === undefined || correlated.sessionId === attached.sessionId);
				if (seq !== undefined && ownsSequence) {
					if (seq <= attached.cursor.seq) return;
					const held = attached.barrier.held;
					if (held && origin === "live") {
						if (held.length >= REPLAY_BARRIER_LIMIT) {
							this.#failBarrier(attached, `hold buffer overflowed at ${REPLAY_BARRIER_LIMIT} frames`);
							return;
						}
						held.push({ seq, frame });
						return;
					}
				}
				const publicationId =
					seq !== undefined && ownsSequence ? `${attached.sessionId}:${attached.generation}:${seq}` : undefined;
				try {
					await this.#deps.onFrame?.(
						attached.capability,
						publicationId === undefined ? correlated : { ...correlated, publicationId },
					);
				} catch (error) {
					if (seq === undefined || !ownsSequence) throw error;
					this.#failDelivery(attached, seq, error);
					return;
				}
				if (seq !== undefined && ownsSequence) {
					this.#undelivered.delete(attached.sessionId);
					this.#removeRecoveredFrame(attached.sessionId, attached.generation, seq);
					if (seq > attached.cursor.seq) attached.cursor.seq = seq;
				}
			});
		this.#frameTails.set(attached.sessionId, current);
		void current.then(
			() => {
				if (this.#frameTails.get(attached.sessionId) === current) this.#frameTails.delete(attached.sessionId);
			},
			() => {
				if (this.#frameTails.get(attached.sessionId) === current) this.#frameTails.delete(attached.sessionId);
			},
		);
		return current;
	}

	async #drainHeldFrames(attached: AttachedSession, held: HeldFrame[]): Promise<void> {
		for (;;) {
			if (attached.barrier.held !== held || !this.#attachmentLive(attached)) return;
			if (held.length === 0) {
				attached.barrier.held = undefined;
				return;
			}
			const batch = held.splice(0, held.length).sort((left, right) => left.seq - right.seq);
			for (const entry of batch) await this.#enqueueFrame(attached, entry.frame, "ordered");
		}
	}

	async #replayAttachment(attached: AttachedSession, sinceSeq: number): Promise<void> {
		if (!this.#attachmentLive(attached)) return;
		const held: HeldFrame[] = [];
		attached.barrier.held = held;
		try {
			let replay: Record<string, unknown>;
			for (let attempt = 0; ; attempt++) {
				try {
					const stopped = Promise.withResolvers<void>();
					const onStop = (): void => stopped.resolve();
					if (this.#stopController.signal.aborted) stopped.resolve();
					else this.#stopController.signal.addEventListener("abort", onStop, { once: true });
					const replayRequest = attached.client.request({
						type: "event_replay",
						sinceGeneration: attached.generation,
						sinceSeq,
					});
					let outcome: { kind: "response"; value: Record<string, unknown> } | { kind: "stopped" };
					try {
						outcome = await Promise.race([
							replayRequest.then(value => ({ kind: "response" as const, value })),
							stopped.promise.then(() => ({ kind: "stopped" as const })),
						]);
					} finally {
						this.#stopController.signal.removeEventListener("abort", onStop);
					}
					if (outcome.kind === "stopped") return;
					replay = outcome.value;
					break;
				} catch {
					if (attempt >= REPLAY_RETRY_ATTEMPTS) {
						this.#failBarrier(attached, "replay went unanswered");
						return;
					}
					await Bun.sleep(REPLAY_RETRY_BACKOFF_MS * 2 ** attempt);
					if (attached.barrier.held !== held || !this.#attachmentLive(attached)) return;
				}
			}
			if (attached.barrier.held !== held || !this.#attachmentLive(attached)) return;
			await this.#frameTails.get(attached.sessionId)?.catch(() => undefined);
			if (attached.barrier.held !== held || !this.#attachmentLive(attached)) return;
			const events = Array.isArray(replay.events)
				? replay.events.filter(
						(event): event is Record<string, unknown> =>
							!!event && typeof event === "object" && !Array.isArray(event),
					)
				: [];
			if (replay.gap !== undefined) {
				const gap = readReplayGap(replay.gap);
				if (!gap) {
					this.#failBarrier(attached, "replay reported a gap it did not state");
					return;
				}
				if (gap.kind === "generation_reset") {
					this.#failBarrier(attached, `replay reported a generation reset to ${gap.toGeneration}`);
					return;
				}
				if (gap.fromSeq !== sinceSeq + 1) {
					this.#failBarrier(
						attached,
						`replay conceded sequences ${gap.fromSeq}-${gap.toSeq} for a request that resumed from seq ${sinceSeq}`,
					);
					return;
				}
				const retained = events
					.map(event => readSequence(event.seq))
					.find(seq => seq !== undefined && seq <= gap.toSeq);
				if (retained !== undefined) {
					this.#failBarrier(
						attached,
						`replay conceded sequences ${gap.fromSeq}-${gap.toSeq} while returning seq ${retained}`,
					);
					return;
				}
				const recovered = held.filter(entry => entry.seq <= gap.toSeq).sort((left, right) => left.seq - right.seq);
				const carried = held.filter(entry => entry.seq > gap.toSeq);
				held.splice(0, held.length, ...carried);
				const recoveredNote =
					recovered.length > 0 ? `, ${recovered.length} of them recovered from live delivery` : "";
				logger.warn(
					`chat daemon replay conceded a retention gap (sequences ${gap.fromSeq}-${gap.toSeq} are gone from the host${recoveredNote}); session ${attached.sessionId} generation ${attached.generation} resumes at seq ${gap.toSeq + 1}.`,
				);
				for (const entry of recovered) this.#rememberRecoveredFrame(attached, entry.seq, entry.frame);
				if (!(await this.#deliverRecoveredFrames(attached))) return;
				if (gap.toSeq > attached.cursor.seq) attached.cursor.seq = gap.toSeq;
			}
			for (const event of events) await this.#enqueueFrame(attached, event, "ordered");
			await this.#drainHeldFrames(attached, held);
		} finally {
			if (attached.barrier.held === held) attached.barrier.held = undefined;
		}
	}
}

async function connectAttachedSession(endpoint: SdkSessionEndpoint): Promise<SessionRouterClient> {
	return await SdkClient.connect(endpoint.url, endpoint.token, { ...ACP_SESSION_RECONNECT });
}

async function connectPreparedSession(endpoint: {
	url: string;
	token: string;
}): Promise<PreparedSessionActivationClient> {
	const client = await SdkClient.connect(endpoint.url, endpoint.token, { reconnectAttempts: 0 });
	return {
		request: async frame => (await client.request(frame)) as Record<string, unknown>,
		close: async () => await client.close(),
	};
}
