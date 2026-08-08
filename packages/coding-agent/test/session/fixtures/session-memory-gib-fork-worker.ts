import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { SessionManager } from "../../../src/session/session-manager";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-session-memory-gib-fork-"));
const sourceFile = path.join(root, "source.jsonl");
const destinationDirectory = path.join(root, "forks");
fs.mkdirSync(destinationDirectory);
const fd = fs.openSync(sourceFile, "w", 0o600);
const payload = "x".repeat(1024 * 1024);
const write = (value: unknown): void => {
	fs.writeSync(fd, `${JSON.stringify(value)}\n`);
};
try {
	write({ type: "session", version: 5, id: "gib-fork-source", timestamp: "0", cwd: root });
	for (let index = 0; index < 1020; index++) {
		write({
			type: "custom",
			id: `entry-${index}`,
			parentId: index === 0 ? null : `entry-${index - 1}`,
			timestamp: "0",
			customType: "gib-fork",
			data: { payload },
		});
	}
	write({
		type: "compaction",
		id: "gib-fork-compaction",
		parentId: "entry-1019",
		timestamp: "0",
		summary: "summary",
		firstKeptEntryId: "entry-1019",
		tokensBefore: 1020,
	});
	fs.fsyncSync(fd);
} finally {
	fs.closeSync(fd);
}

Bun.gc(true);
const sourceBytes = fs.statSync(sourceFile).size;
const baselineRss = process.memoryUsage().rss;
const startedAt = performance.now();
const manager = await SessionManager.forkFrom(
	sourceFile,
	root,
	SessionManager.explicitDestination(destinationDirectory),
	undefined,
	"copy-retain",
	"enabled",
);
await Bun.sleep(0);
const elapsedMs = performance.now() - startedAt;
Bun.gc(true);
const rssGrowthBytes = process.memoryUsage().rss - baselineRss;
const stats = manager.getSessionMemoryStats();
await manager.close();
fs.rmSync(root, { recursive: true, force: true });

process.stdout.write(`${JSON.stringify({ sourceBytes, elapsedMs, rssGrowthBytes, stats })}\n`);
