import { describe, expect, it, vi } from "bun:test";
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
		);
		expect(forked).toMatchObject({ kind: "forked" });
		if (forked.kind !== "forked") throw new Error("Expected strict fork success");
		try {
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
