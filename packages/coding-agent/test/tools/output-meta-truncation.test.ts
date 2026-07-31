import { describe, expect, test } from "bun:test";
import { Settings } from "../../src/config/settings";
import { truncateHead, truncateMiddle, truncateMiddleWindows, truncateTail } from "../../src/session/streaming-output";
import {
	BASH_DEFAULT_OUTPUT_TAIL_BYTES,
	formatArtifactEvidenceNotice,
	formatOutputNotice,
	outputMeta,
	resolveBashOutputSinkHeadBytes,
	resolveBashOutputSinkTailBytes,
} from "../../src/tools/output-meta";

describe("output truncation metadata plumbing", () => {
	test("defaults Bash capture to a 1 KiB tail while preserving explicit retention budgets", () => {
		expect(BASH_DEFAULT_OUTPUT_TAIL_BYTES).toBe(1024);
		expect(resolveBashOutputSinkTailBytes(Settings.isolated())).toBe(1024);
		expect(resolveBashOutputSinkTailBytes(Settings.isolated({ "tools.artifactTailBytes": 7 }))).toBe(7 * 1024);
		expect(resolveBashOutputSinkHeadBytes(Settings.isolated())).toBe(0);
		expect(resolveBashOutputSinkHeadBytes(Settings.isolated({ "tools.artifactHeadBytes": 7 }))).toBe(7 * 1024);
	});
	test("does not render artifact URLs without protocol-resolution proof", () => {
		const notice = formatArtifactEvidenceNotice({ artifactId: "7", artifactVerified: false });
		expect(notice).toContain("availability could not be proven");
		expect(notice).not.toContain("artifact://");
	});
	test("does not label artifacts as full when native callback output was dropped", () => {
		const meta = outputMeta()
			.truncationFromSummary(
				{
					output: "TAIL",
					truncated: true,
					totalLines: 10,
					totalBytes: 100,
					outputLines: 1,
					outputBytes: 4,
					artifactId: "17",
					artifactVerified: true,
					sourceTruncatedBytes: 17,
					artifactTruncatedBytes: 9,
				},
				{ direction: "tail" },
			)
			.get();
		const notice = formatOutputNotice(meta);

		expect(meta?.truncation?.sourceTruncatedBytes).toBe(17);
		expect(meta?.truncation?.shownRange).toBeUndefined();
		expect(notice).toContain("from an incomplete Bash capture");
		expect(notice).toContain("Read artifact://17 for retained output");
		expect(notice).toContain("dropped before Bash capture");
		expect(notice).toContain("omitted by the artifact storage cap");
		expect(notice).not.toContain("for full output");
	});

	test("does not claim completeness when native cancellation cleanup never settles", () => {
		const meta = outputMeta()
			.truncationFromSummary(
				{
					output: "started\nCommand cancelled",
					truncated: true,
					totalLines: 2,
					totalBytes: 25,
					outputLines: 2,
					outputBytes: 25,
					artifactId: "18",
					artifactVerified: true,
					sourceCaptureIncomplete: true,
				},
				{ direction: "tail" },
			)
			.get();
		const notice = formatOutputNotice(meta);

		expect(meta?.truncation?.sourceCaptureIncomplete).toBe(true);
		expect(meta?.truncation?.shownRange).toBeUndefined();
		expect(notice).toContain("from an incomplete Bash capture");
		expect(notice).toContain("Read artifact://18 for retained output");
		expect(notice).toContain("source capture completeness could not be proven");
		expect(notice).not.toContain("for full output");
		expect(notice).not.toContain("limit");
	});

	test("does not claim a complete tail range for a partial middle fragment", () => {
		const meta = outputMeta()
			.truncationFromSummary(
				{
					output: "HEAD\n[... omitted ...]\nT",
					truncated: true,
					totalLines: 3,
					totalBytes: 32,
					outputLines: 3,
					outputBytes: 25,
					elidedBytes: 7,
					elidedLines: 1,
					headRange: { start: 1, end: 1 },
					tailRange: { start: 3, end: 3 },
					lastLinePartial: true,
				},
				{ direction: "middle" },
			)
			.get();
		expect(meta?.truncation?.headRange).toEqual({ start: 1, end: 1 });
		expect(meta?.truncation?.tailRange).toBeUndefined();
	});

	test("omits ranges for partial truncateMiddle and tail fragments", () => {
		const content = `head\n${"x".repeat(100)}`;
		const middle = truncateMiddle(content, { maxBytes: 12, maxHeadBytes: 4, maxLines: 10 });
		const middleMeta = outputMeta().truncation(middle, { direction: "middle" }).get();
		expect(middle.lastLinePartial).toBe(true);
		expect(middleMeta?.truncation?.tailRange).toBeUndefined();

		const tail = truncateTail(content, { maxBytes: 8, maxLines: 10 });
		const tailMeta = outputMeta().truncation(tail, { direction: "tail" }).get();
		expect(tail.lastLinePartial).toBe(true);
		expect(tailMeta?.truncation?.shownRange).toBeUndefined();
	});

	test("reports every omission when no artifact reference is available", () => {
		const meta = outputMeta()
			.truncationFromSummary(
				{
					output: "TAIL",
					truncated: true,
					totalLines: 1,
					totalBytes: 4,
					outputLines: 1,
					outputBytes: 4,
					sourceTruncatedBytes: 17,
					artifactTruncatedBytes: 9,
					artifactFailureDiagnostic: "failed: write rejected",
				},
				{ direction: "tail" },
			)
			.get();
		const notice = formatOutputNotice(meta);

		expect(notice).toContain("Bash capture omitted at least 17B");
		expect(notice).toContain("Artifact storage omitted at least 9B");
		expect(notice).toContain("no artifact reference is available");
		expect(notice).toContain("Artifact storage failed: failed: write rejected");
	});
	test("forwards noticeOwner on ordinary truncation builders", () => {
		const result = truncateHead("one\ntwo\nthree", { maxLines: 2, maxBytes: 100 });
		const meta = outputMeta().truncation(result, { direction: "head", noticeOwner: "body" }).get();
		expect(meta?.truncation?.noticeOwner).toBe("body");
	});

	test("uses actual windows for truncationWindows and forwards noticeOwner", () => {
		const windows = truncateMiddleWindows("aaaaa\nb\nc\nd\ne\nf\ng", { maxBytes: 12, maxLines: 10 });
		const meta = outputMeta()
			.truncationWindows(windows, { noticeOwner: "body", artifactId: "7", artifactVerified: true })
			.get();
		expect(meta?.truncation).toMatchObject({
			direction: "middle",
			noticeOwner: "body",
			artifactId: "7",
			artifactVerified: true,
			headRange: { start: 1, end: 1 },
			tailRange: { start: 5, end: 7 },
		});
	});

	test("labels selected-window coordinates in truncation notices", () => {
		const windows = truncateMiddleWindows("a\nb\nc\nd\ne", { maxBytes: 5, maxLines: 3 });
		const meta = outputMeta().truncationWindows(windows, { rangeBase: "window" }).get();
		const notice = formatOutputNotice(meta);
		expect(notice).toContain("of the selected 5-line range");
	});

	test("marks partial middle tails without inventing a complete tail range", () => {
		const windows = truncateMiddleWindows(`short\n${"Z".repeat(60_000)}`, { maxBytes: 10 * 1024, maxLines: 50 });
		const meta = outputMeta().truncationWindows(windows).get();
		const truncation = meta?.truncation;

		expect(truncation?.partialLine).toMatchObject({ line: 2, sourceBytes: 60_000 });
		expect(truncation?.headRange).toBeUndefined();
		expect(truncation?.tailRange).toBeUndefined();
		expect(formatOutputNotice(meta)).toContain("last");
		expect(formatOutputNotice(meta)).toContain("of line 2");
	});

	test("forwards noticeOwner through summary and text option interfaces", () => {
		const summaryMeta = outputMeta()
			.truncationFromSummary(
				{
					output: "one",
					truncated: true,
					totalLines: 2,
					totalBytes: 7,
					outputLines: 1,
					outputBytes: 3,
				},
				{ direction: "head", noticeOwner: "body" },
			)
			.get();
		expect(summaryMeta?.truncation?.noticeOwner).toBe("body");

		const textMeta = outputMeta()
			.truncationFromText("one", { direction: "head", totalLines: 2, noticeOwner: "body" })
			.get();
		expect(textMeta?.truncation?.noticeOwner).toBe("body");
	});
	test("omits a contiguous range for byte-cut middle text previews", () => {
		const meta = outputMeta()
			.truncationFromText("head\nreceipt\ntail", {
				direction: "middle",
				totalLines: 100,
				totalBytes: 10_000,
				maxBytes: 64,
			})
			.get();
		expect(meta?.truncation?.shownRange).toBeUndefined();
		expect(meta?.truncation?.nextOffset).toBeUndefined();
	});

	test("omits source coordinates when visible lines lost columns", () => {
		const meta = outputMeta()
			.truncationFromSummary(
				{
					output: "partial",
					truncated: true,
					totalLines: 10,
					totalBytes: 1_000,
					outputLines: 1,
					outputBytes: 7,
					columnDroppedBytes: 42,
					columnTruncatedLines: 1,
					columnMax: 7,
				},
				{ direction: "head" },
			)
			.get();
		expect(meta?.truncation?.shownRange).toBeUndefined();
		expect(meta?.truncation?.nextOffset).toBeUndefined();
	});
});
