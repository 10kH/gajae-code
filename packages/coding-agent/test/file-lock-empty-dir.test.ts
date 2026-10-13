import { afterEach, beforeEach, expect, test } from "bun:test";
import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { FileLockTestHooks, withFileLock } from "@gajae-code/coding-agent/config/file-lock";
import {
	exactRemoveDirectoryTree,
	renameDirectoryNoReplacePathAsync,
	renameNoReplacePathAsync,
	snapshotDirectoryTree,
} from "@gajae-code/natives";

const tempDirs: string[] = [];
let originalPlatform: PropertyDescriptor | undefined;

beforeEach(() => {
	originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");
	if (!originalPlatform?.configurable) throw new Error("process.platform descriptor is not configurable");
	Object.defineProperty(process, "platform", { ...originalPlatform, value: "win32" });
});

afterEach(async () => {
	FileLockTestHooks.afterOwnerlessLockStaleVerdict = undefined;
	FileLockTestHooks.beforeDetachedLockCleanup = undefined;
	FileLockTestHooks.beforeRemovalRecordUnlink = undefined;
	FileLockTestHooks.beforeRemovalOwnerPublish = undefined;
	FileLockTestHooks.nativePublicationBindings = undefined;
	FileLockTestHooks.nativeQuarantineBindings = undefined;
	FileLockTestHooks.nativeExactRemovalProbe = undefined;
	if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform);
	for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true });
});

async function writeRemovalOwnerRecord(
	transitionPath: string,
	owner: { pid: number; timestamp: number; owner_token: string },
): Promise<void> {
	const captured = snapshotDirectoryTree(transitionPath);
	if (!captured.ok || !captured.snapshot) throw new Error("Could not snapshot the test retirement");
	await fs.writeFile(
		`${transitionPath}.owner`,
		JSON.stringify({ owner, rootDev: captured.snapshot.rootDev, rootIno: captured.snapshot.rootIno }),
	);
}

test("reclaims an aged ownerless Windows session-index lock on the final configured attempt", async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-lock-empty-dir-"));
	tempDirs.push(tempDir);
	const filePath = path.join(tempDir, "sdk", "sessions", "index.jsonl");
	const lockDir = `${filePath}.lock`;
	await fs.mkdir(lockDir, { recursive: true });
	const pastTime = new Date(Date.now() - 60_000);
	await fs.utimes(lockDir, pastTime, pastTime);

	let callbackEntered = false;
	const acquisitionError = await withFileLock(
		filePath,
		async () => {
			callbackEntered = true;
			if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform);
		},
		{ retries: 1, retryDelayMs: 1, staleMs: 0 },
	).then(
		() => null,
		error => error,
	);

	expect(acquisitionError).toBeNull();
	expect(callbackEntered).toBe(true);
	await expect(fs.lstat(lockDir)).rejects.toMatchObject({ code: "ENOENT" });
});

test("publishes a Windows retirement owner record before native detach", async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-lock-empty-dir-"));
	tempDirs.push(tempDir);
	const filePath = path.join(tempDir, "sdk", "sessions", "index.jsonl");
	const lockDir = `${filePath}.lock`;
	let ownerRecordPublishedBeforeDetach = false;
	FileLockTestHooks.nativeExactRemovalProbe = () => true;
	FileLockTestHooks.nativeQuarantineBindings = () => ({
		snapshotDirectoryTree,
		exactRemoveDirectoryTree: (target, snapshot, parentIdentity, detachOnly) => {
			if (target === lockDir) {
				ownerRecordPublishedBeforeDetach = fsSync.existsSync(`${lockDir}.removing.owner`);
				fsSync.rmSync(target, { recursive: true, force: true });
				return { ok: true };
			}
			return exactRemoveDirectoryTree(target, snapshot, parentIdentity, detachOnly);
		},
	});

	const acquisitionError = await withFileLock(filePath, async () => undefined, {
		retries: 2,
		retryDelayMs: 1,
		staleMs: 0,
	}).then(
		() => null,
		error => error,
	);

	expect(acquisitionError).toBeNull();
	expect(ownerRecordPublishedBeforeDetach).toBe(true);
	await expect(fs.lstat(lockDir)).rejects.toMatchObject({ code: "ENOENT" });
	await expect(fs.lstat(`${lockDir}.removing.owner`)).rejects.toMatchObject({ code: "ENOENT" });
});

test("does not reclaim a fresh ownerless lock directory", async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-lock-empty-dir-"));
	tempDirs.push(tempDir);
	const filePath = path.join(tempDir, "sdk", "sessions", "index.jsonl");
	const lockDir = `${filePath}.lock`;
	await fs.mkdir(lockDir, { recursive: true });

	await expect(
		withFileLock(filePath, async () => undefined, { retries: 2, retryDelayMs: 1, staleMs: 0 }),
	).rejects.toMatchObject({ code: "acquire_timeout" });
	expect(await fs.readdir(lockDir)).toEqual([]);
});

test("adopts a detached Windows retirement before publishing a successor", async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-lock-empty-dir-"));
	tempDirs.push(tempDir);
	const filePath = path.join(tempDir, "sdk", "sessions", "index.jsonl");
	const lockDir = `${filePath}.lock`;
	const transitionPath = `${lockDir}.removing`;
	await fs.mkdir(transitionPath, { recursive: true });
	await fs.writeFile(path.join(transitionPath, "info.retired"), "partially scrubbed owner data");
	await writeRemovalOwnerRecord(transitionPath, {
		pid: 4_194_303,
		timestamp: Date.now(),
		owner_token: "dead-remover-generation",
	});

	let callbackEntered = false;
	const acquisitionError = await withFileLock(
		filePath,
		async () => {
			callbackEntered = true;
			if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform);
		},
		{ retries: 2, retryDelayMs: 1, staleMs: 0 },
	).then(
		() => null,
		error => error,
	);

	expect(acquisitionError).toBeNull();
	expect(callbackEntered).toBe(true);
	await expect(fs.lstat(transitionPath)).rejects.toMatchObject({ code: "ENOENT" });
	await expect(fs.lstat(`${transitionPath}.owner`)).rejects.toMatchObject({ code: "ENOENT" });
});

test("does not publish while a live Windows retirement remains", async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-lock-empty-dir-"));
	tempDirs.push(tempDir);
	const filePath = path.join(tempDir, "sdk", "sessions", "index.jsonl");
	const lockDir = `${filePath}.lock`;
	const transitionPath = `${lockDir}.removing`;
	await fs.mkdir(transitionPath, { recursive: true });
	await fs.writeFile(path.join(transitionPath, "info.retired"), "live owner data");
	await writeRemovalOwnerRecord(transitionPath, {
		pid: process.pid,
		timestamp: Date.now(),
		owner_token: "live-remover-generation",
	});

	let callbackEntered = false;
	await expect(
		withFileLock(
			filePath,
			async () => {
				callbackEntered = true;
			},
			{ retries: 2, retryDelayMs: 1, staleMs: 0 },
		),
	).rejects.toMatchObject({ code: "acquire_timeout" });

	expect(callbackEntered).toBe(false);
	await expect(fs.lstat(lockDir)).rejects.toMatchObject({ code: "ENOENT" });
	expect(await fs.readFile(path.join(transitionPath, "info.retired"), "utf8")).toBe("live owner data");
	await fs.lstat(`${transitionPath}.owner`);
});

test("clears a completed Windows retirement record before a successor", async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-lock-empty-dir-"));
	tempDirs.push(tempDir);
	const filePath = path.join(tempDir, "sdk", "sessions", "index.jsonl");
	const lockDir = `${filePath}.lock`;
	const transitionPath = `${lockDir}.removing`;
	await fs.mkdir(transitionPath, { recursive: true });
	await fs.writeFile(path.join(transitionPath, "info.retired"), "already removed");
	await writeRemovalOwnerRecord(transitionPath, {
		pid: 4_194_303,
		timestamp: Date.now(),
		owner_token: "completed-remover-generation",
	});
	await fs.rm(transitionPath, { recursive: true });

	let callbackEntered = false;
	const acquisitionError = await withFileLock(
		filePath,
		async () => {
			callbackEntered = true;
			if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform);
		},
		{ retries: 2, retryDelayMs: 1, staleMs: 0 },
	).then(
		() => null,
		error => error,
	);

	expect(acquisitionError).toBeNull();
	expect(callbackEntered).toBe(true);
	await expect(fs.lstat(`${transitionPath}.owner`)).rejects.toMatchObject({ code: "ENOENT" });
});

test("retries a completed local retirement record before same-process reacquisition", async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-lock-empty-dir-"));
	tempDirs.push(tempDir);
	const filePath = path.join(tempDir, "sdk", "sessions", "index.jsonl");
	const lockDir = `${filePath}.lock`;
	let refuseUnlink = true;
	FileLockTestHooks.nativeExactRemovalProbe = () => true;
	FileLockTestHooks.beforeRemovalRecordUnlink = () => {
		if (!refuseUnlink) return true;
		refuseUnlink = false;
		return false;
	};
	FileLockTestHooks.nativeQuarantineBindings = () => ({
		snapshotDirectoryTree,
		exactRemoveDirectoryTree: (target, snapshot, parentIdentity, detachOnly) => {
			if (target === lockDir) {
				fsSync.rmSync(target, { recursive: true, force: true });
				return { ok: true };
			}
			return exactRemoveDirectoryTree(target, snapshot, parentIdentity, detachOnly);
		},
	});

	await withFileLock(filePath, async () => undefined, {
		retries: 2,
		retryDelayMs: 1,
		staleMs: 0,
		ownerHostId: "previous-local-host",
	});
	await expect(fs.lstat(lockDir)).rejects.toMatchObject({ code: "ENOENT" });
	await fs.lstat(`${lockDir}.removing.owner`);

	let successorEntered = false;
	await withFileLock(
		filePath,
		async () => {
			successorEntered = true;
		},
		{ retries: 2, retryDelayMs: 1, staleMs: 0 },
	);

	expect(successorEntered).toBe(true);
	await expect(fs.lstat(`${lockDir}.removing.owner`)).rejects.toMatchObject({ code: "ENOENT" });
});

test("resumes an ownerless detached cleanup after a transient cleanup refusal", async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-lock-empty-dir-"));
	tempDirs.push(tempDir);
	const filePath = path.join(tempDir, "sdk", "sessions", "index.jsonl");
	const lockDir = `${filePath}.lock`;
	const transitionPath = `${lockDir}.removing`;
	await fs.mkdir(lockDir, { recursive: true });
	const pastTime = new Date(Date.now() - 60_000);
	await fs.utimes(lockDir, pastTime, pastTime);
	let refuseCleanup = true;
	FileLockTestHooks.nativeExactRemovalProbe = () => true;
	FileLockTestHooks.beforeDetachedLockCleanup = () => {
		if (!refuseCleanup) return true;
		refuseCleanup = false;
		throw Object.assign(new Error("simulated sharing violation"), { code: "EPERM" });
	};
	FileLockTestHooks.nativeQuarantineBindings = () => ({
		snapshotDirectoryTree,
		exactRemoveDirectoryTree: (target, snapshot, parentIdentity, detachOnly) => {
			if (target === lockDir) {
				fsSync.renameSync(target, transitionPath);
				return {
					ok: false,
					code: "cleanup_pending",
					payloadDurable: true,
					detachedPath: transitionPath,
				};
			}
			if (target === transitionPath) {
				fsSync.rmSync(target, { recursive: true, force: true });
				return { ok: true };
			}
			return exactRemoveDirectoryTree(target, snapshot, parentIdentity, detachOnly);
		},
	});

	let callbackEntered = false;
	await withFileLock(
		filePath,
		async () => {
			callbackEntered = true;
		},
		{ retries: 4, retryDelayMs: 1, staleMs: 0 },
	);

	expect(refuseCleanup).toBe(false);
	expect(callbackEntered).toBe(true);
	await expect(fs.lstat(transitionPath)).rejects.toMatchObject({ code: "ENOENT" });
	await expect(fs.lstat(`${transitionPath}.owner`)).rejects.toMatchObject({ code: "ENOENT" });
});

test("rolls back a Windows publication when retirement appears before owner registration", async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-lock-empty-dir-"));
	tempDirs.push(tempDir);
	const filePath = path.join(tempDir, "sdk", "sessions", "index.jsonl");
	const lockDir = `${filePath}.lock`;
	const transitionPath = `${lockDir}.removing`;
	let transitionPublished = false;
	FileLockTestHooks.nativePublicationBindings = () => ({
		renameNoReplacePathAsync: async (source, destination) => {
			const result = await renameNoReplacePathAsync(source, destination);
			if (result.ok && !transitionPublished) {
				transitionPublished = true;
				await fs.mkdir(transitionPath);
			}
			return result;
		},
		renameDirectoryNoReplacePathAsync,
	});

	await expect(
		withFileLock(filePath, async () => undefined, { retries: 1, retryDelayMs: 1, staleMs: 0 }),
	).rejects.toMatchObject({ code: "acquire_timeout" });

	expect(transitionPublished).toBe(true);
	await expect(fs.lstat(lockDir)).rejects.toMatchObject({ code: "ENOENT" });
	expect(await fs.readdir(path.dirname(lockDir))).toEqual([path.basename(transitionPath)]);
});

test("fails closed on an oversized Windows retirement owner sidecar", async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-lock-empty-dir-"));
	tempDirs.push(tempDir);
	const filePath = path.join(tempDir, "sdk", "sessions", "index.jsonl");
	const recordPath = `${filePath}.lock.removing.owner`;
	await fs.mkdir(path.dirname(recordPath), { recursive: true });
	await fs.writeFile(recordPath, "");
	await fs.truncate(recordPath, 2 * 1024 * 1024);

	await expect(
		withFileLock(filePath, async () => undefined, { retries: 1, retryDelayMs: 1, staleMs: 0 }),
	).rejects.toMatchObject({ code: "acquire_timeout" });
	expect((await fs.stat(recordPath)).size).toBe(2 * 1024 * 1024);
});

test.skipIf(process.platform === "win32")("does not reclaim an aged ownerless lock directory on POSIX", async () => {
	if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform);
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-lock-empty-dir-"));
	tempDirs.push(tempDir);
	const filePath = path.join(tempDir, "sdk", "sessions", "index.jsonl");
	const lockDir = `${filePath}.lock`;
	await fs.mkdir(lockDir, { recursive: true });
	const pastTime = new Date(Date.now() - 60_000);
	await fs.utimes(lockDir, pastTime, pastTime);

	await expect(
		withFileLock(filePath, async () => undefined, { retries: 2, retryDelayMs: 1, staleMs: 0 }),
	).rejects.toMatchObject({ code: "acquire_timeout" });
	expect(await fs.readdir(lockDir)).toEqual([]);
});

test("preserves a lock record published after the empty-directory stale verdict", async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-lock-empty-dir-"));
	tempDirs.push(tempDir);
	const filePath = path.join(tempDir, "sdk", "sessions", "index.jsonl");
	const lockDir = `${filePath}.lock`;
	await fs.mkdir(lockDir, { recursive: true });
	const pastTime = new Date(Date.now() - 60_000);
	await fs.utimes(lockDir, pastTime, pastTime);

	let published = false;
	FileLockTestHooks.afterOwnerlessLockStaleVerdict = async observedPath => {
		if (published) return;
		published = true;
		await fs.writeFile(path.join(observedPath, "info"), JSON.stringify({ pid: process.pid, timestamp: Date.now() }));
	};

	await expect(
		withFileLock(filePath, async () => undefined, { retries: 2, retryDelayMs: 1, staleMs: 0 }),
	).rejects.toMatchObject({ code: "acquire_timeout" });

	expect(published).toBe(true);
	expect(JSON.parse(await fs.readFile(path.join(lockDir, "info"), "utf8"))).toMatchObject({ pid: process.pid });
});
