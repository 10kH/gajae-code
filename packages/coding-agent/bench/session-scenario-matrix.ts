import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { SessionManager, type SessionMemoryStats } from "../src/session/session-manager";

const MIB = 1024 * 1024;
const PAYLOAD_CHUNK_BYTES = 256 * 1024;
const DEFAULT_SIZES_MIB = [
	16,
	24,
	32,
	48,
	64,
	96,
	128,
	192,
	256,
	384,
	512,
	768,
	1024,
	1280,
	1536,
	1792,
	2048,
] as const;
const DEFAULT_SCENARIOS = ["linear-resume", "multi-transcript", "subagent-tree", "goal-history"] as const;
const SCHEMA_VERSION = 2;
const DEFAULT_OPERATION: Operation = "raw-cold-first-open";
const DEFAULT_REPETITIONS = 20;
const SMALL_COMPARISON_SIZES_MIB = [1, 4, 16, 32, 64] as const;

type Scenario = (typeof DEFAULT_SCENARIOS)[number];
type Status = "ok" | "rejected" | "error";
type Operation =
	| "raw-cold-first-open"
	| "exact-authenticated-reopen"
	| "transcript-ahead-reopen"
	| "repeated-lifecycle";
type SessionMemoryMode = "off" | "shadow" | "enabled";
type GcStrategy = "current" | "none" | "async" | "pressure";
type SecondaryArtifacts = "current" | "off" | "lazy";

type MemorySample = {
	rssBytes: number;
	heapUsedBytes: number;
	heapTotalBytes: number;
	externalBytes: number;
	arrayBuffersBytes: number;
};

type Summary = {
	min: number;
	median: number;
	p95: number;
	max: number;
};

type PhaseMetric = {
	elapsedMs: number;
	cpuUserMicros: number | null;
	cpuSystemMicros: number | null;
};

type PhaseEvidence = {
	descriptorSecurityPreflight: PhaseMetric | null;
	semanticScan: PhaseMetric | null;
	indexTailBuildScan: PhaseMetric | null;
	indexSerializationWrite: PhaseMetric | null;
	dictionaryBuild: PhaseMetric | null;
	parentBuild: PhaseMetric | null;
	metadataDeltaPublication: PhaseMetric | null;
	fsync: PhaseMetric | null;
	commitPublicationClassification: PhaseMetric | null;
	hotSuffixMaterialization: PhaseMetric | null;
};

type CounterEvidence = {
	gcRequests: number | null;
	gcElapsedMs: number | null;
	bytesRead: number | null;
	bytesWritten: number | null;
	recordsParsed: number | null;
	lineAssemblyCopyCount: number | null;
	lineAssemblyCopyBytes: number | null;
	indexWriteCalls: number | null;
	indexWriteBytes: number | null;
	fsyncCount: number | null;
	fsyncElapsedMs: number | null;
};

type GeneratedTranscript = {
	file: string;
	sessionId: string;
	coldEntryId: string;
	lastEntryId: string;
	compactionId: string;
	bytes: number;
};

type TelemetryValue = number | boolean | string | null;

type WorkerResult = {
	scenario: Scenario;
	targetMiB: number;
	operationClass: Operation;
	sessionMemoryMode: SessionMemoryMode;
	gcStrategy: GcStrategy;
	secondaryArtifacts: SecondaryArtifacts;
	repetitions: number;
	repetitionIndex?: number;
	status: Status;
	fileCount: number;
	totalBytes: number;
	entryCount: number;
	phases: {
		generationMs: number;
		firstOpenMs?: number;
		exactAuthenticatedReopenMs?: number;
		transcriptAheadReopenMs?: number;
		repeatedLifecycleMs?: number;
		closeMs: number;
		cpuUserMicros: number;
		cpuSystemMicros: number;
	};
	phaseEvidence: PhaseEvidence;
	counters: CounterEvidence;
	firstOpenPerFileMs?: Summary & { samples: number[] };
	lifecycle?: {
		openMs: Summary & { samples: number[] };
		lookupMs: Summary & { samples: number[] };
		closeMs: Summary & { samples: number[] };
	};
	throughputMiBPerSecond: number;
	memory: {
		processBaseline: MemorySample;
		operationBaseline: MemorySample;
		afterOperation: MemorySample;
		afterColdLookups: MemorySample;
		afterWarmLookups: MemorySample;
		afterClose: MemorySample;
		operationRssGrowthBytes: number;
		firstOpenBaseline?: MemorySample;
		afterFirstOpen?: MemorySample;
		firstOpenRssGrowthBytes?: number;
		lookupRssGrowthBytes: number;
		teardownRssGrowthBytes: number;
		maxRssBytes: number;
	};
	lookup: {
		coldMs: (Summary & { samples: number[] }) | null;
		warmMs: (Summary & { samples: number[] }) | null;
		coldRangeReads: number | null;
		warmRangeReads: number | null;
	};
	sessionMemory: {
		totalAccountedBytes: number;
		maxAccountedBytes: number;
		coldRetirementActiveCount: number;
		contextMessageCount: number;
		telemetry: Record<string, TelemetryValue>;
	};
	failure?: {
		code: string;
		message: string;
	};
	preparation?: {
		firstOpenMs: number;
		phaseEvidence: PhaseEvidence;
		counters: CounterEvidence;
	};
};

type MatrixReport = {
	schemaVersion: number;
	bench: "session-scenario-matrix";
	generatedAt: string;
	gitSha: string | null;
	platform: NodeJS.Platform;
	arch: string;
	cpu: string | null;
	bunVersion: string;
	sizesMiB: number[];
	scenarios: Scenario[];
	operations: Operation[];
	sessionMemoryModes: SessionMemoryMode[];
	gcStrategy: GcStrategy;
	secondaryArtifacts: SecondaryArtifacts;
	repetitions: number;
	samples: number;
	smallComparisonSizesMiB?: number[];
	runs: WorkerResult[];
};

type ParentArgs = {
	sizesMiB: number[];
	scenarios: Scenario[];
	operations: Operation[];
	sessionMemoryModes: SessionMemoryMode[];
	gcStrategy: GcStrategy;
	secondaryArtifacts: SecondaryArtifacts;
	repetitions: number;
	samples: number;
	outPrefix: string;
	smallComparison: boolean;
};

function percentile(sorted: number[], percentileValue: number): number {
	if (sorted.length === 0) return 0;
	const index = Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1);
	return sorted[index] ?? 0;
}

function summarize(values: number[]): Summary {
	const sorted = [...values].sort((left, right) => left - right);
	return {
		min: sorted[0] ?? 0,
		median: percentile(sorted, 50),
		p95: percentile(sorted, 95),
		max: sorted.at(-1) ?? 0,
	};
}

function memorySample(): MemorySample {
	Bun.gc(true);
	const usage = process.memoryUsage();
	return {
		rssBytes: usage.rss,
		heapUsedBytes: usage.heapUsed,
		heapTotalBytes: usage.heapTotal,
		externalBytes: usage.external,
		arrayBuffersBytes: usage.arrayBuffers,
	};
}

async function settledMemorySample(): Promise<MemorySample> {
	await Bun.sleep(0);
	Bun.gc(true);
	await Bun.sleep(0);
	return memorySample();
}

function scenarioFileCount(scenario: Scenario): number {
	switch (scenario) {
		case "linear-resume":
		case "goal-history":
			return 1;
		case "multi-transcript":
			return 4;
		case "subagent-tree":
			return 5;
	}
}

function partitionBytes(totalBytes: number, count: number): number[] {
	const base = Math.floor(totalBytes / count);
	const remainder = totalBytes % count;
	return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

function customData(scenario: Scenario, fileIndex: number, entryIndex: number, payload: string): Record<string, unknown> {
	switch (scenario) {
		case "goal-history":
			return {
				goalId: `goal-${entryIndex % 8}`,
				status: ["active", "blocked", "resumed", "complete"][entryIndex % 4],
				objective: `Synthetic goal ${entryIndex % 8}`,
				payload,
			};
		case "subagent-tree":
			return {
				agentId: fileIndex === 0 ? "root" : `executor-${fileIndex}`,
				role: fileIndex === 0 ? "coordinator" : ["executor", "architect", "planner", "critic"][fileIndex - 1],
				turn: entryIndex,
				payload,
			};
		case "multi-transcript":
			return { transcript: fileIndex, turn: entryIndex, payload };
		case "linear-resume":
			return { turn: entryIndex, payload };
	}
}

async function generateTranscript(input: {
	file: string;
	root: string;
	scenario: Scenario;
	fileIndex: number;
	targetBytes: number;
	parentSession?: string;
}): Promise<GeneratedTranscript & { entryCount: number }> {
	const sessionId = `${input.scenario}-${input.fileIndex}`;
	const writer = Bun.file(input.file).writer();
	await fs.chmod(input.file, 0o600);
	const serialize = (value: unknown): string => `${JSON.stringify(value)}\n`;
	let bytesWritten = 0;
	let entryIndex = 0;
	let previousId: string | null = null;
	const write = async (line: string): Promise<void> => {
		bytesWritten += Buffer.byteLength(line);
		await writer.write(line);
	};
	try {
		await write(
			serialize({
				type: "session",
				version: 5,
				id: sessionId,
				timestamp: "0",
				cwd: input.root,
				parentSession: input.parentSession,
			}),
		);
		const fullPayload = "x".repeat(PAYLOAD_CHUNK_BYTES);
		while (true) {
			const id = `${sessionId}-entry-${entryIndex}`;
			const fullLine = serialize({
				type: "custom",
				id,
				parentId: previousId,
				timestamp: "0",
				customType: input.scenario,
				data: customData(input.scenario, input.fileIndex, entryIndex, fullPayload),
			});
			const minimumFinal = serialize({
				type: "custom",
				id,
				parentId: previousId,
				timestamp: "0",
				customType: input.scenario,
				data: customData(input.scenario, input.fileIndex, entryIndex, ""),
			});
			const compaction = serialize({
				type: "compaction",
				id: `${sessionId}-compaction`,
				parentId: id,
				timestamp: "0",
				summary: `${input.scenario} synthetic summary`,
				firstKeptEntryId: id,
				tokensBefore: entryIndex + 1,
			});
			if (bytesWritten + Buffer.byteLength(fullLine) + Buffer.byteLength(minimumFinal) + Buffer.byteLength(compaction) > input.targetBytes) {
				const finalPayloadBytes = input.targetBytes - bytesWritten - Buffer.byteLength(minimumFinal) - Buffer.byteLength(compaction);
				if (finalPayloadBytes < 0) throw new Error(`target too small for transcript: ${input.targetBytes}`);
				const finalLine = serialize({
					type: "custom",
					id,
					parentId: previousId,
					timestamp: "0",
					customType: input.scenario,
					data: customData(input.scenario, input.fileIndex, entryIndex, "x".repeat(finalPayloadBytes)),
				});
				await write(finalLine);
				await write(compaction);
				entryIndex++;
				previousId = id;
				break;
			}
			await write(fullLine);
			previousId = id;
			entryIndex++;
		}
		await writer.flush();
	} finally {
		await writer.end();
	}
	const actualBytes = Bun.file(input.file).size;
	if (actualBytes !== input.targetBytes) throw new Error(`transcript size mismatch: ${actualBytes} !== ${input.targetBytes}`);
	return {
		file: input.file,
		sessionId,
		coldEntryId: `${sessionId}-entry-0`,
	lastEntryId: `${sessionId}-entry-${Math.max(0, entryIndex - 1)}`,
		compactionId: `${sessionId}-compaction`,
		bytes: actualBytes,
		entryCount: entryIndex,
	};
}

function lookup(manager: SessionManager, id: string): number {
	const startedAt = performance.now();
	const entry = manager.getEntry(id);
	const elapsedMs = performance.now() - startedAt;
	if (entry?.type !== "custom") throw new Error(`missing synthetic entry ${id}`);
	return elapsedMs;
}

function failureFrom(error: unknown): { code: string; message: string } {
	if (error instanceof Error) {
		const code = "code" in error && typeof error.code === "string" ? error.code : error.name;
		return { code, message: error.message };
	}
	return { code: "unknown", message: String(error) };
}

function statsRecord(stats: SessionMemoryStats): Record<string, unknown> {
	return stats as unknown as Record<string, unknown>;
}

function firstOpenRecord(stats: SessionMemoryStats): Record<string, unknown> {
	const value = statsRecord(stats).firstOpen;
	return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function optionalNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function aggregateStats(stats: SessionMemoryStats[], contextMessageCount: number): WorkerResult["sessionMemory"] {
	const telemetry: Record<string, TelemetryValue> = {};
	const rootKeys = new Set<string>();
	for (const stat of stats) {
		for (const [key, value] of Object.entries(statsRecord(stat))) {
			rootKeys.add(key);
			if (typeof value === "number" && Number.isFinite(value)) {
				telemetry[key] = (typeof telemetry[key] === "number" ? telemetry[key] : 0) + value;
			} else if (typeof value === "boolean") {
				const previous = telemetry[key];
				telemetry[key] = previous === undefined ? value : previous === value ? value : null;
			} else if (typeof value === "string") {
				const previous = telemetry[key];
				telemetry[key] = previous === undefined ? value : previous === value ? value : null;
			}
		}
	}
	for (const stat of stats) {
		for (const [key, value] of Object.entries(firstOpenRecord(stat))) {
			if (rootKeys.has(key)) continue;
			if (typeof value === "number" && Number.isFinite(value)) {
				telemetry[key] = (typeof telemetry[key] === "number" ? telemetry[key] : 0) + value;
			} else if (typeof value === "boolean") {
				const previous = telemetry[key];
				telemetry[key] = previous === undefined ? value : previous === value ? value : null;
			} else if (typeof value === "string") {
				const previous = telemetry[key];
				telemetry[key] = previous === undefined ? value : previous === value ? value : null;
			}
		}
	}
	return {
		totalAccountedBytes: stats.reduce((total, value) => total + value.totalAccountedBytes, 0),
		maxAccountedBytes: Math.max(0, ...stats.map(value => value.totalAccountedBytes)),
		coldRetirementActiveCount: stats.filter(value => value.coldRetirementActive).length,
		contextMessageCount,
		telemetry,
	};
}

function emptyPhaseEvidence(): PhaseEvidence {
	return {
		descriptorSecurityPreflight: null,
		semanticScan: null,
		indexTailBuildScan: null,
		indexSerializationWrite: null,
		dictionaryBuild: null,
		parentBuild: null,
		metadataDeltaPublication: null,
		fsync: null,
		commitPublicationClassification: null,
		hotSuffixMaterialization: null,
	};
}

function emptyCounterEvidence(): CounterEvidence {
	return {
		gcRequests: null,
		gcElapsedMs: null,
		bytesRead: null,
		bytesWritten: null,
		recordsParsed: null,
		lineAssemblyCopyCount: null,
		lineAssemblyCopyBytes: null,
		indexWriteCalls: null,
		indexWriteBytes: null,
		fsyncCount: null,
		fsyncElapsedMs: null,
	};
}

function telemetryPhase(stats: SessionMemoryStats[], key: keyof PhaseEvidence): PhaseMetric | null {
	const aliases: Record<keyof PhaseEvidence, readonly string[]> = {
		descriptorSecurityPreflight: ["descriptorSecurityPreflight"],
		semanticScan: ["semanticScan"],
		indexTailBuildScan: ["indexTailBuildScan", "indexTailWork"],
		indexSerializationWrite: ["indexSerializationWrite"],
		dictionaryBuild: ["dictionaryBuild", "dictionary"],
		parentBuild: ["parentBuild", "parent"],
		metadataDeltaPublication: ["metadataDeltaPublication", "metadataDelta"],
		fsync: ["fsync"],
		commitPublicationClassification: ["commitPublicationClassification", "commitClassification"],
		hotSuffixMaterialization: ["hotSuffixMaterialization", "hotSuffixContext"],
	};
	for (const stat of stats) {
		const root = statsRecord(stat);
		const firstOpen = firstOpenRecord(stat);
		const containers = [
			root,
			firstOpen,
			root.phaseEvidence,
			root.phaseTelemetry,
			root.phaseTimings,
			firstOpen.phaseEvidence,
			firstOpen.phaseTelemetry,
			firstOpen.phaseTimings,
		];
		for (const container of containers) {
			if (!container || typeof container !== "object") continue;
			for (const alias of aliases[key]) {
				const candidate = (container as Record<string, unknown>)[alias];
				if (typeof candidate === "number" && Number.isFinite(candidate))
					return { elapsedMs: candidate, cpuUserMicros: null, cpuSystemMicros: null };
				if (!candidate || typeof candidate !== "object") continue;
				const value = candidate as Record<string, unknown>;
				const elapsedMs = optionalNumber(value.elapsedMs ?? value.wallMs ?? value.durationMs);
				if (elapsedMs !== undefined) {
					const cpuMs = optionalNumber(value.cpuMs);
					return {
						elapsedMs,
						cpuUserMicros: optionalNumber(value.cpuUserMicros ?? value.cpuUserUs) ?? (cpuMs === undefined ? null : cpuMs * 1_000),
						cpuSystemMicros: optionalNumber(value.cpuSystemMicros ?? value.cpuSystemUs) ?? null,
					};
				}
			}
		}
	}
	return null;
}

function counterDelta(before: SessionMemoryStats[], after: SessionMemoryStats[], aliases: readonly string[]): number | null {
	let found = false;
	let total = 0;
	for (let index = 0; index < Math.max(before.length, after.length); index++) {
		const beforeRecords = [statsRecord(before[index] ?? ({} as SessionMemoryStats)), firstOpenRecord(before[index] ?? ({} as SessionMemoryStats))];
		const afterRecords = [statsRecord(after[index] ?? ({} as SessionMemoryStats)), firstOpenRecord(after[index] ?? ({} as SessionMemoryStats))];
		let beforeValue: number | undefined;
		let afterValue: number | undefined;
		for (const alias of aliases) {
			for (const record of beforeRecords) beforeValue ??= optionalNumber(record[alias]);
			for (const record of afterRecords) afterValue ??= optionalNumber(record[alias]);
		}
		if (beforeValue === undefined && afterValue === undefined) continue;
		found = true;
		total += (afterValue ?? 0) - (beforeValue ?? 0);
	}
	return found ? total : null;
}

function counterEvidence(before: SessionMemoryStats[], after: SessionMemoryStats[]): CounterEvidence {
	const aliases: Record<keyof CounterEvidence, readonly string[]> = {
		gcRequests: ["gcRequests", "gcRequestCount", "forcedGcCount"],
		gcElapsedMs: ["gcElapsedMs", "gcTimeMs", "forcedGcElapsedMs"],
		bytesRead: ["bytesRead", "readBytes", "transcriptBytesRead"],
		bytesWritten: ["bytesWritten", "writeBytes", "sidecarBytesWritten"],
		recordsParsed: ["recordsParsed", "parsedRecordCount", "recordCount"],
		lineAssemblyCopyCount: ["lineAssemblyCopyCount", "lineCopyCount"],
		lineAssemblyCopyBytes: ["lineAssemblyCopyBytes", "lineCopyBytes"],
		indexWriteCalls: ["indexWriteCalls", "indexWriteCount"],
		indexWriteBytes: ["indexWriteBytes", "indexBytesWritten"],
		fsyncCount: ["fsyncCount", "fsyncCalls"],
		fsyncElapsedMs: ["fsyncElapsedMs", "fsyncTimeMs"],
	};
	const result = emptyCounterEvidence();
	for (const key of Object.keys(aliases) as Array<keyof CounterEvidence>) result[key] = counterDelta(before, after, aliases[key]);
	return result;
}

async function measurePhase<T>(operation: () => T | Promise<T>): Promise<{ value: T; metric: PhaseMetric }> {
	const cpuStart = process.cpuUsage();
	const startedAt = performance.now();
	const value = await operation();
	const elapsedMs = performance.now() - startedAt;
	const cpu = process.cpuUsage(cpuStart);
	return { value, metric: { elapsedMs, cpuUserMicros: cpu.user, cpuSystemMicros: cpu.system } };
}

function phaseEvidenceFromStats(stats: SessionMemoryStats[]): PhaseEvidence {
	const evidence = emptyPhaseEvidence();
	for (const key of Object.keys(evidence) as Array<keyof PhaseEvidence>) evidence[key] = telemetryPhase(stats, key);
	return evidence;
}

function mergePhaseEvidence(left: PhaseEvidence, right: PhaseEvidence): PhaseEvidence {
	const merged = emptyPhaseEvidence();
	for (const key of Object.keys(merged) as Array<keyof PhaseEvidence>) merged[key] = right[key] ?? left[key];
	return merged;
}

function operationFromArg(value: string | undefined): Operation {
	if (value === "exact-reopen") return "exact-authenticated-reopen";
	if (value === "transcript-ahead") return "transcript-ahead-reopen";
	if (value === "repeated-open-lookup-close") return "repeated-lifecycle";
	if (
		value === "raw-cold-first-open" ||
		value === "exact-authenticated-reopen" ||
		value === "transcript-ahead-reopen" ||
		value === "repeated-lifecycle"
	) return value;
	throw new Error(`invalid operation: ${value ?? ""}`);
}

function sessionMemoryModeFromArg(value: string | undefined): SessionMemoryMode {
	if (value === "off" || value === "shadow" || value === "enabled") return value;
	throw new Error(`invalid session memory mode: ${value ?? ""}`);
}

function gcStrategyFromArg(value: string | undefined): GcStrategy {
	if (value === "current" || value === "none" || value === "async" || value === "pressure") return value;
	throw new Error(`invalid GC strategy: ${value ?? ""}`);
}

function secondaryArtifactsFromArg(value: string | undefined): SecondaryArtifacts {
	if (value === "current" || value === "off" || value === "lazy") return value;
	throw new Error(`invalid secondary artifact mode: ${value ?? ""}`);
}

function benchmarkEnv(gcStrategy: GcStrategy, secondaryArtifacts: SecondaryArtifacts): NodeJS.ProcessEnv {
	return {
		...process.env,
		GJC_SESSION_MEMORY_GC_STRATEGY: gcStrategy,
		GJC_SESSION_MEMORY_SECONDARY_ARTIFACTS: secondaryArtifacts,
	};
}

async function appendTranscriptAhead(transcript: GeneratedTranscript, scenario: Scenario, fileIndex: number): Promise<void> {
	const line = `${JSON.stringify({
		type: "custom",
		id: `${transcript.sessionId}-ahead`,
		parentId: transcript.compactionId,
		timestamp: "1",
		customType: `${scenario}-ahead`,
		data: { turn: transcript.lastEntryId, fileIndex, payload: "ahead" },
	})}\n`;
	await fs.appendFile(transcript.file, line);
}

function metadataArgument(generated: Array<GeneratedTranscript & { entryCount: number }>): string {
	return JSON.stringify(generated.map(value => ({ file: value.file, sessionId: value.sessionId, coldEntryId: value.coldEntryId, lastEntryId: value.lastEntryId, compactionId: value.compactionId, bytes: value.bytes, entryCount: value.entryCount })));
}

async function runFreshReopenWorker(
	scenario: Scenario,
	targetMiB: number,
	operation: "exact-authenticated-reopen" | "transcript-ahead-reopen",
	root: string,
	sessionMemoryMode: SessionMemoryMode,
	gcStrategy: GcStrategy,
	secondaryArtifacts: SecondaryArtifacts,
	repetitions: number,
	metadata: string,
): Promise<WorkerResult> {
	const generated = JSON.parse(metadata) as Array<GeneratedTranscript & { entryCount: number }>;
	const fileCount = generated.length;
	const processBaseline = memorySample();
	const operationBaseline = await settledMemorySample();
	const managers: SessionManager[] = [];
	const coldSamples: number[] = [];
	const warmSamples: number[] = [];
	let afterOperation = operationBaseline;
	let afterColdLookups = operationBaseline;
	let afterWarmLookups = operationBaseline;
	let afterClose = operationBaseline;
	let contextMessageCount = 0;
	let coldRangeReads = 0;
	let warmRangeReads = 0;
	let operationMs = 0;
	let closeMs = 0;
	let cpuUserMicros = 0;
	let cpuSystemMicros = 0;
	let status: Status = "ok";
	let failure: WorkerResult["failure"];
	let beforeStats: SessionMemoryStats[] = [];
	let afterStats: SessionMemoryStats[] = [];
	try {
		const cpuStart = process.cpuUsage();
		const operationStartedAt = performance.now();
		try {
			for (const transcript of generated) {
				const manager = await SessionManager.open(
					transcript.file,
					SessionManager.explicitDestination(root),
					undefined,
					"copy-retain",
					sessionMemoryMode,
				);
				managers.push(manager);
			}
		} catch (error) {
			status = "code" in Object(error) && Object(error).code === "oversized" ? "rejected" : "error";
			failure = failureFrom(error);
		}
		operationMs = performance.now() - operationStartedAt;
		const cpu = process.cpuUsage(cpuStart);
		cpuUserMicros = cpu.user;
		cpuSystemMicros = cpu.system;
		afterOperation = await settledMemorySample();
		if (status === "ok") {
			beforeStats = managers.map(manager => manager.getSessionMemoryStats());
			for (let index = 0; index < managers.length; index++) {
				const id = generated[index]?.coldEntryId ?? "";
				const measured = await measurePhase(() => {
					const entry = managers[index]?.getEntry(id);
					if (entry?.type !== "custom") throw new Error(`missing synthetic entry ${id}`);
					return true;
				});
				coldSamples.push(measured.metric.elapsedMs);
			}
			afterColdLookups = await settledMemorySample();
			const afterCold = managers.map(manager => manager.getSessionMemoryStats());
			for (let index = 0; index < managers.length; index++) {
				const id = generated[index]?.coldEntryId ?? "";
				const measured = await measurePhase(() => {
					const entry = managers[index]?.getEntry(id);
					if (entry?.type !== "custom") throw new Error(`missing synthetic entry ${id}`);
					return true;
				});
				warmSamples.push(measured.metric.elapsedMs);
			}
			afterWarmLookups = await settledMemorySample();
			const afterWarm = managers.map(manager => manager.getSessionMemoryStats());
			coldRangeReads = afterCold.reduce((total, value, index) => total + value.rangeReadCount - (beforeStats[index]?.rangeReadCount ?? 0), 0);
			warmRangeReads = afterWarm.reduce((total, value, index) => total + value.rangeReadCount - (afterCold[index]?.rangeReadCount ?? 0), 0);
			for (const manager of managers) contextMessageCount += manager.buildSessionContext().messages.length;
			afterStats = afterWarm;
		}
		const closeMeasured = await measurePhase(async () => {
			for (const manager of managers) await manager.close();
			managers.length = 0;
		});
		closeMs = closeMeasured.metric.elapsedMs;
		afterClose = await settledMemorySample();
		return {
			scenario,
			targetMiB,
			operationClass: operation,
			sessionMemoryMode,
			gcStrategy,
			secondaryArtifacts,
			repetitions,
			status,
			fileCount,
			totalBytes: generated.reduce((total, value) => total + Bun.file(value.file).size, 0),
			entryCount: generated.reduce((total, value) => total + value.entryCount + (operation === "transcript-ahead-reopen" ? 1 : 0), 0),
			phases: {
				generationMs: 0,
				exactAuthenticatedReopenMs: operation === "exact-authenticated-reopen" ? operationMs : undefined,
				transcriptAheadReopenMs: operation === "transcript-ahead-reopen" ? operationMs : undefined,
				closeMs,
				cpuUserMicros,
				cpuSystemMicros,
			},
			phaseEvidence: phaseEvidenceFromStats(afterStats),
			counters: counterEvidence(beforeStats, afterStats),
			throughputMiBPerSecond: targetMiB / Math.max(operationMs / 1_000, 1e-9),
			memory: {
				processBaseline,
				operationBaseline,
				afterOperation,
				afterColdLookups,
				afterWarmLookups,
				afterClose,
				operationRssGrowthBytes: afterOperation.rssBytes - operationBaseline.rssBytes,
				lookupRssGrowthBytes: afterWarmLookups.rssBytes - afterOperation.rssBytes,
				teardownRssGrowthBytes: afterClose.rssBytes - operationBaseline.rssBytes,
				maxRssBytes: process.resourceUsage().maxRSS * (process.platform === "darwin" ? 1 : 1024),
			},
			lookup: {
				coldMs: { samples: coldSamples, ...summarize(coldSamples) },
				warmMs: { samples: warmSamples, ...summarize(warmSamples) },
				coldRangeReads,
				warmRangeReads,
			},
			sessionMemory: aggregateStats(afterStats, contextMessageCount),
			failure,
		};
	} finally {
		for (const manager of managers) await manager.close();
	}
}

async function runWorker(
	scenario: Scenario,
	targetMiB: number,
	operation: Operation = DEFAULT_OPERATION,
	sessionMemoryMode: SessionMemoryMode = "enabled",
	gcStrategy: GcStrategy = "current",
	secondaryArtifacts: SecondaryArtifacts = "current",
	repetitions = DEFAULT_REPETITIONS,
): Promise<WorkerResult> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), `gjc-session-matrix-${scenario}-${targetMiB}-`));
	const fileCount = scenarioFileCount(scenario);
	const targets = partitionBytes(targetMiB * MIB, fileCount);
	const generated: Array<GeneratedTranscript & { entryCount: number }> = [];
	const managers: SessionManager[] = [];
	const processBaseline = memorySample();
	let operationBaseline = processBaseline;
	let afterOperation = processBaseline;
	let afterColdLookups = processBaseline;
	let afterWarmLookups = processBaseline;
	let afterClose = processBaseline;
	let generationMs = 0;
	let firstOpenMs = 0;
	let closeMs = 0;
	let cpuUserMicros = 0;
	let cpuSystemMicros = 0;
	const firstOpenSamples: number[] = [];
	const coldSamples: number[] = [];
	const warmSamples: number[] = [];
	let contextMessageCount = 0;
	let coldRangeReads = 0;
	let warmRangeReads = 0;
	let status: Status = "ok";
	let failure: WorkerResult["failure"];
	let firstOpenStats: SessionMemoryStats[] = [];
	let afterStats: SessionMemoryStats[] = [];
	let firstOpenEvidence = emptyPhaseEvidence();
	let firstOpenCounters = emptyCounterEvidence();
	try {
		const generationStartedAt = performance.now();
		let rootSessionId: string | undefined;
		for (let fileIndex = 0; fileIndex < fileCount; fileIndex++) {
			const transcript = await generateTranscript({
				file: path.join(root, `${fileIndex}.jsonl`),
				root,
				scenario,
				fileIndex,
				targetBytes: targets[fileIndex] ?? 0,
				parentSession: scenario === "subagent-tree" && fileIndex > 0 ? rootSessionId : undefined,
			});
			generated.push(transcript);
			rootSessionId ??= transcript.sessionId;
		}
		generationMs = performance.now() - generationStartedAt;
		operationBaseline = await settledMemorySample();
		const firstOpenCpuStart = process.cpuUsage();
		const firstOpenStartedAt = performance.now();
		try {
			for (const transcript of generated) {
				const startedAt = performance.now();
				const manager = await SessionManager.open(
					transcript.file,
					SessionManager.explicitDestination(root),
					undefined,
					"copy-retain",
					sessionMemoryMode,
				);
				firstOpenSamples.push(performance.now() - startedAt);
				managers.push(manager);
			}
		} catch (error) {
			status = "code" in Object(error) && Object(error).code === "oversized" ? "rejected" : "error";
			failure = failureFrom(error);
		}
		firstOpenMs = performance.now() - firstOpenStartedAt;
		const firstOpenCpu = process.cpuUsage(firstOpenCpuStart);
		cpuUserMicros = firstOpenCpu.user;
		cpuSystemMicros = firstOpenCpu.system;
		afterOperation = await settledMemorySample();
		firstOpenStats = managers.map(manager => manager.getSessionMemoryStats());
		firstOpenEvidence = phaseEvidenceFromStats(firstOpenStats);
		firstOpenCounters = counterEvidence([], firstOpenStats);
		if (status === "ok" && operation === "raw-cold-first-open") {
			const beforeCold = managers.map(manager => manager.getSessionMemoryStats());
			for (let index = 0; index < managers.length; index++) {
				const measured = await measurePhase(() => {
					const id = generated[index]?.coldEntryId ?? "";
					const entry = managers[index]?.getEntry(id);
					if (entry?.type !== "custom") throw new Error(`missing synthetic entry ${id}`);
					return true;
				});
				coldSamples.push(measured.metric.elapsedMs);
			}
			afterColdLookups = await settledMemorySample();
			const afterCold = managers.map(manager => manager.getSessionMemoryStats());
			for (let index = 0; index < managers.length; index++) {
				const measured = await measurePhase(() => {
					const id = generated[index]?.coldEntryId ?? "";
					const entry = managers[index]?.getEntry(id);
					if (entry?.type !== "custom") throw new Error(`missing synthetic entry ${id}`);
					return true;
				});
				warmSamples.push(measured.metric.elapsedMs);
			}
			afterWarmLookups = await settledMemorySample();
			const afterWarm = managers.map(manager => manager.getSessionMemoryStats());
			coldRangeReads = afterCold.reduce((total, value, index) => total + value.rangeReadCount - (beforeCold[index]?.rangeReadCount ?? 0), 0);
			warmRangeReads = afterWarm.reduce((total, value, index) => total + value.rangeReadCount - (afterCold[index]?.rangeReadCount ?? 0), 0);
			for (const manager of managers) contextMessageCount += manager.buildSessionContext().messages.length;
			afterStats = afterWarm;
		}
		const setupClose = await measurePhase(async () => {
			for (const manager of managers) await manager.close();
			managers.length = 0;
		});
		closeMs = setupClose.metric.elapsedMs;
		afterClose = await settledMemorySample();
		if (operation === "exact-authenticated-reopen" || operation === "transcript-ahead-reopen") {
			if (operation === "transcript-ahead-reopen") {
				for (let index = 0; index < generated.length; index++) await appendTranscriptAhead(generated[index]!, scenario, index);
			}
			const child = Bun.spawnSync({
				cmd: [process.execPath, "--smol", "--expose-gc", import.meta.path, "--fresh-reopen", operation, scenario, String(targetMiB), root, sessionMemoryMode, gcStrategy, secondaryArtifacts, String(repetitions), metadataArgument(generated)],
				stdout: "pipe",
				stderr: "pipe",
				env: benchmarkEnv(gcStrategy, secondaryArtifacts),
			});
			if (child.exitCode !== 0) throw new Error(child.stderr.toString() || `fresh reopen exited ${child.exitCode}`);
			const result = JSON.parse(child.stdout.toString()) as WorkerResult;
			result.phases.generationMs = generationMs;
			result.preparation = { firstOpenMs, phaseEvidence: firstOpenEvidence, counters: firstOpenCounters };
			return result;
		}
		if (operation === "repeated-lifecycle") {
			const openSamples: number[] = [];
			const lifecycleLookupSamples: number[] = [];
			const lifecycleCloseSamples: number[] = [];
			const lifecycleStartedAt = performance.now();
			for (let repetition = 0; repetition < repetitions; repetition++) {
				const opened: SessionManager[] = [];
				const openStartedAt = performance.now();
				for (const transcript of generated) opened.push(await SessionManager.open(transcript.file, SessionManager.explicitDestination(root), undefined, "copy-retain", sessionMemoryMode));
				openSamples.push(performance.now() - openStartedAt);
				const lookupStartedAt = performance.now();
				for (let index = 0; index < opened.length; index++) {
					const id = generated[index]?.coldEntryId ?? "";
					const entry = opened[index]?.getEntry(id);
					if (entry?.type !== "custom") throw new Error(`missing synthetic entry ${id}`);
				}
				lifecycleLookupSamples.push(performance.now() - lookupStartedAt);
				const closeStartedAt = performance.now();
				for (const manager of opened) await manager.close();
				lifecycleCloseSamples.push(performance.now() - closeStartedAt);
			}
			const lifecycleMs = performance.now() - lifecycleStartedAt;
			afterOperation = await settledMemorySample();
			afterClose = afterOperation;
			return {
				scenario,
				targetMiB,
				operationClass: operation,
				sessionMemoryMode,
				gcStrategy,
				secondaryArtifacts,
				repetitions,
				status,
				fileCount,
				totalBytes: generated.reduce((total, value) => total + value.bytes, 0),
				entryCount: generated.reduce((total, value) => total + value.entryCount, 0),
				phases: { generationMs, firstOpenMs, repeatedLifecycleMs: lifecycleMs, closeMs, cpuUserMicros, cpuSystemMicros },
				phaseEvidence: firstOpenEvidence,
				counters: firstOpenCounters,
				firstOpenPerFileMs: { samples: firstOpenSamples, ...summarize(firstOpenSamples) },
				lifecycle: {
					openMs: { samples: openSamples, ...summarize(openSamples) },
					lookupMs: { samples: lifecycleLookupSamples, ...summarize(lifecycleLookupSamples) },
					closeMs: { samples: lifecycleCloseSamples, ...summarize(lifecycleCloseSamples) },
				},
				throughputMiBPerSecond: targetMiB / Math.max(lifecycleMs / 1_000, 1e-9),
				memory: {
					processBaseline,
					operationBaseline,
					afterOperation,
					afterColdLookups,
					afterWarmLookups,
					afterClose,
					operationRssGrowthBytes: afterOperation.rssBytes - operationBaseline.rssBytes,
					firstOpenBaseline: operationBaseline,
					afterFirstOpen: afterOperation,
					firstOpenRssGrowthBytes: afterOperation.rssBytes - operationBaseline.rssBytes,
					lookupRssGrowthBytes: afterOperation.rssBytes - operationBaseline.rssBytes,
					teardownRssGrowthBytes: afterClose.rssBytes - operationBaseline.rssBytes,
					maxRssBytes: process.resourceUsage().maxRSS * (process.platform === "darwin" ? 1 : 1024),
				},
				lookup: { coldMs: null, warmMs: null, coldRangeReads: null, warmRangeReads: null },
				sessionMemory: aggregateStats(firstOpenStats, contextMessageCount),
				failure,
			};
		}
		return {
			scenario,
			targetMiB,
			operationClass: operation,
			sessionMemoryMode,
			gcStrategy,
			secondaryArtifacts,
			repetitions,
			status,
			fileCount,
			totalBytes: generated.reduce((total, value) => total + value.bytes, 0),
			entryCount: generated.reduce((total, value) => total + value.entryCount, 0),
			phases: { generationMs, firstOpenMs, closeMs, cpuUserMicros, cpuSystemMicros },
			phaseEvidence: firstOpenEvidence,
			counters: firstOpenCounters,
			firstOpenPerFileMs: { samples: firstOpenSamples, ...summarize(firstOpenSamples) },
			throughputMiBPerSecond: status === "ok" ? targetMiB / Math.max(firstOpenMs / 1_000, 1e-9) : 0,
			memory: {
				processBaseline,
				operationBaseline,
				afterOperation,
				afterColdLookups,
				afterWarmLookups,
				afterClose,
				operationRssGrowthBytes: afterOperation.rssBytes - operationBaseline.rssBytes,
				firstOpenBaseline: operationBaseline,
				afterFirstOpen: afterOperation,
				firstOpenRssGrowthBytes: afterOperation.rssBytes - operationBaseline.rssBytes,
				lookupRssGrowthBytes: afterWarmLookups.rssBytes - afterOperation.rssBytes,
				teardownRssGrowthBytes: afterClose.rssBytes - operationBaseline.rssBytes,
				maxRssBytes: process.resourceUsage().maxRSS * (process.platform === "darwin" ? 1 : 1024),
			},
			lookup: {
				coldMs: { samples: coldSamples, ...summarize(coldSamples) },
				warmMs: { samples: warmSamples, ...summarize(warmSamples) },
				coldRangeReads,
				warmRangeReads,
			},
			sessionMemory: aggregateStats(afterStats.length > 0 ? afterStats : firstOpenStats, contextMessageCount),
			failure,
		};
	} finally {
		for (const manager of managers) await manager.close();
		await fs.rm(root, { recursive: true, force: true });
	}
}

function isScenario(value: string): value is Scenario {
	return (DEFAULT_SCENARIOS as readonly string[]).includes(value);
}

function parseList(value: string): string[] {
	return value.split(",").map(item => item.trim()).filter(Boolean);
}

function parseParentArgs(argv: string[]): ParentArgs {
	let sizesMiB = [...DEFAULT_SIZES_MIB];
	let scenarios = [...DEFAULT_SCENARIOS];
	let operations: Operation[] = [DEFAULT_OPERATION];
	let sessionMemoryModes: SessionMemoryMode[] = ["enabled"];
	let gcStrategy: GcStrategy = "current";
	let secondaryArtifacts: SecondaryArtifacts = "current";
	let repetitions = DEFAULT_REPETITIONS;
	let samples = 1;
	let outPrefix = "artifacts/session-scenario-matrix-2026-08-10";
	let smallComparison = false;
	let explicitModes = false;
	let explicitSizes = false;
	for (let index = 2; index < argv.length; index++) {
		const argument = argv[index];
		if (argument === "--sizes") {
			explicitSizes = true;
			sizesMiB = parseList(argv[++index] ?? "").map(value => Number.parseInt(value, 10));
			if (sizesMiB.some(value => !Number.isSafeInteger(value) || value < 1 || value > 4096)) throw new Error("invalid --sizes");
		} else if (argument === "--scenarios") {
			const values = parseList(argv[++index] ?? "");
			if (values.some(value => !isScenario(value))) throw new Error("invalid --scenarios");
			scenarios = values as Scenario[];
		} else if (argument === "--operation" || argument === "--operations") {
			const values = parseList(argv[++index] ?? "").map(operationFromArg);
			if (values.length === 0) throw new Error("--operation requires at least one operation");
			operations = values;
		} else if (argument === "--session-memory-mode" || argument === "--session-memory-modes" || argument === "--modes") {
			explicitModes = true;
			const values = parseList(argv[++index] ?? "").map(sessionMemoryModeFromArg);
			if (values.length === 0) throw new Error("--session-memory-mode requires at least one mode");
			sessionMemoryModes = values;
		} else if (argument === "--gc-strategy") {
			gcStrategy = gcStrategyFromArg(argv[++index]);
		} else if (argument === "--secondary-artifacts") {
			secondaryArtifacts = secondaryArtifactsFromArg(argv[++index]);
		} else if (argument === "--repetitions" || argument === "--iterations") {
			const value = Number.parseInt(argv[++index] ?? "", 10);
			if (!Number.isSafeInteger(value) || value < 1 || value > 100) throw new Error("--repetitions must be between 1 and 100");
			repetitions = value;
		} else if (argument === "--samples") {
			const value = Number.parseInt(argv[++index] ?? "", 10);
			if (!Number.isSafeInteger(value) || value < 1 || value > 20) throw new Error("--samples must be between 1 and 20");
			samples = value;
		} else if (argument === "--small-session-comparison" || argument === "--compare-small-modes") {
			smallComparison = true;
		} else if (argument === "--out-prefix") {
			outPrefix = argv[++index] ?? "";
			if (!outPrefix) throw new Error("--out-prefix requires a path");
		} else {
			throw new Error(`unknown argument: ${argument}`);
		}
	}
	if (smallComparison) {
		if (!explicitSizes) sizesMiB = [...SMALL_COMPARISON_SIZES_MIB];
		if (!explicitModes) sessionMemoryModes = ["enabled", "shadow", "off"];
	}
	return { sizesMiB, scenarios, operations, sessionMemoryModes, gcStrategy, secondaryArtifacts, repetitions, samples, outPrefix, smallComparison };
}

function gitSha(): string | null {
	const result = Bun.spawnSync({ cmd: ["git", "rev-parse", "HEAD"], stdout: "pipe", stderr: "ignore" });
	return result.exitCode === 0 ? result.stdout.toString().trim() : null;
}

function csvCell(value: unknown): string {
	const text = String(value ?? "");
	return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function reportCsv(report: MatrixReport): string {
	const headers = [
		"scenario", "operationClass", "sessionMemoryMode", "gcStrategy", "secondaryArtifacts", "repetitions", "repetitionIndex", "targetMiB", "status", "fileCount", "entryCount", "generationMs", "firstOpenMs", "exactAuthenticatedReopenMs", "transcriptAheadReopenMs", "repeatedLifecycleMs", "firstOpenP95Ms",
		"throughputMiBPerSecond", "operationRssGrowthMiB", "firstOpenRssGrowthMiB", "lookupRssGrowthMiB", "teardownRssGrowthMiB", "maxRssMiB", "phaseEvidenceJson", "counterEvidenceJson",
		"coldLookupP95Ms", "warmLookupP95Ms", "coldRangeReads", "warmRangeReads", "accountedMiB", "sidecarEnabled", "coldRetirementActive", "dictionaryArtifactEnabled", "parentArtifactEnabled", "gcRequests", "bytesRead", "bytesWritten", "recordsParsed", "indexWriteCalls", "fsyncCount", "failureCode",
	];
	const rows = report.runs.map(run => [
		run.scenario,
		run.operationClass,
		run.sessionMemoryMode,
		run.gcStrategy,
		run.secondaryArtifacts,
		run.repetitions,
		run.repetitionIndex ?? 0,
		run.targetMiB,
		run.status,
		run.fileCount,
		run.entryCount,
		run.phases.generationMs,
		run.phases.firstOpenMs ?? "",
		run.phases.exactAuthenticatedReopenMs ?? "",
		run.phases.transcriptAheadReopenMs ?? "",
		run.phases.repeatedLifecycleMs ?? "",
		run.firstOpenPerFileMs?.p95 ?? "",
		run.throughputMiBPerSecond,
		run.memory.operationRssGrowthBytes / MIB,
		run.memory.firstOpenRssGrowthBytes === undefined ? "" : (run.memory.firstOpenRssGrowthBytes ?? 0) / MIB,
		run.memory.lookupRssGrowthBytes / MIB,
		run.memory.teardownRssGrowthBytes / MIB,
		run.memory.maxRssBytes / MIB,
		JSON.stringify(run.phaseEvidence),
		JSON.stringify(run.counters),
		run.lookup.coldMs?.p95 ?? "",
		run.lookup.warmMs?.p95 ?? "",
		run.lookup.coldRangeReads ?? "",
		run.lookup.warmRangeReads ?? "",
		run.sessionMemory.totalAccountedBytes / MIB,
		run.sessionMemory.telemetry.sidecarEnabled ?? "",
		run.sessionMemory.telemetry.coldRetirementActive ?? "",
		run.sessionMemory.telemetry.dictionaryArtifactEnabled ?? "",
		run.sessionMemory.telemetry.parentArtifactEnabled ?? "",
		run.counters.gcRequests ?? "",
		run.counters.bytesRead ?? "",
		run.counters.bytesWritten ?? "",
		run.counters.recordsParsed ?? "",
		run.counters.indexWriteCalls ?? "",
		run.counters.fsyncCount ?? "",
		run.failure?.code ?? "",
	]);
	return `${[headers, ...rows].map(row => row.map(csvCell).join(",")).join("\n")}\n`;
}

const COLORS: Record<Scenario, string> = {
	"linear-resume": "#2563eb",
	"multi-transcript": "#16a34a",
	"subagent-tree": "#9333ea",
	"goal-history": "#ea580c",
};

function operationElapsedMs(run: WorkerResult): number | null {
	if (run.status !== "ok") return null;
	return run.phases.firstOpenMs ?? run.phases.exactAuthenticatedReopenMs ?? run.phases.transcriptAheadReopenMs ?? run.phases.repeatedLifecycleMs ?? null;
}

function operationRssGrowthBytes(run: WorkerResult): number | null {
	return run.status === "ok" ? run.memory.operationRssGrowthBytes : null;
}

function chartSvg(report: MatrixReport): string {
	const width = 1280;
	const height = 960;
	const margin = { left: 76, right: 28, top: 60, bottom: 58 };
	const panelWidth = (width - margin.left - margin.right - 40) / 2;
	const panelHeight = (height - margin.top - margin.bottom - 50) / 2;
	const panels = [
		{ title: "Operation latency (ms)", value: (run: WorkerResult) => operationElapsedMs(run) },
		{ title: "Operation RSS growth (MiB)", value: (run: WorkerResult) => { const value = operationRssGrowthBytes(run); return value === null ? null : value / MIB; } },
		{ title: "Operation throughput (MiB/s)", value: (run: WorkerResult) => run.status === "ok" ? run.throughputMiBPerSecond : null },
		{ title: "Cold lookup p95 (ms)", value: (run: WorkerResult) => run.status === "ok" && run.lookup.coldMs ? run.lookup.coldMs.p95 : null },
	] as const;
	const minLog = Math.log2(Math.min(...report.sizesMiB));
	const maxLog = Math.log2(Math.max(...report.sizesMiB));
	const escape = (value: string): string => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
	const parts = [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
		`<rect width="100%" height="100%" fill="#ffffff"/>`,
		`<text x="${margin.left}" y="32" font-family="system-ui,sans-serif" font-size="22" font-weight="700">Synthetic session scenario matrix</text>`,
		`<text x="${margin.left}" y="51" font-family="system-ui,sans-serif" font-size="12" fill="#475569">${escape(report.platform)} ${escape(report.arch)} · Bun ${escape(report.bunVersion)} · ${report.sizesMiB.length}-point dense sweep</text>`,
	];
	for (const [panelIndex, panel] of panels.entries()) {
		const column = panelIndex % 2;
		const row = Math.floor(panelIndex / 2);
		const x0 = margin.left + column * (panelWidth + 40);
		const y0 = margin.top + row * (panelHeight + 50);
		const plotTop = y0 + 28;
		const plotBottom = y0 + panelHeight - 32;
		const plotHeight = plotBottom - plotTop;
		const values = report.runs.map(panel.value).filter((value): value is number => value !== null && Number.isFinite(value));
		const maxValue = Math.max(1, ...values) * 1.08;
		parts.push(`<text x="${x0}" y="${y0 + 17}" font-family="system-ui,sans-serif" font-size="15" font-weight="650">${escape(panel.title)}</text>`);
		parts.push(`<line x1="${x0}" y1="${plotBottom}" x2="${x0 + panelWidth}" y2="${plotBottom}" stroke="#94a3b8"/>`);
		parts.push(`<line x1="${x0}" y1="${plotTop}" x2="${x0}" y2="${plotBottom}" stroke="#94a3b8"/>`);
		for (let tick = 0; tick <= 4; tick++) {
			const y = plotBottom - (tick / 4) * plotHeight;
			const label = (maxValue * tick / 4).toFixed(maxValue >= 100 ? 0 : 1);
			parts.push(`<line x1="${x0}" y1="${y}" x2="${x0 + panelWidth}" y2="${y}" stroke="#e2e8f0"/>`);
			parts.push(`<text x="${x0 - 7}" y="${y + 4}" text-anchor="end" font-family="system-ui,sans-serif" font-size="10" fill="#64748b">${label}</text>`);
		}
		for (const size of report.sizesMiB) {
			const x = x0 + ((Math.log2(size) - minLog) / Math.max(1, maxLog - minLog)) * panelWidth;
			parts.push(`<text x="${x}" y="${plotBottom + 17}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#64748b">${size}</text>`);
		}
		for (const scenario of report.scenarios) {
			const scenarioRuns = report.runs.filter(run => run.scenario === scenario).sort((left, right) => left.targetMiB - right.targetMiB);
			const points = scenarioRuns.flatMap(run => {
				const value = panel.value(run);
				if (value === null) return [];
				const x = x0 + ((Math.log2(run.targetMiB) - minLog) / Math.max(1, maxLog - minLog)) * panelWidth;
				const y = plotBottom - (value / maxValue) * plotHeight;
				return [{ x, y }];
			});
			if (points.length > 1) parts.push(`<polyline fill="none" stroke="${COLORS[scenario]}" stroke-width="2" points="${points.map(point => `${point.x},${point.y}`).join(" ")}"/>`);
			for (const run of scenarioRuns) {
				const x = x0 + ((Math.log2(run.targetMiB) - minLog) / Math.max(1, maxLog - minLog)) * panelWidth;
				const value = panel.value(run);
				if (value === null) {
					parts.push(`<text x="${x}" y="${plotTop + 12}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="#dc2626">×</text>`);
				} else {
					const y = plotBottom - (value / maxValue) * plotHeight;
					parts.push(`<circle cx="${x}" cy="${y}" r="3.5" fill="${COLORS[scenario]}"/>`);
				}
			}
		}
	}
	let legendX = margin.left;
	const legendY = height - 18;
	for (const scenario of report.scenarios) {
		parts.push(`<line x1="${legendX}" y1="${legendY - 4}" x2="${legendX + 22}" y2="${legendY - 4}" stroke="${COLORS[scenario]}" stroke-width="3"/>`);
		parts.push(`<text x="${legendX + 28}" y="${legendY}" font-family="system-ui,sans-serif" font-size="11" fill="#334155">${escape(scenario)}</text>`);
		legendX += 165;
	}
	parts.push("</svg>");
	return `${parts.join("\n")}\n`;
}

async function runParent(): Promise<void> {
	const args = parseParentArgs(Bun.argv);
	const runs: WorkerResult[] = [];
	for (const operation of args.operations) {
		for (const sessionMemoryMode of args.sessionMemoryModes) {
			for (const scenario of args.scenarios) {
				for (const sizeMiB of args.sizesMiB) {
					for (let repetitionIndex = 0; repetitionIndex < args.samples; repetitionIndex++) {
						const child = Bun.spawnSync({
							cmd: [process.execPath, "--smol", "--expose-gc", import.meta.path, "--worker", scenario, String(sizeMiB), operation, sessionMemoryMode, args.gcStrategy, args.secondaryArtifacts, String(args.repetitions)],
							stdout: "pipe",
							stderr: "pipe",
							env: benchmarkEnv(args.gcStrategy, args.secondaryArtifacts),
						});
						if (child.exitCode !== 0) throw new Error(child.stderr.toString() || `worker exited ${child.exitCode}`);
						const run = JSON.parse(child.stdout.toString()) as WorkerResult;
						run.repetitionIndex = repetitionIndex;
						runs.push(run);
					}
				}
			}
		}
	}
	const report: MatrixReport = {
		schemaVersion: SCHEMA_VERSION,
		bench: "session-scenario-matrix",
		generatedAt: new Date().toISOString(),
		gitSha: gitSha(),
		platform: process.platform,
		arch: process.arch,
		cpu: os.cpus()[0]?.model ?? null,
		bunVersion: Bun.version,
		sizesMiB: args.sizesMiB,
		scenarios: args.scenarios,
		operations: args.operations,
		sessionMemoryModes: args.sessionMemoryModes,
		gcStrategy: args.gcStrategy,
		secondaryArtifacts: args.secondaryArtifacts,
		repetitions: args.repetitions,
		samples: args.samples,
		smallComparisonSizesMiB: args.smallComparison ? [...SMALL_COMPARISON_SIZES_MIB] : undefined,
		runs,
	};
	await Bun.write(`${args.outPrefix}.json`, `${JSON.stringify(report, null, 2)}\n`);
	await Bun.write(`${args.outPrefix}.csv`, reportCsv(report));
	await Bun.write(`${args.outPrefix}.svg`, chartSvg(report));
	process.stdout.write(`${JSON.stringify({ json: `${args.outPrefix}.json`, csv: `${args.outPrefix}.csv`, svg: `${args.outPrefix}.svg`, runs: runs.length })}\n`);
}

if (Bun.argv[2] === "--fresh-reopen") {
	const operation = operationFromArg(Bun.argv[3]);
	if (operation !== "exact-authenticated-reopen" && operation !== "transcript-ahead-reopen") throw new Error("fresh reopen requires an authenticated reopen operation");
	const scenario = Bun.argv[4] ?? "";
	const targetMiB = Number.parseInt(Bun.argv[5] ?? "", 10);
	const root = Bun.argv[6] ?? "";
	const sessionMemoryMode = sessionMemoryModeFromArg(Bun.argv[7]);
	const gcStrategy = gcStrategyFromArg(Bun.argv[8]);
	const secondaryArtifacts = secondaryArtifactsFromArg(Bun.argv[9]);
	const repetitions = Number.parseInt(Bun.argv[10] ?? "", 10);
	const metadata = Bun.argv[11] ?? "";
	if (!isScenario(scenario) || !Number.isSafeInteger(targetMiB) || targetMiB < 1 || !root || !Number.isSafeInteger(repetitions) || repetitions < 1 || !metadata) throw new Error("invalid fresh reopen arguments");
	process.stdout.write(`${JSON.stringify(await runFreshReopenWorker(scenario, targetMiB, operation, root, sessionMemoryMode, gcStrategy, secondaryArtifacts, repetitions, metadata))}\n`);
} else if (Bun.argv[2] === "--worker") {
	const scenario = Bun.argv[3] ?? "";
	const targetMiB = Number.parseInt(Bun.argv[4] ?? "", 10);
	const operation = operationFromArg(Bun.argv[5] ?? DEFAULT_OPERATION);
	const sessionMemoryMode = sessionMemoryModeFromArg(Bun.argv[6] ?? "enabled");
	const gcStrategy = gcStrategyFromArg(Bun.argv[7] ?? "current");
	const secondaryArtifacts = secondaryArtifactsFromArg(Bun.argv[8] ?? "current");
	const repetitions = Number.parseInt(Bun.argv[9] ?? String(DEFAULT_REPETITIONS), 10);
	if (!isScenario(scenario) || !Number.isSafeInteger(targetMiB) || targetMiB < 1 || !Number.isSafeInteger(repetitions) || repetitions < 1) throw new Error("invalid worker arguments");
	process.stdout.write(`${JSON.stringify(await runWorker(scenario, targetMiB, operation, sessionMemoryMode, gcStrategy, secondaryArtifacts, repetitions))}\n`);
} else {
	await runParent();
}
