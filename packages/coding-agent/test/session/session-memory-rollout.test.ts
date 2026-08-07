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
});
