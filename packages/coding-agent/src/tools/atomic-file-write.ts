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
 * Staging uses exclusive create (`wx`) so a colliding leftover temp is not
 * truncated or unlinked.
 */
import * as fs from "node:fs/promises";
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
	if (error instanceof FileWriteNotPublishedError) return error.message;
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

async function writeExclusiveTemp(tmp: string, content: string, mode: number): Promise<void> {
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

export async function writeFileAtomically(dest: string, content: string): Promise<void> {
	let publishPath = dest;
	try {
		const resolved = await resolvePublishPath(dest);
		publishPath = resolved.publishPath;
		await fs.mkdir(path.dirname(publishPath), { recursive: true });
		const mode = resolved.existingMode ?? DEFAULT_FILE_MODE;
		let lastError: unknown;
		for (let attempt = 0; attempt < TEMP_CREATE_ATTEMPTS; attempt++) {
			const tmp = tempPathFor(publishPath);
			try {
				await writeExclusiveTemp(tmp, content, mode);
				await renameIntoPlace(tmp, publishPath);
				return;
			} catch (error) {
				lastError = error;
				if (hasFsCode(error, "EEXIST")) continue;
				throw error;
			}
		}
		throw lastError;
	} catch (error) {
		if (error instanceof FileWriteNotPublishedError) throw error;
		throw new FileWriteNotPublishedError(dest, error);
	}
}
