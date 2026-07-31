import { describe, expect, test, vi } from "bun:test";
import type { AgentTool, AgentToolContext, AgentToolResult } from "@gajae-code/agent-core";
import { Settings } from "@gajae-code/coding-agent/config/settings";
import { createReadonlySessionManager, SessionManager } from "@gajae-code/coding-agent/session/session-manager";
import { DEFAULT_ARTIFACT_MAX_BYTES, OutputSink } from "@gajae-code/coding-agent/session/streaming-output";
import {
	finalizeToolResultForDelivery,
	outputMeta,
	wrapToolWithMetaNotice,
} from "@gajae-code/coding-agent/tools/output-meta";

const HEAD_MARKER = "HEAD_MARKER_START";
const TAIL_MARKER = "TAIL_MARKER_END";

/** Build a multi-line payload of ~`kb` KB with distinctive head/tail markers. */
function bigText(kb: number): string {
	const target = kb * 1024;
	const lines: string[] = [HEAD_MARKER];
	let bytes = HEAD_MARKER.length + 1;
	let i = 0;
	while (bytes < target) {
		const line = `line ${i} ${"x".repeat(64)}`;
		lines.push(line);
		bytes += line.length + 1;
		i++;
	}
	lines.push(TAIL_MARKER);
	return lines.join("\n");
}

function makeTool(name: string, result: AgentToolResult): AgentTool {
	return {
		name,
		description: "",
		parameters: {},
		execute: async () => result,
	} as unknown as AgentTool;
}

function makeContext(settings: Settings, saved: Array<{ content: string; toolType: string }>): AgentToolContext {
	const manager = SessionManager.inMemory();
	vi.spyOn(manager, "saveArtifact").mockImplementation(async (content: string, toolType: string) => {
		saved.push({ content, toolType });
		return String(saved.length);
	});
	vi.spyOn(manager, "getArtifactPath").mockImplementation(async id => `/artifacts/${id}.tool-result.log`);
	return {
		settings,
		sessionManager: createReadonlySessionManager(manager),
	} as AgentToolContext;
}

function inlineText(result: AgentToolResult): string {
	return result.content
		.filter((b): b is { type: "text"; text: string } => b.type === "text")
		.map(b => b.text)
		.join("\n");
}

describe("inline-result backstop (Finding 12)", () => {
	test("consumes metadata proof once and rejects replay with a different body", async () => {
		const sink = new OutputSink({
			spillThreshold: 4,
			artifactId: "1",
			artifactPublisher: async () => ({ status: "published", artifactId: "1" }),
		});
		sink.push("proof-payload-suffix");
		const summary = await sink.dump();
		const meta = outputMeta().truncationFromSummary(summary, { direction: "tail" }).get();
		const context = makeContext(Settings.isolated(), []);
		const first = await finalizeToolResultForDelivery(
			{ content: [{ type: "text", text: summary.output }], details: { meta } },
			"bash",
			context,
		);
		const replay = await finalizeToolResultForDelivery(
			{ content: [{ type: "text", text: `${summary.output}-different` }], details: { meta } },
			"bash",
			context,
		);
		expect(first.details?.meta?.truncation?.artifactId).toBe("1");
		expect(replay.details?.meta?.truncation?.artifactId).toBeUndefined();
		expect(inlineText(replay)).not.toContain("artifact://1");
	});
	test("disabled by default: oversized output passes through untouched, no artifact saved", async () => {
		const full = bigText(40);
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(makeTool("mytool", { content: [{ type: "text", text: full }] }));
		const ctx = makeContext(Settings.isolated(), saved);

		const result = await tool.execute("c1", {}, undefined, undefined, ctx);

		expect(inlineText(result)).toBe(full);
		expect(saved).toHaveLength(0);
		expect(result.details?.meta?.truncation).toBeUndefined();
	});

	test("opt-in cap: 40KB (below 50KB spill threshold) spills via backstop retaining head+tail", async () => {
		const full = bigText(40);
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(makeTool("mytool", { content: [{ type: "text", text: full }] }));
		const ctx = makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 10 }), saved);

		const result = await tool.execute("c2", {}, undefined, undefined, ctx);
		const text = inlineText(result);

		// No final tool-result text exceeds the configured inline cap.
		expect(Buffer.byteLength(text, "utf-8")).toBeLessThanOrEqual(10 * 1024);
		// Head+tail retained (middle elision).
		expect(text).toContain(HEAD_MARKER);
		expect(text).toContain(TAIL_MARKER);
		// Full output saved exactly once, referenced by the truncation meta.
		expect(saved).toHaveLength(1);
		expect(saved[0]?.content).toBe(full);
		expect(result.details?.meta?.truncation?.artifactId).toBe("1");
	});

	test("in-memory artifact saves remain unverified and never advertise artifact URLs", async () => {
		const full = bigText(40);
		const manager = SessionManager.inMemory();
		const tool = wrapToolWithMetaNotice(makeTool("mytool", { content: [{ type: "text", text: full }] }));
		const ctx = {
			settings: Settings.isolated({ "tools.maxInlineResultBytes": 10 }),
			sessionManager: createReadonlySessionManager(manager),
		} as AgentToolContext;

		const result = await tool.execute("in-memory-unresolvable", {}, undefined, undefined, ctx);
		const truncation = result.details?.meta?.truncation;
		expect(truncation?.artifactId).toBeUndefined();
		expect(truncation?.artifactVerified).toBe(false);
		expect(truncation?.artifactFailureDiagnostic).toContain("invalid artifact id");
		expect(inlineText(result)).not.toContain("artifact://");
	});

	test("re-spills caller-forged artifact metadata instead of reusing an unrelated current-session id", async () => {
		const full = bigText(40);
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "text", text: `${full}\n[raw output: artifact://9]` }],
				details: {
					meta: {
						truncation: {
							direction: "tail",
							truncatedBy: "bytes",
							totalLines: 1,
							totalBytes: full.length,
							outputLines: 1,
							outputBytes: full.length,
							artifactId: "9",
							artifactVerified: true,
							noticeOwner: "body",
						},
					},
				},
			}),
		);
		const ctx = makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 10 }), saved);

		const result = await tool.execute("c3", {}, undefined, undefined, ctx);
		const text = inlineText(result);

		expect(Buffer.byteLength(text, "utf-8")).toBeLessThanOrEqual(10 * 1024);
		// Caller-provided metadata cannot prove current-execution publication, even when the ID resolves.
		expect(saved).toHaveLength(1);
		expect(saved[0]?.content).toBe(full);
		expect(result.details?.meta?.truncation?.artifactId).toBe("1");
	});

	test("preserves source-loss evidence while replacing forged artifact proof", async () => {
		const full = bigText(40);
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "text", text: `${full}\nRead artifact://10 for retained output` }],
				details: {
					meta: {
						truncation: {
							direction: "tail",
							truncatedBy: "bytes",
							totalLines: 10,
							totalBytes: full.length + 17,
							outputLines: 10,
							outputBytes: full.length,
							artifactId: "10",
							artifactVerified: true,
							noticeOwner: "body",
							sourceTruncatedBytes: 17,
							sourceCaptureIncomplete: true,
						},
					},
				},
			}),
		);
		const ctx = makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 10 }), saved);

		const result = await tool.execute("c3-partial", {}, undefined, undefined, ctx);
		const truncation = result.details?.meta?.truncation;
		const text = inlineText(result);

		expect(saved).toHaveLength(1);
		expect(truncation?.artifactId).toBe("1");
		expect(truncation?.sourceTruncatedBytes).toBe(17);
		expect(truncation?.sourceCaptureIncomplete).toBe(true);
		expect(truncation?.shownRange).toBeUndefined();
		expect(text).toContain("Read artifact://1 for retained output");
		expect(text).not.toContain("for full output");
	});

	test("preserves prior artifact-cap omissions while replacing forged artifact proof", async () => {
		const full = bigText(40);
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "text", text: `${full}\nRead artifact://11 for retained output` }],
				details: {
					meta: {
						truncation: {
							direction: "tail",
							truncatedBy: "bytes",
							totalLines: 10,
							totalBytes: full.length + 9,
							outputLines: 10,
							outputBytes: full.length,
							artifactId: "11",
							artifactVerified: true,
							noticeOwner: "body",
							artifactTruncatedBytes: 9,
						},
					},
				},
			}),
		);
		const ctx = makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 10 }), saved);

		const result = await tool.execute("c3-capped", {}, undefined, undefined, ctx);
		const truncation = result.details?.meta?.truncation;
		const text = inlineText(result);

		expect(saved).toHaveLength(1);
		expect(truncation?.artifactId).toBe("1");
		expect(truncation?.artifactTruncatedBytes).toBe(9);
		expect(text).toContain("Read artifact://1 for retained output");
		expect(text).not.toContain("for full output");
	});

	test("does not trust an unbound numeric prior artifact id", async () => {
		const full = bigText(40);
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "text", text: full }],
				details: {
					meta: {
						truncation: {
							direction: "tail",
							truncatedBy: "bytes",
							totalLines: 1,
							totalBytes: full.length,
							outputLines: 1,
							outputBytes: full.length,
							artifactId: "9",
						},
					},
				},
			}),
		);
		const ctx = makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 10 }), saved);
		const result = await tool.execute("c3-unbound", {}, undefined, undefined, ctx);
		expect(saved).toHaveLength(1);
		expect(result.details?.meta?.truncation?.artifactId).toBe("1");
	});

	test("clears an unproven artifact id below every spill threshold", async () => {
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "text", text: "small result" }],
				details: {
					meta: {
						truncation: {
							direction: "tail",
							truncatedBy: "bytes",
							totalLines: 1,
							totalBytes: 12,
							outputLines: 1,
							outputBytes: 12,
							artifactId: "9",
						},
					},
				},
			}),
		);
		const result = await tool.execute(
			"c3-small-unbound",
			{},
			undefined,
			undefined,
			makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 10 }), saved),
		);
		const text = inlineText(result);
		expect(result.details?.meta?.truncation?.artifactId).toBeUndefined();
		expect(text).toContain("did not prove artifact availability");
		expect(text).not.toContain("artifact://9");
	});

	test("strips a failed body-owned artifact footer below thresholds", async () => {
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "text", text: "small result\nRead artifact://79 for full output\n\n" }],
				details: {
					meta: {
						truncation: {
							direction: "tail",
							noticeOwner: "body",
							truncatedBy: "bytes",
							totalLines: 1,
							totalBytes: 12,
							outputLines: 1,
							outputBytes: 12,
							artifactId: "79",
							artifactFailureDiagnostic: "save failed",
						},
					},
				},
			}),
		);
		const result = await tool.execute(
			"c3-small-failed-body",
			{},
			undefined,
			undefined,
			makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 10 }), saved),
		);
		const text = inlineText(result);
		expect(text).toContain("small result");
		expect(text).toContain("save failed");
		expect(text).not.toContain("artifact://79");
	});

	test("strips an unproven generated artifact footer without notice ownership", async () => {
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "text", text: "small result\nRead artifact://79 for full output\n" }],
				details: {
					meta: {
						truncation: {
							direction: "tail",
							truncatedBy: "bytes",
							totalLines: 1,
							totalBytes: 12,
							outputLines: 1,
							outputBytes: 12,
							artifactId: "79",
						},
					},
				},
			}),
		);
		const result = await tool.execute(
			"c3-small-unowned-body",
			{},
			undefined,
			undefined,
			makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 10 }), saved),
		);
		expect(inlineText(result)).not.toContain("artifact://79");
	});

	test("rejects a verified numeric artifact ID missing from the current session", async () => {
		const manager = SessionManager.inMemory();
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "text", text: "small result\nRead artifact://79 for full output\n" }],
				details: {
					meta: {
						truncation: {
							direction: "tail",
							truncatedBy: "bytes",
							totalLines: 1,
							totalBytes: 12,
							outputLines: 1,
							outputBytes: 12,
							artifactId: "79",
							artifactVerified: true,
						},
					},
				},
			}),
		);
		const result = await tool.execute("c3-missing-verified", {}, undefined, undefined, {
			settings: Settings.isolated(),
			sessionManager: createReadonlySessionManager(manager),
		} as AgentToolContext);
		expect(inlineText(result)).not.toContain("artifact://79");
		expect(result.details?.meta?.truncation?.artifactId).toBeUndefined();
		expect(result.details?.meta?.truncation?.artifactFailureDiagnostic).toContain("not protocol-resolvable");
	});

	test("caps unresolved artifact proof lookups per session without starving another session", async () => {
		const makeProvenResult = async (artifactId: string): Promise<AgentToolResult> => {
			const sink = new OutputSink({
				spillThreshold: 4,
				artifactPublisher: async () => ({ status: "published", artifactId }),
			});
			sink.push("HEAD-TAIL");
			const summary = await sink.dump();
			return {
				content: [{ type: "text", text: summary.output }],
				details: { meta: outputMeta().truncationFromSummary(summary, { direction: "tail" }).get() },
			};
		};
		const ownerGate = Promise.withResolvers<string | null>();
		const owner = SessionManager.inMemory();
		const ownerLookup = vi.spyOn(owner, "getArtifactPath").mockImplementation(async () => ownerGate.promise);
		const ownerContext = {
			settings: Settings.isolated(),
			sessionManager: createReadonlySessionManager(owner),
		} as AgentToolContext;
		const ownerResults = await Promise.all(
			Array.from({ length: 65 }, (_, index) => makeProvenResult(String(1000 + index))),
		);
		const pending = ownerResults
			.slice(0, 64)
			.map(result => finalizeToolResultForDelivery(result, "bash", ownerContext));
		await Bun.sleep(10);
		const saturated = await finalizeToolResultForDelivery(ownerResults[64]!, "bash", ownerContext);
		expect(ownerLookup).toHaveBeenCalledTimes(64);
		expect(saturated.details?.meta?.truncation?.artifactId).toBeUndefined();

		const isolatedGate = Promise.withResolvers<string | null>();
		const isolated = SessionManager.inMemory();
		const isolatedLookup = vi.spyOn(isolated, "getArtifactPath").mockImplementation(async () => isolatedGate.promise);
		const isolatedContext = {
			settings: Settings.isolated(),
			sessionManager: createReadonlySessionManager(isolated),
		} as AgentToolContext;
		const isolatedPending = finalizeToolResultForDelivery(await makeProvenResult("2000"), "bash", isolatedContext);
		await Bun.sleep(10);
		expect(isolatedLookup).toHaveBeenCalledTimes(1);

		ownerGate.resolve("/artifacts/current-session.log");
		isolatedGate.resolve("/artifacts/isolated-session.log");
		await Promise.all([...pending, isolatedPending]);
	});

	test("removes an invalid generated artifact footer even when later diagnostics follow it", async () => {
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "text", text: "small result\n[raw output: artifact://79]\nTimeout after 1s\n" }],
				details: {
					meta: {
						truncation: {
							direction: "tail",
							noticeOwner: "body",
							truncatedBy: "bytes",
							totalLines: 1,
							totalBytes: 12,
							outputLines: 1,
							outputBytes: 12,
							artifactId: "79",
							artifactVerified: true,
							sourceCaptureIncomplete: "true" as never,
						},
					},
				},
			}),
		);
		const result = await tool.execute(
			"c3-stale-full-body",
			{},
			undefined,
			undefined,
			makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 10 }), saved),
		);
		const text = inlineText(result);
		expect(text).not.toContain("[raw output: artifact://79]");
		expect(text).toContain("Timeout after 1s");
		expect(text).toContain("existing metadata did not prove artifact availability");
	});

	test("fails closed on malformed source flags without an artifact", async () => {
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "text", text: "small result" }],
				details: {
					meta: {
						truncation: {
							direction: "tail",
							truncatedBy: "bytes",
							totalLines: 10,
							totalBytes: 100,
							outputLines: 1,
							outputBytes: 12,
							shownRange: { start: 10, end: 10 },
							sourceCaptureIncomplete: null as never,
						},
					},
				},
			}),
		);
		const result = await tool.execute(
			"c3-malformed-source-no-artifact",
			{},
			undefined,
			undefined,
			makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 10 }), saved),
		);
		expect(result.details?.meta?.truncation?.sourceCaptureIncomplete).toBe(true);
		expect(result.details?.meta?.truncation?.shownRange).toBeUndefined();
	});

	test("fails closed on malformed column-loss accounting", async () => {
		const full = bigText(40);
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "text", text: full }],
				details: {
					meta: {
						truncation: {
							direction: "tail",
							truncatedBy: "bytes",
							totalLines: 1,
							totalBytes: full.length,
							outputLines: 1,
							outputBytes: full.length,
							columnDroppedBytes: Number.NaN,
						},
					},
				},
			}),
		);
		const result = await tool.execute(
			"c3-malformed-column",
			{},
			undefined,
			undefined,
			makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 10 }), saved),
		);
		expect(result.details?.meta?.truncation?.sourceCaptureIncomplete).toBe(true);
		expect(inlineText(result)).toContain("for retained output");
	});

	test("fails closed on malformed inherited loss counters", async () => {
		const full = bigText(40);
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "text", text: full }],
				details: {
					meta: {
						truncation: {
							direction: "tail",
							truncatedBy: "bytes",
							totalLines: 1,
							totalBytes: full.length,
							outputLines: 1,
							outputBytes: full.length,
							artifactId: "9",
							artifactTruncatedBytes: Number.NaN,
						},
					},
				},
			}),
		);
		const ctx = makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 10 }), saved);
		const result = await tool.execute("c3-malformed-loss", {}, undefined, undefined, ctx);
		const text = inlineText(result);
		expect(result.details?.meta?.truncation?.sourceCaptureIncomplete).toBe(true);
		expect(text).toContain("source capture completeness could not be proven");
		expect(text).not.toContain("artifact://9 for full output");
	});

	test("preserves prior source loss through normal threshold spill", async () => {
		const full = bigText(60);
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "text", text: full }],
				details: {
					meta: {
						truncation: {
							direction: "tail",
							truncatedBy: "bytes",
							totalLines: 10,
							totalBytes: full.length + 17,
							outputLines: 10,
							outputBytes: full.length,
							sourceTruncatedBytes: 17,
							sourceCaptureIncomplete: true,
						},
					},
				},
			}),
		);
		const ctx = makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 10 }), saved);
		const result = await tool.execute("c3-threshold-source-loss", {}, undefined, undefined, ctx);
		const text = inlineText(result);
		expect(result.details?.meta?.truncation?.sourceTruncatedBytes).toBe(17);
		expect(result.details?.meta?.truncation?.sourceCaptureIncomplete).toBe(true);
		expect(text).toContain("for retained output");
	});

	test("keeps multibyte storage failures under the final inline cap", async () => {
		const full = bigText(40);
		const manager = SessionManager.inMemory();
		vi.spyOn(manager, "saveArtifact").mockRejectedValue(new Error("😀".repeat(512)));
		const tool = wrapToolWithMetaNotice(makeTool("mytool", { content: [{ type: "text", text: full }] }));
		const ctx = {
			settings: Settings.isolated({ "tools.maxInlineResultBytes": 1 }),
			sessionManager: createReadonlySessionManager(manager),
		} as AgentToolContext;
		const result = await tool.execute("c3-multibyte-failure", {}, undefined, undefined, ctx);
		expect(Buffer.byteLength(inlineText(result), "utf-8")).toBeLessThanOrEqual(1024);
	});

	test("retries a failed prior artifact on the normal threshold path", async () => {
		const full = bigText(60);
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "text", text: full }],
				details: {
					meta: {
						truncation: {
							direction: "tail",
							truncatedBy: "bytes",
							totalLines: 1,
							totalBytes: full.length,
							outputLines: 1,
							outputBytes: full.length,
							artifactId: "9",
							artifactFailureDiagnostic: "prior save failed",
						},
					},
				},
			}),
		);
		const ctx = makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 0 }), saved);
		const result = await tool.execute("c3-failed-threshold", {}, undefined, undefined, ctx);
		expect(saved).toHaveLength(1);
		expect(result.details?.meta?.truncation?.artifactId).toBe("1");
		expect(inlineText(result)).not.toContain("prior save failed");
	});

	test("discloses threshold save failure when inline backstop is disabled", async () => {
		const full = bigText(60);
		const manager = SessionManager.inMemory();
		vi.spyOn(manager, "saveArtifact").mockRejectedValue(new Error("threshold store failed"));
		const tool = wrapToolWithMetaNotice(makeTool("mytool", { content: [{ type: "text", text: full }] }));
		const ctx = {
			settings: Settings.isolated({ "tools.maxInlineResultBytes": 0 }),
			sessionManager: createReadonlySessionManager(manager),
		} as AgentToolContext;
		const result = await tool.execute("c3-threshold-failure", {}, undefined, undefined, ctx);
		expect(inlineText(result)).toContain("threshold store failed");
		expect(result.details?.meta?.truncation?.artifactId).toBeUndefined();
	});

	test("labels replacement artifacts from column-capped text as retained output", async () => {
		const full = bigText(40);
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "text", text: full }],
				details: {
					meta: {
						truncation: {
							direction: "tail",
							truncatedBy: "bytes",
							totalLines: 1,
							totalBytes: full.length + 20,
							outputLines: 1,
							outputBytes: full.length,
							columnDroppedBytes: 20,
						},
					},
				},
			}),
		);
		const ctx = makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 10 }), saved);
		const result = await tool.execute("c3-column-capped", {}, undefined, undefined, ctx);
		const text = inlineText(result);
		expect(result.details?.meta?.truncation?.sourceCaptureIncomplete).toBe(true);
		expect(text).toContain("for retained output");
		expect(text).not.toContain("for full output");
	});

	test("read-tool spill exemption is still covered by the backstop", async () => {
		const full = bigText(40);
		const saved: Array<{ content: string; toolType: string }> = [];
		// The threshold spill early-returns for `read`; the backstop must still cap it.
		const tool = wrapToolWithMetaNotice(makeTool("read", { content: [{ type: "text", text: full }] }));
		const ctx = makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 10 }), saved);

		const result = await tool.execute("c4", {}, undefined, undefined, ctx);
		const text = inlineText(result);

		expect(Buffer.byteLength(text, "utf-8")).toBeLessThanOrEqual(10 * 1024);
		expect(saved).toHaveLength(1);
		expect(result.details?.meta?.truncation?.artifactId).toBe("1");
	});

	test("keeps an oversized single line plus appended notice within the inline cap", async () => {
		const full = "x".repeat(40 * 1024);
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(makeTool("mytool", { content: [{ type: "text", text: full }] }));
		const ctx = makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 10 }), saved);

		const result = await tool.execute("c4-long-line", {}, undefined, undefined, ctx);
		const text = inlineText(result);

		expect(Buffer.byteLength(text, "utf-8")).toBeLessThanOrEqual(10 * 1024);
		expect(text).toContain("Showing");
		expect(result.details?.meta?.truncation?.artifactId).toBe("1");
	});

	test("discloses missing artifact capability after inline backstop truncation", async () => {
		const full = bigText(40);
		const tool = wrapToolWithMetaNotice(makeTool("mytool", { content: [{ type: "text", text: full }] }));
		const ctx = { settings: Settings.isolated({ "tools.maxInlineResultBytes": 10 }) } as AgentToolContext;

		const result = await tool.execute("c4-no-store", {}, undefined, undefined, ctx);
		const text = inlineText(result);

		expect(text).toContain("artifact storage is unavailable");
		expect(text).toContain("no artifact reference is available");
		expect(result.details?.meta?.truncation?.artifactId).toBeUndefined();
	});

	test("bounds and discloses rejected inline backstop artifact saves", async () => {
		const full = bigText(40);
		const manager = SessionManager.inMemory();
		vi.spyOn(manager, "saveArtifact").mockRejectedValue(new Error(`store failed ${"x".repeat(1_000)}`));
		const tool = wrapToolWithMetaNotice(makeTool("mytool", { content: [{ type: "text", text: full }] }));
		const ctx = {
			settings: Settings.isolated({ "tools.maxInlineResultBytes": 10 }),
			sessionManager: createReadonlySessionManager(manager),
		} as AgentToolContext;

		const result = await tool.execute("c4-store-failed", {}, undefined, undefined, ctx);
		const diagnostic = result.details?.meta?.truncation?.artifactFailureDiagnostic;
		const text = inlineText(result);

		expect(diagnostic?.length).toBeLessThanOrEqual(512);
		expect(text).toContain("Artifact storage failed: store failed");
		expect(text).toContain("no artifact reference is available");
	});

	test("bounds stalled inline backstop artifact saves", async () => {
		const full = bigText(40);
		const manager = SessionManager.inMemory();
		const saveGate = Promise.withResolvers<string>();
		vi.spyOn(manager, "saveArtifact").mockImplementation(async () => saveGate.promise);
		const tool = wrapToolWithMetaNotice(makeTool("mytool", { content: [{ type: "text", text: full }] }));
		const ctx = {
			settings: Settings.isolated({ "tools.maxInlineResultBytes": 10 }),
			sessionManager: createReadonlySessionManager(manager),
		} as AgentToolContext;

		const result = await tool.execute("c4-store-stalled", {}, undefined, undefined, ctx);
		const text = inlineText(result);
		expect(text).toContain("did not settle within 500ms");
		expect(result.details?.meta?.truncation?.artifactId).toBeUndefined();
		saveGate.resolve("77");
		await saveGate.promise;
	});

	test("bounds the normal threshold spill before the inline backstop", async () => {
		const full = bigText(60);
		const manager = SessionManager.inMemory();
		const saveGate = Promise.withResolvers<string>();
		const saveSpy = vi.spyOn(manager, "saveArtifact").mockImplementation(async () => saveGate.promise);
		const tool = wrapToolWithMetaNotice(makeTool("mytool", { content: [{ type: "text", text: full }] }));
		const ctx = {
			settings: Settings.isolated({ "tools.maxInlineResultBytes": 10 }),
			sessionManager: createReadonlySessionManager(manager),
		} as AgentToolContext;

		const result = await tool.execute("c4-threshold-stalled", {}, undefined, undefined, ctx);
		const text = inlineText(result);
		expect(Buffer.byteLength(text, "utf-8")).toBeLessThanOrEqual(10 * 1024);
		expect(text).toContain("did not settle within 500ms");
		expect(saveSpy).toHaveBeenCalledTimes(2);
		saveGate.resolve("78");
		await saveGate.promise;
	});

	test("caps a fitting body after bounded diagnostic notices are appended", async () => {
		const body = "b".repeat(9 * 1024);
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "text", text: body }],
				details: { meta: { diagnostics: { summary: "large", messages: ["d".repeat(100_000)] } } },
			}),
		);
		const ctx = makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 10 }), saved);

		const result = await tool.execute("c4-large-notice", {}, undefined, undefined, ctx);
		const text = inlineText(result);
		expect(Buffer.byteLength(text, "utf-8")).toBeLessThanOrEqual(10 * 1024);
		expect(text).toContain("[diagnostics truncated]");
	});

	test("keeps compact omission evidence under a one-kilobyte inline cap", async () => {
		const body = "b".repeat(900);
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "text", text: body }],
				details: { meta: { diagnostics: { summary: "large", messages: ["d".repeat(100_000)] } } },
			}),
		);
		const ctx = makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 1 }), saved);

		const result = await tool.execute("c4-minimum-cap", {}, undefined, undefined, ctx);
		const text = inlineText(result);
		expect(Buffer.byteLength(text, "utf-8")).toBeLessThanOrEqual(1024);
		expect(text).toContain("Diagnostics omitted by inline result cap");
	});

	test("counts body-owned directional footers in the inline cap", async () => {
		const footer = "[Showing lines 1-10 of 100. Use :11 to continue]";
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "text", text: `${"x".repeat(1000)}\n${footer}` }],
				details: {
					__bodyTruncationFooter: footer,
					meta: {
						truncation: {
							direction: "tail",
							noticeOwner: "body",
							truncatedBy: "bytes",
							totalLines: 100,
							totalBytes: 2000,
							outputLines: 10,
							outputBytes: 1000,
						},
					},
				} as never,
			}),
		);
		const saved: Array<{ content: string; toolType: string }> = [];
		const result = await tool.execute(
			"c3-body-footer-cap",
			{},
			undefined,
			undefined,
			makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 1 }), saved),
		);
		expect(Buffer.byteLength(inlineText(result), "utf-8")).toBeLessThanOrEqual(1024);
	});

	test("caps notice-only image results", async () => {
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "image", data: "", mimeType: "image/png" }],
				details: { meta: { diagnostics: { summary: "large", messages: ["d".repeat(100_000)] } } },
			}),
		);
		const saved: Array<{ content: string; toolType: string }> = [];
		const result = await tool.execute(
			"c3-image-notice",
			{},
			undefined,
			undefined,
			makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 0.01 }), saved),
		);
		expect(Buffer.byteLength(inlineText(result), "utf-8")).toBeLessThanOrEqual(1024);
	});

	test("rejects invalid new and prior artifact ids", async () => {
		const full = bigText(40);
		const manager = SessionManager.inMemory();
		vi.spyOn(manager, "saveArtifact").mockResolvedValue("invalid-id");
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "text", text: full }],
				details: {
					meta: {
						truncation: {
							direction: "tail",
							truncatedBy: "bytes",
							totalLines: 1,
							totalBytes: full.length,
							outputLines: 1,
							outputBytes: full.length,
							artifactId: "also-invalid",
						},
					},
				},
			}),
		);
		const ctx = {
			settings: Settings.isolated({ "tools.maxInlineResultBytes": 10 }),
			sessionManager: createReadonlySessionManager(manager),
		} as AgentToolContext;

		const result = await tool.execute("c4-invalid-ids", {}, undefined, undefined, ctx);
		const text = inlineText(result);
		expect(result.details?.meta?.truncation?.artifactId).toBeUndefined();
		expect(text).toContain("storage returned an invalid artifact id");
		expect(text).not.toContain("for full output");
	});

	test("does not restore a failed prior artifact after a failed retry", async () => {
		const full = bigText(40);
		const manager = SessionManager.inMemory();
		vi.spyOn(manager, "saveArtifact").mockRejectedValue(new Error("retry failed"));
		const tool = wrapToolWithMetaNotice(
			makeTool("mytool", {
				content: [{ type: "text", text: full }],
				details: {
					meta: {
						truncation: {
							direction: "tail",
							truncatedBy: "bytes",
							totalLines: 1,
							totalBytes: full.length,
							outputLines: 1,
							outputBytes: full.length,
							artifactId: "79",
							artifactFailureDiagnostic: "prior write failed",
						},
					},
				},
			}),
		);
		const ctx = {
			settings: Settings.isolated({ "tools.maxInlineResultBytes": 10 }),
			sessionManager: createReadonlySessionManager(manager),
		} as AgentToolContext;

		const result = await tool.execute("c4-failed-prior", {}, undefined, undefined, ctx);
		const text = inlineText(result);
		expect(result.details?.meta?.truncation?.artifactId).toBeUndefined();
		expect(text).toContain("retry failed");
		expect(text).not.toContain("artifact://79 for full output");
	});

	test("labels artifacts above the storage cap as retained output", async () => {
		const full = "x".repeat(DEFAULT_ARTIFACT_MAX_BYTES + 100);
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(makeTool("mytool", { content: [{ type: "text", text: full }] }));
		const ctx = makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 10 }), saved);

		const result = await tool.execute("c4-storage-cap", {}, undefined, undefined, ctx);
		const text = inlineText(result);
		expect(result.details?.meta?.truncation?.artifactTruncatedBytes).toBe(100);
		expect(text).toContain("Read artifact://1 for retained output");
		expect(text).not.toContain("for full output");
	});

	test("output at or below the cap is left untouched", async () => {
		const small = bigText(5);
		const saved: Array<{ content: string; toolType: string }> = [];
		const tool = wrapToolWithMetaNotice(makeTool("mytool", { content: [{ type: "text", text: small }] }));
		const ctx = makeContext(Settings.isolated({ "tools.maxInlineResultBytes": 10 }), saved);

		const result = await tool.execute("c5", {}, undefined, undefined, ctx);

		expect(inlineText(result)).toBe(small);
		expect(saved).toHaveLength(0);
	});
});
