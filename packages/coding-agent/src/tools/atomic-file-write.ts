/**
 * Crash-atomic user-file writes for the write/edit/LSP writethrough path.
 *
 * `Bun.write` truncates the destination then copies bytes. A permission or IO
 * failure after that truncate leaves a 0-byte target even though the tool
 * reported an error. Stage to a sibling temp, then rename over the destination
 * so a failed attempt never publishes a truncated file. Directory fsync is
 * intentionally omitted: Windows reports `EPERM` for it (#4457) and user-file
 * publication does not need that durability barrier.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { hasFsCode, isEacces, isEisdir, isEnoent, isFsError } from "@gajae-code/utils";

const WINDOWS_RENAME_BACKOFF_MS = [10, 25, 50, 100, 200] as const;
const WINDOWS_SHARING_VIOLATION_CODES = new Set(["EPERM", "EACCES", "EBUSY"]);

export function isFileWritePermissionError(error: unknown): boolean {
	return isEacces(error) || hasFsCode(error, "EPERM") || hasFsCode(error, "EROFS");
}

export function formatFileWriteError(error: unknown, dest: string): string {
	if (isEisdir(error)) {
		return `Cannot write '${dest}': path is a directory.`;
	}
	if (isFileWritePermissionError(error)) {
		const code = isFsError(error) ? error.code : "EPERM";
		return `Permission denied writing '${dest}' (${code}). The original file was left unchanged. Check directory write bits, file immutability, and any sandbox policy. Do not retry the same path through the shell tool.`;
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

export async function writeFileAtomically(dest: string, content: string): Promise<void> {
	const dir = path.dirname(dest);
	await fs.mkdir(dir, { recursive: true });

	let existingMode: number | undefined;
	try {
		const stat = await fs.stat(dest);
		if (stat.isDirectory()) {
			const error = new Error(`EISDIR: illegal operation on a directory, write '${dest}'`) as Error & {
				code: string;
			};
			error.code = "EISDIR";
			throw error;
		}
		existingMode = stat.mode;
	} catch (error) {
		if (!isEnoent(error)) throw error;
	}

	const tmp = tempPathFor(dest);
	try {
		await Bun.write(tmp, content);
		if (existingMode !== undefined) {
			await fs.chmod(tmp, existingMode);
		}
		await renameIntoPlace(tmp, dest);
	} catch (error) {
		await fs.unlink(tmp).catch(() => {});
		throw error;
	}
}
