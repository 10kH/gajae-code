import { type EventFrame, SessionEventStream } from "./events";
import { type ProviderLease, ReverseLeaseError, ReverseLeaseRuntime } from "./reverse-leases";
import type { BrokerIndexWriter, HostEndpointAdapters, SdkFrame } from "./types";

export type SdkRequestObserver = (kind: "control" | "query", connectionId: string, frame: SdkFrame) => void;

export interface ProviderLeaseIdentity {
	leaseId: string;
	connectionId: string;
	connectionGeneration: number;
	fence: string;
}

export type ProviderLeaseFence = (identity: ProviderLeaseIdentity, reason?: string) => boolean;

export interface SessionSdkHostOptions extends HostEndpointAdapters {
	control?: (connectionId: string, frame: SdkFrame) => unknown | Promise<unknown>;
	query?: (connectionId: string, frame: SdkFrame) => unknown | Promise<unknown>;
	/** Best-effort diagnostic observation of accepted control/query frames. */
	onRequest?: SdkRequestObserver;
	onFrameOverflow?: (connectionId: string) => void;
	/** Runs before a control response is sent; identity transitions use sendTerminal. */
	beforeControlResponse?: (
		connectionId: string,
		request: SdkFrame,
		response: SdkFrame,
		sendTerminal: () => Promise<void>,
	) => void | Promise<void>;
	/** Runs only after a successful control response has been sent to the client. */
	afterControlResponse?: (connectionId: string, request: SdkFrame, response: SdkFrame) => void | Promise<void>;
	onProviderLeaseRegistered?: (lease: ProviderLease, connectionGeneration: number) => void;
	installProviderDefinitions?: (
		capability: string,
		definitions: unknown,
		leaseId: string,
		connectionId: string,
		connectionGeneration: number,
	) => void;
	onProviderDefinitionsRemoved?: (capability: string) => void;
	onReverseCancel?: (requestId: string, reason: "provider_disconnected" | "lease_released") => void;
	/** Best-effort capabilities mirrored from the native transport for out-of-band consumers. */
	connectionCapabilities?: (connectionId: string) => ReadonlySet<string> | undefined;
}

/** Bound asynchronous frame admission per transport connection. */
const MAX_PENDING_FRAMES_PER_CONNECTION = 32;
const MAX_QUARANTINED_PROVIDER_LEASES = 256;
const MAX_RETAINED_CLOSED_CONNECTIONS = 256;

const TOOL_ACTIVITY_CAPABILITY = "tool_activity_v2";
const CAP_GATED_FRAME_KINDS = new Set(["tool_activity", "reasoning_summary"]);
const EMPTY_CAPABILITIES: ReadonlySet<string> = new Set();

/** SDK hosting is independent of notification configuration. Only root sessions host an endpoint. */
export function shouldHostSdk(_settings: unknown, isTopLevel: boolean, env: NodeJS.ProcessEnv = process.env): boolean {
	return isTopLevel && env.GJC_SDK_DISABLE !== "1";
}

function errorFrame(connectionId: string, frame: SdkFrame, error: unknown): SdkFrame {
	const candidate = error as { code?: unknown; message?: unknown };
	const code =
		error instanceof ReverseLeaseError
			? error.code
			: typeof candidate?.code === "string"
				? candidate.code
				: "internal";
	const message = typeof candidate?.message === "string" ? candidate.message : "SDK host operation failed.";
	if (frame.type === "control_request") {
		return {
			type: "control_response",
			id: typeof frame.id === "string" ? frame.id : "",
			ok: false,
			error: { code, message },
		};
	}
	return {
		type: "reverse_response",
		id: typeof frame.id === "string" ? frame.id : "",
		connectionId,
		leaseId: typeof frame.leaseId === "string" ? frame.leaseId : "",
		ok: false,
		error: { code, message },
	};
}

function leaseState(id: unknown, lease: ProviderLease, active = lease.active): SdkFrame {
	return {
		type: "lease_state",
		id: typeof id === "string" ? id : "",
		connectionId: lease.connectionId,
		capability: lease.capability,
		leaseId: lease.leaseId,
		leaseExpiresAt: new Date(lease.expiresAt).toISOString(),
		active,
	};
}

function registeredNames(definitions: unknown): string[] {
	const entries = Array.isArray(definitions)
		? definitions
		: definitions && typeof definitions === "object"
			? Object.values(definitions as Record<string, unknown>).flatMap(value => (Array.isArray(value) ? value : []))
			: [];
	return entries.flatMap(entry =>
		entry && typeof entry === "object" && typeof (entry as Record<string, unknown>).name === "string"
			? [(entry as Record<string, string>).name]
			: [],
	);
}

function invalidFrame(message: string): Error {
	return Object.assign(new Error(message), { code: "invalid_reverse_frame" });
}
function record(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}
function requiredString(frame: SdkFrame, field: string): string {
	const value = frame[field];
	if (typeof value !== "string") throw invalidFrame(`${field} must be a string.`);
	return value;
}
function optionalString(frame: SdkFrame, field: string): string | undefined {
	const value = frame[field];
	if (value === undefined) return undefined;
	if (typeof value !== "string") throw invalidFrame(`${field} must be a string.`);
	return value;
}
function requireConnection(connectionId: string, frame: SdkFrame): void {
	if (requiredString(frame, "connectionId") !== connectionId)
		throw invalidFrame("connectionId does not match the transport connection.");
}
function has(frame: SdkFrame, field: string): boolean {
	return Object.hasOwn(frame, field);
}

/** Adapter-based session host; bus wiring owns NotificationServer creation and transport framing. */
export class SessionSdkHost {
	readonly events = new SessionEventStream();
	readonly reverse: ReverseLeaseRuntime;
	readonly #options: SessionSdkHostOptions;
	#started = false;
	#stopPromise?: Promise<"stopped">;
	#unsubscribe?: () => void;
	#registration?: { writer: BrokerIndexWriter; generation: number };
	#connectionGenerations = new Map<string, number>();
	#openConnections = new Set<string>();
	#pendingFrames = new Map<string, { generation: number; count: number }>();
	#leaseRecords = new Map<string, { capability: string; connectionId: string; connectionGeneration: number }>();
	#quarantinedLeases = new Map<string, ProviderLeaseIdentity>();
	#closedConnectionOrder: string[] = [];

	constructor(options: SessionSdkHostOptions) {
		this.#options = options;
		this.reverse = new ReverseLeaseRuntime({
			sendFrame: options.sendFrame,
			installDefinitions: options.installProviderDefinitions,
			onDefinitionsRemoved: options.onProviderDefinitionsRemoved,
			onCancel: options.onReverseCancel,
		});
	}

	get started(): boolean {
		return this.#started;
	}
	get generation(): number {
		return this.events.generation;
	}
	/** Current installed definitions for a live provider capability. */
	getProviderDefinitions(capability: string): unknown | undefined {
		return this.reverse.getInstalledDefinitions(capability);
	}
	/** Mark a transport connection live and return its stable generation. */
	handleConnect(connectionId: string): number {
		if (!this.#openConnections.has(connectionId)) {
			const generation = this.#connectionGenerations.get(connectionId) ?? 1;
			this.#connectionGenerations.set(connectionId, generation);
			this.#openConnections.add(connectionId);
			this.#pendingFrames.set(connectionId, { generation, count: 0 });
		}
		return this.#connectionGenerations.get(connectionId) ?? 0;
	}

	/** Current generation for a transport connection, if it has been observed. */
	connectionGeneration(connectionId: string): number {
		return this.#connectionGenerations.get(connectionId) ?? 0;
	}

	isConnectionOpen(connectionId: string, generation?: number): boolean {
		return (
			this.#openConnections.has(connectionId) &&
			(generation === undefined || this.#connectionGenerations.get(connectionId) === generation)
		);
	}

	/** Release reverse leases after the transport reports a WebSocket disconnect. */
	handleDisconnect(connectionId: string): void {
		if (!this.#openConnections.delete(connectionId)) return;
		this.#connectionGenerations.set(connectionId, (this.#connectionGenerations.get(connectionId) ?? 0) + 1);
		this.#pendingFrames.delete(connectionId);
		for (const [leaseId, record] of this.#leaseRecords) {
			if (record.connectionId === connectionId) this.#leaseRecords.delete(leaseId);
		}
		this.reverse.disconnect(connectionId);
		this.#closedConnectionOrder.push(connectionId);
		while (this.#closedConnectionOrder.length > MAX_RETAINED_CLOSED_CONNECTIONS) {
			const retired = this.#closedConnectionOrder.shift();
			if (retired && !this.#openConnections.has(retired)) this.#connectionGenerations.delete(retired);
		}
	}

	/**
	 * Fences one exact provider lease after uncertain terminal cleanup. The fence
	 * is idempotent for the same identity and never affects a newer generation.
	 */
	quarantineProviderLease(identity: ProviderLeaseIdentity, _reason?: string): boolean {
		if (
			!identity ||
			typeof identity.leaseId !== "string" ||
			identity.leaseId.length === 0 ||
			typeof identity.connectionId !== "string" ||
			identity.connectionId.length === 0 ||
			!Number.isSafeInteger(identity.connectionGeneration) ||
			identity.connectionGeneration < 0 ||
			typeof identity.fence !== "string" ||
			identity.fence.length === 0
		)
			return false;
		const previous = this.#quarantinedLeases.get(identity.leaseId);
		if (
			previous &&
			previous.connectionId === identity.connectionId &&
			previous.connectionGeneration === identity.connectionGeneration &&
			previous.fence === identity.fence
		)
			return true;
		if (this.#quarantinedLeases.size >= MAX_QUARANTINED_PROVIDER_LEASES) return false;
		if (this.#connectionGenerations.get(identity.connectionId) !== identity.connectionGeneration) return false;
		const record = this.#leaseRecords.get(identity.leaseId);
		if (
			!record ||
			record.connectionId !== identity.connectionId ||
			record.connectionGeneration !== identity.connectionGeneration
		)
			return false;
		const lease = this.reverse.getLease(record.capability);
		if (!lease || lease.leaseId !== identity.leaseId || lease.connectionId !== identity.connectionId || !lease.active)
			return false;
		try {
			this.reverse.release(identity.connectionId, identity.leaseId);
		} catch {
			return false;
		}
		this.#quarantinedLeases.set(identity.leaseId, { ...identity });
		return true;
	}

	/** Dispatch a frame through bounded per-connection asynchronous admission. */
	dispatchFrame(connectionId: string, frame: SdkFrame): Promise<void> {
		const generation = this.#connectionGenerations.has(connectionId)
			? (this.#connectionGenerations.get(connectionId) ?? 0)
			: this.handleConnect(connectionId);
		const pending = this.#pendingFrames.get(connectionId);
		const pendingCount = pending?.generation === generation ? pending.count : 0;
		if (pendingCount >= MAX_PENDING_FRAMES_PER_CONNECTION) {
			this.#options.onFrameOverflow?.(connectionId);
			return Promise.resolve();
		}
		this.#pendingFrames.set(connectionId, { generation, count: pendingCount + 1 });
		const task = Promise.resolve().then(() => {
			if (this.#connectionGenerations.get(connectionId) !== generation) return;
			if (!this.#openConnections.has(connectionId)) return;
			return this.#onFrame(connectionId, frame, generation);
		});
		void task.finally(() => {
			const current = this.#pendingFrames.get(connectionId);
			if (!current || current.generation !== generation) return;
			this.#pendingFrames.set(connectionId, {
				generation,
				count: Math.max(0, current.count - 1),
			});
		});
		return task.then(
			() => {},
			() => {},
		);
	}

	/** Adds an event to the resumable event ring. Transport delivery is owned by bus wiring. */
	emitEvent(frame: SdkFrame): EventFrame {
		return this.events.emit(frame);
	}

	async start(): Promise<"started" | "already"> {
		if (this.#started) return "already";
		this.events.restart();
		this.emitEvent({ name: "session_ready", sessionId: this.#options.sessionId, generation: this.events.generation });
		const disposer = this.#options.onFrame((connectionId, frame) => {
			void this.dispatchFrame(connectionId, frame);
		});
		this.#unsubscribe = typeof disposer === "function" ? disposer : undefined;
		this.#started = true;
		if (this.#registration)
			await this.#registration.writer.register({
				sessionId: this.#options.sessionId,
				stateRoot: this.#options.stateRoot,
				endpointGeneration: this.events.generation,
			});
		return "started";
	}

	async stop(): Promise<"stopped" | "already"> {
		if (this.#stopPromise) return this.#stopPromise;
		if (!this.#started) return "already";
		const stopPromise = this.#stopStartedHost();
		this.#stopPromise = stopPromise;
		try {
			return await stopPromise;
		} finally {
			if (this.#stopPromise === stopPromise) this.#stopPromise = undefined;
		}
	}

	async #stopStartedHost(): Promise<"stopped"> {
		this.#unsubscribe?.();
		this.#unsubscribe = undefined;
		if (this.#registration?.writer.unregister)
			await this.#registration.writer.unregister({
				sessionId: this.#options.sessionId,
				stateRoot: this.#options.stateRoot,
				endpointGeneration: this.events.generation,
			});
		this.#started = false;
		return "stopped";
	}

	async registerWithBroker(writer: BrokerIndexWriter): Promise<void> {
		this.#registration = { writer, generation: this.events.generation };
		if (this.#started)
			await writer.register({
				sessionId: this.#options.sessionId,
				stateRoot: this.#options.stateRoot,
				endpointGeneration: this.events.generation,
			});
	}

	async #send(connectionId: string, frame: SdkFrame): Promise<void> {
		await this.#options.sendFrame(connectionId, frame);
	}

	/**
	 * Best-effort delivery for structured error frames. When the original failure
	 * was already a disconnected/dead connection, a second send must not escape
	 * the fire-and-forget `#onFrame` callback as an unhandled rejection.
	 */
	async #sendBestEffort(connectionId: string, frame: SdkFrame): Promise<void> {
		try {
			await this.#send(connectionId, frame);
		} catch {
			// Per-connection delivery only; never rethrow into fire-and-forget handlers.
		}
	}

	async #onFrame(connectionId: string, frame: SdkFrame, generation: number): Promise<void> {
		if (this.#connectionGenerations.has(connectionId) && this.#connectionGenerations.get(connectionId) !== generation)
			return;
		try {
			switch (frame.type) {
				case "control_request": {
					this.#observeRequest("control", connectionId, frame);
					const result = await this.#options.control?.(connectionId, frame);
					if (
						this.#connectionGenerations.has(connectionId) &&
						this.#connectionGenerations.get(connectionId) !== generation
					)
						return;
					if (result !== undefined) {
						const response = { type: "control_response", ...(result as SdkFrame) };
						let terminalSent = false;
						const sendTerminal = async (): Promise<void> => {
							if (terminalSent) return;
							terminalSent = true;
							if (
								this.#connectionGenerations.has(connectionId) &&
								this.#connectionGenerations.get(connectionId) !== generation
							)
								return;
							await this.#send(connectionId, response);
						};
						await this.#options.beforeControlResponse?.(connectionId, frame, response, sendTerminal);
						await sendTerminal();
						await this.#options.afterControlResponse?.(connectionId, frame, response);
					}
					break;
				}
				case "event_replay": {
					const id = requiredString(frame, "id");
					const rawGeneration =
						frame.sinceGeneration === undefined ? this.events.generation : frame.sinceGeneration;
					const rawSeq = frame.sinceSeq === undefined ? 0 : frame.sinceSeq;
					if (typeof rawGeneration !== "number" || !Number.isSafeInteger(rawGeneration) || rawGeneration < 0)
						throw invalidFrame("sinceGeneration must be a non-negative integer.");
					if (typeof rawSeq !== "number" || !Number.isSafeInteger(rawSeq) || rawSeq < 0)
						throw invalidFrame("sinceSeq must be a non-negative integer.");
					const sinceGeneration = rawGeneration;
					const sinceSeq = rawSeq;
					const replay = this.events.replay(sinceSeq, sinceGeneration);
					const capabilities = this.#options.connectionCapabilities?.(connectionId) ?? EMPTY_CAPABILITIES;
					const events = replay.events.filter(
						event => !CAP_GATED_FRAME_KINDS.has(String(event.kind)) || capabilities.has(TOOL_ACTIVITY_CAPABILITY),
					);
					await this.#send(connectionId, {
						type: "event_replay_result",
						id,
						ok: true,
						...replay,
						events,
						generation: this.events.generation,
						lastSeq: this.events.sequence,
					});
					break;
				}
				case "query_request": {
					this.#observeRequest("query", connectionId, frame);
					const result = await this.#options.query?.(connectionId, frame);
					if (
						this.#connectionGenerations.has(connectionId) &&
						this.#connectionGenerations.get(connectionId) !== generation
					)
						return;
					if (result !== undefined)
						await this.#send(connectionId, { type: "query_response", ...(result as SdkFrame) });
					break;
				}
				case "register_provider": {
					requiredString(frame, "id");
					requireConnection(connectionId, frame);
					const capability = requiredString(frame, "capability");
					if (!has(frame, "definitions")) throw invalidFrame("definitions is required.");
					const expectedLeaseId = optionalString(frame, "expectedLeaseId");
					if (expectedLeaseId && this.#quarantinedLeases.has(expectedLeaseId))
						throw new ReverseLeaseError("lease_unavailable");
					const connectionGeneration = this.#connectionGenerations.get(connectionId) ?? 0;
					const lease = this.reverse.registerProvider(
						connectionId,
						capability,
						frame.definitions,
						expectedLeaseId,
						optionalString(frame, "idempotencyKey"),
						connectionGeneration,
					);
					for (const [priorLeaseId, record] of this.#leaseRecords) {
						if (record.capability === lease.capability && priorLeaseId !== lease.leaseId)
							this.#leaseRecords.delete(priorLeaseId);
					}
					this.#leaseRecords.set(lease.leaseId, {
						capability: lease.capability,
						connectionId: lease.connectionId,
						connectionGeneration,
					});
					try {
						this.#options.onProviderLeaseRegistered?.(lease, connectionGeneration);
					} catch {}
					await this.#send(connectionId, {
						id: frame.id,
						type: "register_provider_result",
						leaseId: lease.leaseId,
						leaseExpiresAt: new Date(lease.expiresAt).toISOString(),
						registeredNames: registeredNames(frame.definitions),
					});
					break;
				}
				case "provider_heartbeat": {
					requireConnection(connectionId, frame);
					const lease = this.reverse.heartbeat(connectionId, requiredString(frame, "leaseId"));
					await this.#send(connectionId, leaseState(undefined, lease));
					break;
				}
				case "lease_release": {
					requireConnection(connectionId, frame);
					const handoffTo = optionalString(frame, "handoffTo");
					const lease = this.reverse.release(connectionId, requiredString(frame, "leaseId"), handoffTo);
					this.#leaseRecords.delete(lease.leaseId);
					await this.#send(connectionId, leaseState(undefined, lease));
					break;
				}
				case "reverse_response": {
					const id = requiredString(frame, "id");
					requireConnection(connectionId, frame);
					const leaseId = requiredString(frame, "leaseId");
					if (typeof frame.ok !== "boolean") throw invalidFrame("ok must be a boolean.");
					const responseError = record(frame.error);
					if (frame.ok) {
						if (!has(frame, "result") || has(frame, "error"))
							throw invalidFrame("Successful reverse responses require result and no error.");
						this.reverse.respond(connectionId, id, leaseId, frame.result, undefined, frame);
					} else {
						if (
							has(frame, "result") ||
							!responseError ||
							typeof responseError.code !== "string" ||
							typeof responseError.message !== "string"
						)
							throw invalidFrame("Failed reverse responses require a structured error and no result.");
						this.reverse.respond(
							connectionId,
							id,
							leaseId,
							undefined,
							{ code: responseError.code, message: responseError.message },
							frame,
						);
					}
					break;
				}
				default:
					// Unknown/future frame types are tolerated silently per the v3
					// forward-compatibility contract; only malformed frames of KNOWN
					// types produce structured errors (thrown above).
					return;
			}
		} catch (error) {
			// Structured error delivery is best-effort: if the client already
			// disconnected, do not escalate a second send failure process-wide.
			await this.#sendBestEffort(connectionId, errorFrame(connectionId, frame, error));
		}
	}
	#observeRequest(kind: "control" | "query", connectionId: string, frame: SdkFrame): void {
		try {
			this.#options.onRequest?.(kind, connectionId, frame);
		} catch {
			// Diagnostic observers must not change request handling.
		}
	}
}
