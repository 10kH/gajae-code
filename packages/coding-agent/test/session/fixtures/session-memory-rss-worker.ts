import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { SessionManager } from "../../../src/session/session-manager";

const recordCount = Number.parseInt(process.env.GJC_SESSION_MEMORY_RSS_RECORDS ?? "120000", 10);
if (!Number.isSafeInteger(recordCount) || recordCount < 10) throw new Error("invalid_record_count");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-session-memory-rss-"));
const sessionFile = path.join(root, "rss.jsonl");
const fd = fs.openSync(sessionFile, "w", 0o600);
const write = (value: unknown): void => {
	fs.writeSync(fd, `${JSON.stringify(value)}\n`);
};
try {
	write({ type: "session", version: 5, id: "rss-session", timestamp: "0", cwd: root });
	for (let index = 0; index < recordCount - 2; index++) {
		write({
			type: "custom",
			id: `entry-${index}`,
			parentId: index === 0 ? null : `entry-${index - 1}`,
			timestamp: "0",
			customType: "rss",
			data: { value: index },
		});
	}
	write({
		type: "compaction",
		id: "rss-compaction",
		parentId: `entry-${recordCount - 3}`,
		timestamp: "0",
		summary: "summary",
		firstKeptEntryId: `entry-${recordCount - 3}`,
		tokensBefore: recordCount,
	});
} finally {
	fs.closeSync(fd);
}

const collect = (): { rss: number; heapUsed: number; external: number } => {
	Bun.gc(true);
	const usage = process.memoryUsage();
	return { rss: usage.rss, heapUsed: usage.heapUsed, external: usage.external };
};

const baselineRss = collect();
const manager = await SessionManager.open(sessionFile, SessionManager.explicitDestination(root));
const eagerRss = collect();
manager.setSessionMemoryMode("enabled");
const retiredRss = collect();
const cycleCount = Number.parseInt(process.env.GJC_SESSION_MEMORY_RSS_CYCLES ?? "0", 10);
const cycleRecords = Number.parseInt(process.env.GJC_SESSION_MEMORY_RSS_CYCLE_RECORDS ?? "5000", 10);
const cycleSamples: Array<{ rss: number; heapUsed: number; external: number }> = [];
for (let cycle = 0; cycle < cycleCount; cycle++) {
	let firstKeptEntryId = "";
	for (let index = 0; index < cycleRecords; index++) {
		firstKeptEntryId = manager.appendCustomEntry("rss-cycle", { cycle, index });
	}
	manager.appendCompaction(`cycle ${cycle}`, undefined, firstKeptEntryId, cycleRecords);
	cycleSamples.push(collect());
}
const stats = manager.getSessionMemoryStats();
await manager.close();
if (process.env.GJC_SESSION_MEMORY_RSS_KEEP !== "1") fs.rmSync(root, { recursive: true, force: true });

process.stdout.write(
	`${JSON.stringify({
		recordCount,
		root,
		sessionFile,
		baseline: baselineRss,
		eager: eagerRss,
		retired: retiredRss,
		eagerRssDeltaBytes: eagerRss.rss - baselineRss.rss,
		retiredRssDeltaBytes: retiredRss.rss - baselineRss.rss,
		retiredHeapDeltaBytes: retiredRss.heapUsed - baselineRss.heapUsed,
		cycleCount,
		cycleRecords,
		cycleSamples,
		stats,
	})}\n`,
);
