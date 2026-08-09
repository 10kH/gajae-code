import { describe, expect, it } from "bun:test";
import { SessionManager } from "../../src/session/session-manager";
import { MemorySessionStorage } from "../../src/session/session-storage";

function transcript(sessionId: string, role: string): string {
	const records = [
		{ type: "session", version: 5, id: sessionId, timestamp: "0", cwd: "/cwd" },
		{
			type: "model_change",
			id: `${sessionId}-model`,
			parentId: null,
			timestamp: "0",
			provider: "provider",
			modelId: "model",
			role,
		},
		{
			type: "message",
			id: `${sessionId}-kept`,
			parentId: `${sessionId}-model`,
			timestamp: "0",
			message: { role: "user", content: `prompt-${sessionId}`, timestamp: 1 },
		},
		{
			type: "compaction",
			id: `${sessionId}-compact`,
			parentId: `${sessionId}-kept`,
			timestamp: "0",
			summary: `summary-${sessionId}`,
			firstKeptEntryId: `${sessionId}-kept`,
			tokensBefore: 10,
		},
	];
	return `${records.map(record => JSON.stringify(record)).join("\n")}\n`;
}

describe("session memory rollout", () => {
	it("keeps shadow parity at zero mismatches across 100 sessions", async () => {
		const storage = new MemorySessionStorage();
		let mismatches = 0;
		for (let index = 0; index < 100; index++) {
			const sessionId = `shadow-${index.toString().padStart(3, "0")}`;
			const sessionFile = `/sessions/${sessionId}.jsonl`;
			storage.writeTextSync(sessionFile, transcript(sessionId, index % 2 === 0 ? "reviewer" : "default"));
			const destination = SessionManager.explicitDestination("/sessions");
			const eager = await SessionManager.open(sessionFile, destination, storage, "copy-retain", "off");
			const eagerEvidence = {
				branch: eager.getBranch().map(entry => entry.id),
				context: eager.buildSessionContext(),
				role: eager.getLastModelChangeRole(),
			};
			await eager.close();

			const shadow = await SessionManager.open(sessionFile, destination, storage, "copy-retain", "shadow");
			const shadowEvidence = {
				branch: shadow.getBranch().map(entry => entry.id),
				context: shadow.buildSessionContext(),
				role: shadow.getLastModelChangeRole(),
			};
			if (JSON.stringify(shadowEvidence) !== JSON.stringify(eagerEvidence)) mismatches++;
			expect(shadow.getSessionMemoryStats()).toMatchObject({
				sidecarEnabled: true,
				coldRetirementActive: false,
			});
			await shadow.close();
		}
		expect(mismatches).toBe(0);
	});
	it("downgrades a live cold session without eager reload and restores eager behavior on restart", async () => {
		const storage = new MemorySessionStorage();
		const sessionFile = "/sessions/downgrade.jsonl";
		const messages = Array.from({ length: 200 }, (_, index) => ({
			type: "message",
			id: `downgrade-${index}`,
			parentId: index === 0 ? null : `downgrade-${index - 1}`,
			timestamp: "0",
			message: { role: "user", content: `cold-${index}-${"x".repeat(512)}`, timestamp: index },
		}));
		const records = [
			{ type: "session", version: 5, id: "downgrade", timestamp: "0", cwd: "/cwd" },
			...messages,
			{
				type: "compaction",
				id: "downgrade-compaction",
				parentId: "downgrade-199",
				timestamp: "0",
				summary: "summary",
				firstKeptEntryId: "downgrade-199",
				tokensBefore: 100,
			},
		];
		storage.writeTextSync(sessionFile, `${records.map(record => JSON.stringify(record)).join("\n")}\n`);
		const destination = SessionManager.explicitDestination("/sessions");
		const enabled = await SessionManager.open(sessionFile, destination, storage, "copy-retain", "enabled");
		expect(enabled.getSessionMemoryStats().coldRetirementActive).toBe(true);
		const retainedBefore = enabled.hotRetainedMessageCharsForTests();
		expect(retainedBefore).toBeLessThan(2048);

		enabled.setSessionMemoryMode("off");
		expect(enabled.getSessionMemoryStats().coldRetirementActive).toBe(true);
		expect(enabled.hotRetainedMessageCharsForTests()).toBe(retainedBefore);
		expect(enabled.getEntry("downgrade-0")).toMatchObject({ id: "downgrade-0" });
		await enabled.close();

		const eagerRestart = await SessionManager.open(sessionFile, destination, storage, "copy-retain", "off");
		try {
			expect(eagerRestart.getSessionMemoryStats().coldRetirementActive).toBe(false);
			expect(eagerRestart.hotRetainedMessageCharsForTests()).toBeGreaterThan(100_000);
			expect(eagerRestart.getEntry("downgrade-0")).toMatchObject({ id: "downgrade-0" });
		} finally {
			await eagerRestart.close();
		}
	});
	it("sweeps orphaned sidecar staging files without deleting active proofs", async () => {
		const storage = new MemorySessionStorage();
		const sessionFile = "/sessions/orphan-sweep.jsonl";
		storage.writeTextSync(sessionFile, transcript("orphan-sweep", "reviewer"));
		const destination = SessionManager.explicitDestination("/sessions");
		const built = await SessionManager.open(sessionFile, destination, storage, "copy-retain", "shadow");
		await built.close();
		const root = sessionFile.slice(0, -6);
		const commitPath = `${root}/.session-memory.spill.commit`;
		const orphans = [
			`${root}/.session-memory.spill.commit.crash.tmp`,
			`${root}/.session-memory.spill.capture-crash`,
			`${root}/.session-memory.spill.fork-crash`,
			`${root}/.session-memory.spill.overlay-crash`,
		];
		for (const orphan of orphans) storage.writeTextSync(orphan, "derived crash debris");
		const reopened = await SessionManager.open(sessionFile, destination, storage, "copy-retain", "shadow");
		expect(reopened.getSessionMemoryStats().coldIndexBytes).toBeGreaterThan(0);
		expect(reopened.getSessionMemoryStats().coldIndexBlockCacheBytes).toBeGreaterThanOrEqual(0);
		await reopened.close();
		expect(orphans.every(orphan => !storage.existsSync(orphan))).toBe(true);
		expect(storage.existsSync(commitPath)).toBe(true);
	});
});
