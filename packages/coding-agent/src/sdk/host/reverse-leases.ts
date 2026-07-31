import { createHash, randomUUID } from "node:crypto";
import type { SdkFrame } from "./types";

export const REVERSE_HEARTBEAT_MS = 5_000;
export const REVERSE_LEASE_TTL_MS = 15_000;
export const REVERSE_RECLAIM_GRACE_MS = 15_000;
export const MAX_REVERSE_OUTSTANDING = 64;
export const MAX_REVERSE_CLEANUP_OUTSTANDING = 2;
export const MAX_REVERSE_PAYLOAD_BYTES = 256 * 1024;
export const MAX_REVERSE_TERMINAL_OUTPUT_BYTES = 10 * 1024 * 1024;
export const MAX_REVERSE_TERMINAL_OUTPUT_PAYLOAD_BYTES = 64 * 1024 * 1024;
const MAX_REVERSE_IDEMPOTENCY_ENTRIES = 256;
const MAX_REVERSE_IDEMPOTENCY_KEY_BYTES = 512;

export class ReverseLeaseError extends Error {
	constructor(
		readonly code:
			| "lease_unavailable"
			| "lease_expired"
			| "provider_lease_conflict"
			| "provider_required"
			| "not_lease_owner"
			| "payload_too_large"
			| "too_many_outstanding"
			| "unknown_request"
			| "idempotency_conflict",
		message = code,
	) {
		super(message);
	}
}

export interface ProviderLease {
	leaseId: string;
	connectionId: string;
	capability: string;
	definitions: unknown;
	expiresAt: number;
	graceUntil?: number;
	active: boolean;
}

interface Outstanding {
	connectionId: string;
	capability: string;
	leaseId: string;
	method: string;
	resolve: (value: unknown) => void;
	reject: (reason: Error) => void;
	signal?: AbortSignal;
	onAbort?: () => void;
}

export interface ReverseLeaseOptions {
	now?: () => number;
	leaseTtlMs?: number;
	sendFrame: (connectionId: string, frame: SdkFrame) => void | Promise<void>;
	installDefinitions?: (
		capability: string,
		definitions: unknown,
		leaseId: string,
		connectionId: string,
		connectionGeneration: number,
	) => void;
	onCancel?: (requestId: string, reason: "provider_disconnected" | "lease_released") => void;
	onDefinitionsRemoved?: (capability: string) => void;
}

function canonicalJson(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
	if (value && typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>)
			.filter(([, entry]) => entry !== undefined)
			.sort(([left], [right]) => left.localeCompare(right));
		return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
	}
	return JSON.stringify(value) ?? "null";
}

function registrationFingerprint(capability: string, definitions: unknown, expectedLeaseId?: string): string {
	return createHash("sha256")
		.update(canonicalJson({ capability, definitions, expectedLeaseId: expectedLeaseId ?? null }))
		.digest("hex");
}

/** Session-local directed reverse RPC lease registry. */
export class ReverseLeaseRuntime {
	readonly #now: () => number;
	readonly #leaseTtlMs: number;
	readonly #sendFrame: ReverseLeaseOptions["sendFrame"];
	readonly #installDefinitions?: ReverseLeaseOptions["installDefinitions"];
	readonly #onDefinitionsRemoved?: ReverseLeaseOptions["onDefinitionsRemoved"];
	readonly #onCancel?: ReverseLeaseOptions["onCancel"];
	readonly #leases = new Map<string, ProviderLease>();
	readonly #idempotency = new Map<string, { fingerprint: string; lease: ProviderLease }>();
	readonly #idempotencyOrder: string[] = [];

	readonly #outstanding = new Map<string, Outstanding>();
	readonly #installedCapabilities = new Map<string, string>();
	readonly #sweepTimer: ReturnType<typeof setInterval>;
	#disposing = false;

	constructor(options: ReverseLeaseOptions) {
		this.#now = options.now ?? Date.now;
		this.#leaseTtlMs = options.leaseTtlMs ?? REVERSE_LEASE_TTL_MS;
		this.#sendFrame = options.sendFrame;
		this.#installDefinitions = options.installDefinitions;
		this.#onDefinitionsRemoved = options.onDefinitionsRemoved;
		this.#onCancel = options.onCancel;
		this.#sweepTimer = setInterval(() => this.#expireStaleLeases(), Math.max(1, this.#leaseTtlMs / 3));
		this.#sweepTimer.unref?.();
	}

	registerProvider(
		connectionId: string,
		capability: string,
		definitions: unknown,
		expectedLeaseId?: string,
		idempotencyKey?: string,
		connectionGeneration = 0,
	): ProviderLease {
		if (this.#disposing) throw new Error("reverse runtime is disposing");
		if (idempotencyKey !== undefined && Buffer.byteLength(idempotencyKey, "utf8") > MAX_REVERSE_IDEMPOTENCY_KEY_BYTES)
			throw new ReverseLeaseError("payload_too_large");
		const key = `${connectionId}\u0000${idempotencyKey ?? ""}`;
		const fingerprint = registrationFingerprint(capability, definitions, expectedLeaseId);
		const replay = idempotencyKey ? this.#idempotency.get(key) : undefined;

		if (replay) {
			if (replay.fingerprint !== fingerprint) throw new ReverseLeaseError("idempotency_conflict");
			const current = this.#leases.get(capability);
			if (replay.lease === current && current?.active && current.expiresAt > this.#now()) return { ...replay.lease };
		}
		const now = this.#now();
		const existing = this.#leases.get(capability);
		if (existing && existing.expiresAt <= now) {
			this.#cancelForLease(existing.capability, existing.leaseId);
			this.#removeDefinitions(existing.capability, existing.leaseId);
			this.#evictIdempotencyForLease(existing.leaseId);
		}
		const reclaimReserved = existing?.graceUntil !== undefined && existing.graceUntil > now;
		if (reclaimReserved && existing!.leaseId !== expectedLeaseId) {
			throw new ReverseLeaseError("provider_lease_conflict");
		}
		const pendingHandoff = existing?.active === false && existing.expiresAt > now;
		if (pendingHandoff) {
			if (existing!.connectionId !== connectionId || existing!.leaseId !== expectedLeaseId)
				throw new ReverseLeaseError("provider_lease_conflict");
			const lease: ProviderLease = {
				leaseId: existing!.leaseId,
				connectionId,
				capability,
				definitions,
				expiresAt: now + this.#leaseTtlMs,
				active: true,
			};
			this.#installDefinitionsFor(capability, definitions, lease.leaseId, lease.connectionId, connectionGeneration);
			this.#leases.set(capability, lease);
			if (idempotencyKey) this.#rememberIdempotency(key, fingerprint, lease);

			return { ...lease };
		}
		const reclaiming =
			existing?.leaseId === expectedLeaseId && existing?.graceUntil !== undefined && now <= existing.graceUntil;
		const refreshing =
			existing?.active !== false &&
			existing?.connectionId === connectionId &&
			existing.expiresAt > now &&
			(expectedLeaseId === undefined || existing.leaseId === expectedLeaseId);

		if (existing && !reclaiming && !refreshing && existing.connectionId !== connectionId && existing.expiresAt > now)
			throw new ReverseLeaseError("provider_lease_conflict");
		const lease: ProviderLease = {
			leaseId: reclaiming || refreshing ? existing!.leaseId : randomUUID(),
			connectionId,
			capability,
			definitions,
			expiresAt: now + this.#leaseTtlMs,
			active: true,
		};
		this.#installDefinitionsFor(capability, definitions, lease.leaseId, lease.connectionId, connectionGeneration);
		this.#leases.set(capability, lease);
		if (idempotencyKey) this.#rememberIdempotency(key, fingerprint, lease);

		return { ...lease };
	}

	heartbeat(connectionId: string, leaseId: string): ProviderLease {
		const lease = this.#owner(connectionId, leaseId);
		if (lease.expiresAt <= this.#now()) {
			this.#cancelForLease(lease.capability, lease.leaseId);
			this.#removeDefinitions(lease.capability, lease.leaseId);
			this.#evictIdempotencyForLease(lease.leaseId);
			throw new ReverseLeaseError("lease_expired");
		}

		lease.expiresAt = this.#now() + this.#leaseTtlMs;
		lease.graceUntil = undefined;
		return { ...lease };
	}

	release(connectionId: string, leaseId: string, handoffTo?: string): ProviderLease {
		const lease = this.#owner(connectionId, leaseId);
		if (lease.expiresAt <= this.#now()) {
			this.#cancelForLease(lease.capability, lease.leaseId);
			this.#removeDefinitions(lease.capability, lease.leaseId);
			this.#evictIdempotencyForLease(lease.leaseId);
			throw new ReverseLeaseError("lease_expired");
		}
		this.#cancelForLease(lease.capability, lease.leaseId);
		this.#removeDefinitions(lease.capability, lease.leaseId);
		if (handoffTo) {
			lease.connectionId = handoffTo;
			lease.expiresAt = this.#now() + REVERSE_RECLAIM_GRACE_MS;
			lease.graceUntil = undefined;
			lease.active = false;
			return { ...lease };
		}
		this.#evictIdempotencyForLease(lease.leaseId);
		this.#leases.delete(lease.capability);
		return { ...lease };
	}

	disconnect(connectionId: string): void {
		const now = this.#now();
		for (const lease of this.#leases.values()) {
			if (lease.connectionId !== connectionId) continue;
			lease.expiresAt = now;
			lease.graceUntil = now + REVERSE_RECLAIM_GRACE_MS;
			this.#removeDefinitions(lease.capability, lease.leaseId);
			this.#evictIdempotencyForLease(lease.leaseId);
		}
		this.#cancelForConnection(connectionId, "provider_disconnected");
	}

	request(
		capability: string,
		method: string,
		payload: unknown,
		signal?: AbortSignal,
		expectedLeaseId?: string,
		cleanup = false,
		expectedConnectionId?: string,
	): Promise<unknown> {
		if (this.#disposing) throw new Error("reverse runtime is disposing");
		this.#assertPayload(payload);
		const lease = this.#liveLease(capability);
		if (!lease) {
			const reservation = this.#leases.get(capability);
			if (reservation?.active === false && reservation.expiresAt > this.#now())
				throw new ReverseLeaseError("lease_unavailable");
			throw new ReverseLeaseError("provider_required");
		}
		if (expectedLeaseId !== undefined && lease.leaseId !== expectedLeaseId) {
			throw new ReverseLeaseError("lease_unavailable");
		}
		if (expectedConnectionId !== undefined && lease.connectionId !== expectedConnectionId) {
			throw new ReverseLeaseError("lease_unavailable");
		}
		if (signal?.aborted)
			return Promise.reject(Object.assign(new Error("request_cancelled"), { name: "request_cancelled" }));
		const outstandingLimit = cleanup
			? MAX_REVERSE_OUTSTANDING + MAX_REVERSE_CLEANUP_OUTSTANDING
			: MAX_REVERSE_OUTSTANDING;
		if (this.#outstanding.size >= outstandingLimit) throw new ReverseLeaseError("too_many_outstanding");
		const id = randomUUID();
		return new Promise((resolve, reject) => {
			const outstanding: Outstanding = {
				connectionId: lease.connectionId,
				capability,
				method,
				leaseId: lease.leaseId,
				resolve,
				reject,
				...(signal ? { signal } : {}),
			};
			this.#outstanding.set(id, outstanding);
			if (signal) {
				outstanding.onAbort = () => {
					if (this.#takeOutstanding(id) !== outstanding) return;
					try {
						const cancellation = this.#sendFrame(lease.connectionId, {
							type: "reverse_cancel",
							id,
							connectionId: lease.connectionId,
							leaseId: lease.leaseId,
						});
						void Promise.resolve(cancellation).catch(() => {});
					} catch {
						// Cancellation is best effort; the caller is already settled locally.
					}
					reject(Object.assign(new Error("request_cancelled"), { name: "request_cancelled" }));
				};
				signal.addEventListener("abort", outstanding.onAbort, { once: true });
				if (signal.aborted) {
					outstanding.onAbort();
					return;
				}
			}
			let delivery: void | Promise<void>;
			try {
				delivery = this.#sendFrame(lease.connectionId, {
					type: "reverse_request",
					id,
					capability,
					connectionId: lease.connectionId,
					leaseId: lease.leaseId,
					payload: { method, payload },
				});
			} catch (error) {
				this.#takeOutstanding(id);
				reject(error instanceof Error ? error : new Error(String(error)));
				return;
			}
			Promise.resolve(delivery).catch(error => {
				if (this.#takeOutstanding(id) !== outstanding) return;
				reject(error instanceof Error ? error : new Error(String(error)));
			});
		});
	}

	respond(
		connectionId: string,
		id: string,
		leaseId: string,
		result: unknown,
		error?: { code: string; message: string },
		wireEnvelope?: unknown,
	): void {
		const request = this.#outstanding.get(id);
		if (!request) throw new ReverseLeaseError("unknown_request");
		if (request.connectionId !== connectionId || request.leaseId !== leaseId)
			throw new ReverseLeaseError("not_lease_owner");
		const lease = this.#leases.get(request.capability);
		if (
			!lease?.active ||
			lease.leaseId !== request.leaseId ||
			lease.connectionId !== request.connectionId ||
			lease.expiresAt <= this.#now()
		) {
			const failure = new ReverseLeaseError("lease_expired");
			this.#settleOutstandingWithFailure(id, request, failure, true);
			throw failure;
		}
		const envelope =
			wireEnvelope ??
			({
				type: "reverse_response",
				id,
				connectionId,
				leaseId,
				ok: error === undefined,
				...(error ? { error } : { result }),
			} satisfies Record<string, unknown>);
		try {
			this.#assertPayload(envelope, MAX_REVERSE_TERMINAL_OUTPUT_PAYLOAD_BYTES);
			const terminalOutputResponse =
				error === undefined &&
				request.capability === "terminal" &&
				request.method === "terminal.output" &&
				this.#isTerminalOutputEnvelope(envelope, id, connectionId, leaseId);
			const maxBytes = terminalOutputResponse
				? MAX_REVERSE_TERMINAL_OUTPUT_PAYLOAD_BYTES
				: MAX_REVERSE_PAYLOAD_BYTES;
			if (
				terminalOutputResponse &&
				result &&
				typeof result === "object" &&
				typeof (result as { output?: unknown }).output === "string" &&
				Buffer.byteLength((result as { output: string }).output, "utf-8") > MAX_REVERSE_TERMINAL_OUTPUT_BYTES
			)
				throw new ReverseLeaseError("payload_too_large");
			this.#assertPayload(envelope, maxBytes);
		} catch (failure) {
			const responseError = failure instanceof Error ? failure : new Error(String(failure));
			this.#settleOutstandingWithFailure(id, request, responseError);
			throw responseError;
		}
		if (this.#takeOutstanding(id) !== request) return;
		if (error) {
			const rejection = new Error(error.message);
			rejection.name = error.code;
			request.reject(rejection);
		} else request.resolve(result);
	}

	#isTerminalOutputEnvelope(value: unknown, id: string, connectionId: string, leaseId: string): boolean {
		if (!value || typeof value !== "object" || Array.isArray(value)) return false;
		const frame = value as Record<string, unknown>;
		if (!Object.keys(frame).every(key => ["type", "id", "connectionId", "leaseId", "ok", "result"].includes(key)))
			return false;
		if (
			frame.type !== "reverse_response" ||
			frame.id !== id ||
			frame.connectionId !== connectionId ||
			frame.leaseId !== leaseId ||
			frame.ok !== true
		)
			return false;
		const response = frame.result;
		if (!response || typeof response !== "object" || Array.isArray(response)) return false;
		const resultRecord = response as Record<string, unknown>;
		if (
			!Object.keys(resultRecord).every(key => ["output", "truncated", "exitStatus"].includes(key)) ||
			typeof resultRecord.output !== "string" ||
			typeof resultRecord.truncated !== "boolean"
		)
			return false;
		const exitStatus = resultRecord.exitStatus;
		if (exitStatus === undefined || exitStatus === null) return true;
		if (typeof exitStatus !== "object" || Array.isArray(exitStatus)) return false;
		const status = exitStatus as Record<string, unknown>;
		if (!Object.keys(status).every(key => ["exitCode", "signal"].includes(key))) return false;
		const exitCodeValid =
			status.exitCode === undefined ||
			status.exitCode === null ||
			(typeof status.exitCode === "number" && Number.isSafeInteger(status.exitCode));
		const signalValid =
			status.signal === undefined ||
			status.signal === null ||
			(typeof status.signal === "string" && Buffer.byteLength(status.signal, "utf-8") <= 128);
		return exitCodeValid && signalValid;
	}

	getLease(capability: string): ProviderLease | undefined {
		const lease = this.#liveLease(capability);
		return lease && { ...lease };
	}

	/** Installed definitions are observable only while their provider lease is live. */
	getInstalledDefinitions(capability: string): unknown | undefined {
		return this.#liveLease(capability)?.definitions;
	}

	dispose(): void {
		if (this.#disposing) return;
		this.#disposing = true;
		clearInterval(this.#sweepTimer);
		const outstanding = [...this.#outstanding.entries()];
		const installedCapabilities = [...this.#installedCapabilities.entries()];
		for (const [id] of outstanding) this.#takeOutstanding(id);
		this.#installedCapabilities.clear();
		this.#leases.clear();
		this.#idempotency.clear();
		this.#idempotencyOrder.length = 0;
		for (const [id, request] of outstanding) {
			this.#sendCancellation(id, request);
			request.reject(new Error("request_cancelled"));
			try {
				this.#onCancel?.(id, "lease_released");
			} catch {}
		}
		for (const [capability] of installedCapabilities) {
			try {
				this.#onDefinitionsRemoved?.(capability);
			} catch {}
		}
		this.#disposing = false;
	}

	#owner(connectionId: string, leaseId: string): ProviderLease {
		const lease = [...this.#leases.values()].find(candidate => candidate.leaseId === leaseId);
		if (!lease?.active || lease.connectionId !== connectionId) throw new ReverseLeaseError("not_lease_owner");
		return lease;
	}
	#liveLease(capability: string): ProviderLease | undefined {
		const lease = this.#leases.get(capability);
		if (!lease?.active || lease.expiresAt <= this.#now()) {
			if (lease?.expiresAt !== undefined && lease.expiresAt <= this.#now()) {
				this.#removeDefinitions(capability, lease.leaseId);
				this.#cancelForLease(lease.capability, lease.leaseId);
				this.#evictIdempotencyForLease(lease.leaseId);
			}
			return undefined;
		}

		return lease;
	}
	#expireStaleLeases(): void {
		for (const lease of this.#leases.values()) {
			if (lease.expiresAt > this.#now()) continue;
			this.#removeDefinitions(lease.capability, lease.leaseId);
			this.#cancelForLease(lease.capability, lease.leaseId);
			this.#evictIdempotencyForLease(lease.leaseId);
		}
	}
	#sendCancellation(id: string, request: Outstanding): void {
		queueMicrotask(() => {
			try {
				const cancellation = this.#sendFrame(request.connectionId, {
					type: "reverse_cancel",
					id,
					connectionId: request.connectionId,
					leaseId: request.leaseId,
				});
				void Promise.resolve(cancellation).catch(() => {});
			} catch {
				// Cancellation is best effort; local retirement remains authoritative.
			}
		});
	}
	#cancelForLease(capability: string, leaseId: string): void {
		for (const [id, request] of this.#outstanding) {
			if (request.capability !== capability || request.leaseId !== leaseId) continue;
			if (this.#takeOutstanding(id) !== request) continue;
			this.#sendCancellation(id, request);
			request.reject(new Error("request_cancelled"));
		}
	}
	#cancelForConnection(connectionId: string, reason: "provider_disconnected" | "lease_released"): void {
		for (const [id, request] of this.#outstanding) {
			if (request.connectionId !== connectionId) continue;
			if (this.#takeOutstanding(id) !== request) continue;
			this.#sendCancellation(id, request);
			request.reject(new Error("request_cancelled"));
			this.#onCancel?.(id, reason);
		}
	}
	#takeOutstanding(id: string): Outstanding | undefined {
		const request = this.#outstanding.get(id);
		if (!request) return undefined;
		this.#outstanding.delete(id);
		if (request.signal && request.onAbort) request.signal.removeEventListener("abort", request.onAbort);
		return request;
	}
	#settleOutstandingWithFailure(id: string, request: Outstanding, failure: Error, sendCancellation = false): void {
		if (this.#takeOutstanding(id) !== request) return;
		if (sendCancellation) this.#sendCancellation(id, request);
		request.reject(failure);
	}
	#installDefinitionsFor(
		capability: string,
		definitions: unknown,
		leaseId: string,
		connectionId: string,
		connectionGeneration: number,
	): void {
		this.#installDefinitions?.(capability, definitions, leaseId, connectionId, connectionGeneration);
		this.#installedCapabilities.set(capability, leaseId);
	}
	#removeDefinitions(capability: string, leaseId?: string): void {
		const installedLeaseId = this.#installedCapabilities.get(capability);
		if (installedLeaseId === undefined) return;
		if (leaseId !== undefined && installedLeaseId !== leaseId) return;
		this.#installedCapabilities.delete(capability);
		this.#onDefinitionsRemoved?.(capability);
	}

	#rememberIdempotency(key: string, fingerprint: string, lease: ProviderLease): void {
		this.#idempotency.set(key, { fingerprint, lease });
		this.#idempotencyOrder.push(key);
		while (this.#idempotencyOrder.length > MAX_REVERSE_IDEMPOTENCY_ENTRIES) {
			const evicted = this.#idempotencyOrder.shift();
			if (evicted !== undefined) this.#idempotency.delete(evicted);
		}
	}
	#evictIdempotencyForLease(leaseId: string): void {
		for (const key of this.#idempotencyOrder) {
			if (this.#idempotency.get(key)?.lease.leaseId === leaseId) this.#idempotency.delete(key);
		}
		while (this.#idempotencyOrder.length > 0 && !this.#idempotency.has(this.#idempotencyOrder[0]!))
			this.#idempotencyOrder.shift();
	}
	#assertPayload(payload: unknown, maxBytes = MAX_REVERSE_PAYLOAD_BYTES): void {
		const encoded = JSON.stringify(payload);
		if (encoded !== undefined && Buffer.byteLength(encoded) > maxBytes)
			throw new ReverseLeaseError("payload_too_large");
	}
}
