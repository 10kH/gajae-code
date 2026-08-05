import { createHash, randomUUID } from "node:crypto";
import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { NativeExactFileIdentity, NativeExactUnlinkResult, NativeNoReplaceResult } from "@gajae-code/natives";
import { isCompiledBinary } from "@gajae-code/utils/env";
import { YAML } from "bun";
import type { AtomicYamlNativeWorkerRequest, AtomicYamlNativeWorkerResponse } from "./atomic-yaml-patch-worker";
import { withFileLock } from "./file-lock";

export interface AtomicYamlExpectedPrecondition {
	path: string;
	hash: string;
}

export interface AtomicYamlSetPatch {
	path: string;
	op: "set";
	value: unknown;
	expected?: AtomicYamlExpectedPrecondition;
}

export interface AtomicYamlUnsetPatch {
	path: string;
	op: "unset";
	expected?: AtomicYamlExpectedPrecondition;
}

export type AtomicYamlPatch = AtomicYamlSetPatch | AtomicYamlUnsetPatch;

/** Raised when a compare-and-swap precondition no longer matches durable YAML. */
export class AtomicYamlConflictError extends Error {
	readonly code = "ATOMIC_YAML_CONFLICT";

	constructor(
		readonly path: string,
		readonly expectedHash: string,
		readonly actualHash: string,
	) {
		super(`Atomic YAML precondition failed for ${path}.`);
		this.name = "AtomicYamlConflictError";
	}
}

export interface AtomicYamlPatchRevision {
	path: string;
	beforeHash: string;
	afterHash: string;
	beforeRevision: number;
	afterRevision: number;
}

export type CasRestoreResult =
	| { status: "restored"; receipt: CasReceipt }
	| { status: "conflict"; paths: readonly string[] }
	| { status: "discarded" }
	| { status: "not-restorable" };

/**
 * A receipt intentionally exposes only path-level hashes and opaque revisions.
 * The before values needed by restore stay in this module's closure.
 */
export interface CasReceipt {
	readonly revisions: readonly AtomicYamlPatchRevision[];
	restore(): Promise<CasRestoreResult>;
	discard(): void;
}

export interface AtomicYamlUpdate<T> {
	apply(current: Record<string, unknown>): T | Promise<T>;
	shouldWrite?(result: T): boolean;
	committed?(current: Record<string, unknown>, result: T): void | Promise<void>;
}

export interface AtomicYamlPatchOptions {
	/** Test seam for deterministic pre-rename and Windows sharing-violation failures. */
	rename?: (from: string, to: string) => Promise<void>;
	/** Test seam for an identity-checked atomic replacement. */
	exactReplace?: (
		sourcePath: string,
		destinationPath: string,
		expectedSource: NativeExactFileIdentity,
		expectedDestination: NativeExactFileIdentity,
	) => NativeExactUnlinkResult | Promise<NativeExactUnlinkResult>;
	/** Test seam for an atomic no-replace publication. */
	noReplace?: (sourcePath: string, destinationPath: string) => NativeNoReplaceResult | Promise<NativeNoReplaceResult>;
	/** Test seam for bounded retry timing. */
	sleep?: (ms: number) => Promise<void>;
	/** Test seam for Windows rename retry behavior. */
	platform?: NodeJS.Platform;
	/** Called under the config lock before patches are applied. */
	validateRoot?: (root: unknown, patches: readonly AtomicYamlPatch[]) => void | Promise<void>;
	/** Called under the config lock after a successful CAS restore. */
	onRestored?: (patches: readonly AtomicYamlPatch[]) => void | Promise<void>;
}

/** A replacement failure never unlinks the destination as a fallback. */
export class AtomicYamlReplaceError extends Error {
	readonly code = "ATOMIC_YAML_REPLACE_FAILED";

	constructor(
		readonly configPath: string,
		readonly attempts: number,
		readonly cause: unknown,
		readonly preserveTempPath = false,
	) {
		super(`Failed to atomically replace ${configPath} after ${attempts} rename attempts.`);
		this.name = "AtomicYamlReplaceError";
	}
}

/**
 * Raised when the LEXICAL config path no longer resolves to the canonical
 * target an operation is about to write: e.g. a `config.yml` symlink was
 * repointed while the operation waited in the per-file queue or ran. The
 * native identity check protects only the previously resolved destination, so
 * without this guard the write would modify an unrelated prior target and
 * report success while the now-active configuration is left unchanged.
 */
export class AtomicYamlRetargetError extends Error {
	readonly code = "ATOMIC_YAML_RETARGETED";

	constructor(
		readonly lexicalPath: string,
		readonly expectedCanonicalPath: string,
		readonly actualCanonicalPath: string,
	) {
		super(
			`Atomic YAML target retargeted: ${lexicalPath} resolves to ${actualCanonicalPath}, expected ${expectedCanonicalPath}.`,
		);
		this.name = "AtomicYamlRetargetError";
	}
}

type PathState = { exists: boolean; value: unknown };
type ReceiptChange = {
	path: string;
	before: PathState;
	after: PathState;
	publicRevision: AtomicYamlPatchRevision;
};

const queues = new Map<string, Promise<void>>();
let nextReceiptRevision = 0;
/** Bounded Windows sharing-violation retries: 10, 25, 50, 100, then 200 ms. */
const WINDOWS_RENAME_BACKOFF_MS = [10, 25, 50, 100, 200] as const;
const WINDOWS_SHARING_VIOLATION_CODES = new Set(["EPERM", "EACCES", "EBUSY"]);

function canonicalConfigPath(configPath: string): string {
	const resolved = path.normalize(path.resolve(configPath));
	try {
		// Follow a symlinked config (e.g. `.gjc/config.yml` -> `../shared/config.yml`)
		// so read, identity capture, and the native exact exchange all operate on the
		// real target consistently: the native replacement opens the destination with
		// no-follow semantics and would reject the symlink entry itself. An absent or
		// dangling path falls back to the normalized path (first-time creation still
		// publishes through the no-replace path).
		return fsSync.realpathSync(resolved);
	} catch {
		return resolveDanglingSymlink(resolved);
	}
}

/**
 * Reject a symlink retarget right before publication: the lexical config path
 * (e.g. `.gjc/config.yml`) must still resolve to the canonical target this
 * operation read, or the write would modify an unrelated prior target and
 * report success while the now-active configuration is unchanged. The native
 * identity check protects only the previously resolved destination, so this
 * lexical re-resolution is the retarget guard.
 */
function assertLexicalTargetUnchanged(lexicalPath: string, canonicalPath: string): void {
	const current = canonicalConfigPath(lexicalPath);
	if (current !== canonicalPath) {
		throw new AtomicYamlRetargetError(lexicalPath, canonicalPath, current);
	}
}

/**
 * realpathSync fails when the final path component is a DANGLING symlink (its
 * target has not been created yet). Treating the symlink pathname itself as the
 * config path would read it as absent while the native no-replace publication
 * rejects the EXISTING symlink directory entry as `destination_exists`, so the
 * first publication must target the link's lexical target instead. Resolves a
 * chain of dangling links without requiring the target to exist; non-symlink
 * and genuinely absent paths are returned unchanged.
 */
function resolveDanglingSymlink(configPath: string): string {
	let current = configPath;
	for (let depth = 0; depth < 40; depth++) {
		let stat: fsSync.Stats;
		try {
			stat = fsSync.lstatSync(current);
		} catch {
			return current; // absent (first-time creation) or unreadable entry
		}
		if (!stat.isSymbolicLink()) return current;
		let target: string;
		try {
			target = fsSync.readlinkSync(current);
		} catch {
			return current;
		}
		current = path.isAbsolute(target) ? path.normalize(target) : path.resolve(path.dirname(current), target);
	}
	return current;
}

function assertPatch(patch: AtomicYamlPatch): void {
	if (
		!patch ||
		typeof patch.path !== "string" ||
		patch.path.length === 0 ||
		patch.path.split(".").some(part => !part)
	) {
		throw new Error("Atomic YAML patches require a non-empty dotted path.");
	}
	if (
		patch.expected &&
		(typeof patch.expected.path !== "string" ||
			patch.expected.path.length === 0 ||
			patch.expected.path.split(".").some(part => !part) ||
			typeof patch.expected.hash !== "string" ||
			patch.expected.hash.length === 0)
	) {
		throw new Error("Atomic YAML patch preconditions require a non-empty dotted path and hash.");
	}
	if (patch.op === "set") {
		if (patch.value === undefined) {
			throw new TypeError(`Atomic YAML set patch for ${patch.path} cannot carry undefined; use unset instead.`);
		}
		return;
	}
	if (patch.op !== "unset") {
		throw new Error(`Unknown atomic YAML patch operation: ${(patch as { op?: unknown }).op}`);
	}
}

function record(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function stateAtPath(value: Record<string, unknown>, segments: readonly string[]): PathState {
	let current: Record<string, unknown> = value;
	for (let index = 0; index < segments.length - 1; index++) {
		const next = record(current[segments[index]!]);
		if (!next) return { exists: false, value: undefined };
		current = next;
	}
	const key = segments[segments.length - 1]!;
	return Object.hasOwn(current, key) ? { exists: true, value: current[key] } : { exists: false, value: undefined };
}

/** Set a dotted YAML path, creating object intermediates as needed. */
export function setByPath(value: Record<string, unknown>, segments: readonly string[], nextValue: unknown): void {
	let current = value;
	for (let index = 0; index < segments.length - 1; index++) {
		const segment = segments[index]!;
		const next = record(current[segment]);
		if (!next) current[segment] = {};
		current = current[segment] as Record<string, unknown>;
	}
	current[segments[segments.length - 1]!] = nextValue;
}

/** Delete a dotted YAML path without disturbing sibling keys or parent objects. */
export function deleteByPath(value: Record<string, unknown>, segments: readonly string[]): void {
	let current = value;
	for (let index = 0; index < segments.length - 1; index++) {
		const next = record(current[segments[index]!]);
		if (!next) return;
		current = next;
	}
	delete current[segments[segments.length - 1]!];
}

function stableValue(value: unknown): string {
	if (typeof value === "number") {
		if (Number.isNaN(value)) return "NaN";
		if (value === Infinity) return "Infinity";
		if (value === -Infinity) return "-Infinity";
		if (Object.is(value, -0)) return "-0";
	}
	if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "undefined";
	if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
	const object = value as Record<string, unknown>;
	return `{${Object.keys(object)
		.sort()
		.map(key => `${JSON.stringify(key)}:${stableValue(object[key])}`)
		.join(",")}}`;
}

function stateHash(state: PathState): string {
	return createHash("sha256")
		.update(state.exists ? `present:${stableValue(state.value)}` : "absent")
		.digest("hex");
}

function cloneState(state: PathState): PathState {
	return state.exists ? { exists: true, value: structuredClone(state.value) } : state;
}

/** Hash a dotted YAML path state for an expected-hash patch precondition. */
export function atomicYamlPathHash(value: Record<string, unknown>, path: string): string {
	return stateHash(stateAtPath(value, path.split(".")));
}

type YamlFileState = {
	exists: boolean;
	raw: string;
};

type YamlReadResult = YamlFileState & {
	current: Record<string, unknown>;
	root: unknown;
};

async function readYamlFileState(configPath: string): Promise<YamlFileState> {
	try {
		return { exists: true, raw: await Bun.file(configPath).text() };
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return { exists: false, raw: "" };
		throw error;
	}
}

async function readYaml(configPath: string): Promise<YamlReadResult> {
	const file = await readYamlFileState(configPath);
	const root = file.exists ? YAML.parse(file.raw) : undefined;
	return { ...file, current: record(root) ?? {}, root };
}

async function syncParentDirectory(directory: string): Promise<void> {
	try {
		const directoryHandle = await fs.open(directory, "r");
		try {
			await directoryHandle.sync();
		} finally {
			await directoryHandle.close();
		}
	} catch {
		// Directory fsync is not supported by every platform/filesystem. The renamed
		// destination remains valid even where the durability barrier is unavailable.
	}
}

async function captureExactFileIdentity(file: string): Promise<NativeExactFileIdentity | null> {
	try {
		const [bytes, stat, parent] = await Promise.all([
			Bun.file(file).arrayBuffer(),
			fs.stat(file, { bigint: true }),
			fs.stat(path.dirname(file), { bigint: true }),
		]);
		return {
			dev: stat.dev,
			ino: stat.ino,
			nlink: stat.nlink,
			parentDev: parent.dev,
			parentIno: parent.ino,
			size: stat.size,
			mtimeNs: stat.mtimeNs,
			sha256: createHash("sha256").update(Buffer.from(bytes)).digest("hex"),
		};
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
		throw error;
	}
}

async function currentYamlFileState(configPath: string): Promise<YamlFileState> {
	return await readYamlFileState(configPath);
}

async function runNativeAtomicYamlWorker(
	request: AtomicYamlNativeWorkerRequest,
): Promise<NativeExactUnlinkResult | NativeNoReplaceResult> {
	const worker = isCompiledBinary()
		? new Worker("./packages/coding-agent/src/config/atomic-yaml-patch-worker.ts", { type: "module" })
		: new Worker(new URL("./atomic-yaml-patch-worker.ts", import.meta.url).href, { type: "module" });
	const { promise, resolve, reject } = Promise.withResolvers<NativeExactUnlinkResult | NativeNoReplaceResult>();
	let settled = false;
	let cleanedUp = false;
	const cleanup = (): void => {
		if (cleanedUp) return;
		cleanedUp = true;
		worker.removeEventListener("message", onMessage);
		worker.removeEventListener("error", onError);
		worker.removeEventListener("messageerror", onMessageError);
		worker.removeEventListener("close", onClose);
		worker.removeEventListener("exit", onExit);
	};
	const succeed = (result: NativeExactUnlinkResult | NativeNoReplaceResult): void => {
		if (settled) return;
		settled = true;
		cleanup();
		resolve(result);
	};
	const fail = (error: Error): void => {
		if (settled) return;
		settled = true;
		cleanup();
		reject(error);
	};
	const onMessage: EventListener = event => {
		const response = (event as MessageEvent<AtomicYamlNativeWorkerResponse>).data;
		if (response?.type === "result") {
			succeed(response.result);
			return;
		}
		if (response?.type === "error") {
			const failure = new Error(response.message);
			if (response.name) failure.name = response.name;
			if (response.stack) failure.stack = response.stack;
			fail(failure);
			return;
		}
		fail(new Error("Atomic YAML native worker returned an invalid response."));
	};
	const onError: EventListener = () => fail(new Error("Atomic YAML native worker failed."));
	const onMessageError: EventListener = () => fail(new Error("Atomic YAML native worker message failed."));
	// Bun emits `close`; Node-compatible worker hosts may emit `exit` instead.
	const onClose: EventListener = () => fail(new Error("Atomic YAML native worker closed before responding."));
	const onExit: EventListener = () => fail(new Error("Atomic YAML native worker exited before responding."));
	try {
		worker.addEventListener("message", onMessage);
		worker.addEventListener("error", onError);
		worker.addEventListener("messageerror", onMessageError);
		worker.addEventListener("close", onClose);
		worker.addEventListener("exit", onExit);
		worker.postMessage(request);
		return await promise;
	} catch (error) {
		// The native op was already dispatched; a termination without a response
		// leaves the exchange outcome unknown (it may have committed), so the
		// staged path must be retained for recovery instead of unlinked.
		throw new AtomicYamlReplaceError(request.destinationPath, 1, error, true);
	} finally {
		cleanup();
		worker.terminate();
	}
}

async function replaceWithExpectedIdentity(
	tempPath: string,
	configPath: string,
	expectedState: YamlFileState,
	options: AtomicYamlPatchOptions,
): Promise<void> {
	const { exists: expectedExists, raw: expectedRaw } = expectedState;
	const expectedHash = createHash("sha256").update(expectedRaw).digest("hex");
	const [source, destination] = await Promise.all([
		captureExactFileIdentity(tempPath),
		captureExactFileIdentity(configPath),
	]);
	if (!source)
		throw new AtomicYamlReplaceError(configPath, 1, new Error("staged YAML disappeared before replacement"));
	if (!destination) {
		if (expectedExists)
			throw new AtomicYamlConflictError(configPath, expectedHash, createHash("sha256").update("").digest("hex"));
		const publishOnce = async (): Promise<NativeNoReplaceResult> =>
			options.noReplace
				? await options.noReplace(tempPath, configPath)
				: ((await runNativeAtomicYamlWorker({
						operation: "no-replace",
						sourcePath: tempPath,
						destinationPath: configPath,
					})) as NativeNoReplaceResult);
		const publishOnceWithLink = async (): Promise<NativeNoReplaceResult> =>
			options.noReplace
				? await options.noReplace(tempPath, configPath)
				: ((await runNativeAtomicYamlWorker({
						operation: "no-replace-link",
						sourcePath: tempPath,
						destinationPath: configPath,
					})) as NativeNoReplaceResult);
		let published = await publishOnce();
		if (
			!published.ok &&
			(published.reason === "invalid_request" || published.reason === "atomic_unavailable") &&
			published.mutationState === "not_committed" &&
			published.durabilityState === "not_attempted"
		) {
			// RENAME_NOREPLACE is unsupported (NFS, kernels before 3.15): the native
			// linkat fallback keeps the no-overwrite guarantee (EEXIST on an
			// occupied destination) and is safe because the rename reported a
			// pre-mutation refusal. The staged name survives a link, so the caller
			// still unlinks it after publication.
			published = await publishOnceWithLink();
		}
		if (published.ok) return;
		if (published.reason === "destination_exists") {
			const actual = await currentYamlFileState(configPath);
			throw new AtomicYamlConflictError(
				configPath,
				expectedHash,
				createHash("sha256").update(actual.raw).digest("hex"),
			);
		}
		throw new AtomicYamlReplaceError(
			configPath,
			1,
			new Error(`native no-replace publish failed: ${published.code ?? "unknown"}`),
			published.mutationState === "unknown",
		);
	}
	if (!expectedExists || destination.sha256 !== expectedHash) {
		throw new AtomicYamlConflictError(configPath, expectedHash, destination.sha256 ?? expectedHash);
	}
	// `exactReplacePath` validates both identities inside one native atomic
	// namespace exchange. A save after the snapshots therefore rejects the
	// exchange without replacing the editor's newer destination.
	const replaced: NativeExactUnlinkResult = options.exactReplace
		? await options.exactReplace(tempPath, configPath, source, destination)
		: ((await runNativeAtomicYamlWorker({
				operation: "exact-replace",
				sourcePath: tempPath,
				destinationPath: configPath,
				expectedSource: source,
				expectedDestination: destination,
			})) as NativeExactUnlinkResult);
	if (replaced.ok) return;
	// RENAME_EXCHANGE is unsupported (NFS, kernels before 3.15): the native
	// exact-replace reports atomic_unavailable. Fall back to an identity-checked
	// swap that never overwrites an editor's newer file: atomically detach the
	// destination to a unique tombstone, verify the MOVED file matches the
	// captured destination identity (restoring it on mismatch), then publish the
	// staged document with a no-replace hard link (EEXIST when an editor created
	// a file while the path was briefly absent). Each step is a single atomic
	// syscall, so no window exists in which a newer editor file is clobbered.
	if (replaced.code === "atomic_unavailable") {
		await replaceWithDetachedIdentitySwap(tempPath, configPath, destination, expectedHash);
		return;
	}
	// A retained successor proves the namespace exchange published the staged
	// document. It may still report a post-exchange verification or durability
	// failure, so this is not a CAS rejection and the detached temp-path object
	// must be retained for native recovery rather than unlinked by the caller.
	if (
		replaced.detachedPath ||
		replaced.retainedSuccessorPath ||
		replaced.retainedPlaceholderPath ||
		replaced.retainedUnknownPath
	) {
		throw new AtomicYamlReplaceError(
			configPath,
			1,
			new Error(`native exact replacement completed with retained recovery paths: ${replaced.code ?? "unknown"}`),
			true,
		);
	}
	if (replaced.code === "identity_mismatch") {
		const actual = await currentYamlFileState(configPath);
		throw new AtomicYamlConflictError(
			configPath,
			expectedHash,
			createHash("sha256").update(actual.raw).digest("hex"),
		);
	}
	throw new AtomicYamlReplaceError(
		configPath,
		1,
		new Error(`native exact replacement failed: ${replaced.code ?? "unknown"}`),
	);
}

/**
 * Identity-checked replacement without RENAME_EXCHANGE (NFS, older kernels).
 * The destination is atomically detached to a unique tombstone, the MOVED file
 * is verified against the captured destination identity (an editor's newer
 * replacement is renamed back and the write fails closed), and the staged
 * document is then published with a no-replace hard link so a file an editor
 * created while the path was briefly absent is never overwritten (EEXIST fails
 * the write instead). The old destination is removed only after the new
 * document is durably linked into place.
 */
async function replaceWithDetachedIdentitySwap(
	tempPath: string,
	configPath: string,
	destination: NativeExactFileIdentity,
	expectedHash: string,
): Promise<void> {
	const tombstone = path.join(
		path.dirname(configPath),
		`.${path.basename(configPath)}.${process.pid}.${randomUUID()}.swap`,
	);
	try {
		await fs.rename(configPath, tombstone);
	} catch (error) {
		throw new AtomicYamlReplaceError(configPath, 1, error);
	}
	let moved: { dev: bigint; ino: bigint } | null = null;
	try {
		const stat = await fs.lstat(tombstone, { bigint: true });
		moved = { dev: stat.dev, ino: stat.ino };
	} catch {
		// The detached object vanished: nothing verifiable to replace.
		throw new AtomicYamlConflictError(configPath, expectedHash, createHash("sha256").update("").digest("hex"));
	}
	if (moved.dev !== destination.dev || moved.ino !== destination.ino) {
		// An editor replaced the destination between the identity capture and
		// the detach: restore the editor's file and fail closed. The restore
		// never REPLACES a file the editor published while the path was absent.
		await restoreDetachedNoReplace(tombstone, configPath);
		throw new AtomicYamlConflictError(configPath, expectedHash, createHash("sha256").update("").digest("hex"));
	}
	try {
		await fs.link(tempPath, configPath);
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code === "EEXIST") {
			// An editor created a new file while configPath was briefly absent:
			// never clobber it; the detached old destination is superseded.
			await fs.rm(tombstone, { force: true }).catch(() => undefined);
			throw new AtomicYamlConflictError(configPath, expectedHash, createHash("sha256").update("").digest("hex"));
		}
		// Any other publication failure (EPERM, ENOTSUP, an I/O error): the
		// destination is detached in the tombstone, so RESTORE it - the existing
		// config.yml must never be lost without a replacement published. If the
		// restore itself fails (including a no-replace refusal because an editor
		// published a new file while the path was absent), the tombstone is
		// RETAINED (never deleted) so the old configuration stays recoverable,
		// and the error names it.
		if (!(await restoreDetachedNoReplace(tombstone, configPath))) {
			throw new AtomicYamlReplaceError(
				configPath,
				1,
				new Error(
					`identity-checked swap publication failed (${code ?? "unknown"}); the previous config is retained at ${tombstone}`,
				),
			);
		}
		throw new AtomicYamlReplaceError(configPath, 1, error);
	}
	// The staged document is now published at configPath (a hard link to the
	// temp inode); drop the staging name and the detached old destination.
	await fs.rm(tempPath, { force: true }).catch(() => undefined);
	await fs.rm(tombstone, { force: true }).catch(() => undefined);
}

/**
 * Restore a detached destination WITHOUT replacing a file an editor published
 * while the path was briefly absent: publish a hard link to the tombstone's
 * inode (EEXIST when the path is occupied - the editor's file is preserved)
 * and drop the tombstone name. Returns false when the restore could not
 * complete, in which case the tombstone is retained for recovery.
 */
async function restoreDetachedNoReplace(tombstone: string, configPath: string): Promise<boolean> {
	try {
		await fs.link(tombstone, configPath);
	} catch {
		return false;
	}
	await fs.rm(tombstone, { force: true }).catch(() => undefined);
	return true;
}
async function replaceWithRetry(
	tempPath: string,
	configPath: string,
	options: AtomicYamlPatchOptions,
	/** Expected current file state; native exact replacement validates it with the destination identity. */
	expectedState?: YamlFileState,
): Promise<void> {
	if (expectedState !== undefined) {
		await replaceWithExpectedIdentity(tempPath, configPath, expectedState, options);
		return;
	}
	const rename = options.rename ?? fs.rename;
	const sleep = options.sleep ?? (async (delay: number): Promise<void> => await Bun.sleep(delay));
	const isWindows = (options.platform ?? process.platform) === "win32";
	let attempts = 0;
	for (;;) {
		attempts++;
		try {
			await rename(tempPath, configPath);
			return;
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			const retryDelay = WINDOWS_RENAME_BACKOFF_MS[attempts - 1];
			if (!isWindows || !code || !WINDOWS_SHARING_VIOLATION_CODES.has(code) || retryDelay === undefined) {
				if (isWindows && code && WINDOWS_SHARING_VIOLATION_CODES.has(code)) {
					throw new AtomicYamlReplaceError(configPath, attempts, error);
				}
				throw error;
			}
			await sleep(retryDelay);
		}
	}
}

async function writeAtomicYaml(
	configPath: string,
	value: Record<string, unknown>,
	options: AtomicYamlPatchOptions,
	/** Expected current file state; re-verified immediately before the rename. */
	expectedState?: YamlFileState,
	/** Lexical (unresolved) config path; re-verified against the canonical target before the rename. */
	lexicalConfigPath?: string,
): Promise<YamlFileState> {
	const directory = path.dirname(configPath);
	const tempPath = path.join(directory, `.${path.basename(configPath)}.${process.pid}.${randomUUID()}.tmp`);
	const nextRaw = YAML.stringify(value, null, 2);
	let preserveTempPath = false;
	try {
		const tempHandle = await fs.open(tempPath, "wx", 0o600);
		try {
			await tempHandle.writeFile(nextRaw, "utf8");
			await tempHandle.sync();
		} finally {
			await tempHandle.close();
		}
		// Reject a lexical retarget (e.g. a repointed config.yml symlink) before
		// the rename, whether it happened while the operation waited in the queue
		// or while it ran; then re-verify the CAS state right before the rename so
		// an external save during the temp write cannot be silently overwritten.
		if (lexicalConfigPath !== undefined) assertLexicalTargetUnchanged(lexicalConfigPath, configPath);
		if (expectedState !== undefined) {
			// The transaction's CAS guard ran before this write; re-verify right
			// before the rename so an external save during the temp write cannot be
			// silently overwritten by the replacement.
			const currentState = await currentYamlFileState(configPath);
			if (currentState.exists !== expectedState.exists || currentState.raw !== expectedState.raw) {
				throw new AtomicYamlConflictError(
					configPath,
					createHash("sha256").update(expectedState.raw).digest("hex"),
					createHash("sha256").update(currentState.raw).digest("hex"),
				);
			}
		}
		try {
			await replaceWithRetry(tempPath, configPath, options, expectedState);
		} catch (error) {
			preserveTempPath = error instanceof AtomicYamlReplaceError && error.preserveTempPath;
			throw error;
		}
		await syncParentDirectory(directory);
	} finally {
		if (!preserveTempPath) await fs.rm(tempPath, { force: true }).catch(() => undefined);
	}
	return { exists: true, raw: nextRaw };
}

function createReceipt(
	configPath: string,
	changes: readonly ReceiptChange[],
	options: AtomicYamlPatchOptions,
): CasReceipt {
	let discarded = false;
	const revisions = changes.map(change => change.publicRevision);

	return {
		revisions,
		discard(): void {
			discarded = true;
		},
		async restore(): Promise<CasRestoreResult> {
			if (discarded) return { status: "discarded" };
			return await enqueueAtomicYamlOperation(configPath, async (canonicalPath, lexicalPath) => {
				if (discarded) return { status: "discarded" };
				return await withFileLock(canonicalPath, async () => {
					const { current, root } = await readYaml(canonicalPath);
					const conflicts = changes
						.filter(
							change =>
								stateHash(stateAtPath(current, change.path.split("."))) !== change.publicRevision.afterHash,
						)
						.map(change => change.path);
					if (conflicts.length > 0) return { status: "conflict", paths: conflicts };

					const restorePatches: AtomicYamlPatch[] = changes.map(change =>
						change.before.exists
							? { path: change.path, op: "set", value: structuredClone(change.before.value) }
							: { path: change.path, op: "unset" },
					);
					await options.validateRoot?.(root, restorePatches);
					const receipt = await applyPatchesUnderLock(
						canonicalPath,
						current,
						restorePatches,
						options,
						false,
						undefined,
						lexicalPath,
					);
					await options.onRestored?.(restorePatches);
					return { status: "restored", receipt };
				});
			});
		},
	};
}

async function applyPatchesUnderLock(
	configPath: string,
	current: Record<string, unknown>,
	patches: readonly AtomicYamlPatch[],
	options: AtomicYamlPatchOptions,
	skipWrite = false,
	expectedState?: YamlFileState,
	lexicalConfigPath?: string,
): Promise<CasReceipt> {
	if (patches.length === 0) return createReceipt(configPath, [], options);

	for (const patch of patches) {
		if (!patch.expected) continue;
		const actualHash = stateHash(stateAtPath(current, patch.expected.path.split(".")));
		if (actualHash !== patch.expected.hash) {
			throw new AtomicYamlConflictError(patch.expected.path, patch.expected.hash, actualHash);
		}
	}

	const changesByPath = new Map<string, ReceiptChange>();
	for (const patch of patches) {
		const segments = patch.path.split(".");
		const existingChange = changesByPath.get(patch.path);
		const before = existingChange?.before ?? cloneState(stateAtPath(current, segments));
		if (patch.op === "set") {
			setByPath(current, segments, structuredClone(patch.value));
		} else {
			deleteByPath(current, segments);
		}
		const after = cloneState(stateAtPath(current, segments));
		const beforeRevision = existingChange?.publicRevision.beforeRevision ?? ++nextReceiptRevision;
		const afterRevision = ++nextReceiptRevision;
		changesByPath.set(patch.path, {
			path: patch.path,
			before,
			after,
			publicRevision: {
				path: patch.path,
				beforeHash: stateHash(before),
				afterHash: stateHash(after),
				beforeRevision,
				afterRevision,
			},
		});
	}
	const changes = [...changesByPath.values()];

	if (!skipWrite) await writeAtomicYaml(configPath, current, options, expectedState, lexicalConfigPath);
	return createReceipt(configPath, changes, options);
}

/** Build patches from current durable YAML while holding the shared queue and file lock. */
export function applyAtomicYamlPatchesWithCurrent(
	configPath: string,
	buildPatches: (
		current: Readonly<Record<string, unknown>>,
	) => Promise<readonly AtomicYamlPatch[]> | readonly AtomicYamlPatch[],
	options: AtomicYamlPatchOptions = {},
): Promise<CasReceipt> {
	return enqueueAtomicYamlOperation(configPath, async (canonicalPath, lexicalPath) => {
		await fs.mkdir(path.dirname(canonicalPath), { recursive: true, mode: 0o700 });
		return await withFileLock(canonicalPath, async () => {
			const { current, root } = await readYaml(canonicalPath);
			const patches = await buildPatches(current);
			for (const patch of patches) assertPatch(patch);
			await options.validateRoot?.(root, patches);
			return await applyPatchesUnderLock(canonicalPath, current, patches, options, false, undefined, lexicalPath);
		});
	});
}
export interface AtomicYamlConfigTransaction {
	configPath: string;
	root: unknown;
	current: Readonly<Record<string, unknown>>;
	/** True once any write op has durably committed (a later CAS rejection then
	 * leaves the target with partial writes, so recovery artifacts must stay). */
	written: boolean;
	applyPatches(patches: readonly AtomicYamlPatch[], options?: AtomicYamlPatchOptions): Promise<CasReceipt>;
	/**
	 * Delete top-level keys verbatim, including dotted key names (e.g. a flat
	 * `"gjc.ralplan.maxIterations"` key that the patch grammar would otherwise
	 * interpret as a nested path). Writes atomically under the same lock.
	 */
	removeTopLevelKeys(keys: readonly string[], options?: AtomicYamlPatchOptions): Promise<CasReceipt>;
	/**
	 * Apply patches AND delete top-level keys verbatim in a SINGLE atomic
	 * write, so an external editor's change cannot land between the two
	 * operations (external editors do not participate in the file lock). The
	 * returned receipt is not restorable (the deletions are not journaled).
	 */
	applyPatchesAndRemoveTopLevelKeys(
		patches: readonly AtomicYamlPatch[],
		topLevelKeys: readonly string[],
		options?: AtomicYamlPatchOptions,
	): Promise<CasReceipt>;
	/**
	 * Replace the whole document (used to revert the target when a later
	 * verification fails). Writes atomically under the same lock; the returned
	 * receipt is not restorable.
	 */
	replaceCurrent(next: Readonly<Record<string, unknown>>, options?: AtomicYamlPatchOptions): Promise<CasReceipt>;
}

/**
 * Run a caller-owned multi-step mutation under the config file's per-file queue
 * and cross-process lock. The current YAML is read once and exposed as
 * `root`/`current`; the callback may inspect it, decide patches, and apply them
 * (or perform adjacent durable actions such as marker/source transitions)
 * without re-acquiring the lock. A YAML parse failure surfaces before the
 * callback runs, so no migration action can execute against a malformed target.
 */
export function withAtomicYamlConfigTransaction<T>(
	configPath: string,
	operation: (transaction: AtomicYamlConfigTransaction) => Promise<T>,
): Promise<T> {
	return enqueueAtomicYamlOperation(configPath, async (canonicalPath, lexicalPath) => {
		await fs.mkdir(path.dirname(canonicalPath), { recursive: true, mode: 0o700 });
		return await withFileLock(canonicalPath, async () => {
			const { current, root, raw, exists } = await readYaml(canonicalPath);
			// External editors do not participate in the file lock, so a save
			// between the initial read and a write would be silently overwritten.
			// Guard every write with a compare-and-swap against the last file state
			// this transaction read/wrote; on mismatch, fail closed.
			const initialState: YamlFileState = { exists, raw };
			let lastKnownState: YamlFileState | null = null;
			const casGuard = async (): Promise<void> => {
				const expected = lastKnownState ?? initialState;
				const currentState = await currentYamlFileState(canonicalPath);
				if (currentState.exists !== expected.exists || currentState.raw !== expected.raw) {
					throw new AtomicYamlConflictError(
						canonicalPath,
						createHash("sha256").update(expected.raw).digest("hex"),
						createHash("sha256").update(currentState.raw).digest("hex"),
					);
				}
			};
			let written = false;
			const markWritten = (): void => {
				written = true;
			};
			return await operation({
				configPath: canonicalPath,
				root,
				current,
				get written(): boolean {
					return written;
				},
				applyPatches: async (patches, options = {}) => {
					for (const patch of patches) assertPatch(patch);
					await options.validateRoot?.(root, patches);
					await casGuard();
					const receipt = await applyPatchesUnderLock(
						canonicalPath,
						current,
						patches,
						options,
						false,
						lastKnownState ?? initialState,
						lexicalPath,
					);
					if (patches.length > 0) {
						lastKnownState = { exists: true, raw: YAML.stringify(current, null, 2) };
						markWritten();
					}
					return receipt;
				},
				removeTopLevelKeys: async (keys, options = {}) => {
					for (const key of keys) delete current[key];
					await casGuard();
					lastKnownState = await writeAtomicYaml(
						canonicalPath,
						current,
						options,
						lastKnownState ?? initialState,
						lexicalPath,
					);
					markWritten();
					// The deleted top-level key values are not journaled, so a
					// restore() would vacuously claim success; report honestly that
					// the receipt is not restorable.
					let discarded = false;
					return {
						revisions: [],
						discard(): void {
							discarded = true;
						},
						async restore(): Promise<CasRestoreResult> {
							return discarded ? { status: "discarded" } : { status: "not-restorable" };
						},
					};
				},
				applyPatchesAndRemoveTopLevelKeys: async (patches, topLevelKeys, options = {}) => {
					for (const patch of patches) assertPatch(patch);
					await options.validateRoot?.(root, patches);
					await casGuard();
					await applyPatchesUnderLock(canonicalPath, current, patches, options, true, undefined, lexicalPath);
					for (const key of topLevelKeys) delete current[key];
					lastKnownState = await writeAtomicYaml(
						canonicalPath,
						current,
						options,
						lastKnownState ?? initialState,
						lexicalPath,
					);
					markWritten();
					let discarded = false;
					return {
						revisions: [],
						discard(): void {
							discarded = true;
						},
						async restore(): Promise<CasRestoreResult> {
							return discarded ? { status: "discarded" } : { status: "not-restorable" };
						},
					};
				},
				replaceCurrent: async (next, options = {}) => {
					for (const key of Object.keys(current)) delete current[key];
					Object.assign(current, next);
					await casGuard();
					lastKnownState = await writeAtomicYaml(
						canonicalPath,
						current,
						options,
						lastKnownState ?? initialState,
						lexicalPath,
					);
					markWritten();
					let discarded = false;
					return {
						revisions: [],
						discard(): void {
							discarded = true;
						},
						async restore(): Promise<CasRestoreResult> {
							return discarded ? { status: "discarded" } : { status: "not-restorable" };
						},
					};
				},
			});
		});
	});
}

/**
 * Reserve a FIFO operation for a config file immediately. The patch supplier runs
 * only when this operation reaches the front of the in-process queue, which lets
 * Settings debounce/coalesce inside its already-reserved causal slot.
 */
export function enqueueAtomicYamlOperation<T>(
	configPath: string,
	operation: (canonicalConfigPath: string, lexicalConfigPath: string) => Promise<T>,
): Promise<T> {
	const canonicalPath = canonicalConfigPath(configPath);
	const prior = queues.get(canonicalPath) ?? Promise.resolve();
	const result = prior.catch(() => undefined).then(() => operation(canonicalPath, configPath));
	const completion = result.then(
		() => undefined,
		() => undefined,
	);
	queues.set(canonicalPath, completion);
	void completion.finally(() => {
		if (queues.get(canonicalPath) === completion) queues.delete(canonicalPath);
	});
	return result;
}

/**
 * Reserve an atomic patch slot now, producing patches only after earlier slots
 * complete. Writers with state-aware merges use {@link reserveAtomicYamlUpdateSlot}.
 */
export function reserveAtomicYamlPatchSlot(
	configPath: string,
	patches: () => Promise<readonly AtomicYamlPatch[]> | readonly AtomicYamlPatch[],
	options: AtomicYamlPatchOptions = {},
): Promise<CasReceipt> {
	return enqueueAtomicYamlOperation(configPath, async (canonicalPath, lexicalPath) => {
		const nextPatches = await patches();
		for (const patch of nextPatches) assertPatch(patch);
		await fs.mkdir(path.dirname(canonicalPath), { recursive: true, mode: 0o700 });
		return await withFileLock(canonicalPath, async () => {
			const { current, root } = await readYaml(canonicalPath);
			await options.validateRoot?.(root, nextPatches);
			return await applyPatchesUnderLock(
				canonicalPath,
				current,
				nextPatches,
				options,
				false,
				undefined,
				lexicalPath,
			);
		});
	});
}

/**
 * Reserve a FIFO update slot and atomically persist a caller-owned YAML mutation.
 * The supplier runs only when its operation reaches the front of the queue.
 */
export function reserveAtomicYamlUpdateSlot<T>(
	configPath: string,
	update: () => Promise<AtomicYamlUpdate<T>> | AtomicYamlUpdate<T>,
	options: AtomicYamlPatchOptions = {},
): Promise<T> {
	return enqueueAtomicYamlOperation(configPath, async (canonicalPath, lexicalPath) => {
		const atomicUpdate = await update();
		await fs.mkdir(path.dirname(canonicalPath), { recursive: true, mode: 0o700 });
		return await withFileLock(canonicalPath, async () => {
			const { current } = await readYaml(canonicalPath);
			const result = await atomicUpdate.apply(current);
			if (atomicUpdate.shouldWrite?.(result) !== false) {
				await writeAtomicYaml(canonicalPath, current, options, undefined, lexicalPath);
			}
			await atomicUpdate.committed?.(current, result);
			return result;
		});
	});
}

/**
 * Apply tagged patches through the one per-file in-process queue and the shared
 * cross-process file lock. Success means the temp file was fsynced and renamed.
 */
export function applyAtomicYamlPatches(
	configPath: string,
	patches: readonly AtomicYamlPatch[],
	options: AtomicYamlPatchOptions = {},
): Promise<CasReceipt> {
	for (const patch of patches) assertPatch(patch);
	const immutablePatches = patches.map(patch => {
		const expected = patch.expected ? { ...patch.expected } : undefined;
		return patch.op === "set"
			? ({
					path: patch.path,
					op: "set",
					value: structuredClone(patch.value),
					...(expected ? { expected } : {}),
				} as const)
			: ({ path: patch.path, op: "unset", ...(expected ? { expected } : {}) } as const);
	});
	return reserveAtomicYamlPatchSlot(configPath, () => immutablePatches, options);
}
