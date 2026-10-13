import { afterEach, beforeEach, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { FileLockTestHooks, withFileLock } from "@gajae-code/coding-agent/config/file-lock";

const tempDirs: string[] = [];
let originalPlatform: PropertyDescriptor | undefined;

beforeEach(() => {
	originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");
	if (!originalPlatform?.configurable) throw new Error("process.platform descriptor is not configurable");
	Object.defineProperty(process, "platform", { ...originalPlatform, value: "win32" });
});

afterEach(async () => {
	FileLockTestHooks.afterOwnerlessLockStaleVerdict = undefined;
	if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform);
	for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true });
});

test("reclaims an aged ownerless Windows session-index lock", async () => {
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
		{ retries: 2, retryDelayMs: 1, staleMs: 0 },
	).then(
		() => null,
		error => error,
	);

	expect(acquisitionError).toBeNull();
	expect(callbackEntered).toBe(true);
	await expect(fs.lstat(lockDir)).rejects.toMatchObject({ code: "ENOENT" });
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
