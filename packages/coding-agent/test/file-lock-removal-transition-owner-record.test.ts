import { afterEach, expect, test, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { exactRemoveDirectoryTree, snapshotDirectoryTree } from "@gajae-code/natives";
import { nativeProcessBindings } from "@gajae-code/utils/native-process";
import { acquireFileLock, type FileLockOwnerToken, FileLockTestHooks } from "../src/config/file-lock";

const roots: string[] = [];
type ControlledReleaseRetry = {
	cancelled: boolean;
	callback: () => void | Promise<void>;
};
const controlledReleaseRetries: ControlledReleaseRetry[] = [];

afterEach(async () => {
	for (const timer of controlledReleaseRetries.splice(0)) timer.cancelled = true;
	vi.restoreAllMocks();
	FileLockTestHooks.nativeQuarantineBindings = undefined;
	FileLockTestHooks.beforeRemovalOwnerPublish = undefined;
	for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});

async function fixture() {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "file-lock-removal-owner-"));
	roots.push(root);
	const file = path.join(root, "index.jsonl");
	return { file, lock: `${file}.lock`, transition: `${file}.lock.removing` };
}

async function record(transition: string, owner: FileLockOwnerToken) {
	const stat = await fs.lstat(transition, { bigint: true });
	await Bun.write(
		`${transition}.owner`,
		JSON.stringify({ owner, rootDev: stat.dev.toString(), rootIno: stat.ino.toString() }),
	);
}

function controlReleasePendingRetries(): void {
	const realSetTimeout = globalThis.setTimeout;
	const realClearTimeout = globalThis.clearTimeout;
	const controlledSetTimeout = (callback: () => void | Promise<void>, delay?: number): NodeJS.Timeout => {
		if ([250, 1_000, 5_000, 15_000, 60_000].includes(delay ?? 0)) {
			const timer = { cancelled: false, callback };
			controlledReleaseRetries.push(timer);
			return timer as unknown as NodeJS.Timeout;
		}
		return realSetTimeout(callback, delay);
	};
	const controlledClearTimeout = (timer: unknown): void => {
		if (typeof timer === "object" && timer !== null && "cancelled" in timer && "callback" in timer) {
			(timer as ControlledReleaseRetry).cancelled = true;
			return;
		}
		realClearTimeout(timer as NodeJS.Timeout);
	};
	vi.spyOn(globalThis, "setTimeout").mockImplementation(controlledSetTimeout as unknown as typeof setTimeout);
	vi.spyOn(globalThis, "clearTimeout").mockImplementation(controlledClearTimeout as unknown as typeof clearTimeout);
}

async function runNextControlledReleaseRetry(): Promise<void> {
	const timer = controlledReleaseRetries.shift();
	expect(timer).toBeDefined();
	if (!timer || timer.cancelled) throw new Error("Expected an active pending release retry");
	await timer.callback();
}

const deadOwner: FileLockOwnerToken = { pid: 2147483647, timestamp: Date.now(), owner_token: "dead-remover" };

for (const [name, owner] of [
	["dead owner", deadOwner],
	["recycled pid", { pid: process.pid, process_incarnation: "different-incarnation", timestamp: Date.now() }],
] as const) {
	test(`real acquire recovers ${name} before payload scrub`, async () => {
		const { file, transition } = await fixture();
		await fs.mkdir(transition);
		await Bun.write(path.join(transition, "info"), JSON.stringify({ pid: process.pid, timestamp: Date.now() }));
		await Bun.write(path.join(transition, "payload"), "not yet scrubbed");
		await record(transition, owner);
		const release = await acquireFileLock(file, { retries: 2, retryDelayMs: 1 });
		expect(await fs.exists(transition)).toBe(false);
		expect(await fs.exists(`${transition}.owner`)).toBe(false);
		await release();
	});
}

test("real acquire leaves a live transition owner and payload untouched", async () => {
	const { file, transition } = await fixture();
	await fs.mkdir(transition);
	await Bun.write(path.join(transition, "payload"), "live payload");
	const incarnation = nativeProcessBindings().Process.fromPid(process.pid)?.incarnation;
	expect(incarnation).toBeString();
	await record(transition, { pid: process.pid, timestamp: Date.now(), process_incarnation: incarnation });
	const bytes = await Bun.file(`${transition}.owner`).text();
	await expect(acquireFileLock(file, { retries: 2, retryDelayMs: 1 })).rejects.toMatchObject({
		code: "acquire_timeout",
		orphanPath: transition,
		holder: expect.stringContaining(`blocked by retained removal transition ${transition}`),
	});
	expect(await Bun.file(path.join(transition, "payload")).text()).toBe("live payload");
	expect(await Bun.file(`${transition}.owner`).text()).toBe(bytes);
});

test.each([
	"before-rename",
	"after-rename",
	"after-scrub",
	"legacy-after-scrub",
])("SIGKILL %s retains the remover record and recovers", async phase => {
	const { file, lock, transition } = await fixture();
	const initial = phase === "legacy-after-scrub" ? transition : lock;
	await fs.mkdir(initial);
	await Bun.write(path.join(initial, "info"), JSON.stringify(deadOwner));
	const child = Bun.spawn(
		[
			process.execPath,
			"-e",
			`
import { acquireFileLock, FileLockTestHooks } from ${JSON.stringify(path.resolve(import.meta.dir, "../src/config/file-lock.ts"))};
import { exactRemoveDirectoryTree, renameDirectoryNoReplacePath, snapshotDirectoryTree } from "@gajae-code/natives";
const file = process.env.LOCKED_FILE;
const lock = file + ".lock";
const removalTarget = process.env.REMOVAL_CRASH_PHASE === "legacy-after-scrub" ? lock + ".removing" : lock;
FileLockTestHooks.nativeQuarantineBindings = () => ({
  snapshotDirectoryTree,
  exactRemoveDirectoryTree(target, snapshot) {
    if (target !== removalTarget) return exactRemoveDirectoryTree(target, snapshot);
    if (Bun.file(lock + ".removing.owner").size === 0) throw new Error("owner not prepublished");
    if (snapshot.entries.length !== 2) throw new Error("captured tree was mutated");
    if (process.env.REMOVAL_CRASH_PHASE === "after-rename") {
      if (!renameDirectoryNoReplacePath(lock, lock + ".removing").ok) throw new Error("rename refused");
    } else if (process.env.REMOVAL_CRASH_PHASE.endsWith("after-scrub")) {
      const removed = exactRemoveDirectoryTree(target, snapshot);
      if (removed.code !== "cleanup_pending" || !removed.payloadDurable) throw new Error("scrub refused");
    }
    process.kill(process.pid, "SIGKILL");
    throw new Error("SIGKILL did not terminate remover");
  }
});
await acquireFileLock(file, { retries: 2, retryDelayMs: 1 });
`,
		],
		{
			cwd: path.resolve(import.meta.dir, "../../.."),
			env: { ...process.env, LOCKED_FILE: file, REMOVAL_CRASH_PHASE: phase },
			stdout: "pipe",
			stderr: "pipe",
		},
	);
	const code = await child.exited;
	const stderr = await new Response(child.stderr).text();
	expect(stderr).toBe("");
	expect(code).not.toBe(0);
	const observedOwner = ((await Bun.file(`${transition}.owner`).json()) as { owner: FileLockOwnerToken }).owner;
	expect(observedOwner?.pid).toBe(child.pid);
	expect(observedOwner?.process_incarnation).toBeString();
	const retained = phase === "before-rename" ? lock : transition;
	expect(await Bun.file(path.join(retained, "info")).text()).toBe(
		phase.endsWith("after-scrub") ? "" : JSON.stringify(deadOwner),
	);
	const release = await acquireFileLock(file, { retries: 2, retryDelayMs: 1 });
	expect(await fs.exists(transition)).toBe(false);
	expect(await fs.exists(`${transition}.owner`)).toBe(false);
	await release();
});

test("real acquire reclaims an empty stale ownerless transition", async () => {
	const { file, transition } = await fixture();
	await fs.mkdir(transition);
	const old = new Date(Date.now() - 120_000);
	await fs.utimes(transition, old, old);
	const release = await acquireFileLock(file, { retries: 2, retryDelayMs: 1 });
	expect(await fs.exists(transition)).toBe(false);
	await release();
});

test("real acquire retains an empty ownerless transition within grace", async () => {
	const { file, transition } = await fixture();
	await fs.mkdir(transition);
	const recent = new Date(Date.now() - 1_000);
	await fs.utimes(transition, recent, recent);
	await expect(acquireFileLock(file, { retries: 2, retryDelayMs: 1 })).rejects.toMatchObject({
		code: "acquire_timeout",
		orphanPath: transition,
	});
	expect(await fs.readdir(transition)).toEqual([]);
});

test("ownerless adoption refuses a concurrent live replacement and its sibling claim", async () => {
	const { file, transition } = await fixture();
	await fs.mkdir(transition);
	const old = new Date(Date.now() - 120_000);
	await fs.utimes(transition, old, old);
	let replaced = false;
	let liveRecord = "";
	FileLockTestHooks.beforeRemovalOwnerPublish = async target => {
		if (target !== transition || replaced) return;
		replaced = true;
		await fs.rename(transition, `${transition}.original`);
		await fs.mkdir(transition);
		await fs.utimes(transition, old, old);
		await record(transition, { pid: process.pid, timestamp: Date.now(), owner_token: "live-replacement" });
		liveRecord = await Bun.file(`${transition}.owner`).text();
	};
	await expect(acquireFileLock(file, { retries: 2, retryDelayMs: 1 })).rejects.toMatchObject({
		orphanPath: transition,
	});
	expect(replaced).toBe(true);
	expect(await fs.readdir(transition)).toEqual([]);
	expect(await Bun.file(`${transition}.owner`).text()).toBe(liveRecord);
});

test("a dead sibling record cannot authorize a replacement root", async () => {
	const { file, transition } = await fixture();
	await fs.mkdir(transition);
	await record(transition, deadOwner);
	await fs.rename(transition, `${transition}.original`);
	await fs.mkdir(transition);
	await Bun.write(path.join(transition, "payload"), "replacement payload");
	await expect(acquireFileLock(file, { retries: 2, retryDelayMs: 1 })).rejects.toMatchObject({
		code: "acquire_timeout",
		orphanPath: transition,
	});
	expect(await Bun.file(path.join(transition, "payload")).text()).toBe("replacement payload");
	expect(await fs.exists(`${transition}.owner`)).toBe(true);
});

test("a foreign remover is never probed or displaced using local pid evidence", async () => {
	const { file, transition } = await fixture();
	await fs.mkdir(transition);
	await Bun.write(path.join(transition, "payload"), "foreign payload");
	await record(transition, { ...deadOwner, owner_host_id: "foreign-host" });
	await expect(
		acquireFileLock(file, { ownerHostId: "local-host", retries: 2, retryDelayMs: 1 }),
	).rejects.toMatchObject({
		code: "acquire_timeout",
		orphanPath: transition,
	});
	expect(await Bun.file(path.join(transition, "payload")).text()).toBe("foreign payload");
});

test.each(["local-host", "previous-local-host"])("dead %s remover is adopted on the same installation", async host => {
	const { file, transition } = await fixture();
	await fs.mkdir(transition);
	await Bun.write(path.join(transition, "payload"), "dead payload");
	await record(transition, { ...deadOwner, owner_host_id: host });
	const release = await acquireFileLock(file, {
		ownerHostId: "local-host",
		previousOwnerHostIds: ["previous-local-host"],
		retries: 2,
		retryDelayMs: 1,
	});
	expect(await fs.exists(transition)).toBe(false);
	expect(await fs.exists(`${transition}.owner`)).toBe(false);
	await release();
});

for (const payload of ["", "unproven payload"]) {
	test(`real acquire retains non-empty ownerless transition (${JSON.stringify(payload)})`, async () => {
		const { file, transition } = await fixture();
		await fs.mkdir(transition);
		await Bun.write(path.join(transition, "info"), payload);
		const old = new Date(Date.now() - 120_000);
		await fs.utimes(path.join(transition, "info"), old, old);
		await fs.utimes(transition, old, old);
		await expect(acquireFileLock(file, { retries: 2, retryDelayMs: 1 })).rejects.toMatchObject({
			orphanPath: transition,
		});
		expect(await Bun.file(path.join(transition, "info")).text()).toBe(payload);
	});
}

/**
 * A live remover's `.removing.owner` record outlives its tree: the record is cleared only
 * after native removal returns. A lock acquired in that window must still release.
 */
async function liveRemoverRecord(transition: string): Promise<void> {
	const incarnation = nativeProcessBindings().Process.fromPid(process.pid)?.incarnation;
	expect(incarnation).toBeString();
	await Bun.write(
		`${transition}.owner`,
		JSON.stringify({
			owner: { pid: process.pid, timestamp: Date.now(), process_incarnation: incarnation },
			rootDev: "0",
			rootIno: "0",
		}),
	);
}

async function lingeringLiveRemoverRecord(transition: string, clearAfterMs: number): Promise<void> {
	await liveRemoverRecord(transition);
	setTimeout(() => void fs.rm(`${transition}.owner`, { force: true }), clearAfterMs);
}

async function waitForAbsence(target: string, timeoutMs: number): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (!(await fs.exists(target))) return true;
		await Bun.sleep(25);
	}
	return !(await fs.exists(target));
}

test("release retries behind a live remover's lingering record instead of reporting owner_changed", async () => {
	const { file, lock, transition } = await fixture();
	const release = await acquireFileLock(file, { retries: 2, retryDelayMs: 1 });
	await lingeringLiveRemoverRecord(transition, 100);
	await release();
	expect(await fs.exists(lock)).toBe(false);
});

test.skipIf(process.platform === "win32")(
	"release retries behind a foreign remover's lingering sidecar without removing it",
	async () => {
		const { file, lock, transition } = await fixture();
		const release = await acquireFileLock(file, { ownerHostId: "local-host", retries: 2, retryDelayMs: 1 });
		const recordBytes = JSON.stringify({
			owner: { ...deadOwner, owner_host_id: "foreign-host" },
			rootDev: "0",
			rootIno: "0",
		});
		await Bun.write(`${transition}.owner`, recordBytes);

		let settled = false;
		const releasePromise = release();
		const observedRelease = releasePromise.then(
			() => {
				settled = true;
			},
			() => {
				settled = true;
			},
		);
		await Bun.sleep(75);
		expect(settled).toBe(false);
		expect(await Bun.file(`${transition}.owner`).text()).toBe(recordBytes);
		await fs.rm(`${transition}.owner`);
		await observedRelease;

		expect(await fs.exists(lock)).toBe(false);
	},
);

test("a release that outlasts its retry budget finishes in the background without reacquisition", async () => {
	const { file, lock, transition } = await fixture();
	const release = await acquireFileLock(file, { retries: 2, retryDelayMs: 1 });
	await lingeringLiveRemoverRecord(transition, 1_000);
	await expect(release()).rejects.toThrow("removal_record_busy");
	expect(await fs.exists(lock)).toBe(true);
	expect(await waitForAbsence(lock, 4_000)).toBe(true);
});

test("background release retries never remove a successor generation", async () => {
	const { file, lock } = await fixture();
	const release = await acquireFileLock(file, { retries: 2, retryDelayMs: 1 });
	const successor = { pid: process.pid, timestamp: Date.now() + 1_000, owner_token: "successor" };
	await Bun.write(path.join(lock, "info"), JSON.stringify(successor));
	await expect(release()).rejects.toThrow("Failed to release file lock: owner_changed.");
	await Bun.sleep(1_500);
	expect(await Bun.file(path.join(lock, "info")).json()).toEqual(successor);
});

test("background release retries do not authorize a copied-info replacement root", async () => {
	const { file, lock, transition } = await fixture();
	const release = await acquireFileLock(file, { retries: 2, retryDelayMs: 1 });
	const originalInfo = await Bun.file(path.join(lock, "info")).text();
	controlReleasePendingRetries();
	await liveRemoverRecord(transition);
	await expect(release()).rejects.toThrow("removal_record_busy");

	await fs.rename(lock, `${lock}.original`);
	await fs.mkdir(lock);
	await Bun.write(path.join(lock, "info"), originalInfo);
	let replacementSnapshots = 0;
	FileLockTestHooks.nativeQuarantineBindings = () => ({
		snapshotDirectoryTree(target) {
			if (target === lock) replacementSnapshots++;
			return snapshotDirectoryTree(target);
		},
		exactRemoveDirectoryTree,
	});
	await fs.rm(`${transition}.owner`);
	await runNextControlledReleaseRetry();

	expect(replacementSnapshots).toBe(1);
	expect(await Bun.file(path.join(lock, "info")).text()).toBe(originalInfo);
	expect(await Bun.file(path.join(`${lock}.original`, "info")).text()).toBe(originalInfo);
	expect(await fs.exists(lock)).toBe(true);
	expect(await fs.exists(`${lock}.original`)).toBe(true);
});

test("explicit pending release retries do not authorize a copied-info replacement root", async () => {
	const { file, lock, transition } = await fixture();
	const release = await acquireFileLock(file, { retries: 2, retryDelayMs: 1 });
	const originalInfo = await Bun.file(path.join(lock, "info")).text();
	controlReleasePendingRetries();
	await liveRemoverRecord(transition);
	await expect(release()).rejects.toThrow("removal_record_busy");

	await fs.rename(lock, `${lock}.original`);
	await fs.mkdir(lock);
	await Bun.write(path.join(lock, "info"), originalInfo);
	await fs.rm(`${transition}.owner`);
	await expect(release()).rejects.toThrow("Failed to release file lock: owner_changed.");

	expect(await Bun.file(path.join(lock, "info")).text()).toBe(originalInfo);
	expect(await Bun.file(path.join(`${lock}.original`, "info")).text()).toBe(originalInfo);
	expect(await fs.exists(lock)).toBe(true);
	expect(await fs.exists(`${lock}.original`)).toBe(true);
});

test("a pending release cannot capture identity after its initial capture fails", async () => {
	const { file, lock } = await fixture();
	const release = await acquireFileLock(file, { retries: 2, retryDelayMs: 1 });
	const originalInfo = await Bun.file(path.join(lock, "info")).text();
	controlReleasePendingRetries();
	const lstat = vi
		.spyOn(fs, "lstat")
		.mockRejectedValueOnce(Object.assign(new Error("permission denied"), { code: "EACCES" }));

	await expect(release()).rejects.toThrow("Failed to release file lock: owner_changed.");
	expect(lstat.mock.calls[0]).toEqual([lock, { bigint: true }]);
	lstat.mockRestore();
	await expect(release()).rejects.toThrow("Failed to release file lock: owner_changed.");

	expect(await Bun.file(path.join(lock, "info")).text()).toBe(originalInfo);
	expect(await fs.exists(lock)).toBe(true);
});
