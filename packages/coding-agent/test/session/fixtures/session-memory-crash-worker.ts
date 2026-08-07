import { vi } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { SessionManager } from "../../../src/session/session-manager";
import { FileSessionStorage } from "../../../src/session/session-storage";

const mode = process.env.GJC_SESSION_MEMORY_CRASH_MODE;
const root = process.env.GJC_SESSION_MEMORY_CRASH_ROOT;
if (!mode || !root) throw new Error("Missing crash worker mode/root");
const sessionFile = path.join(root, "crash-session.jsonl");
const storage = new FileSessionStorage();
const destination = SessionManager.explicitDestination(root);

if (mode === "setup") {
	fs.mkdirSync(root, { recursive: true });
	const records = [
		{ type: "session", version: 5, id: "crash-session", timestamp: "0", cwd: root },
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
			summary: "summary",
			firstKeptEntryId: "kept",
			tokensBefore: 10,
		},
	];
	fs.writeFileSync(sessionFile, `${records.map(record => JSON.stringify(record)).join("\n")}\n`);
	const manager = await SessionManager.open(sessionFile, destination, storage, "copy-retain", "enabled");
	await manager.close();
	process.stdout.write(JSON.stringify({ sessionFile }));
	process.exit(0);
}

if (mode === "recover") {
	const manager = await SessionManager.open(sessionFile, destination, storage, "copy-retain", "enabled");
	try {
		const branch = manager.getBranch();
		process.stdout.write(
			JSON.stringify({
				found: branch.some(
					entry =>
						entry.type === "message" &&
						"content" in entry.message &&
						entry.message.content === "durable-before-crash",
				),
				stats: manager.getSessionMemoryStats(),
			}),
		);
	} finally {
		await manager.close();
	}
	process.exit(0);
}

const manager = await SessionManager.open(sessionFile, destination, storage, "copy-retain", "enabled");
const killAfterFsync = mode === "crash-after-transcript-fsync" ? 1 : mode === "crash-after-tail-fsync" ? 3 : 0;
if (killAfterFsync === 0) throw new Error(`Unknown crash mode: ${mode}`);
const realFsyncSync = fs.fsyncSync;
let fsyncCalls = 0;
vi.spyOn(fs, "fsyncSync").mockImplementation(fd => {
	realFsyncSync(fd);
	fsyncCalls++;
	if (fsyncCalls === killAfterFsync) process.kill(process.pid, "SIGKILL");
});
manager.appendMessage({ role: "user", content: "durable-before-crash", timestamp: 3 });
process.exit(2);
