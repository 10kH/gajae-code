/**
 * Standalone sidecar primitives for bounded-memory cold-session offloading.
 *
 * This module is intentionally self-contained: it imports only Node built-ins and
 * defines the reusable P2/P3/P4 primitives agreed in the approved memory spec —
 * the retained-byte accountant, reducer disk-ref demotion guardrails, the
 * `isDerivedSessionMemoryFile` lifecycle predicate, the disposable sidecar v2
 * index schemas, the unsorted append-only bounded dictionary builder with
 * duplicate-ID sidecar-ineligibility detection, fixed-size cache accounting,
 * the anchored base digest + rolling tail checksum chain with commit validation
 * and the five-class reopen classifier, the `latestModelChange` / TTSR
 * latest-wins reducer semantics, and bounded parent→children / labels/pins
 * descriptors.
 *
 * Transcript v5 remains authoritative and every sidecar index is disposable /
 * rebuildable. No builder here requires the whole transcript resident in
 * memory; all builders consume records one at a time and enforce their peak
 * budgets as they go.
 */

import { createHash } from "node:crypto";

// ============================================================================
// Budgets and fixed-size bounds
// ============================================================================

/** Provider-context materialization acceptance peak (AC1). */
export const SESSION_MEMORY_ACCEPTANCE_BUDGET_BYTES = 64 * 1024 * 1024;
/** Steady-state retained-byte budget: 61.0625 MiB leaves the 64 MiB margin. */
export const SESSION_MEMORY_STEADY_STATE_BUDGET_BYTES = 61 * 1024 * 1024 + 64 * 1024;

/** Fixed 24 B resident disk-ref descriptor (ADR / A.1). */
export const DESCRIPTOR_BYTES = 24;
/** Conservative per-record object overhead (A.1). */
export const RECORD_OBJECT_OVERHEAD_BYTES = 48;
/** labels+pins steady-state budget (0.0625 MiB). */
export const LABELS_PINS_BUDGET_BYTES = 64 * 1024;

/** Reducer resident budget (4 MiB) — enforced by disk-ref demotion. */
export const REDUCER_BUDGET_BYTES = 4 * 1024 * 1024;
/** Guardrail: values over this are demoted to disk-ref descriptors. */
export const MAX_REDUCER_INLINE_BYTES = 4 * 1024;
/** Guardrail: max resident string length. */
export const MAX_REDUCER_STRING_BYTES = 4 * 1024;
/** Guardrail: max distinct roles. */
export const MAX_ROLES = 64;
/** Guardrail: max chain entries per role. */
export const MAX_CHAIN_ENTRIES = 32;
/** Guardrail: max TTSR rules. */
export const MAX_TTSR_RULES = 256;
/** Guardrail: max MCP names. */
export const MAX_MCP_NAMES = 4096;
/** Guardrail: max chars per MCP name. */
export const MAX_MCP_NAME_CHARS = 256;
/** Guardrail: modeData ≤ 64 KiB. */
export const MODE_DATA_MAX_BYTES = 64 * 1024;
/** Guardrail: compaction summary ≤ 64 KiB. */
export const COMPACTION_SUMMARY_MAX_BYTES = 64 * 1024;
/** preserveData.openaiRemoteCompaction ≤ 8 MiB (always a disk ref). */
export const OPENAI_REMOTE_COMPACTION_MAX_BYTES = 8 * 1024 * 1024;

/** Fixed-size index block cache (steady-state). */
export const BLOCK_CACHE_BUDGET_BYTES = 8 * 1024 * 1024;
/** Fixed-size resolved-entry cache (steady-state). */
export const ENTRY_CACHE_BUDGET_BYTES = 28 * 1024 * 1024;
/** Tail journal buffer/index (steady-state). */
export const TAIL_BUFFER_BUDGET_BYTES = 4 * 1024 * 1024;
/** Bounded forward-scan window for transcript-ahead recovery (R2.4). */
export const INDEX_TAIL_SCAN_MAX_BYTES = 4 * 1024 * 1024;

/** Dictionary build peak (4 × 4 MiB partition buffers + 4 MiB bucket flush). */
export const DICTIONARY_BUILD_PEAK_BYTES = 20 * 1024 * 1024;
/** One dictionary partition buffer. */
export const DICTIONARY_PARTITION_BUFFER_BYTES = 4 * 1024 * 1024;
/** Dictionary bucket journal flush buffer. */
export const DICTIONARY_BUCKET_JOURNAL_BYTES = 4 * 1024 * 1024;

/** Bounded parent→children index bounds. */
export const PARENT_CHILDREN_MAX_PARENTS = 4096;
export const PARENT_CHILDREN_MAX_CHILDREN_PER_PARENT = 256;
export const PARENT_CHILDREN_BUDGET_BYTES = 4 * 1024 * 1024;

// ============================================================================
// Retained-byte formulas (A.1)
// ============================================================================

/** Resident string = `2 × charCount + 16 B`. */
export function residentStringBytes(value: string): number {
	return 2 * value.length + 16;
}

/** Resident array = `8 B/slot + Σ elements`. */
export function residentArrayBytes(slotCount: number, elementBytes: number): number {
	return 8 * slotCount + elementBytes;
}

/** Per-record object with `childBytes` of payload = 48 B overhead + payload. */
export function residentRecordBytes(childBytes: number): number {
	return RECORD_OBJECT_OVERHEAD_BYTES + childBytes;
}

/**
 * Authoritative measured retained-byte counter. Enforcement acts on the total,
 * never on field counts alone. `tryCharge`/`wouldExceed` let callers enforce a
 * budget without mutating state (used by the provider-context preflight which
 * must never retain an over-budget graph).
 */
export class SessionMemoryAccountant {
	private total = 0;
	private readonly budget: number;

	constructor(budgetBytes: number = SESSION_MEMORY_STEADY_STATE_BUDGET_BYTES) {
		this.budget = budgetBytes;
	}

	get totalBytes(): number {
		return this.total;
	}

	get budgetBytes(): number {
		return this.budget;
	}

	get remainingBytes(): number {
		return Math.max(0, this.budget - this.total);
	}

	/** Adds `bytes` to the running total and returns the new total. */
	charge(bytes: number): number {
		this.assertBytes(bytes);
		this.total += bytes;
		return this.total;
	}

	/** Charges one resident string via the `2 × charCount + 16` formula. */
	chargeString(value: string): number {
		return this.charge(residentStringBytes(value));
	}

	/** Charges one resident array via the `8 B/slot + Σ elements` formula. */
	chargeArray(slotCount: number, elementBytes: number): number {
		return this.charge(residentArrayBytes(slotCount, elementBytes));
	}

	/** Charges one fixed 24 B disk-ref descriptor. */
	chargeDescriptor(): number {
		return this.charge(DESCRIPTOR_BYTES);
	}

	/** Charges one per-record object (48 B overhead + payload). */
	chargeRecord(childBytes: number): number {
		return this.charge(residentRecordBytes(childBytes));
	}

	/**
	 * Adds `bytes` only if the running total stays within the budget.
	 * Returns `false` (and does not mutate) when the addition would exceed it.
	 */
	tryCharge(bytes: number): boolean {
		this.assertBytes(bytes);
		if (this.total + bytes > this.budget) return false;
		this.total += bytes;
		return true;
	}

	/** Returns `true` when charging `bytes` would exceed the budget. */
	wouldExceed(bytes: number): boolean {
		this.assertBytes(bytes);
		return this.total + bytes > this.budget;
	}

	isWithinBudget(): boolean {
		return this.total <= this.budget;
	}

	release(bytes: number): void {
		if (!Number.isSafeInteger(bytes) || bytes < 0) throw new RangeError("invalid_release_bytes");
		if (bytes > this.total) throw new RangeError("release_exceeds_charged");
		this.total -= bytes;
	}

	snapshot(): { totalBytes: number; budgetBytes: number; remainingBytes: number } {
		return { totalBytes: this.total, budgetBytes: this.budget, remainingBytes: this.remainingBytes };
	}

	private assertBytes(bytes: number): void {
		if (!Number.isSafeInteger(bytes) || bytes < 0) throw new RangeError("invalid_charge_bytes");
	}
}

// ============================================================================
// Reducer disk-ref demotion guardrails
// ============================================================================

/**
 * A 24 B resident descriptor that points at a value stored in the sidecar
 * metadata-delta section. Demoted values are never resident as full strings.
 */
export interface ReducerDemotionDescriptor {
	section: "metadata-delta";
	key: string;
	offset: number;
	length: number;
	sha256: string;
}

export interface ReducerValueSnapshot {
	key: string;
	kind: "inline" | "disk_ref";
	residentBytes: number;
	storedBytes: number;
}

export type ReducerBudgetResult =
	| { kind: "ok"; totalBytes: number }
	| { kind: "over_budget_irreducible"; totalBytes: number };

interface TrackedReducerValue {
	key: string;
	kind: "inline" | "disk_ref";
	residentBytes: number;
	storedBytes: number;
	sha256: string;
	metadataBytes: number;
	offset: number;
}

/**
 * Tracks the reducer's resident bytes against the 4 MiB budget. Values over
 * `MAX_REDUCER_INLINE_BYTES` are immediately stored as 24 B disk-ref
 * descriptors. When the total would exceed the budget, the largest resident
 * inline value is demoted, repeating until the total fits or only
 * descriptors/scalars remain (impossible by arithmetic — checked anyway).
 */
export class ReducerBudget {
	private readonly values = new Map<string, TrackedReducerValue>();
	private total = 0;
	private nextOffset = 0;
	private readonly budgetBytesValue: number;
	private readonly maxInlineBytes: number;

	constructor(budgetBytes: number = REDUCER_BUDGET_BYTES, maxInlineBytes: number = MAX_REDUCER_INLINE_BYTES) {
		this.budgetBytesValue = budgetBytes;
		this.maxInlineBytes = maxInlineBytes;
	}

	get totalBytes(): number {
		return this.total;
	}

	get budgetBytes(): number {
		return this.budgetBytesValue;
	}

	get(key: string): ReducerValueSnapshot | undefined {
		const value = this.values.get(key);
		if (value === undefined) return undefined;
		return { key: value.key, kind: value.kind, residentBytes: value.residentBytes, storedBytes: value.storedBytes };
	}

	/** Returns the resident 24 B descriptor for a demoted key, if any. */
	getDescriptor(key: string): ReducerDemotionDescriptor | undefined {
		const value = this.values.get(key);
		if (value === undefined || value.kind !== "disk_ref") return undefined;
		return {
			section: "metadata-delta",
			key: value.key,
			offset: value.offset,
			length: value.storedBytes,
			sha256: value.sha256,
		};
	}

	/**
	 * Records a reducer value of `storedBytes` bytes (optionally with its content
	 * digest) and enforces the budget by demoting the largest resident inline
	 * value until the total fits.
	 */
	setInline(key: string, storedBytes: number, sha256 = ""): ReducerBudgetResult {
		if (!Number.isSafeInteger(storedBytes) || storedBytes < 0) throw new RangeError("invalid_reducer_value_bytes");
		const previous = this.values.get(key);
		if (previous !== undefined) {
			this.total -= previous.residentBytes + previous.metadataBytes;
			this.values.delete(key);
		}
		const metadataBytes = residentStringBytes(key) + residentStringBytes(sha256) + RECORD_OBJECT_OVERHEAD_BYTES;
		if (storedBytes > this.maxInlineBytes) {
			this.values.set(key, {
				key,
				kind: "disk_ref",
				residentBytes: DESCRIPTOR_BYTES,
				metadataBytes,
				storedBytes,
				sha256,
				offset: this.nextOffset++,
			});
			this.total += DESCRIPTOR_BYTES + metadataBytes;
		} else {
			this.values.set(key, {
				key,
				kind: "inline",
				residentBytes: storedBytes,
				metadataBytes,
				storedBytes,
				sha256,
				offset: this.nextOffset++,
			});
			this.total += storedBytes + metadataBytes;
		}
		return this.enforceBudget();
	}

	/** Demotes every currently resident inline value to a disk-ref descriptor. */
	demoteAll(): void {
		for (const value of this.values.values()) {
			if (value.kind === "inline" && value.residentBytes > DESCRIPTOR_BYTES) this.demote(value);
		}
	}

	private enforceBudget(): ReducerBudgetResult {
		while (this.total > this.budgetBytesValue) {
			const largest = this.largestDemotableInline();
			if (largest === undefined) {
				// Only descriptors/scalars remain but still over budget — impossible
				// by arithmetic; the caller keeps the record hot and raises the
				// token-compaction trigger. Never unbounded resident state.
				return { kind: "over_budget_irreducible", totalBytes: this.total };
			}
			this.demote(largest);
		}
		return { kind: "ok", totalBytes: this.total };
	}

	private largestDemotableInline(): TrackedReducerValue | undefined {
		let best: TrackedReducerValue | undefined;
		for (const value of this.values.values()) {
			if (
				value.kind === "inline" &&
				value.residentBytes > DESCRIPTOR_BYTES &&
				(best === undefined || value.residentBytes > best.residentBytes)
			) {
				best = value;
			}
		}
		return best;
	}

	private demote(value: TrackedReducerValue): void {
		const delta = value.residentBytes - DESCRIPTOR_BYTES;
		value.residentBytes = DESCRIPTOR_BYTES;
		value.kind = "disk_ref";
		this.total -= delta;
	}
}

// ============================================================================
// Derived-file lifecycle predicate (MEM-C-014/024)
// ============================================================================

const SPILL_SEGMENT = ".spill.";
const DERIVED_SUFFIXES = new Set(["idx", "tail", "commit", "buckets"]);
const DERIVED_PREFIXES = ["dict-", "capture-", "fork-", "overlay-"];

/**
 * Single source of truth for every sidecar artifact and temp: `*.spill.idx`,
 * `*.spill.tail`, `*.spill.commit`, `*.spill.buckets`, `*.spill.dict-*`,
 * `*.spill.capture-*`, `*.spill.fork-*`, `*.spill.overlay-*`, and any
 * `*.spill.*.tmp`. Used at every fork/delete/sweep/Memory-parity callsite so
 * ad-hoc filters cannot drift.
 */
export function isDerivedSessionMemoryFile(pathname: string): boolean {
	const base = pathname.slice(Math.max(pathname.lastIndexOf("/"), pathname.lastIndexOf("\\")) + 1);
	const idx = base.indexOf(SPILL_SEGMENT);
	if (idx === -1) return false;
	const rest = base.slice(idx + SPILL_SEGMENT.length);
	if (rest.length === 0) return false;
	if (DERIVED_SUFFIXES.has(rest)) return true;
	for (const prefix of DERIVED_PREFIXES) {
		if (rest.startsWith(prefix) && rest.length > prefix.length) return true;
	}
	if (rest.endsWith(".tmp") && rest.length > ".tmp".length) return true;
	return false;
}

// ============================================================================
// Sidecar v2 disposable index schemas
// ============================================================================

/** Common header for every sidecar v2 index file. */
export interface SidecarIndexHeaderV2 {
	version: 2;
	sessionId: string;
	/** Set when duplicate record IDs were detected; session is eager-ineligible. */
	sidecarIneligible: boolean;
}

/** Unsorted append-only variable-width dictionary (term → id). */
export interface SidecarDictionaryV2 {
	header: SidecarIndexHeaderV2;
	/** Insertion-ordered unique terms (append-only; deterministic). */
	terms: readonly string[];
	/** term → dictionary id, assigned by first-insertion order. */
	idByTerm: ReadonlyMap<string, number>;
	/** Combined serialized term bytes. */
	totalBytes: number;
}

/** Rolling tail checksum index (anchored base + terminal chain). */
export interface SidecarTailIndexV2 {
	header: SidecarIndexHeaderV2;
	base: BaseAnchor;
	records: readonly TailRecord[];
	terminalChecksum: string;
	terminalSeq: number;
	transcriptSize: number;
}

/** Metadata-delta section: demoted reducer values + deltas. */
export interface SidecarMetadataIndexV2 {
	header: SidecarIndexHeaderV2;
	/** key → { offset, length, sha256 } for demoted values. */
	entries: Record<string, { offset: number; length: number; sha256: string }>;
}

/** Bounded parent→children index. */
export interface SidecarParentIndexV2 {
	header: SidecarIndexHeaderV2;
	entries: readonly ParentChildrenIndexEntry[];
}

/** Bounded labels/pins descriptor. */
export interface SidecarLabelsPinsIndexV2 {
	header: SidecarIndexHeaderV2;
	labels: ReadonlyMap<string, string>;
	pins: ReadonlyMap<string, string>;
	totalBytes: number;
}

// ============================================================================
// Bounded dictionary builder (20 MiB peak, duplicate-ID detection)
// ============================================================================

export interface DictionaryRecordInput {
	ordinal: number;
	id: string;
	bytes: Uint8Array;
}

export interface DictionaryBuildOptions {
	peakBudgetBytes?: number;
	partitionBufferBytes?: number;
	bucketJournalBytes?: number;
}

export type DictionaryAddResult = { kind: "ok" } | { kind: "budget_exceeded"; peakBytes: number; budgetBytes: number };

export type DictionaryBuildResult =
	| { kind: "ok"; dictionary: SidecarDictionaryV2; stats: DictionaryBuildStats }
	| { kind: "budget_exceeded"; peakBytes: number; budgetBytes: number };

export interface DictionaryBuildStats {
	totalRecords: number;
	uniqueTerms: number;
	totalBytes: number;
	peakBytes: number;
	duplicateIds: readonly string[];
	sidecarIneligible: boolean;
}

const utf8Decoder = new TextDecoder("utf-8");

/**
 * Unsorted append-only variable-width dictionary builder. Consumes records one
 * at a time (no whole transcript resident) and tracks the 20 MiB build peak as
 * `Σ term bytes + 4 × partition buffer + bucket journal`. Duplicate record IDs
 * mark the session sidecar-ineligible (eager fallback) while the build still
 * completes deterministically.
 */
export class BoundedDictionaryBuilder {
	private readonly terms: string[] = [];
	private readonly idByTerm = new Map<string, number>();
	private readonly seenRecordIds = new Map<string, number>();
	private readonly duplicateIds: string[] = [];
	private totalTermBytes = 0;
	private recordIdBytes = 0;
	private duplicateIdBytes = 0;
	private peakBytes = 0;
	private sidecarIneligible = false;
	private recordCount = 0;
	private finished = false;
	private readonly peakBudget: number;
	private readonly partitionBase: number;

	constructor(options: DictionaryBuildOptions = {}) {
		this.peakBudget = options.peakBudgetBytes ?? DICTIONARY_BUILD_PEAK_BYTES;
		const partition = options.partitionBufferBytes ?? DICTIONARY_PARTITION_BUFFER_BYTES;
		const journal = options.bucketJournalBytes ?? DICTIONARY_BUCKET_JOURNAL_BYTES;
		this.partitionBase = 4 * partition + journal;
	}

	add(record: DictionaryRecordInput): DictionaryAddResult {
		if (this.finished) throw new Error("dictionary_builder_finished");
		this.recordCount += 1;
		const priorOrdinal = this.seenRecordIds.get(record.id);
		if (priorOrdinal !== undefined) {
			this.sidecarIneligible = true;
			if (!this.duplicateIds.includes(record.id)) {
				this.duplicateIdBytes += residentStringBytes(record.id) + RECORD_OBJECT_OVERHEAD_BYTES;
				this.duplicateIds.push(record.id);
			}
		} else {
			this.recordIdBytes += residentStringBytes(record.id) + RECORD_OBJECT_OVERHEAD_BYTES;
			this.seenRecordIds.set(record.id, record.ordinal);
		}
		this.updatePeak();
		if (this.peakBytes > this.peakBudget) {
			return { kind: "budget_exceeded", peakBytes: this.peakBytes, budgetBytes: this.peakBudget };
		}
		const term = utf8Decoder.decode(record.bytes);
		if (!this.idByTerm.has(term)) {
			this.idByTerm.set(term, this.idByTerm.size);
			this.terms.push(term);
			this.totalTermBytes += residentStringBytes(term) + RECORD_OBJECT_OVERHEAD_BYTES;
			this.updatePeak();
		}
		if (this.peakBytes > this.peakBudget) {
			return { kind: "budget_exceeded", peakBytes: this.peakBytes, budgetBytes: this.peakBudget };
		}
		return { kind: "ok" };
	}

	finish(): DictionaryBuildResult {
		if (this.finished) throw new Error("dictionary_builder_already_finished");
		this.finished = true;
		return {
			kind: "ok",
			dictionary: {
				header: { version: 2, sessionId: "", sidecarIneligible: this.sidecarIneligible },
				terms: this.terms,
				idByTerm: this.idByTerm,
				totalBytes: this.totalTermBytes,
			},
			stats: {
				totalRecords: this.recordCount,
				uniqueTerms: this.terms.length,
				totalBytes: this.totalTermBytes,
				peakBytes: this.peakBytes,
				duplicateIds: this.duplicateIds,
				sidecarIneligible: this.sidecarIneligible,
			},
		};
	}

	private updatePeak(): void {
		const current = Math.max(this.partitionBase, this.totalTermBytes + this.recordIdBytes + this.duplicateIdBytes);
		if (current > this.peakBytes) this.peakBytes = current;
	}
}

// ============================================================================
// Fixed-size cache accounting (block / entry / tail)
// ============================================================================

/**
 * Tracks a fixed-size cache budget (8 MiB block, 28 MiB entry, 4 MiB tail).
 * `tryAllocate` rejects allocations that would exceed the budget without
 * mutating state.
 */
export class FixedCacheAccount {
	private allocated = 0;
	private readonly budget: number;

	constructor(budgetBytes: number) {
		this.budget = budgetBytes;
	}

	get allocatedBytes(): number {
		return this.allocated;
	}

	get budgetBytes(): number {
		return this.budget;
	}

	get remainingBytes(): number {
		return Math.max(0, this.budget - this.allocated);
	}

	tryAllocate(bytes: number): boolean {
		if (!Number.isSafeInteger(bytes) || bytes < 0) throw new RangeError("invalid_cache_allocation");
		if (this.allocated + bytes > this.budget) return false;
		this.allocated += bytes;
		return true;
	}

	release(bytes: number): void {
		if (!Number.isSafeInteger(bytes) || bytes < 0) throw new RangeError("invalid_cache_release");
		if (bytes > this.allocated) throw new RangeError("cache_release_exceeds_allocated");
		this.allocated -= bytes;
	}
}

// ============================================================================
// Anchored base digest + rolling tail checksum chain (C.1)
// ============================================================================

/** Anchors the base range `[0, baseEndOffset)` with a content digest. */
export interface BaseAnchor {
	baseDigest: string;
	baseEndOffset: number;
}

export type TailRecordKind = "user" | "assistant" | "tool" | "model_change" | "ttsr_injection" | "internal" | "other";

/** One committed rolling tail record. */
export interface TailRecord {
	gen: number;
	seq: number;
	kind: TailRecordKind;
	ordinal: number;
	id: string;
	parentId: string | null;
	type: string;
	byteOffset: number;
	byteLength: number;
	recordDigest: string;
	checksum: string;
}

/** Input for appending to a rolling tail chain (checksum is computed). */
export interface TailRecordInput {
	gen?: number;
	seq: number;
	kind: TailRecordKind;
	ordinal: number;
	id: string;
	parentId: string | null;
	type: string;
	byteOffset: number;
	byteLength: number;
	recordDigest: string;
}

/** Effective base+tail identity (no per-append whole-file hash). */
export interface CommittedTail {
	base: BaseAnchor;
	records: readonly TailRecord[];
	terminalChecksum: string;
	terminalSeq: number;
	transcriptSize: number;
}

/** SHA-256 of one record line's bytes. */
export function computeLineDigest(bytes: Uint8Array): string {
	return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Canonical length-prefixed chain hash. Each part is hashed as its UTF-8 /
 * raw bytes prefixed by a 4-byte big-endian length, so concatenations are
 * unambiguous.
 */
export function hashChain(parts: ReadonlyArray<bigint | number | string | Uint8Array>): string {
	const hash = createHash("sha256");
	for (const part of parts) {
		const bytes =
			typeof part === "string"
				? Buffer.from(part, "utf8")
				: typeof part === "number"
					? Buffer.from(String(part), "utf8")
					: typeof part === "bigint"
						? Buffer.from(part.toString(), "utf8")
						: Buffer.from(part);
		const length = Buffer.allocUnsafe(4);
		length.writeUInt32BE(bytes.byteLength, 0);
		hash.update(length).update(bytes);
	}
	return hash.digest("hex");
}

/** First tail checksum: `C0 = H(baseDigest ‖ baseEndOffset ‖ seq0 ‖ lineDigest0)`. */
export function computeC0(base: BaseAnchor, seq0: number, lineDigest0: string): string {
	return hashChain([base.baseDigest, base.baseEndOffset, seq0, lineDigest0]);
}

/** Checksum one complete tail record, including every field used for ordering or lookup. */
export function computeTailRecordChecksum(
	base: BaseAnchor,
	previousChecksum: string | undefined,
	record: TailRecordInput & { gen?: number },
): string {
	const fields: Array<string | number> = [
		record.gen ?? 0,
		record.seq,
		record.kind,
		record.ordinal,
		record.id,
		record.parentId === null ? "<null>" : record.parentId,
		record.type,
		record.byteOffset,
		record.byteLength,
		record.recordDigest,
	];
	return previousChecksum === undefined
		? hashChain([base.baseDigest, base.baseEndOffset, ...fields])
		: hashChain([previousChecksum, ...fields]);
}

/** Resident bytes for every retained tail string plus the record object. */
export function tailRecordResidentBytes(record: TailRecordInput, checksumChars = 64): number {
	return residentRecordBytes(
		residentStringBytes(record.id) +
			(record.parentId === null ? 0 : residentStringBytes(record.parentId)) +
			residentStringBytes(record.type) +
			residentStringBytes(record.kind) +
			residentStringBytes(record.recordDigest) +
			(2 * checksumChars + 16),
	);
}

/** Terminal checksum for a committed tail (empty chain → base only). */
export function computeTerminalChecksum(base: BaseAnchor, records: readonly TailRecord[]): string {
	if (records.length === 0) return hashChain([base.baseDigest, base.baseEndOffset]);
	return records[records.length - 1].checksum;
}

export interface TailValidationResult {
	valid: boolean;
	firstInvalidSeq?: number;
	reason?: string;
}

/**
 * Validates a committed tail chain: contiguous seq from 0, contiguous absolute
 * offsets from `baseEndOffset`, and checksum continuity
 * `checksum_i = H(checksum_{i-1} ‖ seq_i ‖ offset_i ‖ length_i ‖ lineDigest_i)`.
 */
export function validateTailChain(base: BaseAnchor, records: readonly TailRecord[]): TailValidationResult {
	let expectedSeq = 0;
	let expectedOffset = base.baseEndOffset;
	let previousChecksum: string | undefined;
	for (const record of records) {
		if (record.seq !== expectedSeq) {
			return { valid: false, firstInvalidSeq: record.seq, reason: "seq_discontinuity" };
		}
		if (record.byteOffset !== expectedOffset) {
			return { valid: false, firstInvalidSeq: record.seq, reason: "offset_discontinuity" };
		}
		const expectedChecksum = computeTailRecordChecksum(base, previousChecksum, record);
		if (record.checksum !== expectedChecksum) {
			return { valid: false, firstInvalidSeq: record.seq, reason: "checksum_mismatch" };
		}
		previousChecksum = expectedChecksum;
		expectedSeq += 1;
		expectedOffset = record.byteOffset + record.byteLength;
	}
	return { valid: true };
}

/**
 * Streams tail records, computing the rolling checksum chain incrementally and
 * enforcing the 4 MiB tail buffer budget. Never buffers the whole transcript.
 */
export class RollingTailChainBuilder {
	private readonly records: TailRecord[] = [];
	private readonly base: BaseAnchor;
	private lastChecksum: string | undefined;
	private lastSeq = -1;
	private lastEndOffset: number;
	private remainingTailBytes: number;

	constructor(base: BaseAnchor, options: { tailBufferBytes?: number } = {}) {
		this.base = base;
		this.lastEndOffset = base.baseEndOffset;
		this.remainingTailBytes = options.tailBufferBytes ?? TAIL_BUFFER_BUDGET_BYTES;
	}

	get recordCount(): number {
		return this.records.length;
	}

	/** Appends one tail record; returns `undefined` when the buffer budget is hit. */
	append(input: TailRecordInput): TailRecord | undefined {
		const expectedSeq = this.lastSeq + 1;
		if (input.seq !== expectedSeq) throw new Error("tail_seq_discontinuity");
		if (input.byteOffset !== this.lastEndOffset) throw new Error("tail_offset_discontinuity");
		const checksum = computeTailRecordChecksum(this.base, this.lastChecksum, input);
		const residentBytes = tailRecordResidentBytes(input, checksum.length);
		if (residentBytes > this.remainingTailBytes) return undefined;
		this.remainingTailBytes -= residentBytes;
		const record: TailRecord = { ...input, gen: input.gen ?? 0, checksum };
		this.records.push(record);
		this.lastSeq = input.seq;
		this.lastEndOffset = input.byteOffset + input.byteLength;
		this.lastChecksum = checksum;
		return record;
	}

	build(): CommittedTail {
		return {
			base: this.base,
			records: this.records,
			terminalChecksum: computeTerminalChecksum(this.base, this.records),
			terminalSeq: this.lastSeq,
			transcriptSize: this.lastEndOffset,
		};
	}
}

// ============================================================================
// Commit validation + five-class reopen classifier (R2.4)
// ============================================================================

/** Descriptor snapshot captured post-fsync from the authoritative open handle. */
export interface DescriptorSnapshot {
	dev: bigint;
	ino: bigint;
	nlink?: bigint;
	size: number;
	mtimeNs: bigint;
	ctimeNs: bigint;
}

/** Exact enum-order descriptor comparison (dev/ino/nlink/size/mtimeNs/ctimeNs). */
export function sameDescriptor(left: DescriptorSnapshot, right: DescriptorSnapshot): boolean {
	return (
		left.dev === right.dev &&
		left.ino === right.ino &&
		(left.nlink ?? 0n) === (right.nlink ?? 0n) &&
		left.size === right.size &&
		left.mtimeNs === right.mtimeNs &&
		left.ctimeNs === right.ctimeNs
	);
}

/** Contents of the mutable `.spill.commit` marker (R2). */
export interface CommitMarkerContents {
	gen: number;
	descriptor: DescriptorSnapshot;
	base: BaseAnchor;
	terminalChecksum: string;
	terminalSeq: number;
	transcriptSize: number;
}

export type CommitInvalidReason =
	| "missing_fields"
	| "base_invalid"
	| "chain_invalid"
	| "terminal_checksum_mismatch"
	| "terminal_seq_mismatch"
	| "transcript_size_mismatch"
	| "descriptor_mismatch"
	| "terminal_marker_mismatch";

export type CommitValidationResult = { kind: "valid" } | { kind: "invalid"; reason: CommitInvalidReason };

/**
 * Validates a commit marker's internal consistency plus its descriptor against
 * the currently opened transcript. `baseValid`/`tailValid`/`terminalMarkerValid`
 * are the externally-observed proof results.
 */
export function validateCommit(
	commit: Partial<CommitMarkerContents> | CommitMarkerContents,
	records: readonly TailRecord[],
	observed: { descriptor: DescriptorSnapshot; baseValid: boolean; tailValid: boolean; terminalMarkerValid: boolean },
): CommitValidationResult {
	if (commit === null || typeof commit !== "object") return { kind: "invalid", reason: "missing_fields" };
	if (
		typeof commit.gen !== "number" ||
		commit.descriptor === undefined ||
		commit.base === undefined ||
		typeof commit.terminalChecksum !== "string" ||
		typeof commit.terminalSeq !== "number" ||
		typeof commit.transcriptSize !== "number"
	) {
		return { kind: "invalid", reason: "missing_fields" };
	}
	if (!observed.baseValid) return { kind: "invalid", reason: "base_invalid" };
	const chain = validateTailChain(commit.base, records);
	if (!chain.valid) return { kind: "invalid", reason: "chain_invalid" };
	const computedTerminal = computeTerminalChecksum(commit.base, records);
	if (commit.terminalChecksum !== computedTerminal) return { kind: "invalid", reason: "terminal_checksum_mismatch" };
	const expectedTerminalSeq = records.length === 0 ? -1 : records[records.length - 1].seq;
	if (commit.terminalSeq !== expectedTerminalSeq) return { kind: "invalid", reason: "terminal_seq_mismatch" };
	const expectedSize =
		records.length === 0
			? commit.base.baseEndOffset
			: records[records.length - 1].byteOffset + records[records.length - 1].byteLength;
	if (commit.transcriptSize !== expectedSize) return { kind: "invalid", reason: "transcript_size_mismatch" };
	if (!sameDescriptor(commit.descriptor, observed.descriptor))
		return { kind: "invalid", reason: "descriptor_mismatch" };
	if (!observed.terminalMarkerValid) return { kind: "invalid", reason: "terminal_marker_mismatch" };
	return { kind: "valid" };
}

export type ReopenClassKind = "exact" | "transcript_ahead" | "tail_ahead" | "rebuild" | "stale_commit";

/** Physical evidence the reopen classifier consumes. */
export interface ReopenEvidence {
	markerPresent: boolean;
	descriptorExact: boolean;
	sameObject: boolean;
	sameSize: boolean;
	sizeGrew: boolean;
	sizeShrank: boolean;
	withinScanWindow: boolean;
	timesAdvanced: boolean;
	timesChanged: boolean;
	baseValid: boolean;
	tailValid: boolean;
	terminalMarkerValid: boolean;
}

export interface ReopenClassification {
	kind: ReopenClassKind;
	reason: string;
}

/**
 * Five-class reopen classification (R2.4). Deterministic over the supplied
 * evidence; a stale commit is never accepted as current on any path.
 */
export function classifyReopen(evidence: ReopenEvidence): ReopenClassification {
	if (!evidence.markerPresent) return { kind: "stale_commit", reason: "no_commit_marker" };
	if (evidence.descriptorExact) {
		if (evidence.baseValid && evidence.tailValid && evidence.terminalMarkerValid) {
			return { kind: "exact", reason: "descriptor_and_proof_match" };
		}
		return { kind: "rebuild", reason: "descriptor_exact_proof_invalid" };
	}
	if (evidence.sameObject && evidence.sameSize && evidence.timesChanged) {
		return { kind: "rebuild", reason: "same_size_mutation" };
	}
	if (evidence.sameObject && evidence.sameSize) {
		if (evidence.baseValid && !evidence.tailValid)
			return { kind: "tail_ahead", reason: "committed_tail_record_invalid" };
		if (evidence.baseValid && evidence.tailValid && evidence.terminalMarkerValid) {
			return { kind: "exact", reason: "descriptor_equivalent" };
		}
		return { kind: "rebuild", reason: "proof_invalid" };
	}
	if (evidence.sameObject && evidence.sizeGrew) {
		if (evidence.withinScanWindow && evidence.timesAdvanced && evidence.baseValid && evidence.tailValid) {
			return { kind: "transcript_ahead", reason: "object_grew_within_window" };
		}
		return { kind: "rebuild", reason: "over_window_or_invalid_base" };
	}
	if (evidence.sameObject && evidence.sizeShrank) {
		return { kind: "rebuild", reason: "shrink_outside_tail_state" };
	}
	return { kind: "stale_commit", reason: "object_identity_mismatch" };
}

// ============================================================================
// Reducer deltas: nearest model-change role (R1) + TTSR latest-wins
// ============================================================================

export interface LatestModelChangeDelta {
	kind: "latest_model_change";
	ordinal: number;
	role?: string;
}

export interface TtsrDelta {
	kind: "ttsr_injection";
	ordinal: number;
	rulesCount: number;
	recordsCount: number;
	count: number;
}

export type ReducerDelta = LatestModelChangeDelta | TtsrDelta;

export interface ModelChangeReducerState {
	latest: { ordinal: number; role: string | undefined } | undefined;
}

export interface TtsrReducerState {
	count: number;
	rulesCount: number;
	recordsCount: number;
	largestOrdinal: number;
}

export interface ReducerState {
	modelChange: ModelChangeReducerState;
	ttsr: TtsrReducerState;
}

export function createReducerState(): ReducerState {
	return {
		modelChange: { latest: undefined },
		ttsr: { count: 0, rulesCount: 0, recordsCount: 0, largestOrdinal: -1 },
	};
}

/**
 * Applies one reducer delta. `latest_model_change` overwrites the nearest
 * event's `{ordinal, role}`; `ttsr_injection.count` replaces the prior value
 * (authoritative `buildSessionContext`, latest-wins).
 */
export function applyReducerDelta(state: ReducerState, delta: ReducerDelta): ReducerState {
	switch (delta.kind) {
		case "latest_model_change":
			return { ...state, modelChange: { latest: { ordinal: delta.ordinal, role: delta.role } } };
		case "ttsr_injection":
			return {
				...state,
				ttsr: {
					count: delta.count,
					rulesCount: delta.rulesCount,
					recordsCount: delta.recordsCount,
					largestOrdinal: Math.max(state.ttsr.largestOrdinal, delta.ordinal),
				},
			};
	}
}

/**
 * R1 consumer: returns `latestModelChange.role ?? "default"` when a
 * `model_change` exists on the path, else `undefined`. `hasExplicitDefaultModel`
 * only gates legacy assistant inference into `models.default`; it never feeds
 * this getter.
 */
export function getLastModelChangeRole(state: ReducerState): string | undefined {
	const latest = state.modelChange.latest;
	if (latest === undefined) return undefined;
	return latest.role ?? "default";
}

/**
 * Compaction fold: keeps the max-ordinal `model_change` (nearest wins) and the
 * latest-ordinal TTSR state, matching the eager leaf→root first-hit semantics.
 */
export function foldReducerStates(left: ReducerState, right: ReducerState): ReducerState {
	const modelChange = foldModelChange(left.modelChange.latest, right.modelChange.latest);
	const ttsr = left.ttsr.largestOrdinal >= right.ttsr.largestOrdinal ? left.ttsr : right.ttsr;
	return { modelChange: { latest: modelChange }, ttsr };
}

function foldModelChange(
	left: ModelChangeReducerState["latest"],
	right: ModelChangeReducerState["latest"],
): ModelChangeReducerState["latest"] {
	if (left === undefined) return right;
	if (right === undefined) return left;
	return left.ordinal >= right.ordinal ? left : right;
}

// ============================================================================
// Bounded parent→children and labels/pins descriptors
// ============================================================================

export interface ParentChildrenIndexEntry {
	parentId: string;
	children: readonly string[];
}

/** Bounded parent→children index (rejects when either bound is exceeded). */
export class BoundedParentChildrenIndex {
	private readonly childrenByParent = new Map<string, string[]>();
	private readonly maxParents: number;
	private readonly maxChildrenPerParent: number;
	private readonly budgetBytesValue: number;
	private total = 0;

	constructor(options: { maxParents?: number; maxChildrenPerParent?: number; budgetBytes?: number } = {}) {
		this.maxParents = options.maxParents ?? PARENT_CHILDREN_MAX_PARENTS;
		this.maxChildrenPerParent = options.maxChildrenPerParent ?? PARENT_CHILDREN_MAX_CHILDREN_PER_PARENT;
		this.budgetBytesValue = options.budgetBytes ?? PARENT_CHILDREN_BUDGET_BYTES;
	}

	get size(): number {
		return this.childrenByParent.size;
	}

	get totalBytes(): number {
		return this.total;
	}

	get budgetBytes(): number {
		return this.budgetBytesValue;
	}

	add(parentId: string, childId: string): boolean {
		if (parentId.length === 0 || childId.length === 0) throw new Error("parent_children_empty_id");
		let children = this.childrenByParent.get(parentId);
		if (children?.includes(childId)) return true;
		const parentBytes = children === undefined ? residentStringBytes(parentId) + RECORD_OBJECT_OVERHEAD_BYTES : 0;
		const childBytes = residentStringBytes(childId) + 8;
		if (this.total + parentBytes + childBytes > this.budgetBytesValue) return false;
		if (children === undefined) {
			if (this.childrenByParent.size >= this.maxParents) return false;
			children = [];
			this.childrenByParent.set(parentId, children);
		}
		if (children.length >= this.maxChildrenPerParent) return false;
		children.push(childId);
		this.total += parentBytes + childBytes;
		return true;
	}

	get(parentId: string): readonly string[] | undefined {
		const children = this.childrenByParent.get(parentId);
		return children ? [...children] : undefined;
	}

	entries(): ParentChildrenIndexEntry[] {
		const out: ParentChildrenIndexEntry[] = [];
		for (const [parentId, children] of this.childrenByParent) out.push({ parentId, children: [...children] });
		return out;
	}
}

/**
 * Bounded labels/pins store. Accounting uses `stored bytes + map overhead`
 * (resident string formulas + per-entry overhead), rejected when the labels+pins
 * budget would be exceeded.
 */
export class BoundedLabelsPinsStore {
	private readonly labels = new Map<string, string>();
	private readonly pins = new Map<string, string>();
	private total = 0;
	private readonly budget: number;

	constructor(budgetBytes: number = LABELS_PINS_BUDGET_BYTES) {
		this.budget = budgetBytes;
	}

	get totalBytes(): number {
		return this.total;
	}

	get budgetBytes(): number {
		return this.budget;
	}

	setLabel(key: string, value: string): boolean {
		return this.setIn(this.labels, key, value);
	}

	deleteLabel(key: string): void {
		const existing = this.labels.get(key);
		if (existing === undefined) return;
		this.total -= residentStringBytes(key) + residentStringBytes(existing) + RECORD_OBJECT_OVERHEAD_BYTES;
		this.labels.delete(key);
	}

	setPin(key: string, value: string): boolean {
		return this.setIn(this.pins, key, value);
	}

	getLabel(key: string): string | undefined {
		return this.labels.get(key);
	}

	getPin(key: string): string | undefined {
		return this.pins.get(key);
	}

	labelsEntries(): ReadonlyMap<string, string> {
		return this.labels;
	}

	pinsEntries(): ReadonlyMap<string, string> {
		return this.pins;
	}

	clear(): void {
		this.labels.clear();
		this.pins.clear();
		this.total = 0;
	}

	private setIn(map: Map<string, string>, key: string, value: string): boolean {
		const cost = residentStringBytes(key) + residentStringBytes(value) + RECORD_OBJECT_OVERHEAD_BYTES;
		const existing = map.get(key);
		if (existing !== undefined) {
			const existingCost = residentStringBytes(key) + residentStringBytes(existing) + RECORD_OBJECT_OVERHEAD_BYTES;
			const delta = cost - existingCost;
			if (this.total + delta > this.budget) return false;
			this.total += delta;
			map.set(key, value);
			return true;
		}
		if (this.total + cost > this.budget) return false;
		this.total += cost;
		map.set(key, value);
		return true;
	}
}
