import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface CoordinatorDirectoryBarrierOptions {
	platform?: NodeJS.Platform;
	openDirectory?: (directory: string) => Promise<fs.FileHandle>;
}

export interface CoordinatorFileDurabilityOptions {
	syncFile?: (handle: fs.FileHandle) => Promise<void>;
}

export interface CoordinatorAtomicWriteOptions
	extends CoordinatorDirectoryBarrierOptions,
		CoordinatorFileDurabilityOptions {
	rename?: (source: string, destination: string) => Promise<void>;
}

/**
 * Windows does not support fsync on directory handles. File contents must be
 * synced before publication; this barrier only makes the renamed directory
 * entry durable where the platform supports that operation.
 */
export function isUnsupportedWindowsDirectorySyncError(
	error: unknown,
	platform: NodeJS.Platform = process.platform,
): boolean {
	if (platform !== "win32") return false;
	const code = (error as NodeJS.ErrnoException | undefined)?.code;
	return code === "EPERM" || code === "EACCES" || code === "ENOTSUP" || code === "EOPNOTSUPP" || code === "EINVAL";
}

export async function syncCoordinatorDirectory(
	directory: string,
	options: CoordinatorDirectoryBarrierOptions = {},
): Promise<void> {
	const handle = await (options.openDirectory ?? (path => fs.open(path, "r")))(directory);
	try {
		try {
			await handle.sync();
		} catch (error) {
			if (!isUnsupportedWindowsDirectorySyncError(error, options.platform)) throw error;
		}
	} finally {
		await handle.close();
	}
}

/** File durability is never best-effort: callers must abort on every failure. */
export async function syncCoordinatorFile(
	handle: fs.FileHandle,
	options: CoordinatorFileDurabilityOptions = {},
): Promise<void> {
	await (options.syncFile ?? (file => file.sync()))(handle);
}

/** Atomically publish a synced coordinator state file, then barrier its parent. */
export async function writeCoordinatorAtomic(
	file: string,
	contents: string,
	options: CoordinatorAtomicWriteOptions = {},
): Promise<void> {
	await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
	const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
	try {
		const handle = await fs.open(temporary, "wx", 0o600);
		try {
			await handle.writeFile(contents);
			await syncCoordinatorFile(handle, options);
		} finally {
			await handle.close();
		}
		await (options.rename ?? fs.rename)(temporary, file);
		await syncCoordinatorDirectory(path.dirname(file), options);
	} catch (error) {
		await fs.rm(temporary, { force: true }).catch(() => undefined);
		throw error;
	}
}
