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

export async function ensureCoordinatorDirectory(
	directory: string,
	options: CoordinatorDirectoryBarrierOptions = {},
): Promise<void> {
	const missing: string[] = [];
	for (let current = directory; ; current = path.dirname(current)) {
		try {
			const stat = await fs.stat(current);
			if (!stat.isDirectory()) throw new Error(`coordinator directory is not a directory: ${current}`);
			break;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
			missing.push(current);
			if (current === path.dirname(current)) throw error;
		}
	}
	for (const created of missing.reverse()) {
		try {
			await fs.mkdir(created, { mode: 0o700 });
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
			const stat = await fs.stat(created);
			if (!stat.isDirectory()) throw error;
		}
		await syncCoordinatorDirectory(path.dirname(created), options);
	}
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
	// Windows directory-handle barriers use the established broker precedent:
	// EPERM/EACCES are tolerated only for the directory open/sync operation.
	return code === "EPERM" || code === "EACCES";
}

export async function syncCoordinatorDirectory(
	directory: string,
	options: CoordinatorDirectoryBarrierOptions = {},
): Promise<void> {
	let handle: fs.FileHandle;
	try {
		handle = await (options.openDirectory ?? (path => fs.open(path, "r")))(directory);
	} catch (error) {
		if (!isUnsupportedWindowsDirectorySyncError(error, options.platform)) throw error;
		return;
	}
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

/** Append a durable coordinator journal or diagnostic record, then barrier its parent. */
export async function appendCoordinatorFile(
	file: string,
	contents: string,
	options: CoordinatorDirectoryBarrierOptions & CoordinatorFileDurabilityOptions = {},
): Promise<void> {
	await ensureCoordinatorDirectory(path.dirname(file), options);
	const handle = await fs.open(file, "a", 0o600);
	try {
		await handle.writeFile(contents);
		await syncCoordinatorFile(handle, options);
	} finally {
		await handle.close();
	}
	await syncCoordinatorDirectory(path.dirname(file), options);
}

/** Atomically publish a synced coordinator state file, then barrier its parent. */
export async function writeCoordinatorAtomic(
	file: string,
	contents: string,
	options: CoordinatorAtomicWriteOptions = {},
): Promise<void> {
	await ensureCoordinatorDirectory(path.dirname(file), options);
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
		try {
			await fs.rm(temporary, { force: true });
		} catch (cleanupError) {
			throw new AggregateError([error, cleanupError], "coordinator atomic write and cleanup failed");
		}
		throw error;
	}
}
