/**
 * SessionLease — the construct that makes live control honest without a global daemon.
 *
 * Exactly one live `RuntimeOwner` holds the lease for a session; only the lease holder
 * may append events or run the default router. A stale lease (owner dead OR expired) may
 * be taken over, incrementing `leaseEpoch`, but a stale lease is NEVER permission for
 * destructive recovery (that gate lives in the classifier/recovery layer).
 */
import { createHash, randomBytes } from "node:crypto";
import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { isFileLockAcquireTimeout, withFileLock } from "../config/file-lock";

import { controlSocketPath, sessionPaths } from "./storage";

export interface SessionLease {
	ownerId: string;
	sessionId: string;
	pid: number;
	leaseTokenHash: string;
	endpoint: { kind: "unix-socket" | "fifo"; path: string } | null;
	eventsPath: string;
	heartbeatAt: string;
	expiresAt: string;
	leaseEpoch: number;
	writer: { ownerId: string; leaseEpoch: number };
}

export class LeaseError extends Error {
	constructor(
		message: string,
		readonly code: string,
	) {
		super(message);
		this.name = "LeaseError";
	}
}
export type LeaseStatus = "missing" | "live" | "expiredAlive" | "dead" | "epermAlive";

type PidStatus = "alive" | "dead" | "eperm";

function nowMs(clock?: () => number): number {
	return clock ? clock() : Date.now();
}

function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

async function writeLeaseAtomic(file: string, lease: SessionLease): Promise<void> {
	await fs.mkdir(path.dirname(file), { recursive: true });
	const tmp = `${file}.tmp-${randomBytes(4).toString("hex")}`;
	await fs.writeFile(tmp, `${JSON.stringify(lease, null, 2)}\n`, "utf8");
	await fs.rename(tmp, file);
}
function leaseMutationLockPath(root: string, sessionId: string): string {
	return sessionPaths(root, sessionId).lease;
}

function isOwnedUnixEndpointPath(root: string, sessionId: string, endpointPath: string, fallbackPath: string): boolean {
	const resolvedEndpoint = path.resolve(endpointPath);
	if (resolvedEndpoint === path.resolve(fallbackPath)) return true;
	try {
		return resolvedEndpoint === path.resolve(controlSocketPath(root, sessionId));
	} catch {
		return false;
	}
}

/** Lexical identity of two socket paths. Blank, padded, and NUL paths do not match. */
export function classifyOwnerSocketLexical(candidate: string, canonical: string): "match" | "mismatch" {
	const left = lexicalOwnerSocketKey(candidate);
	const right = lexicalOwnerSocketKey(canonical);
	if (left === null || right === null) return "mismatch";
	return left === right ? "match" : "mismatch";
}

function lexicalOwnerSocketKey(socketPath: string): string | null {
	if (socketPath.length === 0 || socketPath.trim() !== socketPath || socketPath.includes("\0")) return null;
	const resolved = path.resolve(socketPath);
	if (!path.isAbsolute(resolved)) return null;
	return resolved;
}

function socketBaseNamesMatch(left: string, right: string): boolean {
	const leftName = path.basename(left);
	const rightName = path.basename(right);
	if (leftName === rightName) return true;
	if (process.platform !== "darwin" && process.platform !== "win32") return false;
	return leftName.toLowerCase() === rightName.toLowerCase();
}

function ownerSocketPathsMatch(candidate: string, canonical: string): boolean {
	if (classifyOwnerSocketLexical(candidate, canonical) === "match") return true;
	const left = lexicalOwnerSocketKey(candidate);
	const right = lexicalOwnerSocketKey(canonical);
	if (left === null || right === null || !socketBaseNamesMatch(left, right)) return false;
	try {
		return fsSync.realpathSync(path.dirname(left)) === fsSync.realpathSync(path.dirname(right));
	} catch {
		return false;
	}
}

/**
 * Path the CLI may dial for this lease endpoint.
 * Returns the private socket, never the lease string, and only when that inode is a real socket.
 */
export function canonicalLeaseSocket(root: string, sessionId: string, endpointPath: string): string | null {
	let canonical: string;
	try {
		canonical = controlSocketPath(root, sessionId);
	} catch {
		return null;
	}
	if (!ownerSocketPathsMatch(endpointPath, canonical)) return null;
	try {
		const stat = fsSync.lstatSync(canonical);
		// A symlink or a non-socket at the private path is not dialed.
		if (stat.isSymbolicLink() || !stat.isSocket()) return null;
	} catch (error) {
		// The owner can publish the path before listen. Absence is not a foreign path.
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return canonical;
		return null;
	}
	return canonical;
}

/** A workspace lease must not hold the session by naming some other unix socket. */
function leaseHasForeignUnixEndpoint(root: string, sessionId: string, lease: SessionLease): boolean {
	const endpoint = lease.endpoint;
	if (endpoint?.kind !== "unix-socket") return false;
	let canonical: string;
	try {
		canonical = controlSocketPath(root, sessionId);
	} catch {
		return true;
	}
	return !ownerSocketPathsMatch(endpoint.path, canonical);
}
async function withLeaseMutationLock<T>(root: string, sessionId: string, fn: () => Promise<T>): Promise<T> {
	const lockPath = leaseMutationLockPath(root, sessionId);
	await fs.mkdir(path.dirname(lockPath), { recursive: true });
	try {
		return await withFileLock(lockPath, fn, {
			staleMs: 30_000,
			retries: 100,
			retryDelayMs: 20,
		});
	} catch (error) {
		if (isFileLockAcquireTimeout(error)) {
			throw new LeaseError(`lease_lock_timeout:${sessionId}`, "lease_lock_timeout");
		}
		throw error;
	}
}

export async function readLease(root: string, sessionId: string): Promise<SessionLease | null> {
	try {
		const raw = await fs.readFile(sessionPaths(root, sessionId).lease, "utf8");
		return JSON.parse(raw) as SessionLease;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
		throw error;
	}
}

export function isExpired(lease: SessionLease, clock?: () => number): boolean {
	return Date.parse(lease.expiresAt) <= nowMs(clock);
}

function defaultPidStatusProbe(pid: number): PidStatus {
	try {
		process.kill(pid, 0);
		return "alive";
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code === "ESRCH") return "dead";
		if (code === "EPERM") return "eperm";
		return "dead";
	}
}

export function classifyLeaseStatus(
	lease: SessionLease | null,
	opts?: { clock?: () => number; probe?: (pid: number) => PidStatus },
): LeaseStatus {
	if (!lease) return "missing";
	const status = (opts?.probe ?? defaultPidStatusProbe)(lease.pid);
	if (status === "dead") return "dead";
	if (status === "eperm") return "epermAlive";
	return isExpired(lease, opts?.clock) ? "expiredAlive" : "live";
}

function classifyProbeFromBoolean(
	probe?: (pid: number) => boolean | PidStatus,
): ((pid: number) => PidStatus) | undefined {
	if (!probe) return undefined;
	return pid => {
		const status = probe(pid);
		return typeof status === "boolean" ? (status ? "alive" : "dead") : status;
	};
}

/** Liveness probe via signal 0. Defaults to the real process table; injectable for tests. */
export function isOwnerAlive(pid: number, probe?: (pid: number) => boolean): boolean {
	if (probe) return probe(pid);
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		// ESRCH = no such process; EPERM = exists but not ours (treat as alive).
		return (error as NodeJS.ErrnoException).code === "EPERM";
	}
}

export function isStale(
	lease: SessionLease,
	opts?: { clock?: () => number; probe?: (pid: number) => boolean },
): boolean {
	return isExpired(lease, opts?.clock) || !isOwnerAlive(lease.pid, opts?.probe);
}

export interface AcquireOptions {
	ownerId: string;
	pid: number;
	endpoint?: SessionLease["endpoint"];
	eventsPath: string;
	ttlMs: number;
	clock?: () => number;
	probe?: (pid: number) => boolean | PidStatus;
}

export interface AcquiredLease {
	lease: SessionLease;
	token: string;
}

/**
 * Acquire (or take over a stale) lease. Fails closed with `lease_held` when a live,
 * unexpired lease is held by a different owner. Re-acquiring as the current owner refreshes.
 */
export async function acquireLease(root: string, sessionId: string, opts: AcquireOptions): Promise<AcquiredLease> {
	return await withLeaseMutationLock(root, sessionId, async () => {
		const existing = await readLease(root, sessionId);
		if (existing && existing.ownerId !== opts.ownerId) {
			const classifiedOwnerId = existing.ownerId;
			const classifiedEpoch = existing.leaseEpoch;
			const status = classifyLeaseStatus(existing, {
				clock: opts.clock,
				probe: classifyProbeFromBoolean(opts.probe),
			});
			const foreignSocket = leaseHasForeignUnixEndpoint(root, sessionId, existing);
			if (status !== "dead" && !foreignSocket) {
				throw new LeaseError(`lease_held:${sessionId}`, "lease_held");
			}
			const reread = await readLease(root, sessionId);
			if (!reread || reread.ownerId !== classifiedOwnerId || reread.leaseEpoch !== classifiedEpoch) {
				throw new LeaseError(`lease_held:${sessionId}`, "lease_held");
			}
			if (foreignSocket && !leaseHasForeignUnixEndpoint(root, sessionId, reread)) {
				throw new LeaseError(`lease_held:${sessionId}`, "lease_held");
			}
		}
		const priorEpoch = existing?.leaseEpoch ?? 0;
		const epoch = existing && existing.ownerId === opts.ownerId ? priorEpoch : priorEpoch + 1;
		const token = randomBytes(16).toString("hex");
		const now = nowMs(opts.clock);
		const lease: SessionLease = {
			ownerId: opts.ownerId,
			sessionId,
			pid: opts.pid,
			leaseTokenHash: hashToken(token),
			endpoint: opts.endpoint ?? null,
			eventsPath: opts.eventsPath,
			heartbeatAt: new Date(now).toISOString(),
			expiresAt: new Date(now + opts.ttlMs).toISOString(),
			leaseEpoch: epoch,
			writer: { ownerId: opts.ownerId, leaseEpoch: epoch },
		};
		await writeLeaseAtomic(sessionPaths(root, sessionId).lease, lease);
		return { lease, token };
	});
}

/** Refresh the lease expiry. Only the recorded owner may heartbeat (single-writer). */
export async function heartbeat(
	root: string,
	sessionId: string,
	ownerId: string,
	ttlMs: number,
	clock?: () => number,
): Promise<SessionLease> {
	return await withLeaseMutationLock(root, sessionId, async () => {
		const lease = await readLease(root, sessionId);
		if (!lease) throw new LeaseError(`no_lease:${sessionId}`, "no_lease");
		if (lease.ownerId !== ownerId) throw new LeaseError(`not_lease_holder:${sessionId}`, "not_lease_holder");
		const now = nowMs(clock);
		const next: SessionLease = {
			...lease,
			heartbeatAt: new Date(now).toISOString(),
			expiresAt: new Date(now + ttlMs).toISOString(),
		};
		await writeLeaseAtomic(sessionPaths(root, sessionId).lease, next);
		return next;
	});
}

/** Whether `ownerId` is the live, unexpired single writer permitted to append events. */
export function canWriteEvents(lease: SessionLease, ownerId: string, clock?: () => number): boolean {
	return lease.ownerId === ownerId && !isExpired(lease, clock);
}

/** Release the lease (owner shutdown). Only the holder may release. */
export async function releaseLease(root: string, sessionId: string, ownerId: string): Promise<void> {
	await withLeaseMutationLock(root, sessionId, async () => {
		const lease = await readLease(root, sessionId);
		if (!lease) return;
		if (lease.ownerId !== ownerId) throw new LeaseError(`not_lease_holder:${sessionId}`, "not_lease_holder");
		await fs.rm(sessionPaths(root, sessionId).lease, { force: true });
	});
}

export async function reapDeadOwnerArtifacts(
	root: string,
	sessionId: string,
	expectedOwnerId: string,
	expectedEpoch: number,
	opts?: { clock?: () => number; probe?: (pid: number) => PidStatus },
): Promise<boolean> {
	return await withLeaseMutationLock(root, sessionId, async () => {
		const lease = await readLease(root, sessionId);
		if (!lease || lease.ownerId !== expectedOwnerId || lease.leaseEpoch !== expectedEpoch) return false;
		if (classifyLeaseStatus(lease, opts) !== "dead") return false;
		const paths = sessionPaths(root, sessionId);
		const endpointPath =
			lease.endpoint?.kind === "unix-socket" &&
			isOwnedUnixEndpointPath(root, sessionId, lease.endpoint.path, paths.controlSock)
				? lease.endpoint.path
				: null;
		await fs.rm(paths.controlSock, { force: true });
		if (endpointPath) await fs.rm(endpointPath, { force: true });
		await fs.rm(paths.lease, { force: true });
		return true;
	});
}
