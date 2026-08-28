/**
 * Coordinator directory scans that must not treat native exact-unlink debris
 * as live JSON, and must not make start/status unreadable on a large dirent pile.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";

class ProjectionScanRaceError extends Error {
	readonly code = "PROJECTION_SCAN_RACED";

	constructor(message: string) {
		super(message);
		this.name = "ProjectionScanRaceError";
	}
}

const PROJECTION_SCAN_UNSUPPORTED_CODE = "coordinator_projection_safe_read_unsupported";

class ProjectionScanUnsupportedError extends Error {
	readonly code = PROJECTION_SCAN_UNSUPPORTED_CODE;

	constructor() {
		super(PROJECTION_SCAN_UNSUPPORTED_CODE);
		this.name = "ProjectionScanUnsupportedError";
	}
}

/** Post-filter parse-candidate cap. Exhaustion returns an explicit incomplete result. */
export const COORDINATOR_JSON_SCAN_CAP = 10_000;

export interface ProjectionScanStat {
	size: number | bigint;
	dev?: number | bigint;
	ino?: number | bigint;
	isDirectory?(): boolean;
	isFile(): boolean;
	isSymbolicLink(): boolean;
}

export interface ProjectionScanFs {
	readdir(dir: string): Promise<string[]>;
	lstat(file: string): Promise<ProjectionScanStat>;
	readFile(file: string, encoding: "utf8"): Promise<string>;
	/** Optional descriptor-bound reader used by the production filesystem. */
	readFileSafe?: (file: string, encoding: "utf8") => Promise<string>;
	/** Optional pinned directory authority used for enumeration and every child operation. */
	openDirectory?: (dir: string) => Promise<ProjectionScanDirectory>;
}

export interface ProjectionScanDirectory {
	readonly stat: ProjectionScanStat;
	readdir(): Promise<string[]>;
	lstat(entry: string): Promise<ProjectionScanStat>;
	readFile(entry: string, encoding: "utf8"): Promise<string>;
	close(): Promise<void>;
}

export interface ProjectionScanResult {
	values: unknown[];
	parsed: number;
	capped: boolean;
	skippedDebris: number;
	skippedEmpty: number;
	/** Candidates that changed or disappeared after enumeration. */
	raced: number;
	/** True when the scan cannot be authoritative for its caller. */
	incomplete: boolean;
}

/**
 * Read one discovered candidate without ever following a final-component symlink or
 * blocking on a FIFO. POSIX opens are descriptor-bound by O_NOFOLLOW/O_NONBLOCK. Windows
 * has neither flag, so the path is bracketed by lstat/fstat/lstat identity checks and the
 * bytes still come from the opened handle rather than the mutable pathname.
 */
async function readProjectionFileSafe(file: string, encoding: "utf8"): Promise<string> {
	if (encoding !== "utf8") throw new TypeError("Coordinator projection reads require utf8.");
	const noFollow = fs.constants.O_NOFOLLOW;
	const nonBlock = fs.constants.O_NONBLOCK;
	if (process.platform !== "win32" && (typeof noFollow !== "number" || typeof nonBlock !== "number"))
		throw new ProjectionScanUnsupportedError();
	const flags =
		fs.constants.O_RDONLY | (process.platform === "win32" ? 0 : (nonBlock as number) | (noFollow as number));
	let before: import("node:fs").BigIntStats | undefined;
	if (process.platform === "win32") {
		before = await fs.lstat(file, { bigint: true });
		if (before.isSymbolicLink() || !before.isFile())
			throw new ProjectionScanRaceError("candidate is not a regular file");
	}
	let handle: fs.FileHandle | undefined;
	try {
		handle = await fs.open(file, flags);
		const opened = await handle.stat({ bigint: true });
		if (!opened.isFile()) throw new ProjectionScanRaceError("candidate changed to a non-regular file");
		if (before) {
			if (
				before.dev !== opened.dev ||
				before.ino !== opened.ino ||
				before.nlink !== opened.nlink ||
				before.size !== opened.size ||
				before.mtimeNs !== opened.mtimeNs
			)
				throw new ProjectionScanRaceError("candidate changed while opening");
			const relinked = await fs.lstat(file, { bigint: true });
			if (
				relinked.isSymbolicLink() ||
				!relinked.isFile() ||
				relinked.dev !== opened.dev ||
				relinked.ino !== opened.ino ||
				relinked.nlink !== opened.nlink ||
				relinked.size !== opened.size ||
				relinked.mtimeNs !== opened.mtimeNs
			)
				throw new ProjectionScanRaceError("candidate changed before read");
		}
		return await handle.readFile({ encoding: "utf8" });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ELOOP")
			throw new ProjectionScanRaceError("candidate became a symlink");
		throw error;
	} finally {
		await handle?.close().catch(() => undefined);
	}
}

function sameProjectionRoot(left: ProjectionScanStat, right: ProjectionScanStat): boolean {
	const leftDirectory = left.isDirectory?.();
	const rightDirectory = right.isDirectory?.();
	return (
		leftDirectory !== false &&
		rightDirectory !== false &&
		left.dev !== undefined &&
		right.dev !== undefined &&
		left.ino !== undefined &&
		right.ino !== undefined &&
		String(left.dev) === String(right.dev) &&
		String(left.ino) === String(right.ino)
	);
}

function hasProjectionRootIdentity(stat: ProjectionScanStat): boolean {
	return stat.dev !== undefined && stat.ino !== undefined;
}

/**
 * Open a no-follow directory authority and keep it alive through enumeration, child
 * lstat, and child reads. Node has no `openat` binding, so POSIX uses the proc fd path
 * as the descriptor-relative namespace; a replacement root or parent cannot redirect it.
 */
async function openProjectionDirectorySafe(dir: string): Promise<ProjectionScanDirectory> {
	if (process.platform !== "linux") throw new ProjectionScanUnsupportedError();
	const noFollow = fs.constants.O_NOFOLLOW;
	const nonBlock = fs.constants.O_NONBLOCK;
	if (typeof noFollow !== "number" || typeof nonBlock !== "number") throw new ProjectionScanUnsupportedError();
	const directoryFlag = typeof fs.constants.O_DIRECTORY === "number" ? fs.constants.O_DIRECTORY : 0;
	const flags = fs.constants.O_RDONLY | (nonBlock as number) | (noFollow as number) | directoryFlag;
	let handle: fs.FileHandle | undefined;
	try {
		handle = await fs.open(dir, flags);
		const opened = await handle.stat({ bigint: true });
		if (!opened.isDirectory()) throw new ProjectionScanRaceError("scan root is not a directory");
		const pinnedPath = `/proc/self/fd/${handle.fd}`;
		const ownedHandle = handle;
		handle = undefined;
		const assertRoot = async (): Promise<void> => {
			const settled = await ownedHandle.stat({ bigint: true });
			if (!sameProjectionRoot(opened, settled)) throw new ProjectionScanRaceError("scan root descriptor changed");
		};
		return {
			stat: opened,
			readdir: async () => {
				const entries = await fs.readdir(pinnedPath);
				await assertRoot();
				return entries;
			},
			lstat: async entry => {
				const stat = await fs.lstat(path.join(pinnedPath, entry), { bigint: true });
				await assertRoot();
				return stat;
			},
			readFile: async (entry, encoding) => {
				const source = await readProjectionFileSafe(path.join(pinnedPath, entry), encoding);
				await assertRoot();
				return source;
			},
			close: async () => {
				await ownedHandle.close().catch(() => undefined);
			},
		};
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ELOOP")
			throw new ProjectionScanRaceError("scan root became a symlink");
		throw error;
	} finally {
		await handle?.close().catch(() => undefined);
	}
}

const failUnpinnedProjectionOperation = async (): Promise<never> => {
	throw new ProjectionScanUnsupportedError();
};

const defaultFs: ProjectionScanFs = {
	// The default implementation never permits an accidental mutable-path fallback;
	// all production operations must go through openProjectionDirectorySafe above.
	readdir: failUnpinnedProjectionOperation,
	lstat: failUnpinnedProjectionOperation,
	readFile: failUnpinnedProjectionOperation,
	readFileSafe: failUnpinnedProjectionOperation,
	openDirectory: openProjectionDirectorySafe,
};

export function isCoordinatorScanDebrisName(name: string): boolean {
	return name.startsWith(".");
}

async function scanCoordinatorJsonFiles(
	dir: string,
	io: ProjectionScanFs = defaultFs,
	cap: number = COORDINATOR_JSON_SCAN_CAP,
	authority?: ProjectionScanDirectory,
): Promise<ProjectionScanResult> {
	let rootStat: ProjectionScanStat;
	try {
		rootStat = authority?.stat ?? (await io.lstat(dir));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return {
				values: [],
				parsed: 0,
				capped: false,
				skippedDebris: 0,
				skippedEmpty: 0,
				raced: 0,
				incomplete: false,
			};
		}
		throw error;
	}
	if (rootStat.isSymbolicLink() || rootStat.isDirectory?.() === false) {
		return {
			values: [],
			parsed: 0,
			capped: true,
			skippedDebris: 0,
			skippedEmpty: 0,
			raced: 1,
			incomplete: true,
		};
	}
	let entries: string[];
	try {
		entries = authority ? await authority.readdir() : await io.readdir(dir);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return {
				values: [],
				parsed: 0,
				capped: true,
				skippedDebris: 0,
				skippedEmpty: 0,
				raced: 1,
				incomplete: true,
			};
		}
		if (error instanceof ProjectionScanRaceError) {
			return {
				values: [],
				parsed: 0,
				capped: true,
				skippedDebris: 0,
				skippedEmpty: 0,
				raced: 1,
				incomplete: true,
			};
		}
		throw error;
	}

	let skippedDebris = 0;
	let skippedEmpty = 0;
	let raced = 0;
	const parseCandidates: string[] = [];
	for (const entry of entries) {
		if (!entry.endsWith(".json") || isCoordinatorScanDebrisName(entry)) {
			if (entry.endsWith(".json") && isCoordinatorScanDebrisName(entry)) skippedDebris += 1;
			continue;
		}
		const file = path.join(dir, entry);
		let stat: ProjectionScanStat;
		try {
			stat = authority ? await authority.lstat(entry) : await io.lstat(file);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				raced += 1;
				continue;
			}
			throw error;
		}
		if (stat.isSymbolicLink() || !stat.isFile()) {
			skippedEmpty += 1;
			continue;
		}
		parseCandidates.push(entry);
	}

	const capped = parseCandidates.length > cap;
	const toParse = capped ? parseCandidates.slice(0, cap) : parseCandidates;
	const values: unknown[] = [];
	for (const entry of toParse) {
		const file = path.join(dir, entry);
		let source: string;
		try {
			source = authority
				? await authority.readFile(entry, "utf8")
				: await (io.readFileSafe ?? io.readFile)(file, "utf8");
		} catch (error) {
			if (
				(error as NodeJS.ErrnoException).code === "ENOENT" ||
				(error as NodeJS.ErrnoException).code === "ELOOP" ||
				error instanceof ProjectionScanRaceError
			) {
				raced += 1;
				skippedEmpty += 1;
				continue;
			}
			throw error;
		}
		try {
			values.push(JSON.parse(source));
		} catch (error) {
			throw new Error(
				`invalid coordinator projection ${file}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	let finalRoot: ProjectionScanStat;
	try {
		finalRoot = authority?.stat ?? (await io.lstat(dir));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		return {
			values: [],
			parsed: 0,
			capped: true,
			skippedDebris,
			skippedEmpty,
			raced: raced + 1,
			incomplete: true,
		};
	}
	if (hasProjectionRootIdentity(rootStat) && !sameProjectionRoot(rootStat, finalRoot)) {
		return {
			values: [],
			parsed: 0,
			capped: true,
			skippedDebris,
			skippedEmpty,
			raced: raced + 1,
			incomplete: true,
		};
	}
	return {
		values: values.filter(value => value !== null),
		parsed: values.length,
		// Existing authoritative callers already refuse a capped scan. Treat a raced
		// candidate as the same incomplete boundary so they cannot consume a partial
		// projection set while the result still reports the precise race count below.
		capped: capped || raced > 0,
		skippedDebris,
		skippedEmpty,
		raced,
		incomplete: capped || raced > 0,
	};
}

export async function listCoordinatorJsonFiles(
	dir: string,
	io: ProjectionScanFs = defaultFs,
	cap: number = COORDINATOR_JSON_SCAN_CAP,
): Promise<ProjectionScanResult> {
	let authority: ProjectionScanDirectory | undefined;
	try {
		authority = io.openDirectory ? await io.openDirectory(dir) : undefined;
		return await scanCoordinatorJsonFiles(dir, io, cap, authority);
	} catch (error) {
		if (
			error instanceof ProjectionScanRaceError ||
			error instanceof ProjectionScanUnsupportedError ||
			(error as NodeJS.ErrnoException).code === PROJECTION_SCAN_UNSUPPORTED_CODE
		) {
			return {
				values: [],
				parsed: 0,
				capped: true,
				skippedDebris: 0,
				skippedEmpty: 0,
				raced: 1,
				incomplete: true,
			};
		}
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			// No authority was returned: this is the lazy first-use shape for an
			// otherwise valid projection namespace, not a partial scan. Once an
			// authority exists, ENOENT is handled by scanCoordinatorJsonFiles as a
			// raced/incomplete result and cannot reach this branch.
			return {
				values: [],
				parsed: 0,
				capped: false,
				skippedDebris: 0,
				skippedEmpty: 0,
				raced: 0,
				incomplete: false,
			};
		}
		throw error;
	} finally {
		await authority?.close().catch(() => undefined);
	}
}
