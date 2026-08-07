import { describe, expect, it } from "bun:test";
import * as path from "node:path";

interface RssWorkerResult {
	recordCount: number;
	cycleCount: number;
	cycleRecords: number;
	cycleSamples: Array<{ rss: number; heapUsed: number; external: number }>;
	stats: {
		coldRetirementActive: boolean;
		totalAccountedBytes: number;
	};
}

const enabled = process.env.GJC_SESSION_MEMORY_RSS === "1";

describe.skipIf(!enabled)("session memory RSS plateau", () => {
	it("keeps post-compaction RSS growth bounded across a 120k-record session", () => {
		const worker = path.join(import.meta.dir, "fixtures", "session-memory-rss-worker.ts");
		const result = Bun.spawnSync({
			cmd: [process.execPath, worker],
			env: {
				...process.env,
				GJC_SESSION_MEMORY_RSS_RECORDS: "120000",
				GJC_SESSION_MEMORY_RSS_CYCLES: "3",
				GJC_SESSION_MEMORY_RSS_CYCLE_RECORDS: "5000",
			},
			stdout: "pipe",
			stderr: "pipe",
		});
		expect(result.exitCode, result.stderr.toString()).toBe(0);
		const measured = JSON.parse(result.stdout.toString()) as RssWorkerResult;
		expect(measured.recordCount).toBe(120000);
		expect(measured.cycleSamples).toHaveLength(3);
		expect(measured.stats.coldRetirementActive).toBe(true);
		expect(measured.stats.totalAccountedBytes).toBeLessThanOrEqual(64 * 1024 * 1024);
		const rssSamples = measured.cycleSamples.map(sample => sample.rss);
		expect(Math.max(...rssSamples) - Math.min(...rssSamples)).toBeLessThanOrEqual(16 * 1024 * 1024);
	}, 60_000);
});
