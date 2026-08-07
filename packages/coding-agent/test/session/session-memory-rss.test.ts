import { describe, expect, it } from "bun:test";
import * as path from "node:path";

interface RssWorkerResult {
	recordCount: number;
	cycleCount: number;
	cycleRecords: number;
	root: string;
	sessionFile: string;
	cycleSamples: Array<{ rss: number; heapUsed: number; external: number }>;
	eagerRssDeltaBytes: number;
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
		expect(Math.max(...rssSamples) - Math.min(...rssSamples)).toBeLessThanOrEqual(64 * 1024 * 1024);
	}, 60_000);

	it("reopens the authenticated 120k-record sidecar within the 64 MiB RSS budget", () => {
		const prepareWorker = path.join(import.meta.dir, "fixtures", "session-memory-rss-worker.ts");
		const prepared = Bun.spawnSync({
			cmd: [process.execPath, prepareWorker],
			env: {
				...process.env,
				GJC_SESSION_MEMORY_RSS_RECORDS: "120000",
				GJC_SESSION_MEMORY_RSS_CYCLES: "0",
				GJC_SESSION_MEMORY_RSS_KEEP: "1",
			},
			stdout: "pipe",
			stderr: "pipe",
		});
		expect(prepared.exitCode, prepared.stderr.toString()).toBe(0);
		const fixture = JSON.parse(prepared.stdout.toString()) as RssWorkerResult;
		const lazyWorker = path.join(import.meta.dir, "fixtures", "session-memory-lazy-rss-worker.ts");
		const lazy = Bun.spawnSync({
			cmd: [process.execPath, lazyWorker],
			env: {
				...process.env,
				GJC_SESSION_MEMORY_RSS_SESSION: fixture.sessionFile,
				GJC_SESSION_MEMORY_RSS_REMOVE: "1",
			},
			stdout: "pipe",
			stderr: "pipe",
		});
		expect(lazy.exitCode, lazy.stderr.toString()).toBe(0);
		const measured = JSON.parse(lazy.stdout.toString()) as {
			rssDeltaBytes: number;
			stats: { coldRetirementActive: boolean; totalAccountedBytes: number };
		};
		expect(measured.stats.coldRetirementActive).toBe(true);
		expect(measured.stats.totalAccountedBytes).toBeLessThanOrEqual(64 * 1024 * 1024);
		expect(measured.rssDeltaBytes).toBeLessThanOrEqual(64 * 1024 * 1024);
	}, 60_000);

	it("builds a first 120k-record enabled sidecar within the 64 MiB RSS budget", () => {
		const worker = path.join(import.meta.dir, "fixtures", "session-memory-rss-worker.ts");
		const result = Bun.spawnSync({
			cmd: [process.execPath, worker],
			env: {
				...process.env,
				GJC_SESSION_MEMORY_RSS_RECORDS: "120000",
				GJC_SESSION_MEMORY_RSS_CYCLES: "0",
				GJC_SESSION_MEMORY_RSS_FIRST_OPEN: "1",
			},
			stdout: "pipe",
			stderr: "pipe",
		});
		expect(result.exitCode, result.stderr.toString()).toBe(0);
		const measured = JSON.parse(result.stdout.toString()) as RssWorkerResult;
		expect(measured.stats.coldRetirementActive).toBe(true);
		expect(measured.stats.totalAccountedBytes).toBeLessThanOrEqual(64 * 1024 * 1024);
		expect(measured.eagerRssDeltaBytes).toBeLessThanOrEqual(64 * 1024 * 1024);
	}, 60_000);
});
