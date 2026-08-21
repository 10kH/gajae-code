import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as native from "@gajae-code/natives";
import { ArtifactManager } from "../src/session/artifacts";
import {
	ManagedSessionDescendantStore,
	managedDirectoryRoot,
	publishManagedFileNoReplace,
	publishManagedFileNoReplaceSync,
	reapScrubbedProtocolRemnants,
	reapScrubbedProtocolRemnantsSync,
} from "../src/session/internal/managed-session-storage";

const REMNANT_PREFIX = ".gjc-exact-unlink-placeholder-";

async function withTempDir<T>(prefix: string, run: (dir: string) => Promise<T>): Promise<T> {
	const dir = await fsp.mkdtemp(path.join(os.tmpdir(), prefix));
	try {
		return await run(dir);
	} finally {
		await fsp.rm(dir, { recursive: true, force: true });
	}
}

async function seedRemnant(
	dir: string,
	name: string,
	ageMs: number,
	bytes: Uint8Array = new Uint8Array(),
): Promise<string> {
	const pathname = path.join(dir, name);
	await fsp.writeFile(pathname, bytes, { mode: 0o600 });
	const stamp = new Date(Date.now() - ageMs);
	await fsp.utimes(pathname, stamp, stamp);
	return pathname;
}

async function waitFor(condition: () => Promise<boolean>, timeoutMs = 10_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (await condition()) return;
		await Bun.sleep(25);
	}
	throw new Error("condition not met before timeout");
}

describe("async native no-replace publication boundary (issue #4394)", () => {
	it("renameNoReplacePathAsync publishes and never settles from a microtask", async () => {
		await withTempDir("gjc-async-rename-", async dir => {
			const staging = path.join(dir, "staging");
			const destination = path.join(dir, "published");
			await fsp.writeFile(staging, "payload");

			let settled = false;
			const pending = native.renameNoReplacePathAsync(staging, destination).then(result => {
				settled = true;
				return result;
			});
			// A libuv blocking-pool completion is a macrotask: draining microtasks
			// must never observe settlement, which is exactly the property that keeps
			// the resident event loop unblocked during publication.
			await Promise.resolve();
			await Promise.resolve();
			expect(settled).toBe(false);

			const result = await pending;
			expect(result.ok).toBe(true);
			expect(await fsp.readFile(destination, "utf8")).toBe("payload");
			expect(fs.existsSync(staging)).toBe(false);
		});
	});

	it("renameNoReplacePathAsync refuses an existing destination without replacing it", async () => {
		await withTempDir("gjc-async-rename-conflict-", async dir => {
			const staging = path.join(dir, "staging");
			const destination = path.join(dir, "published");
			await fsp.writeFile(staging, "successor");
			await fsp.writeFile(destination, "predecessor");

			const result = await native.renameNoReplacePathAsync(staging, destination);
			expect(result.ok).toBe(false);
			expect(result.mutationState).toBe("not_committed");
			expect(await fsp.readFile(destination, "utf8")).toBe("predecessor");
		});
	});

	it("publishManagedFileNoReplace crosses the threadpool boundary and matches the sync twin", async () => {
		await withTempDir("gjc-async-publish-", async dir => {
			const destination = path.join(dir, "generation.output");
			const bytes = new TextEncoder().encode("managed-output");

			let settled = false;
			const pending = publishManagedFileNoReplace(destination, bytes).then(() => {
				settled = true;
			});
			await Promise.resolve();
			await Promise.resolve();
			expect(settled).toBe(false);
			await pending;

			expect(await fsp.readFile(destination)).toEqual(Buffer.from(bytes));
			// No staging object may survive a committed publication.
			expect((await fsp.readdir(dir)).filter(name => name.includes(".staging"))).toEqual([]);

			// The sync twin publishes identical bytes under the same protocol.
			const syncDestination = path.join(dir, "sync.output");
			publishManagedFileNoReplaceSync(syncDestination, bytes);
			expect(await fsp.readFile(syncDestination)).toEqual(Buffer.from(bytes));
		});
	});

	it("publishManagedFileNoReplace rejects an existing destination as destination_conflict", async () => {
		await withTempDir("gjc-async-publish-conflict-", async dir => {
			const destination = path.join(dir, "generation.output");
			publishManagedFileNoReplaceSync(destination, new TextEncoder().encode("first"));
			await expect(publishManagedFileNoReplace(destination, new TextEncoder().encode("second"))).rejects.toThrow(
				"destination_conflict",
			);
			expect(await fsp.readFile(destination, "utf8")).toBe("first");
		});
	});

	it("yields macrotask turns to the event loop while a publication is in flight", async () => {
		await withTempDir("gjc-async-publish-liveness-", async dir => {
			const bytes = new Uint8Array(4 * 1024 * 1024).fill(0x61);
			let settled = 0;
			const publications = Array.from({ length: 8 }, (_, index) =>
				publishManagedFileNoReplace(path.join(dir, `generation-${index}.output`), bytes).then(() => {
					settled += 1;
				}),
			);
			// Each publication is a chain of sequential threadpool round trips, so a
			// zero-delay timer (one macrotask turn) must fire before any of them can
			// settle. The pre-fix chain ran synchronously and starved exactly these
			// turns, which is what froze await timeouts in issue #4394.
			await Bun.sleep(0);
			expect(settled).toBe(0);
			await Bun.sleep(0);
			await Promise.all(publications);
			expect(settled).toBe(8);
		});
	});
});

describe("scrubbed protocol remnant reaping (issue #4394)", () => {
	it("reaps aged zero-byte remnants and retains everything else", async () => {
		await withTempDir("gjc-remnant-reap-", async dir => {
			const aged = await seedRemnant(dir, `${REMNANT_PREFIX}aged`, 60 * 60 * 1000);
			const fresh = await seedRemnant(dir, `${REMNANT_PREFIX}fresh`, 0);
			const payload = await seedRemnant(dir, `${REMNANT_PREFIX}payload`, 60 * 60 * 1000, new Uint8Array([1]));
			const ordinary = path.join(dir, "session.jsonl");
			await fsp.writeFile(ordinary, "transcript");

			const result = await reapScrubbedProtocolRemnants(dir);

			expect(result).toEqual({ reaped: 1, failures: 0 });
			expect(fs.existsSync(aged)).toBe(false);
			expect(fs.existsSync(fresh)).toBe(true);
			expect(fs.existsSync(payload)).toBe(true);
			expect(fs.existsSync(ordinary)).toBe(true);
		});
	});

	it("matches the sync reaper's result on the same directory shape", async () => {
		await withTempDir("gjc-remnant-parity-", async dir => {
			for (let index = 0; index < 4; index++) {
				await seedRemnant(dir, `${REMNANT_PREFIX}aged-${index}`, 60 * 60 * 1000);
			}
			await seedRemnant(dir, `${REMNANT_PREFIX}fresh`, 0);
			const asyncResult = await reapScrubbedProtocolRemnants(dir);
			for (let index = 0; index < 4; index++) {
				await seedRemnant(dir, `${REMNANT_PREFIX}aged-${index}`, 60 * 60 * 1000);
			}
			const syncResult = reapScrubbedProtocolRemnantsSync(dir);
			expect(asyncResult).toEqual(syncResult);
			expect(asyncResult).toEqual({ reaped: 4, failures: 0 });
		});
	});

	it("drains a directory larger than the yield batch without missing entries", async () => {
		await withTempDir("gjc-remnant-bounded-", async dir => {
			const count = 600;
			for (let index = 0; index < count; index++) {
				await seedRemnant(dir, `${REMNANT_PREFIX}${index.toString().padStart(4, "0")}`, 60 * 60 * 1000);
			}
			const result = await reapScrubbedProtocolRemnants(dir);
			expect(result).toEqual({ reaped: count, failures: 0 });
			expect((await fsp.readdir(dir)).filter(name => name.startsWith(REMNANT_PREFIX))).toEqual([]);
		});
	});

	it("treats a missing directory as a benign no-op", async () => {
		const missing = path.join(os.tmpdir(), `gjc-remnant-missing-${Date.now()}`);
		expect(await reapScrubbedProtocolRemnants(missing)).toEqual({ reaped: 0, failures: 0 });
	});

	it("store mutations schedule best-effort reaping of the bound per-session directory", async () => {
		await withTempDir("gjc-remnant-store-", async dir => {
			const sessionDir = path.join(dir, "session");
			await fsp.mkdir(sessionDir, { mode: 0o700 });
			const aged = await seedRemnant(sessionDir, `${REMNANT_PREFIX}aged`, 60 * 60 * 1000);
			const fresh = await seedRemnant(sessionDir, `${REMNANT_PREFIX}fresh`, 0);

			const store = new ManagedSessionDescendantStore(managedDirectoryRoot(dir), sessionDir);
			store.publishNoReplaceSync("session.jsonl", Buffer.from("transcript\n"));

			await waitFor(async () => !fs.existsSync(aged));
			// The age gate still protects in-flight protocol steps.
			expect(fs.existsSync(fresh)).toBe(true);
			expect(await fsp.readFile(path.join(sessionDir, "session.jsonl"), "utf8")).toBe("transcript\n");
		});
	});

	// Reproduces the observed production deadlock: a long-lived session scope
	// accumulated 50,003 dirents of which 47,043 were inert zero-byte write-protocol
	// remnants and 0 were receipts. The per-mutation receipt scan counted every
	// dirent, so it threw `managed_replace_cleanup_receipt_limit_exceeded` before
	// examining a single receipt, and the remnant reaper -- the only thing that could
	// shrink the directory -- was scheduled after that throw and never ran. Every
	// mutation then failed permanently, tool-output eviction could not persist, and
	// the retained originals drove the session into the emergency heap floor.
	it("keeps mutating a scope saturated with inert remnants and reaps them", async () => {
		await withTempDir("gjc-remnant-saturated-", async dir => {
			const sessionDir = path.join(dir, "session");
			await fsp.mkdir(sessionDir, { mode: 0o700 });

			// Saturate the directory well past the receipt scan limit with aged,
			// zero-byte remnants and no receipts at all -- the production shape.
			const remnantCount = 1200;
			const aged: string[] = [];
			for (let index = 0; index < remnantCount; index++) {
				aged.push(await seedRemnant(sessionDir, `${REMNANT_PREFIX}sat-${index}`, 60 * 60 * 1000));
			}
			expect(fs.readdirSync(sessionDir).length).toBe(remnantCount);

			const store = new ManagedSessionDescendantStore(managedDirectoryRoot(dir), sessionDir);
			// The mutation must succeed rather than throw the receipt-limit error.
			store.publishNoReplaceSync("session.jsonl", Buffer.from("transcript\n"));
			expect(await fsp.readFile(path.join(sessionDir, "session.jsonl"), "utf8")).toBe("transcript\n");

			// Reaping was reachable, so the scope drains instead of staying wedged.
			await waitFor(async () => !fs.existsSync(aged[0] as string));
			await waitFor(async () => !fs.existsSync(aged[remnantCount - 1] as string));

			// A subsequent mutation still works on the drained scope.
			store.publishNoReplaceSync("second.jsonl", Buffer.from("second\n"));
			expect(await fsp.readFile(path.join(sessionDir, "second.jsonl"), "utf8")).toBe("second\n");
		});
	});
});

describe("managed output generation publication over the async boundary", () => {
	it("publishes selector, output, and metadata through the async path", async () => {
		await withTempDir("gjc-managed-generation-", async dir => {
			const artifactsDir = path.join(dir, "artifacts");
			const store = new ManagedSessionDescendantStore(managedDirectoryRoot(dir), artifactsDir);
			const manager = new ArtifactManager(store);

			const output = new TextEncoder().encode("leaf subagent output");
			const metadata = new TextEncoder().encode(JSON.stringify({ tool: "task", status: "complete" }));
			await manager.publishManagedOutputGeneration("task-1.selector", "task-1", output, metadata);

			const selector = JSON.parse(await fsp.readFile(path.join(artifactsDir, "task-1.selector"), "utf8")) as {
				outputFilename: string;
				metadataFilename: string;
			};
			expect(selector.outputFilename.startsWith("task-1.")).toBe(true);
			expect(await fsp.readFile(path.join(artifactsDir, selector.outputFilename))).toEqual(Buffer.from(output));
			expect(await fsp.readFile(path.join(artifactsDir, selector.metadataFilename))).toEqual(Buffer.from(metadata));

			// A second generation replaces the selector and retires the prior pair.
			const secondOutput = new TextEncoder().encode("superseding output");
			await manager.publishManagedOutputGeneration("task-1.selector", "task-1", secondOutput, metadata);
			const secondSelector = JSON.parse(await fsp.readFile(path.join(artifactsDir, "task-1.selector"), "utf8")) as {
				outputFilename: string;
				metadataFilename: string;
			};
			expect(secondSelector.outputFilename).not.toBe(selector.outputFilename);
			expect(await fsp.readFile(path.join(artifactsDir, secondSelector.outputFilename))).toEqual(
				Buffer.from(secondOutput),
			);
			expect(fs.existsSync(path.join(artifactsDir, selector.outputFilename))).toBe(false);
			expect(fs.existsSync(path.join(artifactsDir, selector.metadataFilename))).toBe(false);
		});
	});
});
