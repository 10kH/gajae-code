/**
 * Structured metadata for tool outputs.
 *
 * Tools populate details.meta using the fluent OutputMetaBuilder.
 * The tool wrapper automatically formats and appends notices at message boundary.
 */
import type {
	AgentTool,
	AgentToolContext,
	AgentToolExecFn,
	AgentToolResult,
	AgentToolUpdateCallback,
} from "@gajae-code/agent-core";
import type { ImageContent, TextContent } from "@gajae-code/ai";
import { getDefault, type Settings } from "../config/settings";
import { formatGroupedDiagnosticMessages } from "../lsp/utils";
import type { Theme } from "../modes/theme/theme";
import { type SessionArtifactCapability, sessionArtifactCapability } from "../session/session-manager";
import {
	DEFAULT_ARTIFACT_MAX_BYTES,
	formatMiddleElisionMarker,
	hasCurrentExecutionArtifactProof,
	type OutputSummary,
	type ReadWindow,
	type TruncationResult,
	truncateHeadBytes,
	truncateMiddle,
	truncateTail,
} from "../session/streaming-output";
import { isValidArtifactId } from "../utils/artifact-id";

export { isValidArtifactId } from "../utils/artifact-id";

import { formatBytes, wrapBrackets } from "./render-utils";
import { renderError } from "./tool-errors";

const kCurrentExecutionArtifactProof = Symbol("OutputMeta.CurrentExecutionArtifactProof");
const pendingArtifactLookupsByOwner = new WeakMap<SessionArtifactCapability, Set<Promise<boolean>>>();

function bindCurrentExecutionArtifactProof(truncation: TruncationMeta, summary: OutputSummary): void {
	const artifactId = truncation.artifactId;
	if (!artifactId || !hasCurrentExecutionArtifactProof(summary, artifactId, summary.output)) return;
	Object.defineProperty(truncation, kCurrentExecutionArtifactProof, {
		value: { artifactId, payload: summary.output, consumed: false },
		enumerable: false,
		configurable: false,
		writable: false,
	});
}

function hasBoundCurrentExecutionArtifactProof(
	truncation: TruncationMeta,
	artifactId: string,
	payload: string,
): boolean {
	const proof = (
		truncation as TruncationMeta & {
			[kCurrentExecutionArtifactProof]?: { artifactId: string; payload: string; consumed: boolean };
		}
	)[kCurrentExecutionArtifactProof];
	if (!proof || proof.artifactId !== artifactId || proof.payload !== payload || proof.consumed) return false;
	proof.consumed = true;
	return true;
}

function pendingArtifactLookupsForOwner(capability: SessionArtifactCapability): Set<Promise<boolean>> {
	let pending = pendingArtifactLookupsByOwner.get(capability);
	if (!pending) {
		pending = new Set();
		pendingArtifactLookupsByOwner.set(capability, pending);
	}
	return pending;
}

async function resolveArtifactForCurrentSessionBounded(
	capability: SessionArtifactCapability | undefined,
	artifactId: string,
): Promise<boolean> {
	if (!capability) return false;
	const pending = pendingArtifactLookupsForOwner(capability);
	if (pending.size >= INLINE_ARTIFACT_PENDING_LIMIT) return false;
	const lookup = Promise.resolve()
		.then(async () => (await capability.getArtifactPath(artifactId)) !== null)
		.catch(() => false);
	pending.add(lookup);
	void lookup.then(
		() => pending.delete(lookup),
		() => pending.delete(lookup),
	);
	return Promise.race([lookup, Bun.sleep(INLINE_ARTIFACT_SAVE_WAIT_MS).then(() => false)]);
}
/**
 * Truncation metadata for the output notice.
 */
export interface TruncationMeta {
	direction: "head" | "tail" | "middle";
	/** Coordinate basis for shown/head/tail ranges. Omitted means file coordinates; "window" is the selected-range coordinate system. */
	rangeBase?: "file" | "window";
	noticeOwner?: "body";
	truncatedBy: "lines" | "bytes" | "middle";
	totalLines: number;
	totalBytes: number;
	outputLines: number;
	outputBytes: number;
	maxBytes?: number;
	/** Line range shown (1-indexed, inclusive). Omitted for middle elision. */
	shownRange?: { start: number; end: number };
	/** Head/tail line ranges shown when direction === "middle". */
	headRange?: { start: number; end: number };
	tailRange?: { start: number; end: number };
	/** Partial source-line preview retained by a directional window. */
	partialLine?: { line: number; bytes: number; sourceBytes: number };
	/** Bytes elided from the middle. */
	elidedBytes?: number;
	/** Lines elided from the middle. */
	elidedLines?: number;
	/** Artifact ID when output was persisted; completeness is tracked separately below. */
	artifactId?: string;
	/** Artifact existence was proven by a successful save or publisher receipt. */
	artifactVerified?: boolean;
	/** Bytes omitted from an artifact after its hard storage cap was reached. */
	artifactTruncatedBytes?: number;
	/** Bytes dropped before Bash received the native output stream. */
	sourceTruncatedBytes?: number;
	/** Exact source capture completeness could not be proven. */
	sourceCaptureIncomplete?: boolean;
	/** Bytes omitted from the visible output by per-line column capping. */
	columnDroppedBytes?: number;
	/** Bounded diagnostic when artifact writer creation, write, or finalization failed. */
	artifactFailureDiagnostic?: string;
	/** Next offset for pagination (head truncation only) */
	nextOffset?: number;
}

/**
 * Source resolution info for the output.
 */
export type SourceMeta =
	| { type: "path"; value: string }
	| { type: "url"; value: string }
	| { type: "internal"; value: string };

/**
 * LSP diagnostic info (for edit/write tools).
 */
export interface DiagnosticMeta {
	summary: string;
	messages: string[];
}

/**
 * Limit-specific notices.
 */
export interface LimitsMeta {
	matchLimit?: { reached: number; suggestion: number };
	resultLimit?: { reached: number; suggestion: number };
	headLimit?: { reached: number; suggestion: number };
	columnTruncated?: { maxColumn: number };
}

/**
 * Structured metadata for tool outputs.
 */
export interface OutputMeta {
	truncation?: TruncationMeta;
	source?: SourceMeta;
	diagnostics?: DiagnosticMeta;
	limits?: LimitsMeta;
	/** Diagnostics were omitted to preserve the configured inline byte cap. */
	diagnosticsOmitted?: boolean;
}

// =============================================================================
// OutputMetaBuilder - Fluent API for building OutputMeta
// =============================================================================

export interface TruncationOptions {
	direction: "head" | "tail" | "middle";
	startLine?: number;
	totalFileLines?: number;
	artifactId?: string;
	artifactVerified?: boolean;
	artifactFailureDiagnostic?: string;
	sourceCaptureIncomplete?: boolean;
	maxBytes?: number;
	noticeOwner?: "body";
}

export interface TruncationSummaryOptions {
	direction: "head" | "tail" | "middle";
	startLine?: number;
	totalFileLines?: number;
	noticeOwner?: "body";
}

export interface TruncationTextOptions {
	direction: "head" | "tail" | "middle";
	totalLines?: number;
	totalBytes?: number;
	maxBytes?: number;
	artifactId?: string;
	artifactVerified?: boolean;
	sourceCaptureIncomplete?: boolean;
	noticeOwner?: "body";
}

/**
 * Fluent builder for OutputMeta.
 *
 * @example
 * ```ts
 * details.meta = outputMeta()
 *   .truncation(truncation, { direction: "head" })
 *   .matchLimit(limitReached ? effectiveLimit : 0)
 *   .columnTruncated(linesTruncated ? DEFAULT_MAX_COLUMN : 0)
 *   .get();
 * ```
 */
export class OutputMetaBuilder {
	#meta: OutputMeta = {};

	/** Add truncation info from TruncationResult. No-op if not truncated. */
	truncation(result: TruncationResult, options: TruncationOptions): this {
		if (!result.truncated) return this;

		const {
			direction,
			startLine = 1,
			totalFileLines,
			artifactId,
			artifactVerified,
			artifactFailureDiagnostic,
			sourceCaptureIncomplete,
			noticeOwner,
			maxBytes,
		} = options;
		const outputLines = result.outputLines ?? result.totalLines;
		const outputBytes = result.outputBytes ?? result.totalBytes;
		const isMiddle = direction === "middle" || result.truncatedBy === "middle";
		const truncatedBy: "lines" | "bytes" | "middle" = isMiddle
			? "middle"
			: result.truncatedBy === "lines"
				? "lines"
				: "bytes";

		const effectiveTotalLines = totalFileLines ?? result.totalLines;
		const owner = noticeOwner !== undefined ? { noticeOwner } : {};

		if (isMiddle) {
			const elidedLines = result.elidedLines ?? Math.max(0, effectiveTotalLines - outputLines);
			const elidedBytes = result.elidedBytes ?? Math.max(0, result.totalBytes - outputBytes);
			this.#meta.truncation = {
				direction: "middle",
				truncatedBy: "middle",
				...owner,
				totalLines: effectiveTotalLines,
				totalBytes: result.totalBytes,
				outputLines,
				outputBytes,
				...(maxBytes !== undefined ? { maxBytes } : {}),
				headRange: result.firstLinePartial ? undefined : result.headRange,
				tailRange: result.lastLinePartial ? undefined : result.tailRange,
				elidedLines,
				elidedBytes,
				artifactId,
				artifactVerified,
				artifactFailureDiagnostic,
				sourceCaptureIncomplete: sourceCaptureIncomplete || undefined,
			};
			return this;
		}

		let shownStart: number;
		let shownEnd: number;

		if (direction === "tail") {
			shownStart = result.totalLines - outputLines + 1;
			shownEnd = result.totalLines;
		} else {
			shownStart = startLine;
			shownEnd = startLine + outputLines - 1;
		}

		this.#meta.truncation = {
			direction,
			truncatedBy,
			...owner,
			totalLines: effectiveTotalLines,
			totalBytes: result.totalBytes,
			outputLines,
			outputBytes,
			...(maxBytes !== undefined ? { maxBytes } : {}),
			shownRange: direction === "tail" && result.lastLinePartial ? undefined : { start: shownStart, end: shownEnd },
			artifactId,
			artifactVerified,
			artifactFailureDiagnostic,
			sourceCaptureIncomplete: sourceCaptureIncomplete || undefined,
			nextOffset: direction === "head" ? shownEnd + 1 : undefined,
		};

		return this;
	}

	/** Add metadata from the actual head/tail windows retained by middle truncation. */
	truncationWindows(
		windows: ReadWindow,
		options: {
			artifactId?: string;
			artifactVerified?: boolean;
			noticeOwner?: "body";
			maxBytes?: number;
			rangeBase?: "file" | "window";
		} = {},
	): this {
		if (windows.kind === "full") return this;

		const { artifactId, artifactVerified, noticeOwner, rangeBase } = options;
		const maxBytes = options.maxBytes ?? (windows as ReadWindow & { maxBytes?: number }).maxBytes;
		const outputLinesOverride = (windows as ReadWindow & { outputLinesOverride?: number }).outputLinesOverride;
		const outputBytesOverride = (windows as ReadWindow & { outputBytesOverride?: number }).outputBytesOverride;
		const owner = noticeOwner !== undefined ? { noticeOwner } : {};
		const rangeBaseMeta = rangeBase !== undefined ? { rangeBase } : {};
		const hiddenReason = (windows as ReadWindow & { truncatedBy?: "lines" | "bytes" | "middle" }).truncatedBy;
		const fallbackTruncatedBy: "lines" | "bytes" = hiddenReason === "bytes" ? "bytes" : "lines";
		const partialTail = windows.tail?.kind === "partial-line" ? windows.tail : undefined;
		if (partialTail) {
			const headBytes = windows.head?.bytes ?? 0;
			const separatorBytes = windows.head ? 1 : 0;
			const markerBytes =
				windows.elidedLines > 0
					? Buffer.byteLength(formatMiddleElisionMarker(windows.elidedLines, windows.elidedBytes), "utf-8") + 1
					: 0;
			this.#meta.truncation = {
				direction: windows.kind === "tail-only" ? "tail" : "middle",
				truncatedBy: "bytes",
				...owner,
				...rangeBaseMeta,
				totalLines: windows.totalLines,
				totalBytes: windows.totalBytes,
				outputLines:
					outputLinesOverride ??
					(windows.head
						? windows.head.lines + partialTail.lines + (windows.elidedLines > 0 ? 1 : 0)
						: partialTail.lines),
				outputBytes: outputBytesOverride ?? headBytes + partialTail.bytes + separatorBytes + markerBytes,
				...(maxBytes !== undefined ? { maxBytes } : {}),
				partialLine: {
					line: partialTail.origin.startLine,
					bytes: partialTail.bytes,
					sourceBytes: partialTail.sourceLineBytes,
				},
				artifactId,
				artifactVerified,
			};
			return this;
		}

		if (windows.kind === "head-only" && windows.head) {
			const { head } = windows;
			this.#meta.truncation = {
				direction: "head",
				truncatedBy: fallbackTruncatedBy,
				...owner,
				...rangeBaseMeta,
				totalLines: windows.totalLines,
				totalBytes: windows.totalBytes,
				outputLines: outputLinesOverride ?? head.lines,
				outputBytes: outputBytesOverride ?? head.bytes,
				...(maxBytes !== undefined ? { maxBytes } : {}),
				shownRange: { start: head.origin.startLine, end: head.origin.endLine },
				artifactId,
				artifactVerified,
				nextOffset: head.origin.endLine + 1,
			};
			return this;
		}

		if (windows.kind === "tail-only" && windows.tail) {
			const { tail } = windows;
			this.#meta.truncation = {
				direction: "tail",
				truncatedBy: fallbackTruncatedBy,
				...owner,
				...rangeBaseMeta,
				totalLines: windows.totalLines,
				totalBytes: windows.totalBytes,
				outputLines: outputLinesOverride ?? tail.lines,
				outputBytes: outputBytesOverride ?? tail.bytes,
				...(maxBytes !== undefined ? { maxBytes } : {}),
				shownRange: { start: tail.origin.startLine, end: tail.origin.endLine },
				artifactId,
				artifactVerified,
			};
			return this;
		}

		const { head, tail } = windows;
		if (!head || !tail) return this;
		const marker = formatMiddleElisionMarker(windows.elidedLines, windows.elidedBytes);
		this.#meta.truncation = {
			direction: "middle",
			truncatedBy: "middle",
			...owner,
			...rangeBaseMeta,
			totalLines: windows.totalLines,
			totalBytes: windows.totalBytes,
			outputLines: head.lines + tail.lines + 1,
			outputBytes: head.bytes + tail.bytes + Buffer.byteLength(marker, "utf-8") + 2,
			...(maxBytes !== undefined ? { maxBytes } : {}),
			headRange: { start: head.origin.startLine, end: head.origin.endLine },
			tailRange:
				tail.kind === "partial-line" ? undefined : { start: tail.origin.startLine, end: tail.origin.endLine },
			elidedLines: windows.elidedLines,
			elidedBytes: windows.elidedBytes,
			artifactId,
			artifactVerified,
		};
		return this;
	}

	/** Add truncation info from OutputSummary. No-op if not truncated or artifact evidence is absent. */
	truncationFromSummary(summary: OutputSummary, options: TruncationSummaryOptions): this {
		const artifactFailureDiagnostic = summary.artifactFailureDiagnostic;
		const artifactLossValid = isValidLossCounter(summary.artifactTruncatedBytes);
		const sourceLossValid = isValidLossCounter(summary.sourceTruncatedBytes);
		const columnLossValid =
			isValidLossCounter(summary.columnDroppedBytes) &&
			isValidLossCounter(summary.columnTruncatedLines) &&
			isValidLossCounter(summary.columnMax);
		const sourceCaptureFlagValid =
			summary.sourceCaptureIncomplete === undefined || typeof summary.sourceCaptureIncomplete === "boolean";
		const artifactTruncatedBytes =
			artifactLossValid && summary.artifactTruncatedBytes != null && summary.artifactTruncatedBytes > 0
				? summary.artifactTruncatedBytes
				: undefined;
		const sourceTruncatedBytes =
			sourceLossValid && summary.sourceTruncatedBytes != null && summary.sourceTruncatedBytes > 0
				? summary.sourceTruncatedBytes
				: undefined;
		const columnDroppedBytes =
			columnLossValid && summary.columnDroppedBytes != null && summary.columnDroppedBytes > 0
				? summary.columnDroppedBytes
				: undefined;
		const sourceCaptureIncomplete =
			summary.sourceCaptureIncomplete === true ||
			!sourceCaptureFlagValid ||
			!artifactLossValid ||
			!sourceLossValid ||
			!columnLossValid
				? true
				: undefined;
		if (columnLossValid && (summary.columnTruncatedLines ?? 0) > 0 && (summary.columnMax ?? 0) > 0) {
			this.columnTruncated(summary.columnMax ?? 0);
		}
		const sourceCoordinatesIncomplete =
			sourceTruncatedBytes !== undefined || sourceCaptureIncomplete === true || columnDroppedBytes !== undefined;
		const hasArtifactEvidence =
			summary.artifactId !== undefined ||
			artifactFailureDiagnostic !== undefined ||
			artifactTruncatedBytes !== undefined ||
			sourceTruncatedBytes !== undefined ||
			sourceCaptureIncomplete !== undefined;
		if (!summary.truncated && !hasArtifactEvidence) return this;

		const { direction, startLine = 1, totalFileLines, noticeOwner } = options;
		const totalLines = totalFileLines ?? summary.totalLines;
		const bodyHasArtifact =
			summary.artifactId !== undefined && summary.output.includes(`artifact://${summary.artifactId}`);
		const bodyOwnsArtifact =
			bodyHasArtifact &&
			(artifactTruncatedBytes === undefined &&
			sourceTruncatedBytes === undefined &&
			sourceCaptureIncomplete === undefined &&
			summary.columnDroppedBytes === undefined
				? true
				: summary.artifactId !== undefined &&
					summary.output.includes(
						formatArtifactReference(
							summary.artifactId,
							artifactTruncatedBytes,
							sourceTruncatedBytes,
							sourceCaptureIncomplete,
						),
					));
		const owner =
			noticeOwner !== undefined ? { noticeOwner } : bodyOwnsArtifact ? { noticeOwner: "body" as const } : {};

		// Middle elision: the sink retained head + tail with an elision marker.
		if (summary.elidedBytes != null && summary.elidedBytes > 0) {
			const elidedLines = summary.elidedLines ?? Math.max(0, totalLines - summary.outputLines);
			this.#meta.truncation = {
				direction: "middle",
				truncatedBy: "middle",
				...owner,
				totalLines,
				totalBytes: summary.totalBytes,
				outputLines: summary.outputLines,
				outputBytes: summary.outputBytes,
				headRange: sourceCoordinatesIncomplete || summary.firstLinePartial ? undefined : summary.headRange,
				tailRange: sourceCoordinatesIncomplete || summary.lastLinePartial ? undefined : summary.tailRange,
				elidedBytes: summary.elidedBytes,
				elidedLines,
				artifactId: summary.artifactId,
				artifactVerified: summary.artifactVerified,
				artifactTruncatedBytes,
				sourceTruncatedBytes,
				sourceCaptureIncomplete,
				columnDroppedBytes,
				artifactFailureDiagnostic,
			};
			bindCurrentExecutionArtifactProof(this.#meta.truncation, summary);
			return this;
		}

		const truncatedBy: "lines" | "bytes" =
			summary.outputBytes < summary.totalBytes
				? "bytes"
				: summary.outputLines < summary.totalLines
					? "lines"
					: "bytes";

		let shownStart: number;
		let shownEnd: number;

		if (direction === "tail") {
			shownStart = totalLines - summary.outputLines + 1;
			shownEnd = totalLines;
		} else {
			shownStart = startLine;
			shownEnd = startLine + summary.outputLines - 1;
		}

		this.#meta.truncation = {
			direction,
			truncatedBy,
			...owner,
			totalLines,
			totalBytes: summary.totalBytes,
			outputLines: summary.outputLines,
			outputBytes: summary.outputBytes,
			shownRange:
				sourceCoordinatesIncomplete || (direction === "tail" && summary.lastLinePartial)
					? undefined
					: { start: shownStart, end: shownEnd },
			artifactId: summary.artifactId,
			artifactVerified: summary.artifactVerified,
			artifactTruncatedBytes,
			sourceTruncatedBytes,
			sourceCaptureIncomplete,
			columnDroppedBytes,
			artifactFailureDiagnostic,
			nextOffset: direction === "head" && !sourceCoordinatesIncomplete ? shownEnd + 1 : undefined,
		};
		bindCurrentExecutionArtifactProof(this.#meta.truncation, summary);

		return this;
	}

	/** Add truncation info from truncated output text. No-op if truncation not detected. */
	truncationFromText(text: string, options: TruncationTextOptions): this {
		const outputLines = text.length > 0 ? text.split("\n").length : 0;
		const outputBytes = Buffer.byteLength(text, "utf-8");
		const totalLines = options.totalLines ?? outputLines;
		const totalBytes = options.totalBytes ?? outputBytes;

		const truncated = totalLines > outputLines || totalBytes > outputBytes || false;
		if (!truncated) return this;

		const truncatedBy: "lines" | "bytes" =
			options.maxBytes && outputBytes >= options.maxBytes
				? "bytes"
				: totalBytes > outputBytes
					? "bytes"
					: totalLines > outputLines
						? "lines"
						: "bytes";

		let shownStart: number;
		let shownEnd: number;

		if (options.direction === "tail") {
			shownStart = totalLines - outputLines + 1;
			shownEnd = totalLines;
		} else {
			shownStart = 1;
			shownEnd = outputLines;
		}

		this.#meta.truncation = {
			direction: options.direction,
			truncatedBy,
			...(options.noticeOwner !== undefined ? { noticeOwner: options.noticeOwner } : {}),
			totalLines,
			totalBytes,
			outputLines,
			outputBytes,
			maxBytes: options.maxBytes,
			artifactId: options.artifactId,
			artifactVerified: options.artifactVerified,
			shownRange:
				options.sourceCaptureIncomplete || options.direction === "middle"
					? undefined
					: { start: shownStart, end: shownEnd },
			sourceCaptureIncomplete: options.sourceCaptureIncomplete || undefined,
			nextOffset: options.direction === "head" && !options.sourceCaptureIncomplete ? shownEnd + 1 : undefined,
		};

		return this;
	}

	/** Add match limit notice. No-op if reached <= 0. */
	matchLimit(reached: number, suggestion = reached * 2): this {
		if (reached <= 0) return this;
		this.#meta.limits = { ...this.#meta.limits, matchLimit: { reached, suggestion } };
		return this;
	}

	/** Add limit notices in one call. */
	limits(limits: { matchLimit?: number; resultLimit?: number; headLimit?: number; columnMax?: number }): this {
		if (limits.matchLimit !== undefined) {
			this.matchLimit(limits.matchLimit);
		}
		if (limits.resultLimit !== undefined) {
			this.resultLimit(limits.resultLimit);
		}
		if (limits.headLimit !== undefined) {
			this.headLimit(limits.headLimit);
		}
		if (limits.columnMax !== undefined) {
			this.columnTruncated(limits.columnMax);
		}
		return this;
	}

	/** Add result limit notice. No-op if reached <= 0. */
	resultLimit(reached: number, suggestion = reached * 2): this {
		if (reached <= 0) return this;
		this.#meta.limits = { ...this.#meta.limits, resultLimit: { reached, suggestion } };
		return this;
	}

	/** Add limit notice for head truncation. No-op if reached <= 0. */
	headLimit(reached: number, suggestion = reached * 2): this {
		if (reached <= 0) return this;
		this.#meta.limits = { ...this.#meta.limits, headLimit: { reached, suggestion } };
		return this;
	}

	/** Add column truncation notice. No-op if maxColumn <= 0. */
	columnTruncated(maxColumn: number): this {
		if (maxColumn <= 0) return this;
		this.#meta.limits = { ...this.#meta.limits, columnTruncated: { maxColumn } };
		return this;
	}

	/** Add source path info. */
	sourcePath(value: string): this {
		this.#meta.source = { type: "path", value };
		return this;
	}

	/** Add source URL info. */
	sourceUrl(value: string): this {
		this.#meta.source = { type: "url", value };
		return this;
	}

	/** Add internal URL source info (skill://, agent://, artifact://). */
	sourceInternal(value: string): this {
		this.#meta.source = { type: "internal", value };
		return this;
	}

	/** Add LSP diagnostics. No-op if no messages. */
	diagnostics(summary: string, messages: string[]): this {
		if (messages.length === 0) return this;
		this.#meta.diagnostics = { summary, messages };
		return this;
	}

	/** Get the built OutputMeta, or undefined if empty. */
	get(): OutputMeta | undefined {
		return Object.keys(this.#meta).length > 0 ? this.#meta : undefined;
	}
}

/** Create a new OutputMetaBuilder. */
export function outputMeta(): OutputMetaBuilder {
	return new OutputMetaBuilder();
}

// =============================================================================
// Notice formatting
// =============================================================================

export function formatFullOutputReference(artifactId: string): string {
	return `Read artifact://${artifactId} for full output`;
}

function boundArtifactFailureDiagnostic(error: unknown): string {
	const message = (error instanceof Error ? error.message : String(error)).replace(/\s+/gu, " ").trim();
	return truncateHeadBytes(message || "unknown storage error", 512).text;
}

const INLINE_ARTIFACT_SAVE_WAIT_MS = 500;
const INLINE_ARTIFACT_PENDING_LIMIT = 64;
const pendingInlineArtifactSavesByOwner = new WeakMap<SessionArtifactCapability, Set<Promise<unknown>>>();

function pendingInlineArtifactSavesForOwner(capability: SessionArtifactCapability): Set<Promise<unknown>> {
	let pending = pendingInlineArtifactSavesByOwner.get(capability);
	if (!pending) {
		pending = new Set<Promise<unknown>>();
		pendingInlineArtifactSavesByOwner.set(capability, pending);
	}
	return pending;
}

async function saveInlineArtifactBounded(
	capability: SessionArtifactCapability,
	save: () => Promise<string | null | undefined>,
	resolvePath: (artifactId: string) => Promise<string | null>,
): Promise<
	{ status: "ok"; artifactId: string; artifactTruncatedBytes?: number } | { status: "failed"; diagnostic: string }
> {
	const pendingInlineArtifactSaves = pendingInlineArtifactSavesForOwner(capability);
	if (pendingInlineArtifactSaves.size >= INLINE_ARTIFACT_PENDING_LIMIT) {
		return { status: "failed", diagnostic: "pending artifact save limit reached for this session" };
	}
	const promise = Promise.resolve()
		.then(save)
		.then(async artifactId => {
			if (!isValidArtifactId(artifactId)) {
				return { status: "failed", diagnostic: "storage returned an invalid artifact id" } as const;
			}
			const artifactPath = await resolvePath(artifactId);
			if (!artifactPath) {
				return { status: "failed", diagnostic: "saved artifact is not protocol-resolvable" } as const;
			}
			return { status: "ok", artifactId } as const;
		})
		.catch(error => ({ status: "failed", diagnostic: boundArtifactFailureDiagnostic(error) }) as const);
	pendingInlineArtifactSaves.add(promise);
	void promise.then(
		() => pendingInlineArtifactSaves.delete(promise),
		() => pendingInlineArtifactSaves.delete(promise),
	);
	return Promise.race([
		promise,
		Bun.sleep(INLINE_ARTIFACT_SAVE_WAIT_MS).then(
			() => ({ status: "failed", diagnostic: `did not settle within ${INLINE_ARTIFACT_SAVE_WAIT_MS}ms` }) as const,
		),
	]);
}

function genericArtifactOmittedBytes(content: string): number | undefined {
	const contentBytes = Buffer.byteLength(content, "utf-8");
	if (contentBytes <= DEFAULT_ARTIFACT_MAX_BYTES) return undefined;
	const retained = truncateHeadBytes(content, DEFAULT_ARTIFACT_MAX_BYTES);
	return contentBytes - retained.bytes;
}

const ARTIFACT_FAILURE_PREVIEW_DEFAULT_BYTES = 8 * 1024;

export interface ArtifactFailurePreview {
	text: string;
	omittedBytes: number;
}

/** Build a bounded, UTF-8-safe preview when artifact storage cannot retain the full payload. */
export function createArtifactFailurePreview(
	fullText: string,
	maxInlineBytes: number | undefined,
	diagnostic: string,
): ArtifactFailurePreview {
	const totalBytes = Buffer.byteLength(fullText, "utf-8");
	const previewLimit =
		maxInlineBytes !== undefined && maxInlineBytes > 0 ? maxInlineBytes : ARTIFACT_FAILURE_PREVIEW_DEFAULT_BYTES;
	const boundedDiagnostic = boundArtifactFailureDiagnostic(diagnostic);
	let bodyBudget = Math.min(Math.max(0, totalBytes - 1), previewLimit);
	for (let attempt = 0; attempt < 8; attempt++) {
		const body = truncateTail(fullText, { maxBytes: bodyBudget }).content;
		const bodyBytes = Buffer.byteLength(body, "utf-8");
		const omittedBytes = Math.max(1, totalBytes - bodyBytes);
		const marker = `\n\n[${omittedBytes} bytes omitted; no artifact available: ${boundedDiagnostic}]\n\n`;
		const markerBytes = Buffer.byteLength(marker, "utf-8");
		if (bodyBytes + markerBytes <= previewLimit) {
			return { text: `${body}${marker}`, omittedBytes };
		}
		bodyBudget = Math.max(0, Math.min(bodyBudget - 1, previewLimit - markerBytes));
	}
	const marker = `\n\n[${totalBytes} bytes omitted; no artifact available: ${boundedDiagnostic}]\n\n`;
	return { text: truncateHeadBytes(marker, previewLimit).text, omittedBytes: totalBytes };
}

/** Format an artifact reference without claiming completeness when capture or storage omitted bytes. */
export function formatArtifactReference(
	artifactId: string,
	artifactTruncatedBytes?: number,
	sourceTruncatedBytes?: number,
	sourceCaptureIncomplete?: boolean,
): string {
	const omissions: string[] = [];
	if (!isValidLossCounter(sourceTruncatedBytes) || !isValidLossCounter(artifactTruncatedBytes)) {
		omissions.push("loss accounting was invalid");
	}
	if (sourceTruncatedBytes != null && sourceTruncatedBytes > 0) {
		omissions.push(`at least ${formatBytes(sourceTruncatedBytes)} dropped before Bash capture`);
	}
	if (sourceCaptureIncomplete) {
		omissions.push("source capture completeness could not be proven");
	}
	if (artifactTruncatedBytes != null && artifactTruncatedBytes > 0) {
		omissions.push(`at least ${formatBytes(artifactTruncatedBytes)} omitted by the artifact storage cap`);
	}
	return omissions.length > 0
		? `Read artifact://${artifactId} for retained output (${omissions.join("; ")})`
		: formatFullOutputReference(artifactId);
}

export interface ArtifactEvidence {
	artifactId?: string;
	artifactVerified?: boolean;
	artifactTruncatedBytes?: number;
	sourceTruncatedBytes?: number;
	sourceCaptureIncomplete?: boolean;
	artifactFailureDiagnostic?: string;
	columnDroppedBytes?: number;
}

export function formatArtifactEvidenceNotice(evidence: ArtifactEvidence): string | undefined {
	const parts: string[] = [];
	if (
		isValidArtifactId(evidence.artifactId) &&
		evidence.artifactVerified === true &&
		!evidence.artifactFailureDiagnostic
	) {
		parts.push(
			formatArtifactReference(
				evidence.artifactId,
				evidence.artifactTruncatedBytes,
				evidence.sourceTruncatedBytes,
				evidence.sourceCaptureIncomplete || (evidence.columnDroppedBytes ?? 0) > 0,
			),
		);
		if ((evidence.columnDroppedBytes ?? 0) > 0) {
			parts.push(`Visible line caps omitted ${formatBytes(evidence.columnDroppedBytes ?? 0)}`);
		}
	} else {
		if (evidence.artifactId && evidence.artifactVerified !== true) {
			parts.push("Artifact availability could not be proven");
		}
		if ((evidence.sourceTruncatedBytes ?? 0) > 0) {
			parts.push(
				`Bash capture omitted at least ${formatBytes(evidence.sourceTruncatedBytes ?? 0)} before artifact storage`,
			);
		}
		if (evidence.sourceCaptureIncomplete) {
			parts.push("Source capture completeness could not be proven before retained output was finalized");
		}
		if ((evidence.artifactTruncatedBytes ?? 0) > 0) {
			parts.push(`Artifact storage omitted at least ${formatBytes(evidence.artifactTruncatedBytes ?? 0)}`);
		}
		if ((evidence.columnDroppedBytes ?? 0) > 0) {
			parts.push(`Visible line caps omitted ${formatBytes(evidence.columnDroppedBytes ?? 0)}`);
		}
		if (parts.length > 0) {
			parts.push("no artifact reference is available");
		}
	}
	if (evidence.artifactFailureDiagnostic) {
		parts.push(`Artifact storage failed: ${evidence.artifactFailureDiagnostic}`);
	}
	if (!evidence.artifactId && parts.length > 0 && !parts.includes("no artifact reference is available")) {
		parts.push("no artifact reference is available");
	}
	return parts.length > 0 ? parts.join("; ") : undefined;
}

function formatTruncationArtifactNotice(truncation: TruncationMeta): string {
	return formatArtifactEvidenceNotice(truncation) ?? "";
}

function hasArtifactNotice(truncation: TruncationMeta): boolean {
	return (
		truncation.artifactId != null ||
		(truncation.artifactTruncatedBytes ?? 0) > 0 ||
		(truncation.sourceTruncatedBytes ?? 0) > 0 ||
		truncation.sourceCaptureIncomplete ||
		(truncation.columnDroppedBytes ?? 0) > 0 ||
		truncation.artifactFailureDiagnostic != null
	);
}

function formatTruncationRangeTotal(truncation: TruncationMeta): string {
	return truncation.rangeBase === "window"
		? `the selected ${truncation.totalLines}-line range`
		: `${truncation.totalLines}`;
}

export function formatTruncationMetaNotice(truncation: TruncationMeta): string {
	const rangeTotal = formatTruncationRangeTotal(truncation);
	if ((truncation.sourceTruncatedBytes ?? 0) > 0 || truncation.sourceCaptureIncomplete) {
		let notice = `Showing ${truncation.outputLines} retained line${truncation.outputLines === 1 ? "" : "s"} from an incomplete Bash capture`;
		if (truncation.truncatedBy === "bytes" && truncation.maxBytes != null) {
			notice += ` (${formatBytes(truncation.maxBytes)} limit)`;
		}
		if (hasArtifactNotice(truncation)) {
			notice += `. ${formatTruncationArtifactNotice(truncation)}`;
		}
		return notice;
	}
	if (truncation.partialLine) {
		let notice = `Showing last ${formatBytes(truncation.partialLine.bytes)} of line ${truncation.partialLine.line} of ${rangeTotal}`;
		if (truncation.partialLine.sourceBytes > truncation.partialLine.bytes) {
			notice += ` (line is ${formatBytes(truncation.partialLine.sourceBytes)})`;
		}
		if (hasArtifactNotice(truncation)) {
			notice += `. ${formatTruncationArtifactNotice(truncation)}`;
		}
		return notice;
	}

	let notice: string;

	if (truncation.direction === "middle") {
		const head = truncation.headRange;
		const tail = truncation.tailRange;
		const totalLines = truncation.totalLines;
		const elidedBytes = truncation.elidedBytes ?? Math.max(0, truncation.totalBytes - truncation.outputBytes);
		const elidedLines = truncation.elidedLines ?? Math.max(0, totalLines - truncation.outputLines);
		const headPart = head ? `lines ${head.start}-${head.end}` : "";
		const tailPart = tail ? `${tail.start}-${tail.end}` : "";
		if (head && tail && elidedLines === 0 && head.start === tail.start && head.end === tail.end) {
			notice = `Showing head and tail of line ${head.start} of ${rangeTotal}; ${formatBytes(elidedBytes)} middle bytes elided`;
		} else if (headPart && tailPart) {
			notice = `Showing ${headPart} and ${tailPart} of ${rangeTotal}; ${elidedLines.toLocaleString()} middle line${elidedLines === 1 ? "" : "s"} (${formatBytes(elidedBytes)}) elided`;
		} else {
			notice = `Showing retained head and tail fragments of ${rangeTotal}; ${formatBytes(elidedBytes)} middle bytes elided`;
		}
		if (hasArtifactNotice(truncation)) {
			notice += `. ${formatTruncationArtifactNotice(truncation)}`;
		}
		return notice;
	}

	const range = truncation.shownRange;
	if (range && range.end >= range.start) {
		notice = `Showing lines ${range.start}-${range.end} of ${rangeTotal}`;
	} else {
		notice = `Showing ${truncation.outputLines} of ${rangeTotal}${truncation.rangeBase === "window" ? "" : " lines"}`;
	}

	if (truncation.truncatedBy === "bytes") {
		const maxBytes = truncation.maxBytes ?? truncation.outputBytes;
		notice += ` (${formatBytes(maxBytes)} limit)`;
	}

	if (truncation.nextOffset != null) {
		notice += `. Use :${truncation.nextOffset} to continue`;
	}

	if (hasArtifactNotice(truncation)) {
		notice += `. ${formatTruncationArtifactNotice(truncation)}`;
	}

	return notice;
}

/**
 * Format styled artifact reference with warning color and brackets.
 * For TUI rendering of truncation warnings.
 */
export function formatStyledArtifactReference(artifactId: string, theme: Theme): string {
	return theme.fg("warning", formatFullOutputReference(artifactId));
}

/**
 * Format notices from OutputMeta for LLM consumption.
 * Returns empty string if no notices needed.
 */
export function formatOutputNotice(meta: OutputMeta | undefined): string {
	if (!meta) return "";

	const parts: string[] = [];

	// Truncation notice
	if (meta.truncation && meta.truncation.noticeOwner !== "body") {
		parts.push(formatTruncationMetaNotice(meta.truncation));
	}

	// Limit notices
	if (meta.limits?.matchLimit) {
		const l = meta.limits.matchLimit;
		parts.push(`${l.reached} matches limit reached. Use limit=${l.suggestion} for more`);
	}
	if (meta.limits?.resultLimit) {
		const l = meta.limits.resultLimit;
		parts.push(`${l.reached} results limit reached. Use limit=${l.suggestion} for more`);
	}
	if (meta.limits?.headLimit) {
		const l = meta.limits.headLimit;
		parts.push(`${l.reached} results limit reached. Use limit=${l.suggestion} for more`);
	}
	if (meta.limits?.columnTruncated) {
		parts.push(`Some lines truncated to ${meta.limits.columnTruncated.maxColumn} chars`);
	}

	// Diagnostics
	let diagnosticsNotice = "";
	if (meta.diagnostics && meta.diagnostics.messages.length > 0) {
		const d = meta.diagnostics;
		const grouped = formatGroupedDiagnosticMessages(d.messages);
		const bounded = truncateHeadBytes(grouped, 1024);
		const suffix = bounded.bytes < Buffer.byteLength(grouped, "utf-8") ? "\n[diagnostics truncated]" : "";
		diagnosticsNotice = `\n\nLSP Diagnostics (${d.summary}):\n${bounded.text}${suffix}`;
	}
	if (meta.diagnosticsOmitted) parts.push("Diagnostics omitted by inline result cap");

	const notice = parts.length ? `\n\n[${parts.join(". ")}]` : "";
	return notice + diagnosticsNotice;
}

/**
 * Format a styled truncation warning message.
 * Returns null if no truncation metadata present.
 */
export function formatStyledTruncationWarning(meta: OutputMeta | undefined, theme: Theme): string | null {
	const truncation = meta?.truncation;
	if (!truncation) return null;
	if (
		truncation.noticeOwner === "body" &&
		truncation.totalBytes === truncation.outputBytes &&
		truncation.totalLines === truncation.outputLines
	) {
		return null;
	}
	const warningMeta =
		truncation.noticeOwner === "body"
			? {
					...truncation,
					artifactId: undefined,
					artifactTruncatedBytes: undefined,
					artifactFailureDiagnostic: undefined,
				}
			: truncation;
	const message = formatTruncationMetaNotice(warningMeta);
	return theme.fg("warning", wrapBrackets(message, theme));
}

/**
 * Strip the trailing notice that {@link appendOutputNotice} bakes into the
 * LLM-facing content body. Renderers should call this before printing
 * `result.content` text in the TUI, because they emit a styled warning line of
 * their own; without this, users see the same `[Showing lines …]` string twice
 * (once verbatim from the body, once as the styled `⟨…⟩` warning).
 *
 * Safe to call eagerly: returns the input unchanged when no notice is present
 * (e.g. during streaming, before {@link wrappedExecute} runs).
 */
export function stripOutputNotice(text: string, meta: OutputMeta | undefined): string {
	const notice = formatOutputNotice(meta);
	if (!notice) return text;
	// Trim trailing whitespace from `text` and from the notice itself so we
	// match regardless of whether: (a) the caller already trimEnd()'d, (b)
	// extra blank lines slipped in after the notice (diagnostics blocks add
	// `\n\n` between sections, OutputSink may pad), or (c) neither. Returns
	// the prefix before the notice so the caller can re-trim as needed.
	const trimmedText = text.trimEnd();
	const trimmedNotice = notice.trimEnd();
	if (trimmedText.endsWith(trimmedNotice)) {
		return trimmedText.slice(0, -trimmedNotice.length);
	}
	return text;
}

// =============================================================================
// Tool wrapper
// =============================================================================

/**
 * Append output notice to tool result content if meta is present.
 */
function appendOutputNotice(
	content: (TextContent | ImageContent)[],
	meta: OutputMeta | undefined,
): (TextContent | ImageContent)[] {
	const notice = formatOutputNotice(meta);
	if (!notice) return content;

	const result = [...content];
	for (let i = result.length - 1; i >= 0; i--) {
		const item = result[i];
		if (item.type === "text") {
			result[i] = { ...item, text: item.text + notice };
			return result;
		}
	}

	result.push({ type: "text", text: notice.trim() });
	return result;
}

const kUnwrappedExecute = Symbol("OutputMeta.UnwrappedExecute");

// =============================================================================
// Centralized artifact spill for large tool results
// =============================================================================

/** Resolved artifact spill config sourced from the session settings (or schema defaults). */
function getSpillConfig(s: Settings | undefined) {
	type Path =
		| "tools.artifactSpillThreshold"
		| "tools.artifactTailBytes"
		| "tools.artifactTailLines"
		| "tools.artifactHeadBytes"
		| "tools.maxInlineResultBytes"
		| "tools.readArtifactSpillThreshold";
	const get = <P extends Path>(path: P) => s?.get(path) ?? getDefault(path);
	const configuredInlineKiB = get("tools.maxInlineResultBytes");
	const maxInlineBytes = configuredInlineKiB > 0 ? Math.max(1024, Math.floor(configuredInlineKiB * 1024)) : 0;
	return {
		threshold: get("tools.artifactSpillThreshold") * 1024,
		readThreshold: get("tools.readArtifactSpillThreshold") * 1024,
		tailBytes: get("tools.artifactTailBytes") * 1024,
		tailLines: get("tools.artifactTailLines"),
		headBytes: get("tools.artifactHeadBytes") * 1024,
		maxInlineBytes,
	};
}

/**
 * Resolve the OutputSink `headBytes` budget from session settings.
 * Exposed so streaming executors (bash/python/ssh/eval) can opt into
 * middle elision with the same per-user configuration.
 */
export function resolveOutputSinkHeadBytes(s: Settings | undefined): number {
	return getSpillConfig(s).headBytes;
}

export const BASH_DEFAULT_OUTPUT_TAIL_BYTES = 1024;

/**
 * Bash uses a deliberately small tail window to nudge callers toward focused
 * commands and dedicated search tools. An explicitly configured shared tail
 * budget still wins.
 */
export function resolveBashOutputSinkTailBytes(s: Settings): number {
	const configuredTailBytes = s.get("tools.artifactTailBytes");
	const hasExplicitTailBytes =
		typeof s.has === "function" ? s.has("tools.artifactTailBytes") : configuredTailBytes !== undefined;
	return hasExplicitTailBytes && configuredTailBytes !== undefined
		? configuredTailBytes * 1024
		: BASH_DEFAULT_OUTPUT_TAIL_BYTES;
}
/**
 * Bash keeps only the tail unless the user explicitly opts into the shared
 * head-retention setting. Schema defaults still apply to other streaming
 * tools without silently turning Bash back into middle-elision mode.
 */
export function resolveBashOutputSinkHeadBytes(s: Settings): number {
	const configuredHeadBytes = s.get("tools.artifactHeadBytes");
	const hasExplicitHeadBytes =
		typeof s.has === "function" ? s.has("tools.artifactHeadBytes") : configuredHeadBytes !== undefined;
	return hasExplicitHeadBytes && configuredHeadBytes !== undefined ? configuredHeadBytes * 1024 : 0;
}

function isValidLossCounter(value: number | undefined): boolean {
	return value === undefined || (Number.isSafeInteger(value) && value >= 0);
}

function stripBodyArtifactReferences(result: AgentToolResult, artifactId: string): AgentToolResult["content"] {
	return result.content.map(block => {
		if (block.type !== "text") return block;
		const lines = block.text.split("\n");
		const kept = lines.filter(line => {
			const trimmed = line.trim();
			return !(
				(trimmed.startsWith("[raw output:") && trimmed.includes(`artifact://${artifactId}`)) ||
				trimmed.startsWith(`Read artifact://${artifactId} `)
			);
		});
		return kept.length === lines.length ? block : { ...block, text: kept.join("\n") };
	});
}

async function sanitizeArtifactIdEvidence(
	result: AgentToolResult,
	context: AgentToolContext | undefined,
): Promise<AgentToolResult> {
	const meta: OutputMeta | undefined = result.details?.meta;
	const truncation = meta?.truncation;
	if (!truncation) return result;
	const artifactId = truncation.artifactId;
	const artifactIdValid = artifactId === undefined || isValidArtifactId(artifactId);
	const countersValid =
		isValidLossCounter(truncation.artifactTruncatedBytes) &&
		isValidLossCounter(truncation.sourceTruncatedBytes) &&
		isValidLossCounter(truncation.columnDroppedBytes);
	const sourceCaptureFlagValid =
		truncation.sourceCaptureIncomplete === undefined || typeof truncation.sourceCaptureIncomplete === "boolean";
	const sourceCoordinatesIncomplete =
		!countersValid ||
		!sourceCaptureFlagValid ||
		truncation.sourceCaptureIncomplete === true ||
		(truncation.sourceTruncatedBytes ?? 0) > 0;
	const artifactCapability = artifactCapabilityForContext(context);
	const artifactResolvable =
		artifactId === undefined ? true : await resolveArtifactForCurrentSessionBounded(artifactCapability, artifactId);
	const resultPayload = result.content.map(block => (block.type === "text" ? block.text : "")).join("");
	const artifactProven =
		artifactId === undefined ||
		(truncation.artifactVerified === true &&
			hasBoundCurrentExecutionArtifactProof(truncation, artifactId, resultPayload) &&
			artifactResolvable);
	const artifactFailed = truncation.artifactFailureDiagnostic !== undefined;
	const invalidateArtifact = artifactId !== undefined && (!artifactIdValid || !artifactProven || artifactFailed);
	const staleFullClaim =
		artifactId !== undefined &&
		(sourceCoordinatesIncomplete ||
			(truncation.artifactTruncatedBytes ?? 0) > 0 ||
			(truncation.columnDroppedBytes ?? 0) > 0);
	if (
		artifactIdValid &&
		countersValid &&
		sourceCaptureFlagValid &&
		!sourceCoordinatesIncomplete &&
		!invalidateArtifact &&
		!staleFullClaim
	)
		return result;
	const diagnostic = !artifactIdValid
		? "existing metadata contained an invalid artifact id"
		: artifactFailed
			? truncation.artifactFailureDiagnostic
			: !artifactProven
				? artifactResolvable
					? "existing metadata did not prove artifact availability"
					: "existing artifact is not protocol-resolvable in the current session"
				: undefined;
	return {
		...result,
		content:
			artifactId && (invalidateArtifact || staleFullClaim)
				? stripBodyArtifactReferences(result, artifactId)
				: result.content,
		details: {
			...(result.details ?? {}),
			meta: {
				...meta,
				truncation: {
					...truncation,
					noticeOwner: invalidateArtifact || staleFullClaim ? undefined : truncation.noticeOwner,
					artifactId: invalidateArtifact ? undefined : artifactId,
					artifactVerified: invalidateArtifact ? false : truncation.artifactVerified,
					sourceCaptureIncomplete:
						!countersValid || !sourceCaptureFlagValid || truncation.sourceCaptureIncomplete || undefined,
					shownRange: sourceCoordinatesIncomplete ? undefined : truncation.shownRange,
					headRange: sourceCoordinatesIncomplete ? undefined : truncation.headRange,
					tailRange: sourceCoordinatesIncomplete ? undefined : truncation.tailRange,
					nextOffset: sourceCoordinatesIncomplete ? undefined : truncation.nextOffset,
					artifactFailureDiagnostic: diagnostic,
				},
			},
		},
	};
}

/**
 * Resolve the per-line column cap from session settings. Shared by streaming
 * executors (bash/python/ssh/eval via OutputSink) and the `read` tool's
 * line-buffer post-processing, so one setting controls both surfaces.
 */
export function resolveOutputMaxColumns(s: Settings | undefined): number {
	return s?.get("tools.outputMaxColumns") ?? getDefault("tools.outputMaxColumns");
}

/**
 * If the tool result text exceeds the spill threshold, save the full output
 * as a session artifact and replace the content with a head+tail (middle
 * elision) view plus an artifact reference. When `tools.artifactHeadBytes`
 * is 0, falls back to tail-only truncation. Skips when the tool already
 * saved its own artifact (e.g. bash/python via OutputSink).
 */
function artifactCapabilityForContext(context: AgentToolContext | undefined) {
	return sessionArtifactCapability(context?.sessionManager);
}

async function spillLargeResultToArtifact(
	result: AgentToolResult,
	toolName: string,
	context: AgentToolContext | undefined,
): Promise<AgentToolResult> {
	if (toolName === "read" && (result.details as { spillEligible?: boolean } | undefined)?.spillEligible !== true) {
		return result;
	}

	const { threshold, readThreshold, tailBytes, tailLines, headBytes, maxInlineBytes } = getSpillConfig(
		context?.settings,
	);
	// `read` manages its own per-range truncation, but the combined multi-range
	// output has no cap — enforce a read-specific (higher) combined threshold
	// instead of exempting read entirely. 0 disables read spill (backstop only).
	const effectiveThreshold = toolName === "read" ? readThreshold : threshold;
	const existingMeta: OutputMeta | undefined = result.details?.meta;

	// Measure total text content before any threshold early return so the absolute
	// inline cap is enforced even when token-based spilling is disabled.
	const textParts: string[] = [];
	for (const block of result.content) {
		if (block.type === "text" && block.text) textParts.push(block.text);
	}
	if (textParts.length === 0) return result;

	const fullText = textParts.length === 1 ? textParts[0] : textParts.join("\n");
	const existingTruncation = existingMeta?.truncation;
	const existingArtifactProven =
		existingTruncation?.artifactId !== undefined &&
		isValidArtifactId(existingTruncation.artifactId) &&
		existingTruncation.artifactFailureDiagnostic === undefined &&
		existingTruncation.artifactVerified === true;
	if (existingArtifactProven) return result;
	const totalBytes = Buffer.byteLength(fullText, "utf-8");
	const exceedsInlineCap = maxInlineBytes > 0 && totalBytes > maxInlineBytes;
	if (!exceedsInlineCap && (effectiveThreshold <= 0 || totalBytes <= effectiveThreshold)) return result;

	const artifactCapability = artifactCapabilityForContext(context);
	const saveFailure = (diagnostic: string): AgentToolResult => {
		const failurePreview = createArtifactFailurePreview(
			fullText,
			maxInlineBytes > 0 ? maxInlineBytes : undefined,
			diagnostic,
		);
		const outputLines = failurePreview.text.length > 0 ? failurePreview.text.split("\n").length : 0;
		const outputBytes = Buffer.byteLength(failurePreview.text, "utf-8");
		const failureTruncation: TruncationMeta = {
			...(existingTruncation ?? {}),
			direction: "tail",
			truncatedBy: "bytes",
			noticeOwner: undefined,
			totalLines: fullText.length > 0 ? fullText.split("\n").length : 0,
			totalBytes,
			outputLines,
			outputBytes,
			maxBytes: maxInlineBytes > 0 ? maxInlineBytes : undefined,
			shownRange: undefined,
			headRange: undefined,
			tailRange: undefined,
			nextOffset: undefined,
			artifactId: undefined,
			artifactVerified: false,
			sourceCaptureIncomplete: true,
			artifactFailureDiagnostic: diagnostic,
		};
		const content: (TextContent | ImageContent)[] = result.content.filter(block => block.type !== "text");
		content.push({ type: "text", text: failurePreview.text });
		return {
			...result,
			content,
			details: {
				...(result.details ?? {}),
				meta: { ...(existingMeta ?? {}), truncation: failureTruncation },
			},
		};
	};
	if (!artifactCapability) return saveFailure("artifact storage is unavailable");

	// Save full output through the bounded, validating path. Failed threshold
	// spills preserve their diagnostic even when the absolute backstop is disabled.
	const saveOutcome = await saveInlineArtifactBounded(
		artifactCapability,
		() => artifactCapability.saveArtifact(fullText, toolName),
		artifactId => artifactCapability.getArtifactPath(artifactId),
	);
	if (saveOutcome.status !== "ok") return saveFailure(saveOutcome.diagnostic);

	const artifactId = saveOutcome.artifactId;
	const newArtifactOmissions = genericArtifactOmittedBytes(fullText) ?? 0;
	const priorArtifactOmissions = isValidLossCounter(existingTruncation?.artifactTruncatedBytes)
		? (existingTruncation?.artifactTruncatedBytes ?? 0)
		: 0;
	const artifactTruncatedBytes = Math.max(newArtifactOmissions, priorArtifactOmissions) || undefined;
	const sourceTruncatedBytes = existingTruncation?.sourceTruncatedBytes;
	const columnDroppedBytes = existingTruncation?.columnDroppedBytes;
	const sourceCaptureIncomplete =
		existingTruncation?.sourceCaptureIncomplete || (columnDroppedBytes ?? 0) > 0 || undefined;

	// Truncate: middle elision when a head budget is configured, otherwise tail-only.
	const useMiddle = headBytes > 0;
	const truncated = useMiddle
		? truncateMiddle(fullText, {
				maxBytes: headBytes + tailBytes,
				maxLines: tailLines * 2,
				maxHeadBytes: headBytes,
				maxHeadLines: tailLines,
			})
		: truncateTail(fullText, {
				maxBytes: tailBytes,
				maxLines: tailLines,
			});

	// Replace text blocks with single truncated block, keep images.
	const newContent: (TextContent | ImageContent)[] = [];
	for (const block of result.content) {
		if (block.type !== "text") newContent.push(block);
	}
	newContent.push({ type: "text", text: truncated.content });

	// Build truncation meta.
	const outputLines = truncated.outputLines ?? truncated.totalLines;
	const outputBytes = truncated.outputBytes ?? truncated.totalBytes;
	let truncationMeta: TruncationMeta;
	if (truncated.truncatedBy === "middle") {
		const elidedLines = truncated.elidedLines ?? Math.max(0, truncated.totalLines - outputLines);
		const elidedBytes = truncated.elidedBytes ?? Math.max(0, truncated.totalBytes - outputBytes);
		truncationMeta = {
			direction: "middle",
			truncatedBy: "middle",
			totalLines: truncated.totalLines,
			totalBytes: truncated.totalBytes,
			outputLines,
			outputBytes,
			maxBytes: headBytes + tailBytes,
			headRange: sourceCaptureIncomplete ? undefined : truncated.headRange,
			tailRange: sourceCaptureIncomplete ? undefined : truncated.tailRange,
			elidedLines,
			elidedBytes,
			artifactId,
			artifactVerified: true,
			artifactTruncatedBytes,
			sourceTruncatedBytes,
			sourceCaptureIncomplete,
			columnDroppedBytes,
		};
	} else {
		const shownStart = truncated.totalLines - outputLines + 1;
		truncationMeta = {
			direction: "tail",
			truncatedBy: truncated.truncatedBy ?? "bytes",
			totalLines: truncated.totalLines,
			totalBytes: truncated.totalBytes,
			outputLines,
			outputBytes,
			maxBytes: tailBytes,
			shownRange: sourceCaptureIncomplete ? undefined : { start: shownStart, end: truncated.totalLines },
			artifactId,
			artifactVerified: true,
			artifactTruncatedBytes,
			sourceTruncatedBytes,
			sourceCaptureIncomplete,
			columnDroppedBytes,
		};
	}

	const newMeta: OutputMeta = { ...(existingMeta ?? {}), truncation: truncationMeta };
	const newDetails = { ...(result.details ?? {}), meta: newMeta };

	return { ...result, content: newContent, details: newDetails };
}

const BODY_TRUNCATION_FOOTER_KEY = "__bodyTruncationFooter";

function stripBodyOwnedTruncationFooter(text: string, details: unknown): string {
	const footer = (details as { [BODY_TRUNCATION_FOOTER_KEY]?: unknown } | undefined)?.[BODY_TRUNCATION_FOOTER_KEY];
	if (typeof footer !== "string" || footer.length === 0) return text;
	const trimmedText = text.trimEnd();
	const trimmedFooter = footer.trim();
	if (!trimmedText.endsWith(trimmedFooter)) return text;
	return trimmedText.slice(0, -trimmedFooter.length).trimEnd();
}

/**
 * Absolute inline-size backstop enforced after {@link spillLargeResultToArtifact}.
 *
 * The threshold-based spill above has escape hatches: it skips ineligible `read`
 * results and results that already carry an `artifactId` (a tool may set
 * partial truncation meta yet still emit oversized inline text). This backstop
 * closes those gaps: when `tools.maxInlineResultBytes` is configured (> 0), any
 * final result whose inline text exceeds the cap is force-saved to an artifact
 * (reusing an existing artifactId to avoid double-artifacting) and truncated to a
 * head+tail view that fits the cap. Disabled by default (opt-in pending
 * measurement); a 0 cap returns the result untouched.
 */
async function enforceInlineResultBackstop(
	result: AgentToolResult,
	toolName: string,
	context: AgentToolContext | undefined,
): Promise<AgentToolResult> {
	const { maxInlineBytes, tailLines, headBytes } = getSpillConfig(context?.settings);
	if (maxInlineBytes <= 0) return result;

	const textParts: string[] = [];
	for (const block of result.content) {
		if (block.type === "text" && block.text) {
			textParts.push(block.text);
		}
	}

	const renderedText = textParts.length === 1 ? textParts[0] : textParts.join("\n");
	const fullText = stripBodyOwnedTruncationFooter(renderedText, result.details);
	const totalBytes = Buffer.byteLength(renderedText, "utf-8");
	const existingMeta: OutputMeta | undefined = result.details?.meta;
	const existingNoticeBytes = Buffer.byteLength(formatOutputNotice(existingMeta), "utf-8");
	if (totalBytes + existingNoticeBytes <= maxInlineBytes) return result;

	// Reuse only storage-complete artifacts. Source-loss evidence remains bound
	// to the rendered body even when a new complete artifact is saved.
	const existingTruncation = existingMeta?.truncation;
	const previousArtifactId = existingTruncation?.artifactId;
	const previousArtifactIdValid = previousArtifactId === undefined || isValidArtifactId(previousArtifactId);
	const previousArtifactProven =
		previousArtifactId !== undefined && previousArtifactIdValid && existingTruncation?.artifactVerified === true;
	const existingArtifactStorageComplete =
		previousArtifactProven && existingTruncation?.artifactFailureDiagnostic === undefined;
	let artifactId = existingArtifactStorageComplete ? previousArtifactId : undefined;
	let artifactFailureDiagnostic = previousArtifactIdValid
		? existingTruncation?.artifactFailureDiagnostic
		: "existing metadata contained an invalid artifact id";
	let artifactTruncatedBytes = existingTruncation?.artifactTruncatedBytes;
	let artifactVerified = existingArtifactStorageComplete;
	let savedReplacementArtifact = false;
	const artifactCapability = artifactCapabilityForContext(context);
	if (!artifactId && artifactCapability && fullText.length > 0) {
		const saveOutcome = await saveInlineArtifactBounded(
			artifactCapability,
			() => artifactCapability.saveArtifact(fullText, toolName),
			artifactId => artifactCapability.getArtifactPath(artifactId),
		);
		if (saveOutcome.status === "ok") {
			artifactId = saveOutcome.artifactId;
			const newArtifactOmissions = genericArtifactOmittedBytes(fullText) ?? 0;
			const priorArtifactOmissions = artifactTruncatedBytes ?? 0;
			artifactTruncatedBytes = Math.max(newArtifactOmissions, priorArtifactOmissions) || undefined;
			artifactFailureDiagnostic = undefined;
			artifactVerified = true;
			savedReplacementArtifact = true;
		} else {
			artifactFailureDiagnostic = saveOutcome.diagnostic;
		}
	} else if (!artifactId && !artifactCapability) {
		artifactFailureDiagnostic ??= "artifact storage is unavailable";
	}
	const sourceTruncatedBytes = existingTruncation?.sourceTruncatedBytes;
	const columnDroppedBytes = existingTruncation?.columnDroppedBytes;
	const sourceCaptureIncomplete =
		existingTruncation?.sourceCaptureIncomplete ||
		(savedReplacementArtifact && (columnDroppedBytes ?? 0) > 0) ||
		undefined;
	const sourceCoordinatesIncomplete = (sourceTruncatedBytes ?? 0) > 0 || sourceCaptureIncomplete === true;

	// Reserve the actual pre-existing notice plus room for the bounded truncation
	// evidence appended below. This prevents large diagnostics from bypassing the
	// final inline cap while retaining both head/tail content when space permits.
	const MARKER_RESERVE = 256;
	const NOTICE_RESERVE = Math.min(
		Math.max(0, maxInlineBytes - MARKER_RESERVE),
		Math.max(4096, existingNoticeBytes + 1024),
	);
	const budget = Math.max(0, maxInlineBytes - MARKER_RESERVE - NOTICE_RESERVE);
	const useMiddle = headBytes > 0 && budget > 0;
	let truncated = useMiddle
		? truncateMiddle(fullText, {
				maxBytes: budget,
				maxLines: tailLines * 2,
				maxHeadBytes: Math.min(headBytes, Math.floor(budget / 2)),
				maxHeadLines: tailLines,
			})
		: truncateTail(fullText, { maxBytes: budget, maxLines: tailLines });

	if (Buffer.byteLength(truncated.content, "utf-8") > budget) {
		truncated = truncateTail(fullText, { maxBytes: budget, maxLines: tailLines });
	}

	const newContent: (TextContent | ImageContent)[] = [];
	for (const block of result.content) {
		if (block.type !== "text") {
			newContent.push(block);
		}
	}
	newContent.push({ type: "text", text: truncated.content });

	const outputLines = truncated.outputLines ?? truncated.totalLines;
	const outputBytes = truncated.outputBytes ?? truncated.totalBytes;
	const truncationMeta: TruncationMeta =
		truncated.truncatedBy === "middle"
			? {
					direction: "middle",
					truncatedBy: "middle",
					totalLines: truncated.totalLines,
					totalBytes: truncated.totalBytes,
					outputLines,
					outputBytes,
					maxBytes: maxInlineBytes,
					elidedLines: truncated.elidedLines ?? Math.max(0, truncated.totalLines - outputLines),
					elidedBytes: truncated.elidedBytes ?? Math.max(0, truncated.totalBytes - outputBytes),
					artifactId,
					artifactVerified,
					artifactTruncatedBytes,
					sourceTruncatedBytes,
					sourceCaptureIncomplete,
					columnDroppedBytes,
					artifactFailureDiagnostic,
				}
			: {
					direction: "tail",
					truncatedBy: truncated.truncatedBy ?? "bytes",
					totalLines: truncated.totalLines,
					totalBytes: truncated.totalBytes,
					outputLines,
					outputBytes,
					maxBytes: maxInlineBytes,
					shownRange: sourceCoordinatesIncomplete
						? undefined
						: { start: truncated.totalLines - outputLines + 1, end: truncated.totalLines },
					artifactId,
					artifactVerified,
					artifactTruncatedBytes,
					sourceTruncatedBytes,
					sourceCaptureIncomplete,
					columnDroppedBytes,
					artifactFailureDiagnostic,
				};

	let newMeta: OutputMeta = { ...(existingMeta ?? {}), truncation: truncationMeta };
	let finalText = truncated.content;
	let renderedBytes = Buffer.byteLength(finalText, "utf-8") + Buffer.byteLength(formatOutputNotice(newMeta), "utf-8");
	if (renderedBytes > maxInlineBytes && newMeta.diagnostics) {
		newMeta = { ...newMeta, diagnostics: undefined, diagnosticsOmitted: true };
		renderedBytes = Buffer.byteLength(finalText, "utf-8") + Buffer.byteLength(formatOutputNotice(newMeta), "utf-8");
	}
	if (renderedBytes > maxInlineBytes) {
		const compactTruncation = newMeta.truncation
			? {
					...newMeta.truncation,
					artifactFailureDiagnostic: newMeta.truncation.artifactFailureDiagnostic
						? truncateHeadBytes(newMeta.truncation.artifactFailureDiagnostic, 64).text
						: undefined,
					shownRange: undefined,
					headRange: undefined,
					tailRange: undefined,
					nextOffset: undefined,
				}
			: undefined;
		newMeta = { ...newMeta, truncation: compactTruncation, limits: undefined };
		const noticeBytes = Buffer.byteLength(formatOutputNotice(newMeta), "utf-8");
		const bodyBudget = Math.max(0, maxInlineBytes - noticeBytes);
		const finalTruncated = truncateTail(finalText, { maxBytes: bodyBudget, maxLines: tailLines });
		finalText = finalTruncated.content;
		if (newMeta.truncation) {
			newMeta = {
				...newMeta,
				truncation: {
					...newMeta.truncation,
					direction: "tail",
					truncatedBy: "bytes",
					outputBytes: Buffer.byteLength(finalText, "utf-8"),
					outputLines: finalText.length > 0 ? finalText.split("\n").length : 0,
				},
			};
		}
	}
	const boundedContent = newContent.map(block => (block.type === "text" ? { ...block, text: finalText } : block));
	const newDetails = { ...(result.details ?? {}), meta: newMeta };
	return { ...result, content: boundedContent, details: newDetails };
}

export async function finalizeToolResultForDelivery(
	result: AgentToolResult,
	toolName: string,
	context: AgentToolContext | undefined,
): Promise<AgentToolResult> {
	let finalized = await sanitizeArtifactIdEvidence(result, context);
	finalized = await spillLargeResultToArtifact(finalized, toolName, context);
	finalized = await enforceInlineResultBackstop(finalized, toolName, context);
	const meta: OutputMeta | undefined = finalized.details?.meta;
	return meta ? { ...finalized, content: appendOutputNotice(finalized.content, meta) } : finalized;
}

// =============================================================================
// Tool wrapper
// =============================================================================

async function wrappedExecute(
	this: AgentTool & { [kUnwrappedExecute]: AgentToolExecFn },
	toolCallId: string,
	params: any,
	signal?: AbortSignal,
	onUpdate?: AgentToolUpdateCallback,
	context?: AgentToolContext,
): Promise<AgentToolResult> {
	const originalExecute = this[kUnwrappedExecute];

	try {
		return await finalizeToolResultForDelivery(
			await originalExecute.call(this, toolCallId, params, signal, onUpdate, context),
			this.name,
			context,
		);
	} catch (e) {
		// Re-throw with formatted message so agent-loop sets isError flag
		throw new Error(renderError(e));
	}
}

/**
 * Wrap a tool to:
 * 1. Automatically append output notices based on details.meta
 * 2. Handle ToolError rendering
 */
export function wrapToolWithMetaNotice<T extends AgentTool<any, any, any>>(tool: T): T {
	if (kUnwrappedExecute in tool) {
		return tool;
	}

	const originalExecute = tool.execute;

	return Object.defineProperties(tool, {
		[kUnwrappedExecute]: {
			value: originalExecute,
			enumerable: false,
			configurable: true,
		},
		execute: {
			value: wrappedExecute,
			enumerable: false,
			configurable: true,
			writable: true,
		},
	});
}
