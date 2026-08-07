/**
 * Contract tests for the standalone sidecar primitives: accountant arithmetic
 * and disk-ref demotion, the six nearest-model cases, TTSR latest-wins,
 * duplicate-ID sidecar ineligibility, deterministic dictionary output,
 * anchored base + rolling tail checksum tamper detection, the five reopen
 * classes, the derived-file predicate (incl. `.spill.buckets`), and cache
 * budget rejection.
 */
import { describe, expect, it } from "bun:test";
import {
	applyReducerDelta,
	type BaseAnchor,
	BLOCK_CACHE_BUDGET_BYTES,
	BoundedDictionaryBuilder,
	BoundedLabelsPinsStore,
	BoundedParentChildrenIndex,
	type CommitMarkerContents,
	classifyReopen,
	computeLineDigest,
	computeTerminalChecksum,
	createReducerState,
	DESCRIPTOR_BYTES,
	type DescriptorSnapshot,
	DICTIONARY_BUILD_PEAK_BYTES,
	ENTRY_CACHE_BUDGET_BYTES,
	FixedCacheAccount,
	foldReducerStates,
	getLastModelChangeRole,
	isDerivedSessionMemoryFile,
	LABELS_PINS_BUDGET_BYTES,
	MAX_REDUCER_INLINE_BYTES,
	ReducerBudget,
	type ReopenEvidence,
	RollingTailChainBuilder,
	residentArrayBytes,
	residentStringBytes,
	SESSION_MEMORY_ACCEPTANCE_BUDGET_BYTES,
	SESSION_MEMORY_STEADY_STATE_BUDGET_BYTES,
	SessionMemoryAccountant,
	TAIL_BUFFER_BUDGET_BYTES,
	type TailRecordInput,
	validateCommit,
	validateTailChain,
} from "../../src/session/internal/session-memory-sidecar";

const enc = (value: string): Uint8Array => new TextEncoder().encode(value);

describe("SessionMemoryAccountant arithmetic", () => {
	it("charges the resident formulas exactly", () => {
		const accountant = new SessionMemoryAccountant();
		expect(residentStringBytes("hello")).toBe(2 * 5 + 16);
		expect(residentArrayBytes(3, 100)).toBe(8 * 3 + 100);
		accountant.chargeString("hello");
		expect(accountant.totalBytes).toBe(26);
		accountant.chargeArray(3, 100);
		expect(accountant.totalBytes).toBe(26 + 124);
		accountant.chargeDescriptor();
		expect(accountant.totalBytes).toBe(26 + 124 + DESCRIPTOR_BYTES);
		accountant.release(26);
		expect(accountant.totalBytes).toBe(124 + DESCRIPTOR_BYTES);
		expect(accountant.isWithinBudget()).toBe(true);
	});

	it("tryCharge rejects over-budget additions without mutating", () => {
		const accountant = new SessionMemoryAccountant(100);
		expect(accountant.tryCharge(60)).toBe(true);
		expect(accountant.tryCharge(50)).toBe(false);
		expect(accountant.totalBytes).toBe(60);
		expect(accountant.wouldExceed(50)).toBe(true);
		expect(accountant.wouldExceed(40)).toBe(false);
	});

	it("defines the 64 MiB acceptance and 61.0625 MiB steady-state budgets", () => {
		expect(SESSION_MEMORY_ACCEPTANCE_BUDGET_BYTES).toBe(64 * 1024 * 1024);
		expect(SESSION_MEMORY_STEADY_STATE_BUDGET_BYTES).toBe(61 * 1024 * 1024 + 64 * 1024);
	});
});

describe("ReducerBudget disk-ref demotion", () => {
	it("stores values over MAX_REDUCER_INLINE_BYTES as disk-ref descriptors", () => {
		const budget = new ReducerBudget();
		const result = budget.setInline("big", MAX_REDUCER_INLINE_BYTES + 1);
		expect(result.kind).toBe("ok");
		const entry = budget.get("big");
		expect(entry?.kind).toBe("disk_ref");
		expect(entry?.residentBytes).toBe(DESCRIPTOR_BYTES);
		const descriptor = budget.getDescriptor("big");
		expect(descriptor?.section).toBe("metadata-delta");
		expect(descriptor?.length).toBe(MAX_REDUCER_INLINE_BYTES + 1);
	});

	it("keeps small values inline (cheaper than a descriptor)", () => {
		const budget = new ReducerBudget();
		budget.setInline("small", 10);
		expect(budget.get("small")?.kind).toBe("inline");
		expect(budget.totalBytes).toBe(10);
	});

	it("demotes the largest resident value before the cap is crossed", () => {
		const budget = new ReducerBudget(1024);
		budget.setInline("a", 500);
		budget.setInline("b", 700);
		// 500 + 700 = 1200 > 1024 → demote the largest (b) to 24 B.
		expect(budget.totalBytes).toBe(500 + DESCRIPTOR_BYTES);
		expect(budget.get("b")?.kind).toBe("disk_ref");
		expect(budget.get("a")?.kind).toBe("inline");
	});

	it("reports over_budget_irreducible when only descriptors remain over budget", () => {
		const budget = new ReducerBudget(40);
		budget.setInline("a", 100);
		const result = budget.setInline("b", 100);
		// 100 → 24, then 100 → 24, total 48, still over 40 with only descriptors.
		expect(result.kind).toBe("over_budget_irreducible");
		expect(budget.totalBytes).toBe(48);
	});
});

describe("nearest model-change role (R1)", () => {
	it("reviewer-only resolves to reviewer", () => {
		let state = createReducerState();
		state = applyReducerDelta(state, { kind: "latest_model_change", ordinal: 1, role: "reviewer" });
		expect(getLastModelChangeRole(state)).toBe("reviewer");
	});

	it("temporary-only resolves to temporary", () => {
		let state = createReducerState();
		state = applyReducerDelta(state, { kind: "latest_model_change", ordinal: 2, role: "temporary" });
		expect(getLastModelChangeRole(state)).toBe("temporary");
	});

	it("interleaved default→reviewer→temporary resolves to the nearest (temporary)", () => {
		let state = createReducerState();
		state = applyReducerDelta(state, { kind: "latest_model_change", ordinal: 1, role: "default" });
		state = applyReducerDelta(state, { kind: "latest_model_change", ordinal: 2, role: "reviewer" });
		state = applyReducerDelta(state, { kind: "latest_model_change", ordinal: 3, role: "temporary" });
		expect(getLastModelChangeRole(state)).toBe("temporary");
	});

	it("no model_change resolves to undefined", () => {
		expect(getLastModelChangeRole(createReducerState())).toBeUndefined();
	});

	it("legacy-only (no model_change) resolves to undefined while models.default is inferred", () => {
		// The reducer carries no model_change; the legacy assistant-inference into
		// models.default is a separate SessionManager mechanism (hasExplicitDefaultModel).
		expect(getLastModelChangeRole(createReducerState())).toBeUndefined();
	});

	it("explicit default then legacy inference resolves to default", () => {
		let state = createReducerState();
		state = applyReducerDelta(state, { kind: "latest_model_change", ordinal: 1, role: "default" });
		expect(getLastModelChangeRole(state)).toBe("default");
	});

	it("role-less model_change defaults to default", () => {
		let state = createReducerState();
		state = applyReducerDelta(state, { kind: "latest_model_change", ordinal: 1 });
		expect(getLastModelChangeRole(state)).toBe("default");
	});

	it("compaction fold keeps the max-ordinal value (nearest wins)", () => {
		const left = applyReducerDelta(createReducerState(), {
			kind: "latest_model_change",
			ordinal: 2,
			role: "default",
		});
		const right = applyReducerDelta(createReducerState(), {
			kind: "latest_model_change",
			ordinal: 5,
			role: "reviewer",
		});
		expect(getLastModelChangeRole(foldReducerStates(left, right))).toBe("reviewer");
	});
});

describe("TTSR latest-wins", () => {
	it("count replaces the prior value (authoritative buildSessionContext)", () => {
		let state = createReducerState();
		state = applyReducerDelta(state, {
			kind: "ttsr_injection",
			ordinal: 1,
			rulesCount: 2,
			recordsCount: 3,
			count: 10,
		});
		state = applyReducerDelta(state, {
			kind: "ttsr_injection",
			ordinal: 2,
			rulesCount: 4,
			recordsCount: 5,
			count: 30,
		});
		expect(state.ttsr.count).toBe(30);
		expect(state.ttsr.rulesCount).toBe(4);
		expect(state.ttsr.recordsCount).toBe(5);
	});

	it("fold keeps the latest ordinal's count", () => {
		const left = applyReducerDelta(createReducerState(), {
			kind: "ttsr_injection",
			ordinal: 1,
			rulesCount: 1,
			recordsCount: 1,
			count: 5,
		});
		const right = applyReducerDelta(createReducerState(), {
			kind: "ttsr_injection",
			ordinal: 3,
			rulesCount: 2,
			recordsCount: 2,
			count: 9,
		});
		expect(foldReducerStates(left, right).ttsr.count).toBe(9);
	});
});

describe("BoundedDictionaryBuilder", () => {
	it("produces deterministic append-only output", () => {
		const records = [
			{ ordinal: 0, id: "a", bytes: enc("hello") },
			{ ordinal: 1, id: "b", bytes: enc("world") },
			{ ordinal: 2, id: "c", bytes: enc("hello") }, // duplicate term → reused id
		];
		const buildOnce = new BoundedDictionaryBuilder();
		for (const record of records) buildOnce.add(record);
		const first = buildOnce.finish();
		const buildAgain = new BoundedDictionaryBuilder();
		for (const record of records) buildAgain.add(record);
		const second = buildAgain.finish();
		expect(first.kind).toBe("ok");
		expect(second.kind).toBe("ok");
		if (first.kind !== "ok" || second.kind !== "ok") throw new Error("expected ok build");
		expect(first.dictionary.terms).toEqual(second.dictionary.terms);
		expect(first.dictionary.terms).toEqual(["hello", "world"]);
		expect(first.dictionary.idByTerm.get("hello")).toBe(0);
		expect(first.dictionary.idByTerm.get("world")).toBe(1);
		expect(first.stats.uniqueTerms).toBe(2);
		expect(first.stats.totalRecords).toBe(3);
		expect(first.stats.sidecarIneligible).toBe(false);
	});

	it("marks the session sidecar-ineligible on duplicate record IDs", () => {
		const builder = new BoundedDictionaryBuilder();
		builder.add({ ordinal: 0, id: "dup", bytes: enc("x") });
		builder.add({ ordinal: 1, id: "dup", bytes: enc("y") });
		const result = builder.finish();
		expect(result.kind).toBe("ok");
		if (result.kind !== "ok") throw new Error("expected ok build");
		expect(result.stats.sidecarIneligible).toBe(true);
		expect(result.stats.duplicateIds).toEqual(["dup"]);
		expect(result.dictionary.header.sidecarIneligible).toBe(true);
	});

	it("uses a 20 MiB default build peak and enforces a custom budget", () => {
		expect(DICTIONARY_BUILD_PEAK_BYTES).toBe(20 * 1024 * 1024);
		const builder = new BoundedDictionaryBuilder({
			peakBudgetBytes: 100,
			partitionBufferBytes: 10,
			bucketJournalBytes: 10,
		});
		const result = builder.add({ ordinal: 0, id: "big", bytes: enc("x".repeat(200)) });
		expect(result.kind).toBe("budget_exceeded");
		if (result.kind === "budget_exceeded") {
			expect(result.peakBytes).toBeGreaterThan(result.budgetBytes);
		}
	});
});

describe("anchored base digest + rolling tail chain tamper detection", () => {
	const base: BaseAnchor = { baseDigest: "abc123", baseEndOffset: 100 };

	function couple(): { records: TailRecordInput[]; tail: ReturnType<RollingTailChainBuilder["build"]> } {
		const records: TailRecordInput[] = [
			{
				seq: 0,
				kind: "user",
				ordinal: 0,
				id: "m0",
				parentId: null,
				type: "user",
				byteOffset: 100,
				byteLength: 5,
				recordDigest: computeLineDigest(enc("line0")),
			},
			{
				seq: 1,
				kind: "assistant",
				ordinal: 1,
				id: "m1",
				parentId: "m0",
				type: "assistant",
				byteOffset: 105,
				byteLength: 7,
				recordDigest: computeLineDigest(enc("line111")),
			},
		];
		const builder = new RollingTailChainBuilder(base);
		for (const record of records) builder.append(record);
		return { records, tail: builder.build() };
	}

	it("computes a deterministic chain and validates it", () => {
		const { tail } = couple();
		expect(tail.records.length).toBe(2);
		expect(validateTailChain(base, tail.records).valid).toBe(true);
		expect(tail.terminalChecksum).toBe(computeTerminalChecksum(base, tail.records));
		expect(tail.transcriptSize).toBe(112);
		// Determinism: same input → same checksums.
		const { tail: again } = couple();
		expect(again.terminalChecksum).toBe(tail.terminalChecksum);
	});

	it("detects tampering in byteLength, recordDigest, and the base anchor", () => {
		const { records, tail } = couple();
		// Tamper byteLength on record 0 → record 1's offset becomes discontinuous.
		const tamperedLength = validateTailChain(base, [{ ...tail.records[0], byteLength: 9 }, tail.records[1]]);
		expect(tamperedLength.valid).toBe(false);
		expect(tamperedLength.reason).toBe("offset_discontinuity");
		// Tamper recordDigest on record 0 → C0 mismatch.
		const tamperedDigest = validateTailChain(base, [
			{ ...tail.records[0], recordDigest: computeLineDigest(enc("evil")) },
			tail.records[1],
		]);
		expect(tamperedDigest.valid).toBe(false);
		expect(tamperedDigest.reason).toBe("checksum_mismatch");
		// Tamper the base digest → C0 mismatch.
		const tamperedBase = validateTailChain({ baseDigest: "deadbeef", baseEndOffset: 100 }, tail.records);
		expect(tamperedBase.valid).toBe(false);
		expect(tamperedBase.reason).toBe("checksum_mismatch");
		// Sanity: the untouched records still validate.
		expect(
			validateTailChain(
				base,
				records.map((r, i) => ({ ...r, gen: 0, checksum: tail.records[i].checksum })),
			).valid,
		).toBe(true);
	});
});

describe("commit validation", () => {
	const descriptor: DescriptorSnapshot = { dev: 1n, ino: 2n, nlink: 1n, size: 112, mtimeNs: 100n, ctimeNs: 100n };
	const base: BaseAnchor = { baseDigest: "base", baseEndOffset: 100 };

	function consistentCommit(): {
		commit: CommitMarkerContents;
		records: ReturnType<RollingTailChainBuilder["build"]>["records"];
	} {
		const builder = new RollingTailChainBuilder(base);
		builder.append({
			seq: 0,
			kind: "user",
			ordinal: 0,
			id: "m0",
			parentId: null,
			type: "user",
			byteOffset: 100,
			byteLength: 5,
			recordDigest: computeLineDigest(enc("line0")),
		});
		builder.append({
			seq: 1,
			kind: "assistant",
			ordinal: 1,
			id: "m1",
			parentId: "m0",
			type: "assistant",
			byteOffset: 105,
			byteLength: 7,
			recordDigest: computeLineDigest(enc("line111")),
		});
		const tail = builder.build();
		return {
			records: tail.records,
			commit: {
				gen: 1,
				descriptor,
				base,
				terminalChecksum: tail.terminalChecksum,
				terminalSeq: tail.terminalSeq,
				transcriptSize: tail.transcriptSize,
			},
		};
	}

	it("validates a consistent commit", () => {
		const { commit, records } = consistentCommit();
		const result = validateCommit(commit, records, {
			descriptor,
			baseValid: true,
			tailValid: true,
			terminalMarkerValid: true,
		});
		expect(result.kind).toBe("valid");
	});

	it("flags a descriptor mismatch", () => {
		const { commit, records } = consistentCommit();
		const result = validateCommit(commit, records, {
			descriptor: { ...descriptor, size: 999 },
			baseValid: true,
			tailValid: true,
			terminalMarkerValid: true,
		});
		expect(result).toMatchObject({ kind: "invalid", reason: "descriptor_mismatch" });
	});

	it("flags a tampered terminal checksum", () => {
		const { commit, records } = consistentCommit();
		const result = validateCommit({ ...commit, terminalChecksum: "nope" }, records, {
			descriptor,
			baseValid: true,
			tailValid: true,
			terminalMarkerValid: true,
		});
		expect(result).toMatchObject({ kind: "invalid", reason: "terminal_checksum_mismatch" });
	});

	it("flags missing fields", () => {
		const { records } = consistentCommit();
		const result = validateCommit({}, records, {
			descriptor,
			baseValid: true,
			tailValid: true,
			terminalMarkerValid: true,
		});
		expect(result).toMatchObject({ kind: "invalid", reason: "missing_fields" });
	});
});

describe("five-class reopen classification", () => {
	const exactEvidence: ReopenEvidence = {
		markerPresent: true,
		descriptorExact: true,
		sameObject: true,
		sameSize: true,
		sizeGrew: false,
		sizeShrank: false,
		withinScanWindow: true,
		timesAdvanced: true,
		timesChanged: false,
		baseValid: true,
		tailValid: true,
		terminalMarkerValid: true,
	};

	it("classifies exact", () => {
		expect(classifyReopen(exactEvidence).kind).toBe("exact");
	});

	it("classifies transcript_ahead on in-window growth with valid proof", () => {
		const evidence: ReopenEvidence = {
			...exactEvidence,
			descriptorExact: false,
			sameSize: false,
			sizeGrew: true,
			baseValid: true,
			tailValid: true,
		};
		expect(classifyReopen(evidence).kind).toBe("transcript_ahead");
	});

	it("classifies tail_ahead when a committed tail record fails at matching size", () => {
		const evidence: ReopenEvidence = {
			...exactEvidence,
			descriptorExact: false,
			baseValid: true,
			tailValid: false,
		};
		expect(classifyReopen(evidence).kind).toBe("tail_ahead");
	});

	it("classifies rebuild on same-size mutation, shrink, and over-window growth", () => {
		expect(classifyReopen({ ...exactEvidence, descriptorExact: false, timesChanged: true }).kind).toBe("rebuild");
		expect(
			classifyReopen({
				...exactEvidence,
				descriptorExact: false,
				sameSize: false,
				sizeGrew: false,
				sizeShrank: true,
			}).kind,
		).toBe("rebuild");
		expect(
			classifyReopen({
				...exactEvidence,
				descriptorExact: false,
				sameSize: false,
				sizeGrew: true,
				withinScanWindow: false,
			}).kind,
		).toBe("rebuild");
	});

	it("classifies stale_commit on a missing marker or object identity mismatch", () => {
		expect(classifyReopen({ ...exactEvidence, markerPresent: false }).kind).toBe("stale_commit");
		expect(classifyReopen({ ...exactEvidence, descriptorExact: false, sameObject: false }).kind).toBe("stale_commit");
	});

	it("never accepts a stale commit as current on any path", () => {
		for (const evidence of [
			{ ...exactEvidence, markerPresent: false },
			{ ...exactEvidence, descriptorExact: false, sameObject: false },
		]) {
			expect(classifyReopen(evidence).kind).not.toBe("exact");
		}
	});
});

describe("isDerivedSessionMemoryFile", () => {
	it("matches every sidecar artifact suffix and prefix", () => {
		const names = [
			"session.spill.idx",
			"session.spill.tail",
			"session.spill.commit",
			"session.spill.buckets",
			"session.spill.dict-0",
			"session.spill.capture-abc.tmp",
			"session.spill.fork-def.tmp",
			"session.spill.overlay-ghi.tmp",
		];
		for (const name of names) {
			expect(isDerivedSessionMemoryFile(`/sessions/mysession/${name}`)).toBe(true);
		}
	});

	it("matches any .spill.*.tmp temp", () => {
		expect(isDerivedSessionMemoryFile("/s/session.spill.whatever.xyz.tmp")).toBe(true);
	});

	it("rejects the transcript and unrelated files", () => {
		expect(isDerivedSessionMemoryFile("/s/session.jsonl")).toBe(false);
		expect(isDerivedSessionMemoryFile("/s/session.spill")).toBe(false);
		expect(isDerivedSessionMemoryFile("/s/spill.index")).toBe(false);
		expect(isDerivedSessionMemoryFile("/s/session.spill.")).toBe(false);
	});
});

describe("fixed-size cache accounting", () => {
	it("defines the block/entry/tail budgets", () => {
		expect(BLOCK_CACHE_BUDGET_BYTES).toBe(8 * 1024 * 1024);
		expect(ENTRY_CACHE_BUDGET_BYTES).toBe(28 * 1024 * 1024);
		expect(TAIL_BUFFER_BUDGET_BYTES).toBe(4 * 1024 * 1024);
		expect(LABELS_PINS_BUDGET_BYTES).toBe(64 * 1024);
	});

	it("rejects allocations beyond the budget", () => {
		const cache = new FixedCacheAccount(100);
		expect(cache.tryAllocate(60)).toBe(true);
		expect(cache.tryAllocate(40)).toBe(true);
		expect(cache.tryAllocate(1)).toBe(false);
		expect(cache.allocatedBytes).toBe(100);
		cache.release(50);
		expect(cache.tryAllocate(50)).toBe(true);
		expect(cache.tryAllocate(1)).toBe(false);
	});
});

describe("bounded parent→children and labels/pins descriptors", () => {
	it("indexes parents to children within both bounds", () => {
		const index = new BoundedParentChildrenIndex({ maxParents: 2, maxChildrenPerParent: 2 });
		expect(index.add("root", "a")).toBe(true);
		expect(index.add("root", "b")).toBe(true);
		expect(index.add("root", "c")).toBe(false); // children bound
		expect(index.add("a", "x")).toBe(true);
		expect(index.add("a", "y")).toBe(true);
		expect(index.add("a", "z")).toBe(false); // children bound
		expect(index.add("b", "w")).toBe(false); // parents bound (root, a)
		expect(index.get("root")).toEqual(["a", "b"]);
		expect(index.size).toBe(2);
	});

	it("byte-accounts labels/pins and rejects over-budget additions", () => {
		const store = new BoundedLabelsPinsStore(300);
		expect(store.setLabel("k1", "v1")).toBe(true);
		expect(store.setLabel("k2", "v2")).toBe(true);
		expect(store.setPin("p1", "v1")).toBe(true);
		expect(store.totalBytes).toBeGreaterThan(0);
		expect(store.getLabel("k1")).toBe("v1");
		expect(store.getPin("p1")).toBe("v1");
		// Replacing a value re-accounts the delta.
		expect(store.setLabel("k1", "longer-value")).toBe(true);
		// A value that does not fit the budget is rejected and not stored.
		const tight = new BoundedLabelsPinsStore(10);
		expect(tight.setLabel("kkkkkk", "vvvvvv")).toBe(false);
		expect(tight.getLabel("kkkkkk")).toBeUndefined();
		expect(tight.totalBytes).toBe(0);
	});
});

describe("boundary: accountant enforces the 64 MiB provider peak without retention", () => {
	it("releases scratch on overflow and leaves later builds possible", () => {
		const accountant = new SessionMemoryAccountant(SESSION_MEMORY_ACCEPTANCE_BUDGET_BYTES);
		// A charge just under the budget fits; a further charge is rejected.
		expect(accountant.tryCharge(SESSION_MEMORY_ACCEPTANCE_BUDGET_BYTES - 1)).toBe(true);
		expect(accountant.tryCharge(2)).toBe(false);
		expect(accountant.totalBytes).toBe(SESSION_MEMORY_ACCEPTANCE_BUDGET_BYTES - 1);
		// Releasing the scratch restores the budget for a later build.
		accountant.release(SESSION_MEMORY_ACCEPTANCE_BUDGET_BYTES - 1);
		expect(accountant.totalBytes).toBe(0);
		expect(accountant.tryCharge(1024)).toBe(true);
	});
});
