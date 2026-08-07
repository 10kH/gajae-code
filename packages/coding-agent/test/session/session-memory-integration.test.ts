import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import { TempDir } from "@gajae-code/utils";
import { SessionManager } from "../../src/session/session-manager";
import { FileSessionStorage } from "../../src/session/session-storage";

describe("SessionManager cold sidecar integration", () => {
	it("retires a compacted prefix on resume and lazily reloads exact transcript entries", async () => {
		const tempDir = TempDir.createSync("@pi-session-memory-sidecar-");
		const storage = new FileSessionStorage();
		const sessionFile = path.join(tempDir.path(), "session.jsonl");
		const now = new Date().toISOString();
		const ids = Array.from({ length: 200 }, (_, index) => `message-${index.toString().padStart(4, "0")}`);
		const entries: Array<Record<string, unknown>> = [
			{ type: "session", version: 5, id: "sidecar-session", timestamp: now, cwd: tempDir.path() },
			...ids.map((id, index) => ({
				type: "message",
				id,
				parentId: index === 0 ? null : ids[index - 1],
				timestamp: now,
				message: { role: "user", content: `cold-${index}-${"x".repeat(256)}`, timestamp: index },
			})),
			{
				type: "model_change",
				id: "reviewer-model",
				parentId: ids.at(-1),
				timestamp: now,
				model: "anthropic/claude-sonnet-4-5",
				role: "reviewer",
			},
			{
				type: "compaction",
				id: "compaction-0001",
				parentId: "reviewer-model",
				timestamp: now,
				summary: "summary",
				firstKeptEntryId: ids.at(-1),
				tokensBefore: 10_000,
			},
		];
		storage.writeTextSync(sessionFile, `${entries.map(entry => JSON.stringify(entry)).join("\n")}\n`);

		const manager = await SessionManager.open(
			sessionFile,
			SessionManager.explicitDestination(tempDir.path()),
			storage,
		);
		try {
			expect(manager.hotRetainedMessageCharsForTests()).toBeGreaterThan(50_000);
			manager.setSessionMemoryMode("enabled");
			expect(storage.existsSync(`${sessionFile}.spill.idx`)).toBe(true);
			expect(storage.existsSync(`${sessionFile}.spill.tail`)).toBe(true);
			const memoryStats = manager.getSessionMemoryStats();
			expect(memoryStats.sidecarEnabled).toBe(true);
			expect(memoryStats.totalAccountedBytes).toBeLessThanOrEqual(64 * 1024 * 1024);
			expect(manager.getLastModelChangeRole()).toBe("reviewer");
			expect(manager.hotRetainedMessageCharsForTests()).toBeLessThan(1024);

			const cold = manager.getEntry(ids[0]);
			expect(cold).toMatchObject({ id: ids[0], type: "message" });
			if (cold?.type !== "message" || !("content" in cold.message)) throw new Error("Expected cold message entry");
			expect(cold.message.content).toBe(`cold-0-${"x".repeat(256)}`);

			const branch = manager.getBranch();
			expect(branch[0]?.id).toBe(ids[0]);
			expect(branch.at(-1)?.type).toBe("compaction");
			expect(manager.getEntriesForExport()).toHaveLength(202);
			await manager.rewriteEntries();
			const rewrittenEntries = storage
				.readTextSync(sessionFile)
				.trimEnd()
				.split("\n")
				.map(line => JSON.parse(line) as { id?: string });
			expect(rewrittenEntries).toHaveLength(203);
			expect(rewrittenEntries.some(entry => entry.id === ids[0])).toBe(true);
			manager.branch(ids[0]);
			expect(manager.getBranch().map(entry => entry.id)).toEqual([ids[0]]);
			expect(manager.getLastModelChangeRole()).toBeUndefined();
			manager.setSessionMemoryMode("off");
			expect(storage.existsSync(`${sessionFile}.spill.idx`)).toBe(false);
			expect(storage.existsSync(`${sessionFile}.spill.tail`)).toBe(false);
			expect(manager.hotRetainedMessageCharsForTests()).toBeGreaterThan(50_000);
		} finally {
			await manager.close();
			tempDir.removeSync();
		}
	});

	it("keeps the resident hot region flat for a 60k-entry compacted transcript", async () => {
		const tempDir = TempDir.createSync("@pi-session-memory-60k-");
		const storage = new FileSessionStorage();
		const sessionFile = path.join(tempDir.path(), "large.jsonl");
		const writer = storage.openWriter(sessionFile, { flags: "w" });
		const now = new Date().toISOString();
		writer.writeLineSync(
			`${JSON.stringify({ type: "session", version: 5, id: "large-session", timestamp: now, cwd: tempDir.path() })}\n`,
		);
		let priorId: string | null = null;
		for (let index = 0; index < 60_000; index++) {
			const id = `entry-${index.toString().padStart(8, "0")}`;
			writer.writeLineSync(
				`${JSON.stringify({
					type: "message",
					id,
					parentId: priorId,
					timestamp: now,
					message: { role: "user", content: `record-${index}`, timestamp: index },
				})}\n`,
			);
			priorId = id;
		}
		writer.writeLineSync(
			`${JSON.stringify({
				type: "compaction",
				id: "large-compaction",
				parentId: priorId,
				timestamp: now,
				summary: "summary",
				firstKeptEntryId: priorId,
				tokensBefore: 1_000_000,
			})}\n`,
		);
		writer.closeSync();

		const manager = await SessionManager.open(
			sessionFile,
			SessionManager.explicitDestination(tempDir.path()),
			storage,
		);
		try {
			manager.setSessionMemoryMode("enabled");
			expect(manager.hotRetainedMessageCharsForTests()).toBeLessThan(1024);
			const memoryStats = manager.getSessionMemoryStats();
			expect(memoryStats.sidecarEnabled).toBe(true);
			expect(memoryStats.totalAccountedBytes).toBeLessThanOrEqual(64 * 1024 * 1024);
			const accountedBeforeAppend = memoryStats.totalAccountedBytes;
			manager.appendMessage({ role: "user", content: "post-retirement", timestamp: Date.now() });
			expect(manager.getSessionMemoryStats().totalAccountedBytes).toBeGreaterThan(accountedBeforeAppend);
			expect(manager.getEntry("entry-00000000")).toMatchObject({ id: "entry-00000000", type: "message" });
		} finally {
			await manager.close();
			tempDir.removeSync();
		}
	}, 30_000);

	it("retires cold entries immediately after a persisted live compaction", async () => {
		const tempDir = TempDir.createSync("@pi-session-memory-live-");
		const storage = new FileSessionStorage();
		const manager = SessionManager.create(
			tempDir.path(),
			SessionManager.explicitDestination(tempDir.path()),
			storage,
		);
		try {
			manager.setSessionMemoryMode("enabled");
			manager.appendMessage({
				role: "assistant",
				content: [{ type: "text", text: "published" }],
				api: "anthropic-messages",
				provider: "anthropic",
				model: "claude-sonnet-4-5",
				usage: {
					input: 0,
					output: 0,
					cacheRead: 0,
					cacheWrite: 0,
					totalTokens: 0,
					cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
				},
				stopReason: "stop",
				timestamp: Date.now(),
			});
			let firstKeptEntryId = "";
			for (let index = 0; index < 200; index++) {
				firstKeptEntryId = manager.appendMessage({
					role: "user",
					content: `live-${index}-${"x".repeat(256)}`,
					timestamp: Date.now(),
				});
			}
			manager.appendCompaction("summary", undefined, firstKeptEntryId, 10_000);

			const sessionFile = manager.getSessionFile();
			if (!sessionFile) throw new Error("Expected persisted live session");
			expect(storage.existsSync(`${sessionFile}.spill.idx`)).toBe(true);
			expect(storage.existsSync(`${sessionFile}.spill.tail`)).toBe(true);
			expect(manager.hotRetainedMessageCharsForTests()).toBeLessThan(1024);
			expect(manager.getSessionMemoryStats().sidecarEnabled).toBe(true);
		} finally {
			await manager.close();
			tempDir.removeSync();
		}
	});

	it("fails closed when the authoritative cold prefix changes after shadow indexing", async () => {
		const tempDir = TempDir.createSync("@pi-session-memory-mismatch-");
		const storage = new FileSessionStorage();
		const sessionFile = path.join(tempDir.path(), "mismatch.jsonl");
		const now = new Date().toISOString();
		const ids = Array.from({ length: 20 }, (_, index) => `mismatch-${index}`);
		const entries: Array<Record<string, unknown>> = [
			{ type: "session", version: 5, id: "mismatch-session", timestamp: now, cwd: tempDir.path() },
			...ids.map((id, index) => ({
				type: "message",
				id,
				parentId: index === 0 ? null : ids[index - 1],
				timestamp: now,
				message: { role: "user", content: `cold-${index}-${"x".repeat(1024)}`, timestamp: index },
			})),
			{
				type: "compaction",
				id: "mismatch-compaction",
				parentId: ids.at(-1),
				timestamp: now,
				summary: "summary",
				firstKeptEntryId: ids.at(-1),
				tokensBefore: 10_000,
			},
		];
		storage.writeTextSync(sessionFile, `${entries.map(entry => JSON.stringify(entry)).join("\n")}\n`);
		const manager = await SessionManager.open(
			sessionFile,
			SessionManager.explicitDestination(tempDir.path()),
			storage,
		);
		try {
			const changed = storage.readTextSync(sessionFile).replace("cold-0-", "told-0-");
			storage.writeTextSync(sessionFile, changed);
			manager.setSessionMemoryMode("enabled");
			expect(manager.getSessionMemoryStats().coldRetirementActive).toBe(false);
			expect(manager.getEntry(ids[0])).toMatchObject({ id: ids[0], type: "message" });
		} finally {
			await manager.close();
			tempDir.removeSync();
		}
	});

	it("keeps duplicate-id transcripts on the eager path", async () => {
		const tempDir = TempDir.createSync("@pi-session-memory-duplicates-");
		const storage = new FileSessionStorage();
		const sessionFile = path.join(tempDir.path(), "duplicates.jsonl");
		const now = new Date().toISOString();
		const entries: Array<Record<string, unknown>> = [
			{ type: "session", version: 5, id: "duplicate-session", timestamp: now, cwd: tempDir.path() },
			{
				type: "message",
				id: "duplicate",
				parentId: null,
				timestamp: now,
				message: { role: "user", content: "first", timestamp: 1 },
			},
			{
				type: "message",
				id: "duplicate",
				parentId: null,
				timestamp: now,
				message: { role: "user", content: "second", timestamp: 2 },
			},
			{
				type: "compaction",
				id: "duplicate-compaction",
				parentId: "duplicate",
				timestamp: now,
				summary: "summary",
				firstKeptEntryId: "duplicate",
				tokensBefore: 10,
			},
		];
		storage.writeTextSync(sessionFile, `${entries.map(entry => JSON.stringify(entry)).join("\n")}\n`);
		const manager = await SessionManager.open(
			sessionFile,
			SessionManager.explicitDestination(tempDir.path()),
			storage,
		);
		try {
			manager.setSessionMemoryMode("enabled");
			expect(storage.existsSync(`${sessionFile}.spill.idx`)).toBe(false);
			expect(manager.getSessionMemoryStats()).toMatchObject({ sidecarEnabled: false, sidecarIneligible: true });
			expect(manager.getEntriesForExport()).toHaveLength(3);
		} finally {
			await manager.close();
			tempDir.removeSync();
		}
	});
});
