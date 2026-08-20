/**
 * Crash-atomic user-file writes for the write/edit/LSP writethrough path.
 *
 * `Bun.write` truncates the destination then copies bytes. A permission or IO
 * failure after that truncate leaves a 0-byte target even though the tool
 * reported an error. Stage to a sibling temp, then rename over the destination
 * so a failed attempt never publishes a truncated file. Directory fsync is
 * intentionally omitted: Windows reports `EPERM` for it (#4457) and user-file
 * publication does not need that durability barrier.
 *
 * Destination symlinks are followed: the referent is replaced, the link stays.
 * The referent is re-resolved immediately before publication so a retargeted
 * link cannot silently repoint the write, and when the lexical destination
 * sits inside a session-scoped `gjc-local` root the resolved referent and its
 * parent must remain inside that root (a link there must not redirect the
 * write out of the trust boundary).
 *
 * Staging uses exclusive create (`wx`) so a colliding leftover temp is never
 * truncated or unlinked; only the temp this call created is cleaned on failure.
 * Existing-file mode and ownership are re-applied after staging so a process
 * umask or replacement inode never changes the target's identity. Hard-linked
 * targets are rejected because replacement would split their link group, and
 * target identity is revalidated before the final same-directory rename. The
 * staged bytes are synced before publication; directory fsync is intentionally not
 * promised because Windows reports EPERM for it (#4457).
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { hasFsCode, isEacces, isEisdir, isEnoent, isFsError } from "@gajae-code/utils";

const TEMP_CREATE_ATTEMPTS = 8;
const DEFAULT_FILE_MODE = 0o666;
const WINDOWS_RENAME_BACKOFF_MS = [10, 25, 50, 100, 200] as const;
const WINDOWS_SHARING_VIOLATION_CODES = new Set(["EPERM", "EACCES", "EBUSY"]);

export type FileWritePublicationState = "not_published" | "published" | "unknown";

interface ExistingFileMetadata {
	mode: number;
	uid: number;
	gid: number;
	nlink: number;
	dev: number;
	ino: number;
}

interface ResolvedPublishPath {
	publishPath: string;
	existing?: ExistingFileMetadata;
}

export class FileWriteNotPublishedError extends Error {
	readonly dest: string;
	readonly destUnchanged: boolean;
	readonly publicationState: FileWritePublicationState;
	override readonly cause: unknown;
	constructor(
		dest: string,
		cause: unknown,
		options: { destUnchanged?: boolean; publicationState?: FileWritePublicationState } = {},
	) {
		const destUnchanged = options.destUnchanged ?? true;
		super(formatFileWriteError(cause, dest, { destUnchanged }));
		this.name = "FileWriteNotPublishedError";
		this.dest = dest;
		this.destUnchanged = destUnchanged;
		this.publicationState = options.publicationState ?? (destUnchanged ? "not_published" : "unknown");
		this.cause = cause;
		if (isFsError(cause)) {
			(this as Error & { code?: string }).code = cause.code;
		}
	}
}

export function isFileWritePermissionError(error: unknown): boolean {
	return isEacces(error) || hasFsCode(error, "EPERM") || hasFsCode(error, "EROFS");
}

export function formatFileWriteError(error: unknown, dest: string, options: { destUnchanged?: boolean } = {}): string {
	if (error instanceof FileWriteNotPublishedError && options.destUnchanged !== false) return error.message;
	if (isEisdir(error)) {
		return `Cannot write '${dest}': path is a directory.`;
	}
	if (isFileWritePermissionError(error)) {
		const code = isFsError(error) ? error.code : "EPERM";
		const unchanged = options.destUnchanged
			? " The original file was left unchanged."
			: " The destination may already have been replaced if a formatter published earlier in this write.";
		return `Permission denied writing '${dest}' (${code}).${unchanged} Check directory write bits, file immutability, and any sandbox policy. Do not retry the same path through the shell tool.`;
	}
	return error instanceof Error ? error.message : String(error);
}

export interface WriteFileAtomicallyOptions {
	/**
	 * Trusted root that a resolved symlink referent and its parent must not
	 * leave. When omitted, the helper still enforces the session-scoped
	 * `gjc-local` boundary implied by a lexical destination under
	 * `<tmpdir>/gjc-local/<session-id>`.
	 */
	trustBoundary?: string;
	/** Platform override used by deterministic retry tests. */
	platform?: NodeJS.Platform;
	/** Sleep seam used by deterministic retry tests. */
	sleep?: (delayMs: number) => Promise<void>;
}

function tempPathFor(dest: string): string {
	const unique = `${process.pid}.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}`;
	return path.join(path.dirname(dest), `.${path.basename(dest)}.${unique}.tmp`);
}

function eisdir(dest: string): Error & { code: string } {
	const error = new Error(`EISDIR: illegal operation on a directory, write '${dest}'`) as Error & {
		code: string;
	};
	error.code = "EISDIR";
	return error;
}

async function resolvePublishPath(dest: string, depth = 0): Promise<ResolvedPublishPath> {
	if (depth > 40) {
		throw new Error(`ELOOP: too many symbolic links, write '${dest}'`);
	}
	try {
		const lst = await fs.lstat(dest);
		if (lst.isDirectory()) throw eisdir(dest);
		if (lst.isSymbolicLink()) {
			const target = await fs.readlink(dest);
			return resolvePublishPath(path.resolve(path.dirname(dest), target), depth + 1);
		}
		return {
			publishPath: dest,
			existing: {
				mode: lst.mode,
				uid: lst.uid,
				gid: lst.gid,
				nlink: lst.nlink,
				dev: lst.dev,
				ino: lst.ino,
			},
		};
	} catch (error) {
		if (!isEnoent(error)) throw error;
		return { publishPath: dest };
	}
}

function pathIsWithin(target: string, root: string): boolean {
	return target === root || target.startsWith(`${root}${path.sep}`);
}

async function realpathOrSelf(p: string): Promise<string> {
	try {
		return await fs.realpath(p);
	} catch (error) {
		if (!isEnoent(error)) throw error;
		return path.resolve(p);
	}
}

/**
 * Derive the session-scoped `local://` trust boundary from a lexical write
 * destination. Session roots live at `<tmpdir>/gjc-local/<session-id>`, and a
 * symlink placed inside one must not be able to redirect a write out of it.
 */
function sessionLocalRootFor(lexicalDest: string): string | undefined {
	const resolvedDest = path.resolve(lexicalDest);
	const localParent = path.join(os.tmpdir(), "gjc-local");
	if (!pathIsWithin(resolvedDest, localParent)) return undefined;
	const rest = resolvedDest.slice(localParent.length + path.sep.length);
	const sessionSegment = rest.split(path.sep, 1)[0] ?? "";
	if (sessionSegment.length === 0) return undefined;
	return path.join(localParent, sessionSegment);
}

/**
 * Reject publication when the resolved referent's real parent (and therefore
 * the referent itself) leaves the trust boundary. The boundary root is
 * realpathed so a symlinked `gjc-local` root cannot smuggle a write out.
 */
async function assertWithinTrustBoundary(publishPath: string, trustBoundary: string): Promise<void> {
	const boundary = path.resolve(trustBoundary);
	const realBoundary = await realpathOrSelf(boundary);
	const realParent = await realpathOrSelf(path.dirname(publishPath));
	if (!pathIsWithin(realParent, realBoundary)) {
		throw new Error(`write target '${publishPath}' resolves outside trust boundary '${trustBoundary}'`);
	}
}

/**
 * Rename replaces the referent without consulting its file permissions, so a
 * writable parent could otherwise overwrite a read-only or ACL-denied target in
 * a way a direct write would not. Probe effective write authorization the way a
 * direct write would: open the existing referent for append (requires write
 * permission and mutates nothing). Native Windows read-only attributes surface
 * as EPERM/EACCES here just like POSIX immutable/`0444` targets.
 */
async function assertExistingTargetWritable(publishPath: string): Promise<void> {
	const handle = await fs.open(publishPath, "a");
	await handle.close();
}

function sameFileIdentity(left: ExistingFileMetadata, right: ExistingFileMetadata): boolean {
	return (
		left.dev === right.dev &&
		left.ino === right.ino &&
		left.nlink === right.nlink &&
		left.mode === right.mode &&
		left.uid === right.uid &&
		left.gid === right.gid
	);
}

async function preserveExistingMetadata(tmp: string, existing: ExistingFileMetadata): Promise<void> {
	const staged = await fs.stat(tmp);
	if (staged.uid !== existing.uid || staged.gid !== existing.gid) {
		await fs.chown(tmp, existing.uid, existing.gid);
	}
	await fs.chmod(tmp, existing.mode);
}

async function cleanupOwnedTemp(tmp: string, cause: unknown): Promise<void> {
	try {
		await fs.unlink(tmp);
	} catch (cleanupError) {
		if (isEnoent(cleanupError)) return;
		throw new AggregateError([cause, cleanupError], `Failed to clean up staging file '${tmp}'.`);
	}
}

function isWindowsSharingViolation(error: unknown): boolean {
	return isFsError(error) && WINDOWS_SHARING_VIOLATION_CODES.has(error.code);
}

async function renameIntoPlace(
	from: string,
	to: string,
	platform: NodeJS.Platform,
	sleep: (delayMs: number) => Promise<void>,
): Promise<void> {
	try {
		await fs.rename(from, to);
		return;
	} catch (error) {
		if (platform !== "win32" || !isWindowsSharingViolation(error)) throw error;
		let lastError: unknown = error;
		for (const delay of WINDOWS_RENAME_BACKOFF_MS) {
			await sleep(delay);
			try {
				await fs.rename(from, to);
				return;
			} catch (retryError) {
				lastError = retryError;
				if (!isWindowsSharingViolation(retryError)) throw retryError;
			}
		}
		throw lastError;
	}
}

/**
 * Windows permits another process to share writes while denying delete/rename.
 * In that narrow case preserve the existing inode and perform a rollback-capable
 * in-place replacement. Hard-linked files never enter this path: they are
 * rejected before staging because a failed write cannot safely preserve every
 * alias with a pathname replacement contract.
 */
async function replaceInPlaceAfterSharingViolation(
	dest: string,
	tmp: string,
	platform: NodeJS.Platform,
): Promise<void> {
	if (platform !== "win32") throw new Error("in-place sharing fallback is Windows-only");
	const original = new Uint8Array(await Bun.file(dest).arrayBuffer());
	const replacement = new Uint8Array(await Bun.file(tmp).arrayBuffer());
	const handle = await fs.open(dest, "r+");
	let failure: unknown;
	let committed = false;
	try {
		try {
			await handle.writeFile(replacement);
			await handle.sync();
			await handle.truncate(replacement.byteLength);
			await handle.sync();
			committed = true;
		} catch (error) {
			try {
				await handle.writeFile(original);
				await handle.truncate(original.byteLength);
				await handle.sync();
			} catch (rollbackError) {
				failure = new FileWriteNotPublishedError(
					dest,
					new AggregateError([error, rollbackError], "In-place write rollback failed."),
					{ destUnchanged: false, publicationState: "unknown" },
				);
			}
			if (failure === undefined) failure = error;
		}
	} finally {
		try {
			await handle.close();
		} catch (closeError) {
			if (committed) {
				failure = new FileWriteNotPublishedError(dest, closeError, {
					destUnchanged: false,
					publicationState: "published",
				});
			} else if (failure === undefined) {
				failure = closeError;
			}
		}
	}
	if (failure !== undefined) {
		if (failure instanceof FileWriteNotPublishedError) throw failure;
		throw new FileWriteNotPublishedError(dest, failure, {
			destUnchanged: !committed,
			publicationState: committed ? "published" : "not_published",
		});
	}
}

/**
 * Revalidate the resolved destination immediately before publication so a
 * symlink retargeted while staging cannot silently repoint the write at a
 * different file.
 */
async function assertPublishTargetStillIntended(
	dest: string,
	publishPath: string,
	trustBoundary: string | undefined,
	expectedExisting: ExistingFileMetadata | undefined,
	expectedParentRealpath: string,
): Promise<void> {
	const after = await resolvePublishPath(dest);
	if (after.publishPath !== publishPath) {
		throw new Error(`destination '${dest}' was retargeted while staging; refusing to overwrite a different file`);
	}
	const currentParentRealpath = await realpathOrSelf(path.dirname(publishPath));
	if (currentParentRealpath !== expectedParentRealpath) {
		throw new Error(
			`destination '${dest}' parent was retargeted while staging; refusing to overwrite a different file`,
		);
	}
	if (expectedExisting === undefined) {
		if (after.existing !== undefined) {
			throw new Error(`destination '${dest}' appeared while staging; refusing to overwrite a different file`);
		}
	} else if (after.existing === undefined || !sameFileIdentity(after.existing, expectedExisting)) {
		throw new Error(`destination '${dest}' was replaced while staging; refusing to overwrite a different file`);
	}
	if (trustBoundary !== undefined) {
		await assertWithinTrustBoundary(after.publishPath, trustBoundary);
	}
}

export async function writeFileAtomically(
	dest: string,
	content: string | Uint8Array,
	options: WriteFileAtomicallyOptions = {},
): Promise<void> {
	let publishPath = dest;
	try {
		const platform = options.platform ?? process.platform;
		const sleep = options.sleep ?? (async (delayMs: number): Promise<void> => await Bun.sleep(delayMs));
		const trustBoundary = options.trustBoundary ?? sessionLocalRootFor(dest);
		const resolved = await resolvePublishPath(dest);
		publishPath = resolved.publishPath;
		await fs.mkdir(path.dirname(publishPath), { recursive: true });
		const expectedParentRealpath = await realpathOrSelf(path.dirname(publishPath));
		if (trustBoundary !== undefined) {
			await assertWithinTrustBoundary(publishPath, trustBoundary);
		}
		const existing = resolved.existing;
		if (existing !== undefined && existing.nlink > 1) {
			throw new Error(
				`Cannot atomically replace hard-linked file '${dest}': replacement would split its link group.`,
			);
		}
		if (existing !== undefined) {
			await assertExistingTargetWritable(publishPath);
		}
		let lastError: unknown;
		for (let attempt = 0; attempt < TEMP_CREATE_ATTEMPTS; attempt++) {
			const tmp = tempPathFor(publishPath);
			let owned = false;
			try {
				const handle = await fs.open(tmp, "wx", existing?.mode ?? DEFAULT_FILE_MODE);
				owned = true;
				try {
					await handle.writeFile(content);
					await handle.sync();
				} finally {
					await handle.close();
				}
				if (existing !== undefined) {
					await preserveExistingMetadata(tmp, existing);
				}
				await assertPublishTargetStillIntended(dest, publishPath, trustBoundary, existing, expectedParentRealpath);
				// The staged file lives beside the destination, so rename is one
				// same-directory atomic publication. A failed rename leaves the
				// destination untouched and the owned staging file is cleaned below.
				try {
					await renameIntoPlace(tmp, publishPath, platform, sleep);
				} catch (error) {
					if (existing !== undefined && platform === "win32" && isWindowsSharingViolation(error)) {
						await replaceInPlaceAfterSharingViolation(publishPath, tmp, platform);
						try {
							await fs.unlink(tmp);
						} catch (cleanupError) {
							owned = false;
							throw new FileWriteNotPublishedError(
								dest,
								new AggregateError([error, cleanupError], "Published bytes could not be cleaned up."),
								{ destUnchanged: false, publicationState: "published" },
							);
						}
						owned = false;
						return;
					}
					throw error;
				}
				owned = false;
				return;
			} catch (error) {
				lastError = error;
				// A temp that never got created was a genuine pre-existing
				// collision file: leave it alone and try a fresh sibling name.
				if (hasFsCode(error, "EEXIST") && !owned) continue;
				// Any failure after we exclusively created the temp must not leak it.
				if (owned) await cleanupOwnedTemp(tmp, error);
				throw error;
			}
		}
		throw lastError;
	} catch (error) {
		if (error instanceof FileWriteNotPublishedError) throw error;
		throw new FileWriteNotPublishedError(dest, error);
	}
}
