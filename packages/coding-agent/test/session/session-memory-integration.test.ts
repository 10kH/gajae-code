import { describe, expect, it, vi } from "bun:test";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { TempDir } from "@gajae-code/utils";
import { SessionManager } from "../../src/session/session-manager";
import {
	FileSessionStorage,
	MemorySessionStorage,
	type StagedStreamingWriter,
} from "../../src/session/session-storage";

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

	it("keeps the resident hot region flat for a 120k-entry compacted transcript", async () => {
		const tempDir = TempDir.createSync("@pi-session-memory-60k-");
		const storage = new FileSessionStorage();
		const sessionFile = path.join(tempDir.path(), "large.jsonl");
		const writer = storage.openWriter(sessionFile, { flags: "w" });
		const now = new Date().toISOString();
		writer.writeLineSync(
			`${JSON.stringify({ type: "session", version: 5, id: "large-session", timestamp: now, cwd: tempDir.path() })}\n`,
		);
		let priorId: string | null = null;
		const soak = process.env.GJC_SESSION_MEMORY_SOAK === "1";
		const entryCount = soak ? 1_000_000 : 120_000;
		const firstId = soak ? "e0" : "entry-00000000";
		for (let index = 0; index < entryCount; index++) {
			const id = soak ? `e${index.toString(36)}` : `entry-${index.toString().padStart(8, "0")}`;
			writer.writeLineSync(
				`${JSON.stringify(
					soak
						? { type: "custom", id, customType: "x" }
						: {
								type: "message",
								id,
								parentId: priorId,
								timestamp: now,
								message: { role: "user", content: `record-${index}`, timestamp: index },
							},
				)}\n`,
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
			expect(manager.getEntry(firstId)).toMatchObject({ id: firstId, type: soak ? "custom" : "message" });
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

describe("active branch retirement boundary", () => {
	it("keeps the active branch eager when only an abandoned branch was compacted", async () => {
		const storage = new MemorySessionStorage();
		const sessionFile = "/sessions/abandoned-compaction.jsonl";
		const entries = [
			{ type: "session", version: 5, id: "branch-session", timestamp: "0", cwd: "/cwd" },
			{ type: "custom", id: "root", parentId: null, timestamp: "0", customType: "x" },
			{ type: "custom", id: "abandoned", parentId: "root", timestamp: "0", customType: "x" },
			{
				type: "compaction",
				id: "abandoned-compaction",
				parentId: "abandoned",
				timestamp: "0",
				summary: "summary",
				firstKeptEntryId: "abandoned",
				tokensBefore: 10,
			},
			{ type: "custom", id: "active", parentId: "root", timestamp: "0", customType: "x" },
		];
		storage.writeTextSync(sessionFile, `${entries.map(entry => JSON.stringify(entry)).join("\n")}\n`);
		const manager = await SessionManager.open(sessionFile, SessionManager.explicitDestination("/sessions"), storage);
		try {
			manager.setSessionMemoryMode("enabled");
			expect(manager.getSessionMemoryStats().coldRetirementActive).toBe(false);
			expect(manager.getEntries()).toHaveLength(4);
			expect(manager.getBranch().map(entry => entry.id)).toEqual(["root", "active"]);
		} finally {
			await manager.close();
		}
	});

	it("invalidates old sidecars before re-enabling on a branch without compaction", async () => {
		const storage = new MemorySessionStorage();
		const sessionFile = "/sessions/rebranch.jsonl";
		const entries = [
			{ type: "session", version: 5, id: "rebranch", timestamp: "0", cwd: "/cwd" },
			{ type: "custom", id: "root", parentId: null, timestamp: "0", customType: "x" },
			{ type: "custom", id: "old", parentId: "root", timestamp: "0", customType: "x" },
			{
				type: "compaction",
				id: "old-compaction",
				parentId: "old",
				timestamp: "0",
				summary: "summary",
				firstKeptEntryId: "old",
				tokensBefore: 10,
			},
		];
		storage.writeTextSync(sessionFile, `${entries.map(entry => JSON.stringify(entry)).join("\n")}\n`);
		const manager = await SessionManager.open(sessionFile, SessionManager.explicitDestination("/sessions"), storage);
		try {
			manager.setSessionMemoryMode("enabled");
			expect(manager.getSessionMemoryStats().coldRetirementActive).toBe(true);
			manager.branch("root");
			expect(manager.getSessionMemoryStats().coldRetirementActive).toBe(false);
			expect(storage.listFilesSync("/sessions", "*.spill.*")).toEqual([]);
			manager.setSessionMemoryMode("enabled");
			expect(manager.getSessionMemoryStats().coldRetirementActive).toBe(false);
			expect(manager.getEntries()).toHaveLength(3);
			expect(manager.getBranch().map(entry => entry.id)).toEqual(["root"]);
		} finally {
			await manager.close();
		}
	});
});

describe("bounded provider context traversal", () => {
	it("stops at the active compaction boundary without hydrating older cold entries", async () => {
		class CountingStorage extends MemorySessionStorage {
			rangeReads = 0;
			override readRangeSync(filePath: string, offset: number, length: number) {
				this.rangeReads++;
				return super.readRangeSync(filePath, offset, length);
			}
		}
		const storage = new CountingStorage();
		const sessionFile = "/sessions/context-boundary.jsonl";
		const entries = [
			{ type: "session", version: 5, id: "context-boundary", timestamp: "0", cwd: "/cwd" },
			{
				type: "message",
				id: "old-user",
				parentId: null,
				timestamp: "0",
				message: { role: "user", content: "old", timestamp: 1 },
			},
			{
				type: "message",
				id: "old-assistant",
				parentId: "old-user",
				timestamp: "0",
				message: {
					role: "assistant",
					content: [{ type: "text", text: "old answer" }],
					api: "x",
					provider: "x",
					model: "x",
					usage: {
						input: 1,
						output: 1,
						cacheRead: 0,
						cacheWrite: 0,
						totalTokens: 2,
						cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
					},
					stopReason: "stop",
					timestamp: 2,
				},
			},
			{
				type: "message",
				id: "kept",
				parentId: "old-assistant",
				timestamp: "0",
				message: { role: "user", content: "kept", timestamp: 3 },
			},
			{
				type: "compaction",
				id: "compaction",
				parentId: "kept",
				timestamp: "0",
				summary: "summary",
				firstKeptEntryId: "kept",
				tokensBefore: 10,
			},
			{
				type: "message",
				id: "after",
				parentId: "compaction",
				timestamp: "0",
				message: { role: "user", content: "after", timestamp: 4 },
			},
		];
		storage.writeTextSync(sessionFile, `${entries.map(entry => JSON.stringify(entry)).join("\n")}\n`);
		const manager = await SessionManager.open(sessionFile, SessionManager.explicitDestination("/sessions"), storage);
		try {
			manager.setSessionMemoryMode("enabled");
			storage.rangeReads = 0;
			const context = manager.buildSessionContext();
			expect(context.messages).toHaveLength(3);
			expect(storage.rangeReads).toBe(0);
		} finally {
			await manager.close();
		}
	});
});

it("reopens an enabled explicit session from authenticated hot-tail metadata", async () => {
	class CountingStorage extends MemorySessionStorage {
		rangeReads = 0;
		textReads = 0;
		override readRangeSync(filePath: string, offset: number, length: number) {
			this.rangeReads++;
			return super.readRangeSync(filePath, offset, length);
		}
		override readText(filePath: string) {
			this.textReads++;
			return super.readText(filePath);
		}
	}
	const storage = new CountingStorage();
	const sessionFile = "/sessions/lazy-reopen.jsonl";
	const records = [
		{ type: "session", version: 5, id: "lazy-reopen", timestamp: "0", cwd: "/cwd" },
		{
			type: "message",
			id: "old",
			parentId: null,
			timestamp: "0",
			message: { role: "user", content: "old", timestamp: 1 },
		},
		{
			type: "message",
			id: "kept",
			parentId: "old",
			timestamp: "0",
			message: { role: "user", content: "kept", timestamp: 2 },
		},
		{
			type: "compaction",
			id: "compaction",
			parentId: "kept",
			timestamp: "0",
			summary: "summary",
			firstKeptEntryId: "kept",
			tokensBefore: 10,
		},
		{
			type: "message",
			id: "after",
			parentId: "compaction",
			timestamp: "0",
			message: { role: "user", content: "after", timestamp: 3 },
		},
	];
	storage.writeTextSync(sessionFile, `${records.map(record => JSON.stringify(record)).join("\n")}\n`);
	const initial = await SessionManager.open(sessionFile, SessionManager.explicitDestination("/sessions"), storage);
	initial.setSessionMemoryMode("enabled");
	await initial.close();
	storage.textReads = 0;

	const reopened = await SessionManager.open(
		sessionFile,
		SessionManager.explicitDestination("/sessions"),
		storage,
		"copy-retain",
		"enabled",
	);
	try {
		expect(reopened.getSessionMemoryStats().coldRetirementActive).toBe(true);
		expect(reopened.getSessionMemoryStats()).toMatchObject({
			lazyReopenAttempted: true,
			lazyReopenSucceeded: true,
			lazyReopenFallbackReason: undefined,
		});
		storage.rangeReads = 0;
		expect(reopened.buildSessionContext().messages).toHaveLength(3);
		expect(storage.rangeReads).toBe(0);
		expect(storage.textReads).toBe(0);
		expect(reopened.getEntry("old")).toMatchObject({ id: "old" });
	} finally {
		await reopened.close();
	}
	const markerPath = `${sessionFile}.spill.commit`;
	const marker = JSON.parse(storage.readTextSync(markerPath)) as { reducer: { ttsr: { count: number } } };
	marker.reducer.ttsr.count = Number.NaN;
	storage.writeTextSync(markerPath, `${JSON.stringify(marker)}\n`);
	storage.textReads = 0;
	const fallback = await SessionManager.open(
		sessionFile,
		SessionManager.explicitDestination("/sessions"),
		storage,
		"copy-retain",
		"enabled",
	);
	try {
		expect(storage.textReads).toBeGreaterThan(0);
		expect(fallback.getSessionMemoryStats()).toMatchObject({
			lazyReopenAttempted: true,
			lazyReopenSucceeded: false,
			lazyReopenFallbackReason: "proof_invalid",
		});
		expect(fallback.buildSessionContext().messages).toHaveLength(3);
	} finally {
		await fallback.close();
	}
});

it("applies enabled retirement while constructing a direct fork", async () => {
	const storage = new MemorySessionStorage();
	const source = "/sessions/fork-source.jsonl";
	const records = [
		{ type: "session", version: 5, id: "fork-source", timestamp: "0", cwd: "/cwd" },
		{ type: "custom", id: "old", parentId: null, timestamp: "0", customType: "x", data: { text: "old" } },
		{ type: "custom", id: "kept", parentId: "old", timestamp: "0", customType: "x", data: { text: "kept" } },
		{
			type: "compaction",
			id: "compaction",
			parentId: "kept",
			timestamp: "0",
			summary: "summary",
			firstKeptEntryId: "kept",
			tokensBefore: 10,
		},
	];
	storage.writeTextSync(source, `${records.map(record => JSON.stringify(record)).join("\n")}\n`);
	const forked = await SessionManager.forkFrom(
		source,
		"/cwd",
		SessionManager.explicitDestination("/forks"),
		storage,
		"copy-retain",
		"enabled",
	);
	try {
		expect(forked.getSessionMemoryStats().coldRetirementActive).toBe(true);
		expect(forked.getEntry("old")).toMatchObject({ id: "old" });
	} finally {
		await forked.close();
	}
});

it("bounds the first enabled open with zero full-transcript reads and authentic sidecars", async () => {
	class CountingStorage extends MemorySessionStorage {
		rangeReads = 0;
		textReads = 0;
		textSyncReads = 0;
		bytesReads = 0;
		override readRangeSync(filePath: string, offset: number, length: number) {
			this.rangeReads++;
			return super.readRangeSync(filePath, offset, length);
		}
		override readText(filePath: string) {
			if (!filePath.includes(".spill.")) this.textReads++;
			return super.readText(filePath);
		}
		override readTextSync(filePath: string) {
			if (!filePath.includes(".spill.")) this.textSyncReads++;
			return super.readTextSync(filePath);
		}
		override readBytesSync(filePath: string) {
			if (!filePath.includes(".spill.")) this.bytesReads++;
			return super.readBytesSync(filePath);
		}
	}
	const storage = new CountingStorage();
	const sessionFile = "/sessions/bounded-first-open.jsonl";
	const now = "0";
	const records = [
		{ type: "session", version: 5, id: "bounded-first-open", timestamp: now, cwd: "/cwd" },
		{
			type: "message",
			id: "cold-old",
			parentId: null,
			timestamp: now,
			message: { role: "user", content: "cold old", timestamp: 1 },
		},
		{
			type: "message",
			id: "cold-kept",
			parentId: "cold-old",
			timestamp: now,
			message: { role: "user", content: "cold kept", timestamp: 2 },
		},
		{
			type: "compaction",
			id: "compaction",
			parentId: "cold-kept",
			timestamp: now,
			summary: "summary",
			firstKeptEntryId: "cold-kept",
			tokensBefore: 10,
		},
		{
			type: "message",
			id: "hot-after",
			parentId: "compaction",
			timestamp: now,
			message: {
				role: "assistant",
				content: "hot after",
				timestamp: 3,
				usage: { input: 5, output: 7, cacheRead: 1, cacheWrite: 0, premiumRequests: 0, cost: { total: 12 } },
			},
		},
		{ type: "label", id: "label", parentId: "hot-after", timestamp: now, targetId: "cold-old", label: "cold label" },
	];
	const transcript = `${records.map(record => JSON.stringify(record)).join("\n")}\n`;
	storage.writeTextSync(sessionFile, transcript);

	const manager = await SessionManager.open(
		sessionFile,
		SessionManager.explicitDestination("/sessions"),
		storage,
		"copy-retain",
		"enabled",
	);
	try {
		expect(storage.textReads).toBe(0);
		expect(storage.textSyncReads).toBe(0);
		expect(storage.bytesReads).toBe(0);
		expect(storage.rangeReads).toBeGreaterThan(0);
		expect(manager.getSessionMemoryStats()).toMatchObject({
			sidecarEnabled: true,
			coldRetirementActive: true,
			lazyReopenAttempted: true,
			lazyReopenSucceeded: true,
			lazyReopenFallbackReason: undefined,
			lastReopenTransition: { kind: "rebuild", reason: "bounded_first_open" },
		});
		const cold = manager.getEntry("cold-old");
		expect(cold).toMatchObject({ id: "cold-old", type: "message" });
		if (cold?.type !== "message" || !("content" in cold.message)) throw new Error("Expected cold message entry");
		expect(cold.message.content).toBe("cold old");
		expect(manager.buildSessionContext().messages).toHaveLength(3);
		expect(manager.getLabel("cold-old")).toBe("cold label");
		expect(manager.getUsageStatistics()).toMatchObject({
			input: 5,
			output: 7,
			cacheRead: 1,
			cacheWrite: 0,
			premiumRequests: 0,
			cost: 12,
		});
		const marker = JSON.parse(storage.readTextSync(`${sessionFile}.spill.commit`)) as {
			base: { baseDigest: string; baseEndOffset: number };
			transcriptSize: number;
			retirementFirstKeptEntryId: string;
			leafId: string;
			indexDigest: string;
		};
		expect(marker.base.baseEndOffset).toBe(transcript.indexOf(`${JSON.stringify(records[2])}\n`));
		expect(marker.base.baseDigest).toMatch(/^[0-9a-f]{64}$/);
		expect(marker.transcriptSize).toBe(Buffer.byteLength(transcript, "utf8"));
		expect(marker.retirementFirstKeptEntryId).toBe("cold-kept");
		expect(marker.leafId).toBe("label");

		// The commit authenticates the exact `.spill.idx` bytes (indexDigest).
		expect(marker.indexDigest).toBe(
			createHash("sha256")
				.update(storage.readBytesSync(`${sessionFile}.spill.idx`))
				.digest("hex"),
		);
	} finally {
		await manager.close();
	}

	// The marker published by the bounded first open is accepted by the existing
	// authenticated explicit lazy reopen path (exact offsets, digests, and the
	// rolling tail proof all round-trip).
	const exactIndexText = storage.readTextSync(`${sessionFile}.spill.idx`);
	storage.textReads = 0;
	storage.textSyncReads = 0;
	storage.bytesReads = 0;
	const reopened = await SessionManager.open(
		sessionFile,
		SessionManager.explicitDestination("/sessions"),
		storage,
		"copy-retain",
		"enabled",
	);
	try {
		expect(storage.textReads).toBe(0);
		expect(storage.textSyncReads).toBe(0);
		expect(storage.bytesReads).toBe(0);
		expect(reopened.getSessionMemoryStats()).toMatchObject({
			sidecarEnabled: true,
			coldRetirementActive: true,
			lazyReopenAttempted: true,
			lazyReopenSucceeded: true,
			lazyReopenFallbackReason: undefined,
			lastReopenTransition: { kind: "exact", reason: "descriptor_and_proof_match" },
		});
		storage.writeTextSync(`${sessionFile}.spill.idx`, `${exactIndexText}{}\n`);
		expect(reopened.getEntry("cold-old")).toBeUndefined();
		storage.writeTextSync(`${sessionFile}.spill.idx`, exactIndexText);
		expect(reopened.getEntry("cold-old")).toMatchObject({ id: "cold-old", type: "message" });
		expect(reopened.buildSessionContext().messages).toHaveLength(3);
		expect(reopened.getUsageStatistics()).toMatchObject({ cost: 12 });
	} finally {
		await reopened.close();
	}

	// A disposable index that no longer matches the committed indexDigest is
	// never adopted: the open fails closed to the eager authoritative path.
	storage.writeTextSync(`${sessionFile}.spill.idx`, `${storage.readTextSync(`${sessionFile}.spill.idx`)}{}\n`);
	storage.textReads = 0;
	storage.textSyncReads = 0;
	storage.bytesReads = 0;
	const corruptIndex = await SessionManager.open(
		sessionFile,
		SessionManager.explicitDestination("/sessions"),
		storage,
		"copy-retain",
		"enabled",
	);
	try {
		expect(storage.textReads).toBeGreaterThan(0);
		expect(corruptIndex.getSessionMemoryStats()).toMatchObject({
			lazyReopenAttempted: true,
			lazyReopenSucceeded: false,
			lazyReopenFallbackReason: "index_digest_mismatch",
		});
		expect(corruptIndex.getEntry("cold-old")).toMatchObject({ id: "cold-old", type: "message" });
	} finally {
		await corruptIndex.close();
	}
});

it("commits cold label clears and appended usage before exact reopen", async () => {
	const storage = new MemorySessionStorage();
	const sessionFile = "/sessions/metadata-append.jsonl";
	const records = [
		{ type: "session", version: 5, id: "metadata", timestamp: "0", cwd: "/cwd" },
		{
			type: "message",
			id: "cold",
			parentId: null,
			timestamp: "0",
			message: { role: "user", content: "cold", timestamp: 1 },
		},
		{
			type: "message",
			id: "kept",
			parentId: "cold",
			timestamp: "0",
			message: { role: "user", content: "kept", timestamp: 2 },
		},
		{
			type: "compaction",
			id: "compact",
			parentId: "kept",
			timestamp: "0",
			summary: "s",
			firstKeptEntryId: "kept",
			tokensBefore: 2,
		},
		{ type: "label", id: "label", parentId: "compact", timestamp: "0", targetId: "cold", label: "bookmark" },
	];
	storage.writeTextSync(sessionFile, `${records.map(record => JSON.stringify(record)).join("\n")}\n`);
	const manager = await SessionManager.open(
		sessionFile,
		SessionManager.explicitDestination("/sessions"),
		storage,
		"copy-retain",
		"enabled",
	);
	try {
		expect(manager.getLabel("cold")).toBe("bookmark");
		manager.appendLabelChange("cold", undefined);
		const assistantId = manager.appendMessage({
			role: "assistant",
			content: [{ type: "text", text: "done" }],
			timestamp: 3,
			usage: {
				input: 2,
				output: 3,
				cacheRead: 0,
				cacheWrite: 0,
				premiumRequests: 0,
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 5 },
			},
		} as unknown as Parameters<SessionManager["appendMessage"]>[0]);
		manager.appendCompaction("checkpoint", undefined, assistantId, 5);
		const marker = JSON.parse(storage.readTextSync(`${sessionFile}.spill.commit`)) as {
			labels: Array<[string, string]>;
			usageStatistics: { input: number; output: number; cost: number };
		};
		expect(marker.labels).not.toContainEqual(["cold", "bookmark"]);
		expect(marker.usageStatistics).toMatchObject({ input: 2, output: 3, cost: 5 });
	} finally {
		await manager.close();
	}

	const reopened = await SessionManager.open(
		sessionFile,
		SessionManager.explicitDestination("/sessions"),
		storage,
		"copy-retain",
		"enabled",
	);
	try {
		expect(reopened.getSessionMemoryStats()).toMatchObject({
			lazyReopenSucceeded: true,
			lazyReopenFallbackReason: undefined,
		});
		expect(reopened.getLabel("cold")).toBeUndefined();
		expect(reopened.getUsageStatistics()).toMatchObject({ input: 2, output: 3, cost: 5 });
	} finally {
		await reopened.close();
	}
});

it("fails closed to eager on a branched transcript during enabled first open", async () => {
	class CountingStorage extends MemorySessionStorage {
		textReads = 0;
		override readText(filePath: string) {
			this.textReads++;
			return super.readText(filePath);
		}
	}
	const storage = new CountingStorage();
	const sessionFile = "/sessions/branched-first-open.jsonl";
	const now = "0";
	const records = [
		{ type: "session", version: 5, id: "branched", timestamp: now, cwd: "/cwd" },
		{ type: "custom", id: "root", parentId: null, timestamp: now, customType: "x" },
		{ type: "custom", id: "kept", parentId: "root", timestamp: now, customType: "x" },
		{
			type: "compaction",
			id: "compaction",
			parentId: "kept",
			timestamp: now,
			summary: "s",
			firstKeptEntryId: "kept",
			tokensBefore: 10,
		},
		// The branch jumps back to "root" instead of the adjacent "compaction":
		// the strictly linear parent chain is violated, so the bounded path fails
		// closed and the eager authoritative path loads everything.
		{ type: "custom", id: "branch", parentId: "root", timestamp: now, customType: "x" },
	];
	storage.writeTextSync(sessionFile, `${records.map(record => JSON.stringify(record)).join("\n")}\n`);
	const manager = await SessionManager.open(
		sessionFile,
		SessionManager.explicitDestination("/sessions"),
		storage,
		"copy-retain",
		"enabled",
	);
	try {
		expect(storage.textReads).toBeGreaterThan(0);
		expect(manager.getSessionMemoryStats()).toMatchObject({
			lazyReopenAttempted: true,
			lazyReopenSucceeded: false,
			lazyReopenFallbackReason: "bounded_scan_branch",
		});
		expect(manager.getEntry("root")).toMatchObject({ id: "root", type: "custom" });
		expect(manager.getEntry("branch")).toMatchObject({ id: "branch", type: "custom" });
		expect(storage.listFilesSync("/sessions", "*.spill.*")).toEqual([]);
	} finally {
		await manager.close();
	}
});
it("fails closed for transcript-ahead and tail-ahead reopen states", async () => {
	class CountingStorage extends MemorySessionStorage {
		textReads = 0;
		override readText(filePath: string) {
			this.textReads++;
			return super.readText(filePath);
		}
	}
	const buildFixture = async (name: string) => {
		const storage = new CountingStorage();
		const sessionFile = `/sessions/${name}.jsonl`;
		const records = [
			{ type: "session", version: 5, id: name, timestamp: "0", cwd: "/cwd" },
			{ type: "custom", id: `${name}-old`, parentId: null, timestamp: "0", customType: "x" },
			{ type: "custom", id: `${name}-kept`, parentId: `${name}-old`, timestamp: "0", customType: "x" },
			{
				type: "compaction",
				id: `${name}-compaction`,
				parentId: `${name}-kept`,
				timestamp: "0",
				summary: "summary",
				firstKeptEntryId: `${name}-kept`,
				tokensBefore: 10,
			},
		];
		storage.writeTextSync(sessionFile, `${records.map(record => JSON.stringify(record)).join("\n")}\n`);
		const initial = await SessionManager.open(sessionFile, SessionManager.explicitDestination("/sessions"), storage);
		initial.setSessionMemoryMode("enabled");
		await initial.close();
		return { storage, sessionFile };
	};

	const transcriptAhead = await buildFixture("transcript-ahead");
	transcriptAhead.storage.writeTextSync(
		transcriptAhead.sessionFile,
		`${transcriptAhead.storage.readTextSync(transcriptAhead.sessionFile)}${JSON.stringify({ type: "custom", id: "new-tail", parentId: "transcript-ahead-compaction", timestamp: "0", customType: "x" })}\n`,
	);
	transcriptAhead.storage.textReads = 0;
	const transcriptFallback = await SessionManager.open(
		transcriptAhead.sessionFile,
		SessionManager.explicitDestination("/sessions"),
		transcriptAhead.storage,
		"copy-retain",
		"enabled",
	);
	try {
		expect(transcriptAhead.storage.textReads).toBeGreaterThan(0);
		expect(transcriptFallback.getEntry("new-tail")).toMatchObject({ id: "new-tail" });
	} finally {
		await transcriptFallback.close();
	}

	const tailAhead = await buildFixture("tail-ahead");
	const tailPath = `${tailAhead.sessionFile}.spill.tail`;
	tailAhead.storage.writeTextSync(tailPath, `${tailAhead.storage.readTextSync(tailPath)}{}\n`);
	tailAhead.storage.textReads = 0;
	const tailFallback = await SessionManager.open(
		tailAhead.sessionFile,
		SessionManager.explicitDestination("/sessions"),
		tailAhead.storage,
		"copy-retain",
		"enabled",
	);
	try {
		expect(tailAhead.storage.textReads).toBeGreaterThan(0);
		expect(tailFallback.buildSessionContext().messages).toHaveLength(1);
	} finally {
		await tailFallback.close();
	}
});
describe("session memory mode across file transitions", () => {
	it("reapplies enabled retirement and keeps off transitions sidecar-free", async () => {
		const storage = new MemorySessionStorage();
		const writeCompacted = (sessionFile: string, sessionId: string): void => {
			const records = [
				{ type: "session", version: 5, id: sessionId, timestamp: "0", cwd: "/cwd" },
				{ type: "custom", id: `${sessionId}-root`, parentId: null, timestamp: "0", customType: "x" },
				{ type: "custom", id: `${sessionId}-kept`, parentId: `${sessionId}-root`, timestamp: "0", customType: "x" },
				{
					type: "compaction",
					id: `${sessionId}-compaction`,
					parentId: `${sessionId}-kept`,
					timestamp: "0",
					summary: "summary",
					firstKeptEntryId: `${sessionId}-kept`,
					tokensBefore: 10,
				},
			];
			storage.writeTextSync(sessionFile, `${records.map(record => JSON.stringify(record)).join("\n")}\n`);
		};
		writeCompacted("/sessions/first.jsonl", "first");
		writeCompacted("/sessions/second.jsonl", "second");
		writeCompacted("/sessions/third.jsonl", "third");
		const manager = await SessionManager.open(
			"/sessions/first.jsonl",
			SessionManager.explicitDestination("/sessions"),
			storage,
		);
		try {
			manager.setSessionMemoryMode("enabled");
			expect(manager.getSessionMemoryStats().coldRetirementActive).toBe(true);
			await manager.setSessionFile("/sessions/second.jsonl");
			expect(manager.getSessionMemoryStats().coldRetirementActive).toBe(true);
			expect(manager.getEntry("second-root")).toMatchObject({ id: "second-root" });

			manager.setSessionMemoryMode("off");
			await manager.setSessionFile("/sessions/third.jsonl");
			expect(manager.getSessionMemoryStats().coldRetirementActive).toBe(false);
			expect(storage.listFilesSync("/sessions", "*.spill.*")).toEqual([]);
		} finally {
			await manager.close();
		}
	});
});
it("stages and promotes default model selection without hydrating retired history", async () => {
	const storage = new MemorySessionStorage();
	const sessionFile = "/sessions/bounded-default-selection.jsonl";
	const records = [
		{ type: "session", version: 5, id: "bounded-selection", timestamp: "0", cwd: "/cwd" },
		{
			type: "message",
			id: "cold-old",
			parentId: null,
			timestamp: "0",
			message: { role: "user", content: "x".repeat(100_000), timestamp: 1 },
		},
		{
			type: "message",
			id: "kept",
			parentId: "cold-old",
			timestamp: "0",
			message: { role: "user", content: "kept", timestamp: 2 },
		},
		{
			type: "compaction",
			id: "compact",
			parentId: "kept",
			timestamp: "0",
			summary: "summary",
			firstKeptEntryId: "kept",
			tokensBefore: 10,
		},
	];
	storage.writeTextSync(sessionFile, `${records.map(record => JSON.stringify(record)).join("\n")}\n`);
	const manager = await SessionManager.open(
		sessionFile,
		SessionManager.explicitDestination("/sessions"),
		storage,
		"copy-retain",
		"enabled",
	);
	try {
		const retainedBefore = manager.hotRetainedMessageCharsForTests();
		const stage = await manager.stageDefaultModelSelection("provider/model", "high", { appendThinkingLevel: true });
		expect(stage.boundedCold).toBe(true);
		expect(manager.hotRetainedMessageCharsForTests()).toBe(retainedBefore);
		expect(manager.promoteDefaultModelSelection(stage)).toEqual({ kind: "promoted" });
		expect(manager.getSessionMemoryStats().coldRetirementActive).toBe(true);
		expect(manager.getLastModelChangeRole()).toBe("default");
		expect(manager.getEntry("cold-old")).toMatchObject({ id: "cold-old" });
		const staleStage = await manager.stageDefaultModelSelection("provider/other", "low", {
			appendThinkingLevel: true,
		});
		const tailPath = `${sessionFile}.spill.tail`;
		const tailText = storage.readTextSync(tailPath);
		storage.writeTextSync(tailPath, `${tailText}{}\n`);
		expect(manager.promoteDefaultModelSelection(staleStage)).toEqual({ kind: "not_promoted" });
		storage.writeTextSync(tailPath, tailText);
		await manager.discardDefaultModelSelectionStage(staleStage);
	} finally {
		await manager.close();
	}
	const reopened = await SessionManager.open(
		sessionFile,
		SessionManager.explicitDestination("/sessions"),
		storage,
		"copy-retain",
		"enabled",
	);
	try {
		expect(reopened.getSessionMemoryStats()).toMatchObject({
			coldRetirementActive: true,
			lazyReopenSucceeded: true,
		});
		expect(reopened.getLastModelChangeRole()).toBe("default");
	} finally {
		await reopened.close();
	}
});

describe("malformed transcript sidecar fallback", () => {
	it("keeps malformed known records eager", async () => {
		const storage = new MemorySessionStorage();
		const sessionFile = "/sessions/malformed-compaction.jsonl";
		const records = [
			{ type: "session", version: 5, id: "malformed", timestamp: "0", cwd: "/cwd" },
			{
				type: "message",
				id: "old",
				parentId: null,
				timestamp: "0",
				message: { role: "user", content: "old", timestamp: 1 },
			},
			{
				type: "compaction",
				id: "compact",
				parentId: "old",
				timestamp: "0",
				summary: "summary",
				firstKeptEntryId: "old",
			},
		];
		storage.writeTextSync(sessionFile, `${records.map(record => JSON.stringify(record)).join("\n")}\n`);
		const manager = await SessionManager.open(
			sessionFile,
			SessionManager.explicitDestination("/sessions"),
			storage,
			"copy-retain",
			"enabled",
		);
		try {
			expect(manager.getSessionMemoryStats()).toMatchObject({
				coldRetirementActive: false,
				sidecarIneligible: true,
				lazyReopenSucceeded: false,
			});
			expect(manager.getEntry("old")).toMatchObject({ id: "old" });
		} finally {
			await manager.close();
		}
	});
});

describe("patch-bearing transcript fallback", () => {
	it("keeps patch-bearing transcripts eager so raw offsets cannot drift", async () => {
		const storage = new MemorySessionStorage();
		const sessionFile = "/sessions/patched.jsonl";
		const records = [
			{ type: "session", version: 5, id: "patched", timestamp: "0", cwd: "/cwd" },
			{
				type: "message",
				id: "m0",
				parentId: null,
				timestamp: "0",
				message: { role: "user", content: "original", timestamp: 0 },
			},
			{
				type: "entry_patch",
				entryId: "m0",
				patch: { message: { role: "user", content: "updated", timestamp: 0 } },
			},
			{
				type: "message",
				id: "m1",
				parentId: "m0",
				timestamp: "0",
				message: { role: "user", content: "kept", timestamp: 1 },
			},
			{
				type: "compaction",
				id: "c1",
				parentId: "m1",
				timestamp: "0",
				summary: "summary",
				firstKeptEntryId: "m1",
				tokensBefore: 10,
			},
		];
		storage.writeTextSync(sessionFile, `${records.map(record => JSON.stringify(record)).join("\n")}\n`);
		const manager = await SessionManager.open(sessionFile, SessionManager.explicitDestination("/sessions"), storage);
		try {
			manager.setSessionMemoryMode("enabled");
			expect(manager.getSessionMemoryStats()).toMatchObject({
				coldRetirementActive: false,
				sidecarIneligible: true,
			});
			expect(manager.getEntry("m0")).toMatchObject({ message: { content: "updated" } });
		} finally {
			await manager.close();
		}
	});
});

describe("sidecar I/O fallback", () => {
	it("preserves eager authoritative state when disposable sidecar creation fails", async () => {
		const sessionFile = "/sessions/sidecar-failure.jsonl";
		const now = "0";
		const entries = [
			{ type: "session", version: 5, id: "failure-session", timestamp: now, cwd: "/cwd" },
			...Array.from({ length: 4 }, (_, index) => ({
				type: "message",
				id: `cold-${index.toString().padStart(4, "0")}`,
				parentId: index === 0 ? null : `cold-${(index - 1).toString().padStart(4, "0")}`,
				timestamp: now,
				message: { role: "user", content: `cold-${index}`, timestamp: index },
			})),
			{
				type: "compaction",
				id: "failure-compaction",
				parentId: "cold-0003",
				timestamp: now,
				summary: "summary",
				firstKeptEntryId: "cold-0003",
				tokensBefore: 10,
			},
		];
		const storage = new (class extends MemorySessionStorage {
			override openWriter(filePath: string, options?: { flags?: "w" | "a" }) {
				if (filePath.includes(".spill.")) throw new Error("injected_sidecar_failure");
				return super.openWriter(filePath, options);
			}
		})();
		storage.writeTextSync(sessionFile, `${entries.map(entry => JSON.stringify(entry)).join("\n")}\n`);
		const manager = await SessionManager.open(sessionFile, SessionManager.explicitDestination("/sessions"), storage);
		try {
			manager.setSessionMemoryMode("enabled");
			expect(manager.getSessionMemoryStats()).toMatchObject({
				coldRetirementActive: false,
				sidecarIneligible: true,
			});
			expect(manager.getEntries()).toHaveLength(5);
			expect(manager.getEntry("cold-0000")).toMatchObject({ id: "cold-0000" });
		} finally {
			await manager.close();
		}
	});
});

describe("managed commit marker classification", () => {
	it("records missing-marker recovery before publishing an exact current marker", async () => {
		const tempDir = TempDir.createSync("@pi-managed-marker-");
		const cwd = path.join(tempDir.path(), "workspace");
		const agentDir = path.join(tempDir.path(), "agent");
		fs.mkdirSync(cwd, { recursive: true });
		const manager = SessionManager.create(cwd, SessionManager.managedDestination(cwd, agentDir));
		try {
			manager.setSessionMemoryMode("enabled");
			const firstId = manager.appendMessage({ role: "user", content: "first", timestamp: 1 });
			const keptId = manager.appendMessage({ role: "user", content: "kept", timestamp: 2 });
			await manager.ensureOnDisk();
			manager.appendCompaction("summary", undefined, keptId, 10);
			const stats = manager.getSessionMemoryStats();
			expect(stats).toMatchObject({ lastReopenTransition: { kind: "stale_commit", reason: "no_commit_marker" } });
			expect(stats.currentCommitTransition).toEqual({ kind: "exact", reason: "descriptor_and_proof_match" });
			manager.appendLabelChange(firstId, "cold label");
			expect(manager.getLabel(firstId)).toBe("cold label");
			const appendedId = manager.appendMessage({ role: "user", content: "after", timestamp: 3 });
			const appendedStats = manager.getSessionMemoryStats();
			expect(appendedStats.currentCommitTransition).toEqual({
				kind: "exact",
				reason: "descriptor_and_proof_match",
			});
			const sessionFile = manager.getSessionFile();
			expect(sessionFile).toBeTruthy();
			if (sessionFile) {
				const marker = JSON.parse(fs.readFileSync(`${sessionFile}.spill.commit`, "utf8")) as {
					transcriptSize: number;
				};
				expect(marker.transcriptSize).toBe(fs.statSync(sessionFile).size);
				const tailRecords = fs
					.readFileSync(`${sessionFile}.spill.tail`, "utf8")
					.trimEnd()
					.split("\n")
					.map(line => JSON.parse(line) as { id: string });
				expect(tailRecords.at(-1)?.id).toBe(appendedId);
			}
			expect(manager.getEntry(firstId)).toMatchObject({ id: firstId });
		} finally {
			await manager.close();
			tempDir.removeSync();
		}
	});

	it("classifies and repairs transcript-ahead crash evidence on reopen", async () => {
		const tempDir = TempDir.createSync("@pi-managed-transcript-ahead-");
		const cwd = path.join(tempDir.path(), "workspace");
		const agentDir = path.join(tempDir.path(), "agent");
		fs.mkdirSync(cwd, { recursive: true });
		const destination = SessionManager.managedDestination(cwd, agentDir);
		const source = SessionManager.create(cwd, destination);
		let sessionFile: string;
		try {
			source.setSessionMemoryMode("enabled");
			const firstId = source.appendMessage({ role: "user", content: "first", timestamp: 1 });
			const keptId = source.appendMessage({ role: "user", content: "kept", timestamp: 2 });
			await source.ensureOnDisk();
			const compactionId = source.appendCompaction("summary", undefined, keptId, 10);
			sessionFile = source.getSessionFile()!;
			await source.close();
			fs.appendFileSync(
				sessionFile,
				`${JSON.stringify({
					type: "message",
					id: "crash-window-append",
					parentId: compactionId,
					timestamp: new Date().toISOString(),
					message: { role: "user", content: "transcript ahead", timestamp: 3 },
				})}\n`,
			);

			const reopened = await SessionManager.open(sessionFile, destination);
			try {
				const stats = reopened.getSessionMemoryStats();
				expect(stats.lastReopenTransition).toEqual({
					kind: "transcript_ahead",
					reason: "object_grew_within_window",
				});
				expect(stats.currentCommitTransition).toEqual({
					kind: "exact",
					reason: "descriptor_and_proof_match",
				});
				expect(reopened.getEntry(firstId)).toMatchObject({ id: firstId });
				expect(reopened.getEntry("crash-window-append")).toMatchObject({ id: "crash-window-append" });
			} finally {
				await reopened.close();
			}
			const markerPath = `${sessionFile}.spill.commit`;
			const corruptMarker = JSON.parse(fs.readFileSync(markerPath, "utf8")) as { terminalChecksum: string };
			corruptMarker.terminalChecksum = "0".repeat(64);
			fs.writeFileSync(markerPath, `${JSON.stringify(corruptMarker)}\n`);
			const repaired = await SessionManager.open(sessionFile, destination);
			try {
				expect(repaired.getSessionMemoryStats().lastReopenTransition).toEqual({
					kind: "rebuild",
					reason: "terminal_checksum_mismatch",
				});
				expect(repaired.getSessionMemoryStats().currentCommitTransition).toEqual({
					kind: "exact",
					reason: "descriptor_and_proof_match",
				});
			} finally {
				await repaired.close();
			}
		} finally {
			await source.close().catch(() => {});
			tempDir.removeSync();
		}
	});
});
describe("descriptor-bound capture and staged fork publication", () => {
	function writeColdTranscript(
		storage: FileSessionStorage | MemorySessionStorage,
		sessionFile: string,
		root: string,
		entryCount = 60,
	): { ids: string[]; now: string } {
		const now = new Date().toISOString();
		const ids = Array.from({ length: entryCount }, (_, index) => `cold-${index.toString().padStart(4, "0")}`);
		const entries: Array<Record<string, unknown>> = [
			{ type: "session", version: 5, id: "fork-source", timestamp: now, cwd: root },
			...ids.map((id, index) => ({
				type: "message",
				id,
				parentId: index === 0 ? null : ids[index - 1],
				timestamp: now,
				message: { role: "user", content: `cold-${index}-${"x".repeat(256)}`, timestamp: index },
			})),
			{
				type: "compaction",
				id: "fork-compaction",
				parentId: ids.at(-1),
				timestamp: now,
				summary: "summary",
				firstKeptEntryId: ids.at(-1),
				tokensBefore: 10_000,
			},
		];
		storage.writeTextSync(sessionFile, `${entries.map(entry => JSON.stringify(entry)).join("\n")}\n`);
		return { ids, now };
	}

	it("forks a compacted cold transcript with every entry, fresh identity, and no source-sidecar copying", async () => {
		const tempDir = TempDir.createSync("@pi-memory-fork-cold-");
		const storage = new FileSessionStorage();
		const sessionFile = path.join(tempDir.path(), "source.jsonl");
		const { ids } = writeColdTranscript(storage, sessionFile, tempDir.path());
		const source = await SessionManager.open(
			sessionFile,
			SessionManager.explicitDestination(tempDir.path()),
			storage,
		);
		try {
			source.setSessionMemoryMode("enabled");
			expect(storage.existsSync(`${sessionFile}.spill.idx`)).toBe(true);
			expect(source.hotRetainedMessageCharsForTests()).toBeLessThan(1024);

			const captured = SessionManager.captureTranscriptStrict(sessionFile, storage);
			expect(captured.kind).toBe("captured");
			if (captured.kind !== "captured") throw new Error("Expected strict capture");
			// The descriptor-bound handle must not expose a whole-transcript buffer.
			expect("content" in captured.snapshot).toBe(false);

			const forked = await SessionManager.forkFromCaptured(
				captured.snapshot,
				tempDir.path(),
				SessionManager.explicitDestination(path.join(tempDir.path(), "forked")),
			);
			expect(forked.kind).toBe("forked");
			if (forked.kind !== "forked") throw new Error("Expected strict fork success");
			try {
				expect(forked.manager.getSessionId()).not.toBe("fork-source");
				expect(forked.manager.getSessionDir()).toBe(path.join(tempDir.path(), "forked"));
				// 60 messages + 1 compaction, all preserved.
				expect(forked.manager.getEntries()).toHaveLength(ids.length + 1);
				expect(forked.manager.getEntry(ids[0])).toMatchObject({ id: ids[0], type: "message" });
				expect(forked.manager.getEntry(ids.at(-1)!)).toMatchObject({ id: ids.at(-1), type: "message" });

				const forkedSessionFile = forked.manager.getSessionFile();
				expect(forkedSessionFile).toBeTruthy();
				if (forkedSessionFile) {
					// No cold sidecars are copied into the fork destination.
					const forkSidecars = storage.listFilesSync(path.dirname(forkedSessionFile), "*.spill.*");
					expect(forkSidecars.every(candidate => candidate.startsWith(`${forkedSessionFile}.spill.`))).toBe(true);
					const lines = storage
						.readTextSync(forkedSessionFile)
						.trimEnd()
						.split("\n")
						.map(line => JSON.parse(line) as { id?: string; type?: string });
					// fresh header + 60 messages + 1 compaction.
					expect(lines).toHaveLength(ids.length + 2);
					expect(lines[0]).toMatchObject({ type: "session", id: forked.manager.getSessionId() });
					expect(lines[0]?.id).not.toBe("fork-source");
					expect(lines.some(entry => entry.id === ids[0])).toBe(true);
					expect(lines.some(entry => entry.id === ids.at(-1))).toBe(true);
					expect(lines.some(entry => entry.id === "fork-compaction")).toBe(true);
				}
			} finally {
				await forked.manager.close();
			}
		} finally {
			await source.close();
			tempDir.removeSync();
		}
	});

	it("publishes through bounded range reads and staged writers without whole-buffer reads", async () => {
		const tempDir = TempDir.createSync("@pi-memory-fork-bounded-");
		const storage = new FileSessionStorage();
		const sessionFile = path.join(tempDir.path(), "source.jsonl");
		writeColdTranscript(storage, sessionFile, tempDir.path(), 8);

		const readRangeSync = vi.spyOn(storage, "readRangeSync");
		const openStagedWriter = vi.spyOn(storage, "openStagedWriter");
		const readSnapshotSync = vi.spyOn(storage, "readSnapshotSync");

		const captured = SessionManager.captureTranscriptStrict(sessionFile, storage);
		expect(captured.kind).toBe("captured");
		if (captured.kind !== "captured") throw new Error("Expected strict capture");
		expect(readSnapshotSync).not.toHaveBeenCalled();

		const forked = await SessionManager.forkFromCaptured(
			captured.snapshot,
			tempDir.path(),
			SessionManager.explicitDestination(path.join(tempDir.path(), "forked-bounded")),
		);
		expect(forked.kind).toBe("forked");
		if (forked.kind !== "forked") throw new Error("Expected strict fork success");
		try {
			expect(readRangeSync).toHaveBeenCalled();
			expect(openStagedWriter).toHaveBeenCalled();
			expect(readSnapshotSync).not.toHaveBeenCalled();
		} finally {
			await forked.manager.close();
			tempDir.removeSync();
		}
	});

	it("rolls back cleanly and removes its private staging directory when source authority changes during publication", async () => {
		const tempDir = TempDir.createSync("@pi-memory-fork-rollback-");
		const sourcePath = path.join(tempDir.path(), "source.jsonl");
		const replacementPath = path.join(tempDir.path(), "replacement.jsonl");
		const destDir = path.join(tempDir.path(), "dest");
		const base = new FileSessionStorage();
		writeColdTranscript(base, sourcePath, tempDir.path(), 4);
		fs.writeFileSync(
			replacementPath,
			`${JSON.stringify({ type: "session", version: 5, id: "replacement", timestamp: new Date().toISOString(), cwd: tempDir.path() })}\n${JSON.stringify({ type: "message", id: "other", parentId: null, timestamp: new Date().toISOString(), message: { role: "user", content: "other", timestamp: 0 } })}\n`,
		);

		const storage = new (class extends FileSessionStorage {
			override openStagedWriter(filePath: string): StagedStreamingWriter {
				fs.renameSync(replacementPath, sourcePath);
				return super.openStagedWriter(filePath);
			}
		})();

		const captured = SessionManager.captureTranscriptStrict(sourcePath, storage);
		expect(captured.kind).toBe("captured");
		if (captured.kind !== "captured") throw new Error("Expected strict capture");
		expect(
			await SessionManager.forkFromCaptured(
				captured.snapshot,
				tempDir.path(),
				SessionManager.explicitDestination(destDir),
			),
		).toEqual({ kind: "error", reason: "identity-mismatch" });
		// The private staging directory was removed; the destination was never published.
		expect(fs.existsSync(destDir)).toBe(false);
		expect(
			fs.readdirSync(tempDir.path()).filter(name => name.includes(".fork-staging-") && !name.endsWith(".removing")),
		).toEqual([]);
	});

	it("never overwrites existing destination content (no-replace publication)", async () => {
		const tempDir = TempDir.createSync("@pi-memory-fork-noreplace-");
		const storage = new FileSessionStorage();
		const sessionFile = path.join(tempDir.path(), "source.jsonl");
		writeColdTranscript(storage, sessionFile, tempDir.path(), 4);
		const destDir = path.join(tempDir.path(), "dest");
		fs.mkdirSync(destDir);
		const foreignFile = path.join(destDir, "foreign.jsonl");
		fs.writeFileSync(foreignFile, `${JSON.stringify({ type: "session", id: "foreign" })}\n`);

		const captured = SessionManager.captureTranscriptStrict(sessionFile, storage);
		expect(captured.kind).toBe("captured");
		if (captured.kind !== "captured") throw new Error("Expected strict capture");
		const forked = await SessionManager.forkFromCaptured(
			captured.snapshot,
			tempDir.path(),
			SessionManager.explicitDestination(destDir),
		);
		expect(forked.kind).toBe("forked");
		if (forked.kind !== "forked") throw new Error("Expected strict fork success");
		try {
			// The foreign transcript is preserved byte-for-byte (never overwritten).
			expect(fs.readFileSync(foreignFile, "utf8")).toBe(`${JSON.stringify({ type: "session", id: "foreign" })}\n`);
			// The fork added its own fresh session alongside without touching foreign content.
			const forkedSessionFile = forked.manager.getSessionFile();
			expect(forkedSessionFile).toBeTruthy();
			if (forkedSessionFile) {
				expect(forkedSessionFile).not.toBe(foreignFile);
				expect(fs.readFileSync(foreignFile, "utf8")).toBe(
					`${JSON.stringify({ type: "session", id: "foreign" })}\n`,
				);
			}
		} finally {
			await forked.manager.close();
			tempDir.removeSync();
		}
	});

	it("forks through memory storage with staged-publication parity and no copied sidecars", async () => {
		const storage = new MemorySessionStorage();
		const sessionFile = "/sessions/source.jsonl";
		writeColdTranscript(storage, sessionFile, "/cwd", 12);

		const captured = SessionManager.captureTranscriptStrict(sessionFile, storage);
		expect(captured.kind).toBe("captured");
		if (captured.kind !== "captured") throw new Error("Expected strict capture");
		expect("content" in captured.snapshot).toBe(false);
		const capturedLines: unknown[] = [];
		captured.snapshot.forEachLine(line => {
			capturedLines.push(JSON.parse(Buffer.from(line).toString("utf8")));
		});
		expect(capturedLines).toHaveLength(14);

		const forked = await SessionManager.forkFromCaptured(
			captured.snapshot,
			"/cwd",
			SessionManager.explicitDestination("/sessions/forked-memory"),
			"copy-retain",
			"enabled",
		);
		expect(forked).toMatchObject({ kind: "forked" });
		if (forked.kind !== "forked") throw new Error("Expected strict fork success");
		try {
			expect(forked.manager.getSessionMemoryStats().coldRetirementActive).toBe(true);
			expect(forked.manager.getSessionId()).not.toBe("fork-source");
			expect(forked.manager.getEntries()).toHaveLength(13);
			const forkedSessionFile = forked.manager.getSessionFile();
			expect(forkedSessionFile).toContain("/sessions/forked-memory");
			if (forkedSessionFile) {
				const lines = storage
					.readTextSync(forkedSessionFile)
					.trimEnd()
					.split("\n")
					.map(line => JSON.parse(line) as { id?: string });
				expect(lines).toHaveLength(14);
				expect(lines.some(entry => entry.id === "cold-0000")).toBe(true);
			}
		} finally {
			await forked.manager.close();
		}
	});

	it("restores eager state before an append would exceed the hot-suffix budget", async () => {
		const storage = new MemorySessionStorage();
		const sessionFile = "/sessions/append-budget.jsonl";
		writeColdTranscript(storage, sessionFile, "/cwd", 12);
		const manager = await SessionManager.open(sessionFile, SessionManager.explicitDestination("/sessions"), storage);
		try {
			manager.setSessionMemoryMode("enabled");
			expect(manager.getSessionMemoryStats().coldRetirementActive).toBe(true);
			manager.setSidecarHotSuffixBudgetForTests(1);
			manager.appendMessage({ role: "user", content: "budget overflow", timestamp: 1 });
			expect(manager.getSessionMemoryStats().coldRetirementActive).toBe(false);
			expect(manager.getEntry("cold-0000")).toMatchObject({ id: "cold-0000" });
			expect(manager.getEntries()).toHaveLength(14);
		} finally {
			await manager.close();
		}
	});

	it("preserves a valid final record without a trailing newline and rejects a truncated one", async () => {
		const storage = new MemorySessionStorage();
		const sourcePath = "/sessions/no-newline.jsonl";
		storage.writeTextSync(
			sourcePath,
			`${JSON.stringify({ type: "session", version: 5, id: "no-newline", timestamp: "0", cwd: "/cwd" })}\n${JSON.stringify({ type: "custom", id: "final", parentId: null, timestamp: "0", customType: "x" })}`,
		);
		const captured = SessionManager.captureTranscriptStrict(sourcePath, storage);
		expect(captured.kind).toBe("captured");
		if (captured.kind !== "captured") throw new Error("Expected strict capture");
		const forked = await SessionManager.forkFromCaptured(
			captured.snapshot,
			"/cwd",
			SessionManager.explicitDestination("/sessions/no-newline-fork"),
		);
		expect(forked.kind).toBe("forked");
		if (forked.kind === "forked") {
			expect(forked.manager.getEntry("final")).toMatchObject({ id: "final", type: "custom" });
			await forked.manager.close();
		}

		storage.writeTextSync(
			"/sessions/truncated.jsonl",
			`${JSON.stringify({ type: "session", version: 5, id: "bad", timestamp: "0", cwd: "/cwd" })}\n{"type":`,
		);
		const truncated = SessionManager.captureTranscriptStrict("/sessions/truncated.jsonl", storage);
		expect(truncated.kind).toBe("captured");
		if (truncated.kind !== "captured") throw new Error("Expected descriptor capture");
		expect(
			await SessionManager.forkFromCaptured(
				truncated.snapshot,
				"/cwd",
				SessionManager.explicitDestination("/sessions/truncated-fork"),
			),
		).toEqual({ kind: "error", reason: "malformed" });
	});
});
