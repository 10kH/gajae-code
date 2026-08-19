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
 * Existing-file mode bits are re-applied after staging so a process umask never
 * narrows a replaced file's permissions, and effective write authorization on an
 * existing referent is checked before rename so a writable parent cannot bypass
 * a read-only or ACL-denied target.
 */
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { hasFsCode, isEacces, isEisdir, isEnoent, isFsError } from "@gajae-code/utils";

const WINDOWS_RENAME_BACKOFF_MS = [10, 25, 50, 100, 200] as const;
const WINDOWS_SHARING_VIOLATION_CODES = new Set(["EPERM", "EACCES", "EBUSY"]);
const TEMP_CREATE_ATTEMPTS = 8;
const DEFAULT_FILE_MODE = 0o666;

export class FileWriteNotPublishedError extends Error {
	readonly dest: string;
	override readonly cause: unknown;
	constructor(dest: string, cause: unknown) {
		super(formatFileWriteError(cause, dest, { destUnchanged: true }));
		this.name = "FileWriteNotPublishedError";
		this.dest = dest;
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
}

function tempPathFor(dest: string): string {
	const unique = `${process.pid}.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}`;
	return path.join(path.dirname(dest), `.${path.basename(dest)}.${unique}.tmp`);
}

async function renameIntoPlace(from: string, to: string): Promise<void> {
	try {
		await fs.rename(from, to);
		return;
	} catch (error) {
		if (process.platform !== "win32" || !isFsError(error) || !WINDOWS_SHARING_VIOLATION_CODES.has(error.code)) {
			throw error;
		}
	}
	let lastError: unknown;
	for (const delay of WINDOWS_RENAME_BACKOFF_MS) {
		await Bun.sleep(delay);
		try {
			await fs.rename(from, to);
			return;
		} catch (error) {
			lastError = error;
			if (!isFsError(error) || !WINDOWS_SHARING_VIOLATION_CODES.has(error.code)) throw error;
		}
	}
	throw lastError;
}

function eisdir(dest: string): Error & { code: string } {
	const error = new Error(`EISDIR: illegal operation on a directory, write '${dest}'`) as Error & {
		code: string;
	};
	error.code = "EISDIR";
	return error;
}

async function resolvePublishPath(dest: string, depth = 0): Promise<{ publishPath: string; existingMode?: number }> {
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
		return { publishPath: dest, existingMode: lst.mode };
	} catch (error) {
		if (!isEnoent(error)) throw error;
		return { publishPath: dest };
	}
}

async function writeExclusiveTemp(tmp: string, content: string | Uint8Array, mode: number): Promise<void> {
	const handle = await fs.open(tmp, "wx", mode);
	try {
		await handle.writeFile(content);
	} catch (error) {
		await handle.close().catch(() => {});
		await fs.unlink(tmp).catch(() => {});
		throw error;
	}
	await handle.close();
}

function pathIsWithin(target: string, root: string): boolean {
	return target === root || target.startsWith(`${root}${path.sep}`);
}

async function realpathOrSelf(p: string): Promise<string> {
	try {
		return await fs.realpath(p);
	} catch {
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

/**
 * Revalidate the resolved destination immediately before publication so a
 * symlink retargeted while staging cannot silently repoint the write at a
 * different file.
 */
async function assertPublishTargetStillIntended(
	dest: string,
	publishPath: string,
	trustBoundary: string | undefined,
): Promise<void> {
	const after = await resolvePublishPath(dest);
	if (after.publishPath !== publishPath) {
		throw new Error(`destination '${dest}' was retargeted while staging; refusing to overwrite a different file`);
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
		const trustBoundary = options.trustBoundary ?? sessionLocalRootFor(dest);
		const resolved = await resolvePublishPath(dest);
		publishPath = resolved.publishPath;
		await fs.mkdir(path.dirname(publishPath), { recursive: true });
		if (trustBoundary !== undefined) {
			await assertWithinTrustBoundary(publishPath, trustBoundary);
		}
		const mode = resolved.existingMode ?? DEFAULT_FILE_MODE;
		if (resolved.existingMode !== undefined) {
			await assertExistingTargetWritable(publishPath);
		}
		let lastError: unknown;
		for (let attempt = 0; attempt < TEMP_CREATE_ATTEMPTS; attempt++) {
			const tmp = tempPathFor(publishPath);
			let owned = false;
			try {
				await writeExclusiveTemp(tmp, content, mode);
				owned = true;
				if (resolved.existingMode !== undefined) {
					// Restore exact existing mode bits: the `wx` open applied the
					// process umask, which would otherwise silently narrow them.
					await fs.chmod(tmp, resolved.existingMode);
				}
				await assertPublishTargetStillIntended(dest, publishPath, trustBoundary);
				await renameIntoPlace(tmp, publishPath);
				return;
			} catch (error) {
				lastError = error;
				// A temp that never got created was a genuine pre-existing
				// collision file: leave it alone and try a fresh sibling name.
				if (hasFsCode(error, "EEXIST") && !owned) continue;
				// Any failure after we exclusively created the temp must not leak it.
				if (owned) await fs.unlink(tmp).catch(() => {});
				throw error;
			}
		}
		throw lastError;
	} catch (error) {
		if (error instanceof FileWriteNotPublishedError) throw error;
		throw new FileWriteNotPublishedError(dest, error);
	}
}
