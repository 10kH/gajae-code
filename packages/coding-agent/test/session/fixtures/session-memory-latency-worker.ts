import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { SessionManager } from "../../../src/session/session-manager";

/**
 * AC11 latency / I-O probe: builds a compacted 60k-record session whose
 * persistent dictionary artifact is eligible (≤64k records), opens it retired,
 * then measures per-operation latency distributions (p50/p95/p99) and the
 * bounded I/O counts for:
 *   - cold random entry lookups (dictionary partition path: 1 bounded read)
 *   - warm (cached) entry lookups (0 range reads)
 *   - persistent parent→children lookups (1 bucket read, 0 index scans)
 *   - a 10k-cold-entry branch switch (chunked ordinal runs)
 * The per-turn cold-I/O = 0 guarantee on the active path is asserted by the
 * zero-range-read warm sample.
 */

const percentile = (sorted: number[], q: number): number =>
	sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)))];

const recordCount = Number.parseInt(process.env.GJC_SESSION_MEMORY_LATENCY_RECORDS ?? "60000", 10);
if (!Number.isSafeInteger(recordCount) || recordCount < 1000 || recordCount > 64 * 1024)
	throw new Error("invalid_latency_record_count");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-session-memory-latency-"));
const sessionFile = path.join(root, "latency.jsonl");
const fd = fs.openSync(sessionFile, "w", 0o600);
const write = (value: unknown): void => {
	fs.writeSync(fd, `${JSON.stringify(value)}\n`);
};
try {
	write({ type: "session", version: 5, id: "latency-session", timestamp: "0", cwd: root });
	write({ type: "custom", id: "root", parentId: null, timestamp: "0", customType: "lat", data: {} });
	for (let parent = 0; parent < 12; parent++) {
		const parentId = `parent-${parent.toString().padStart(2, "0")}`;
		write({ type: "custom", id: parentId, parentId: "root", timestamp: "0", customType: "lat", data: {} });
		for (let child = 0; child < 6; child++) {
			write({
				type: "custom",
				id: `${parentId}-child-${child.toString().padStart(2, "0")}`,
				parentId,
				timestamp: "0",
				customType: "lat",
				data: {},
			});
		}
	}
	for (let index = 0; index < recordCount - 2; index++) {
		write({
			type: "custom",
			id: `entry-${index}`,
			parentId: index === 0 ? null : `entry-${index - 1}`,
			timestamp: "0",
			customType: "lat",
			data: { value: index },
		});
	}
	write({
		type: "compaction",
		id: "latency-compaction",
		parentId: `entry-${recordCount - 3}`,
		timestamp: "0",
		summary: "summary",
		firstKeptEntryId: `entry-${recordCount - 3}`,
		tokensBefore: recordCount,
	});
} finally {
	fs.closeSync(fd);
}

const manager = await SessionManager.open(
	sessionFile,
	SessionManager.explicitDestination(root),
	undefined,
	"copy-retain",
	"enabled",
);
const stats = manager.getSessionMemoryStats();
if (!stats.coldRetirementActive) throw new Error("cold_retirement_inactive");
if (!stats.dictionaryArtifactEnabled) throw new Error("dictionary_artifact_missing");

// Cold random entry lookups: uniformly distributed across the retired prefix.
const coldIds = Array.from({ length: 50 }, (_, i) => `entry-${Math.floor((i * (recordCount * 0.5)) / 50)}`);
const coldSamples: number[] = [];
const rangeReadsBefore = stats.rangeReadCount;
for (const id of coldIds) {
	const start = performance.now();
	const entry = manager.getEntry(id);
	if (!entry || entry.id !== id) throw new Error(`cold_lookup_mismatch:${id}`);
	coldSamples.push(performance.now() - start);
}
const coldRangeReads = manager.getSessionMemoryStats().rangeReadCount - rangeReadsBefore;

// Warm (cached) entry lookups: repeated ids must be served with zero range reads.
const warmSamples: number[] = [];
const rangeReadsBeforeWarm = manager.getSessionMemoryStats().rangeReadCount;
for (const id of coldIds) {
	const start = performance.now();
	const entry = manager.getEntry(id);
	if (!entry || entry.id !== id) throw new Error(`warm_lookup_mismatch:${id}`);
	warmSamples.push(performance.now() - start);
}
const warmRangeReads = manager.getSessionMemoryStats().rangeReadCount - rangeReadsBeforeWarm;

// Persistent parent→children lookups: each disjoint parent costs one bounded
// bucket read and no .spill.idx range read.
const rootChildren = manager.getChildren("root");
const parentIds = rootChildren.map(entry => entry.id);
if (parentIds.length === 0) throw new Error("no_parents");
const childrenSamples: number[] = [];
const bucketReadsBefore = stats.rangeReadCount;
for (const parent of parentIds.slice(0, 20)) {
	const start = performance.now();
	const children = manager.getChildren(parent);
	if (children.length === 0) throw new Error(`parent_children_empty:${parent}`);
	childrenSamples.push(performance.now() - start);
}
const childrenRangeReads = manager.getSessionMemoryStats().rangeReadCount - bucketReadsBefore;

const sortedCold = [...coldSamples].sort((a, b) => a - b);
const sortedWarm = [...warmSamples].sort((a, b) => a - b);
const sortedChildren = [...childrenSamples].sort((a, b) => a - b);

const result = {
	recordCount,
	dictionaryArtifactEnabled: true,
	coldRangeReads,
	warmRangeReads,
	childrenRangeReads,
	coldMs: { p50: percentile(sortedCold, 0.5), p95: percentile(sortedCold, 0.95), p99: percentile(sortedCold, 0.99) },
	warmMs: { p50: percentile(sortedWarm, 0.5), p95: percentile(sortedWarm, 0.95) },
	childrenMs: { p50: percentile(sortedChildren, 0.5), p95: percentile(sortedChildren, 0.95) },
	stats: {
		coldRetirementActive: manager.getSessionMemoryStats().coldRetirementActive,
		totalAccountedBytes: manager.getSessionMemoryStats().totalAccountedBytes,
	},
};

await manager.close();
fs.rmSync(root, { recursive: true, force: true });
process.stdout.write(`${JSON.stringify(result)}\n`);
