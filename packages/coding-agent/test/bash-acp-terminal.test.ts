import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { ClientBridge, ClientBridgeTerminalHandle } from "../src/session/client-bridge";
import { DEFAULT_ARTIFACT_MAX_BYTES, truncateHeadBytes, truncateTailBytes } from "../src/session/streaming-output";
import type { ToolSession } from "../src/tools";
import { BashTool } from "../src/tools/bash";

interface SessionOptions {
	tailKiB?: number;
	headKiB?: number;
	saveArtifact?: (content: string, type: string) => Promise<string>;
	maxInlineKiB?: number;
}

function makeSession(bridge: ClientBridge, options: SessionOptions = {}): ToolSession {
	return {
		cwd: "/tmp",
		hasUI: false,
		skills: [],
		getSessionFile: () => null,
		settings: {
			get(key: string) {
				if (key === "async.enabled") return false;
				if (key === "bash.autoBackground.enabled") return false;
				if (key === "bash.autoBackground.thresholdMs") return 60_000;
				if (key === "bashInterceptor.enabled") return false;
				if (key === "astGrep.enabled") return false;
				if (key === "astEdit.enabled") return false;
				if (key === "search.enabled") return false;
				if (key === "find.enabled") return false;
				if (key === "tools.artifactTailBytes") return options.tailKiB;
				if (key === "tools.artifactHeadBytes") return options.headKiB;
				if (key === "tools.maxInlineResultBytes") return options.maxInlineKiB;
				return undefined;
			},
			has(key: string) {
				if (key === "tools.artifactTailBytes") return options.tailKiB !== undefined;
				if (key === "tools.artifactHeadBytes") return options.headKiB !== undefined;
				if (key === "tools.maxInlineResultBytes") return options.maxInlineKiB !== undefined;
				return false;
			},
			getBashInterceptorRules() {
				return [];
			},
		},
		getClientBridge: () => bridge,
		getArtifactManager: options.saveArtifact ? () => ({ save: options.saveArtifact }) : undefined,
	} as unknown as ToolSession;
}

afterEach(() => {
	mock.restore();
});

describe("BashTool ACP terminal routing", () => {
	it("routes through bridge, emits terminalId update, and releases the handle", async () => {
		const stubText = "hello from terminal\n";

		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-xyz",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: async () => ({ output: stubText, truncated: false }),
			kill: async () => {},
			release: async () => {},
		};

		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};

		const createSpy = spyOn(bridge, "createTerminal");
		const releaseSpy = spyOn(handle, "release");

		const updates: Array<{ details?: { terminalId?: string } }> = [];

		const tool = new BashTool(makeSession(bridge));
		const result = await tool.execute("call-1", { command: "echo hi" }, undefined, update => {
			updates.push(update as { details?: { terminalId?: string } });
		});

		// createTerminal must be called with the expanded command
		expect(createSpy).toHaveBeenCalledTimes(1);
		const params = createSpy.mock.calls[0]![0];
		expect(params.command).toBe("echo hi");
		expect(params.toolCallId).toBe("call-1");
		expect(params.outputByteLimit).toBe(DEFAULT_ARTIFACT_MAX_BYTES);

		// The first onUpdate must carry the terminalId so the editor can embed it
		expect(updates.length).toBeGreaterThanOrEqual(1);
		expect(updates[0]!.details?.terminalId).toBe("term-xyz");

		// The final result text must contain the stub output
		const text = result.content.find(c => c.type === "text");
		expect(text?.text).toContain("hello from terminal");

		// The result details must carry terminalId for the ACP event mapper
		expect(result.details?.terminalId).toBe("term-xyz");

		// The handle must always be released
		expect(releaseSpy).toHaveBeenCalledTimes(1);
	});

	it("bounds client-terminal output to the default 1 KiB tail", async () => {
		const stubText = `HEAD\n${"middle\n".repeat(400)}TAIL\n`;
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-tail",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: async () => ({ output: stubText, truncated: false }),
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};

		const result = await new BashTool(makeSession(bridge)).execute("call-tail", { command: "wide-output" });
		const text = result.content.find(block => block.type === "text")?.text ?? "";

		expect(text).not.toContain("HEAD");
		expect(text).toContain("TAIL");
		expect(result.details?.meta?.truncation?.direction).toBe("tail");
		expect(result.details?.meta?.truncation?.outputBytes).toBeGreaterThan(1000);
		expect(result.details?.meta?.truncation?.outputBytes).toBeLessThanOrEqual(1024);
	});

	it("honors an explicit ACP tail budget", async () => {
		const stubText = `HEAD\n${"middle\n".repeat(800)}TAIL\n`;
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-explicit-tail",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: async () => ({ output: stubText, truncated: false }),
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};
		const createSpy = spyOn(bridge, "createTerminal");

		const result = await new BashTool(makeSession(bridge, { tailKiB: 2 })).execute("call-explicit-tail", {
			command: "wide-output",
		});

		expect(createSpy.mock.calls[0]?.[0].outputByteLimit).toBe(DEFAULT_ARTIFACT_MAX_BYTES);
		expect(result.details?.meta?.truncation?.direction).toBe("tail");
		expect(result.details?.meta?.truncation?.outputBytes).toBeGreaterThan(2000);
		expect(result.details?.meta?.truncation?.outputBytes).toBeLessThanOrEqual(2048);
	});

	it("honors explicit ACP head retention and artifacts the full returned output", async () => {
		const stubText = `HEAD\n${"middle\n".repeat(800)}TAIL\n`;
		const saveArtifact = mock(async () => "101");
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-head-tail",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: async () => ({ output: stubText, truncated: false }),
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};
		const createSpy = spyOn(bridge, "createTerminal");

		const result = await new BashTool(makeSession(bridge, { tailKiB: 1, headKiB: 1, saveArtifact })).execute(
			"call-head-tail",
			{ command: "wide-output" },
		);
		const text = result.content.find(block => block.type === "text")?.text ?? "";

		expect(createSpy.mock.calls[0]?.[0].outputByteLimit).toBe(DEFAULT_ARTIFACT_MAX_BYTES);
		expect(text).toContain("HEAD");
		expect(text).toContain("TAIL");
		expect(text).toContain("elided");
		expect(result.details?.meta?.truncation?.direction).toBe("middle");
		expect(result.details?.meta?.truncation?.artifactId).toBe("101");
		expect(result.details?.meta?.truncation?.artifactVerified).toBe(false);
		expect(saveArtifact).toHaveBeenCalledWith(stubText, "bash-original");
		expect(text).not.toContain("artifact://101");
		expect(result.details?.meta?.truncation?.artifactTruncatedBytes).toBeUndefined();
	});

	it("uses UTF-8-safe byte windows for explicit ACP head and tail on one line", async () => {
		const stubText = "界".repeat(2_000);
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-multibyte-head-tail",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: async () => ({ output: stubText, truncated: false }),
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};

		const result = await new BashTool(makeSession(bridge, { tailKiB: 1, headKiB: 1 })).execute("call-multibyte", {
			command: "wide-output",
		});
		const text = result.content.find(block => block.type === "text")?.text ?? "";

		expect(text).toContain(truncateHeadBytes(stubText, 1024).text);
		expect(text).toContain(truncateTailBytes(stubText, 1024).text);
		expect(text).not.toContain("�");
		expect(result.details?.meta?.truncation?.direction).toBe("middle");
	});

	it("surfaces bounded artifact-save diagnostics without inventing a URI", async () => {
		const stubText = `HEAD\n${"middle\n".repeat(800)}TAIL\n`;
		const saveArtifact = mock(async (_content: string, _type: string): Promise<string> => {
			throw new Error("disk full while publishing bash output");
		});
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-save-failure",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: async () => ({ output: stubText, truncated: false }),
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};

		const result = await new BashTool(makeSession(bridge, { saveArtifact })).execute("call-save-failure", {
			command: "wide-output",
		});
		const text = result.content.find(block => block.type === "text")?.text ?? "";

		expect(text).toContain("Bash output artifact save failed");
		expect(text).toContain("disk full while publishing bash output");
		expect(text).not.toContain("artifact://");
		expect(result.details?.meta?.truncation?.artifactId).toBeUndefined();
	});

	it("rejects injected ACP artifact ids without emitting a reference", async () => {
		const stubText = `HEAD\n${"middle\n".repeat(800)}TAIL\n`;
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-invalid-artifact-id",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: async () => ({ output: stubText, truncated: false }),
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};

		const result = await new BashTool(makeSession(bridge, { saveArtifact: async () => "bad\nid" })).execute(
			"call-invalid-artifact-id",
			{ command: "wide-output" },
		);
		const text = result.content.find(block => block.type === "text")?.text ?? "";
		expect(text).toContain("storage returned an invalid artifact id");
		expect(text).not.toContain("artifact://");
		expect(result.details?.meta?.truncation?.artifactId).toBeUndefined();
	});
	it("discloses unavailable original-output recovery without inventing a URI", async () => {
		const stubText = `HEAD\n${"middle\n".repeat(800)}TAIL\n`;
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-save-unavailable",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: async () => ({ output: stubText, truncated: false }),
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};

		const result = await new BashTool(makeSession(bridge, { tailKiB: 1 })).execute("call-save-unavailable", {
			command: "wide-output",
		});
		const text = result.content.find(block => block.type === "text")?.text ?? "";

		expect(text).toContain("Bash output artifact unavailable");
		expect(text).toContain("artifact storage is unavailable");
		expect(text).not.toContain("artifact://");
		expect(result.details?.meta?.truncation?.artifactId).toBeUndefined();
	});

	it("does not label already-truncated client output as a full artifact", async () => {
		const stubText = `REMOTE-PARTIAL\n${"middle\n".repeat(400)}TAIL\n`;
		const saveArtifact = mock(async () => "must-not-save");
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-remote-truncated",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: async () => ({ output: stubText, truncated: true }),
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};

		const result = await new BashTool(makeSession(bridge, { saveArtifact })).execute("call-remote-truncated", {
			command: "wide-output",
		});
		const text = result.content.find(block => block.type === "text")?.text ?? "";

		expect(saveArtifact).not.toHaveBeenCalled();
		expect(result.details?.meta?.truncation?.artifactId).toBeUndefined();
		expect(result.details?.meta?.truncation?.sourceCaptureIncomplete).toBe(true);
		expect(result.details?.meta?.truncation?.shownRange).toBeUndefined();
		expect(text).toContain("(output truncated)");
	});

	it("fails closed on malformed ACP output completeness", async () => {
		const saveArtifact = mock(async () => "must-not-save");
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-malformed-output",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: (async () => ({ output: "REMOTE-PARTIAL\n", truncated: null })) as never,
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};
		const result = await new BashTool(makeSession(bridge, { saveArtifact })).execute("call-malformed-output", {
			command: "wide-output",
		});
		expect(saveArtifact).not.toHaveBeenCalled();
		expect(result.details?.meta?.truncation?.artifactId).toBeUndefined();
		expect(result.details?.meta?.truncation?.sourceCaptureIncomplete).toBe(true);
		expect(result.details?.meta?.truncation?.shownRange).toBeUndefined();
	});

	it("discloses client-reported partial output on ACP failures", async () => {
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-remote-truncated-failure",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 7, signal: null }),
			currentOutput: async () => ({ output: "REMOTE-PARTIAL\n", truncated: true }),
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};

		let caught: unknown;
		try {
			await new BashTool(makeSession(bridge)).execute("call-remote-truncated-failure", {
				command: "failing-stream",
			});
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(Error);
		const message = caught instanceof Error ? caught.message : String(caught);
		expect(message).toContain("Source capture completeness could not be proven");
		expect(message).toContain("no artifact reference is available");
		expect(message).toContain("Command exited with code 7");
	});

	it("discloses client-reported partial output on ACP poll updates", async () => {
		const pendingExit = Promise.withResolvers<{ exitCode: number | null; signal: string | null }>();
		let reads = 0;
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-poll-truncated",
			providerLeaseId: "test-lease",
			waitForExit: async () => pendingExit.promise,
			currentOutput: async () => {
				reads++;
				if (reads === 1) queueMicrotask(() => pendingExit.resolve({ exitCode: 0, signal: null }));
				return { output: "REMOTE-PARTIAL\n", truncated: true };
			},
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};
		const updates: Array<{ content?: Array<{ text?: string }> }> = [];

		await new BashTool(makeSession(bridge)).execute(
			"call-poll-truncated",
			{ command: "stream" },
			undefined,
			update => {
				updates.push(update as { content?: Array<{ text?: string }> });
			},
		);

		expect(updates.some(update => update.content?.some(block => block.text?.includes("(output truncated)")))).toBe(
			true,
		);
	});

	it("fails closed on malformed ACP poll output", async () => {
		const pendingExit = Promise.withResolvers<{ exitCode: number | null; signal: string | null }>();
		let reads = 0;
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-poll-malformed",
			providerLeaseId: "test-lease",
			waitForExit: async () => pendingExit.promise,
			currentOutput: (async () => {
				reads++;
				if (reads === 1) {
					queueMicrotask(() => pendingExit.resolve({ exitCode: 0, signal: null }));
					return { output: "REMOTE-PARTIAL\n", truncated: null };
				}
				return { output: "final-output", truncated: false };
			}) as never,
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};
		const updates: Array<{ content?: Array<{ text?: string }> }> = [];
		await new BashTool(makeSession(bridge)).execute(
			"call-poll-malformed",
			{ command: "stream" },
			undefined,
			update => {
				updates.push(update as { content?: Array<{ text?: string }> });
			},
		);
		expect(updates.some(update => update.content?.some(block => block.text?.includes("(output truncated)")))).toBe(
			true,
		);
	});

	it("preserves prior poll loss through a falsely complete final snapshot", async () => {
		for (const [label, pollTruncated] of [
			["truncated", true],
			["malformed", null],
		] as const) {
			const pendingExit = Promise.withResolvers<{ exitCode: number | null; signal: string | null }>();
			const finalOutput = `HEAD\n${"middle\n".repeat(800)}TAIL\n`;
			let reads = 0;
			const saveArtifact = mock(async () => (label === "truncated" ? "121" : "122"));
			const handle: ClientBridgeTerminalHandle = {
				terminalId: `term-poll-loss-${label}`,
				providerLeaseId: "test-lease",
				waitForExit: async () => pendingExit.promise,
				currentOutput: (async () => {
					reads++;
					if (reads === 1) {
						queueMicrotask(() => pendingExit.resolve({ exitCode: 0, signal: null }));
						return { output: "REMOTE-PARTIAL\n", truncated: pollTruncated };
					}
					return { output: finalOutput, truncated: false };
				}) as never,
				kill: async () => {},
				release: async () => {},
			};
			const bridge: ClientBridge = {
				capabilities: { terminal: true },
				quarantineProviderLease: async () => {},
				createTerminal: async () => handle,
			};
			const result = await new BashTool(makeSession(bridge, { tailKiB: 1, saveArtifact })).execute(
				`call-poll-loss-${label}`,
				{ command: "stream" },
			);
			const text = result.content.find(block => block.type === "text")?.text ?? "";
			expect(result.details?.meta?.truncation?.sourceCaptureIncomplete).toBe(true);
			expect(result.details?.meta?.truncation?.artifactVerified).toBe(false);
			expect(text).not.toContain("artifact://");
		}
	});

	it("recovers after a rejected ACP poll read", async () => {
		const pendingExit = Promise.withResolvers<{ exitCode: number | null; signal: string | null }>();
		let reads = 0;
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-poll-rejection",
			providerLeaseId: "test-lease",
			waitForExit: async () => pendingExit.promise,
			currentOutput: async () => {
				reads++;
				if (reads === 1) {
					queueMicrotask(() => pendingExit.resolve({ exitCode: 0, signal: null }));
					throw new Error("poll unavailable");
				}
				return { output: "final-output", truncated: false };
			},
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};

		const result = await new BashTool(makeSession(bridge)).execute("call-poll-rejection", { command: "stream" });
		const text = result.content.find(block => block.type === "text")?.text ?? "";
		expect(text).toContain("final-output");
		expect(reads).toBeGreaterThanOrEqual(2);
	});

	it("discloses locally truncated output on ACP poll updates", async () => {
		const pendingExit = Promise.withResolvers<{ exitCode: number | null; signal: string | null }>();
		const stubText = `HEAD\n${"middle\n".repeat(400)}TAIL\n`;
		let reads = 0;
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-poll-local-truncated",
			providerLeaseId: "test-lease",
			waitForExit: async () => pendingExit.promise,
			currentOutput: async () => {
				reads++;
				if (reads === 2) queueMicrotask(() => pendingExit.resolve({ exitCode: 0, signal: null }));
				return { output: stubText, truncated: false };
			},
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};
		const updates: Array<{ content?: Array<{ text?: string }> }> = [];

		await new BashTool(makeSession(bridge)).execute(
			"call-poll-local-truncated",
			{ command: "stream" },
			undefined,
			update => {
				updates.push(update as { content?: Array<{ text?: string }> });
			},
		);

		expect(updates.some(update => update.content?.some(block => block.text?.includes("(output truncated)")))).toBe(
			true,
		);
	});

	it("releases the client terminal and reports incomplete capture when final output retrieval fails", async () => {
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-output-failure",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: async () => {
				throw new Error("client output unavailable");
			},
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};
		const releaseSpy = spyOn(handle, "release");

		const tool = new BashTool(makeSession(bridge));

		const result = await tool.execute("call-output-failure", { command: "echo hi" });
		const text = result.content.find(block => block.type === "text")?.text ?? "";
		expect(text).toContain("Terminal output recovery failed: client output unavailable");
		expect(result.details?.meta?.truncation?.sourceCaptureIncomplete).toBe(true);
		expect(result.details?.meta?.truncation?.shownRange).toBeUndefined();
		expect(releaseSpy).toHaveBeenCalledTimes(1);
	});

	it("releases the client terminal when terminalId update throws", async () => {
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-update-throw",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: async () => ({ output: "", truncated: false }),
			kill: async () => {},
			release: async () => {},
		};
		const releaseSpy = spyOn(handle, "release");
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};

		await expect(
			new BashTool(makeSession(bridge)).execute("call-update-throw", { command: "echo hi" }, undefined, () => {
				throw new Error("update callback failed");
			}),
		).rejects.toThrow("update callback failed");
		expect(releaseSpy).toHaveBeenCalledTimes(1);
	});

	it("honors aborts that arrive during final ACP output recovery", async () => {
		const controller = new AbortController();
		const killSpy = mock(async () => {});
		const releaseSpy = mock(async () => {});
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-final-read-abort",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: async () => {
				controller.abort();
				return { output: "final-partial", truncated: false };
			},
			kill: killSpy,
			release: releaseSpy,
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};

		await expect(
			new BashTool(makeSession(bridge)).execute("call-final-read-abort", { command: "echo hi" }, controller.signal),
		).rejects.toThrow(/Source capture completeness could not be proven[\s\S]*Command aborted/);
		expect(killSpy).toHaveBeenCalledTimes(1);
		expect(releaseSpy).toHaveBeenCalledTimes(1);
	});

	it("preserves prior poll loss when abort races post-exit recovery", async () => {
		const controller = new AbortController();
		const pendingExit = Promise.withResolvers<{ exitCode: number | null; signal: string | null }>();
		const finalOutput = `HEAD\n${"middle\n".repeat(800)}TAIL\n`;
		let reads = 0;
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-post-exit-poll-loss",
			providerLeaseId: "test-lease",
			waitForExit: async () => pendingExit.promise,
			currentOutput: async () => {
				reads++;
				if (reads === 1) {
					queueMicrotask(() => {
						pendingExit.resolve({ exitCode: 0, signal: null });
						controller.abort();
					});
					return { output: "REMOTE-PARTIAL\n", truncated: true };
				}
				return { output: finalOutput, truncated: false };
			},
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};
		let message = "";
		try {
			await new BashTool(
				makeSession(bridge, { tailKiB: 1, maxInlineKiB: 1, saveArtifact: mock(async () => "123") }),
			).execute("call-post-exit-poll-loss", { command: "stream" }, controller.signal);
		} catch (error) {
			message = error instanceof Error ? error.message : String(error);
		}
		expect(message).not.toContain("artifact://123");
		expect(message).toContain("TAIL");
		expect(message).not.toContain("[raw output:");
		expect(Buffer.byteLength(message, "utf8")).toBeLessThanOrEqual(1024);
	});

	it("bounds a stalled final output RPC and reports incomplete capture", async () => {
		const outputGate = Promise.withResolvers<{ output: string; truncated: boolean }>();
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-output-stall",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: async () => outputGate.promise,
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};

		const result = await new BashTool(makeSession(bridge)).execute("call-output-stall", { command: "echo hi" });
		const text = result.content.find(block => block.type === "text")?.text ?? "";
		expect(text).toContain("Terminal output recovery failed: did not settle within 500ms");
		expect(result.details?.meta?.truncation?.sourceCaptureIncomplete).toBe(true);
		outputGate.resolve({ output: "", truncated: true });
		await outputGate.promise;
	});

	it("does not accumulate stalled ACP output RPCs across polls and finalization", async () => {
		const pendingExit = Promise.withResolvers<{ exitCode: number | null; signal: string | null }>();
		const outputGate = Promise.withResolvers<{ output: string; truncated: boolean }>();
		let pollCount = 0;
		const realSleep = Bun.sleep.bind(Bun);
		spyOn(Bun, "sleep").mockImplementation(async milliseconds => {
			if (milliseconds === 250) {
				pollCount++;
				if (pollCount === 70) pendingExit.resolve({ exitCode: 0, signal: null });
				return;
			}
			if (milliseconds === 500) return realSleep(milliseconds);
			return new Promise<void>(() => {});
		});
		const currentOutput = mock(async () => outputGate.promise);
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-output-serialized-stall",
			providerLeaseId: "test-lease",
			waitForExit: async () => pendingExit.promise,
			currentOutput,
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};

		const result = await new BashTool(makeSession(bridge)).execute("call-output-serialized-stall", {
			command: "echo hi",
		});
		expect(currentOutput).toHaveBeenCalledTimes(1);
		expect(pollCount).toBeGreaterThanOrEqual(70);
		expect(result.details?.meta?.truncation?.sourceCaptureIncomplete).toBe(true);
		outputGate.resolve({ output: "", truncated: true });
		await outputGate.promise;
	});

	it("bounds a stalled terminal release RPC", async () => {
		const releaseGate = Promise.withResolvers<void>();
		const quarantineProviderLease = mock(async (_providerLeaseId: string, _reason: string) => {});
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-release-stall",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: async () => ({ output: "done", truncated: false }),
			kill: async () => {},
			release: async () => releaseGate.promise,
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease,
			createTerminal: async () => handle,
		};

		const raced = await Promise.race([
			new BashTool(makeSession(bridge)).execute("call-release-stall", { command: "echo hi" }).then(
				() => undefined,
				error => error,
			),
			Bun.sleep(1_500).then(() => undefined),
		]);
		expect(raced).toBeInstanceOf(Error);
		expect(raced instanceof Error ? raced.message : "").toContain("Terminal release ownership incomplete");
		expect(raced instanceof Error ? raced.message : "").toContain("done");
		expect(quarantineProviderLease).toHaveBeenCalledWith("test-lease", "terminal release did not settle");
		releaseGate.resolve();
		await releaseGate.promise;
	});

	it("bounds stalled artifact saves before releasing the terminal", async () => {
		const stubText = `HEAD\n${"middle\n".repeat(400)}TAIL\n`;
		const saveGate = Promise.withResolvers<string>();
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-save-stall",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: async () => ({ output: stubText, truncated: false }),
			kill: async () => {},
			release: async () => {},
		};
		const releaseSpy = spyOn(handle, "release");
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};
		const saveArtifact = async (): Promise<string> => saveGate.promise;

		const result = await new BashTool(makeSession(bridge, { saveArtifact })).execute("call-save-stall", {
			command: "wide-output",
		});
		const text = result.content.find(block => block.type === "text")?.text ?? "";
		expect(text).toContain("did not settle within 500ms");
		expect(result.details?.meta?.truncation?.artifactId).toBeUndefined();
		expect(releaseSpy).toHaveBeenCalledTimes(1);
		saveGate.resolve("106");
		await saveGate.promise;
	});

	it("bounds a stalled terminal creation RPC", async () => {
		const createGate = Promise.withResolvers<ClientBridgeTerminalHandle>();
		let creationSignal: AbortSignal | undefined;
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async params => {
				creationSignal = params.signal;
				return createGate.promise;
			},
		};

		await expect(
			new BashTool(makeSession(bridge)).execute("call-create-stall", { command: "echo hi" }),
		).rejects.toThrow("ACP terminal creation failed: did not settle within 500ms");
		expect(creationSignal?.aborted).toBe(true);
		createGate.resolve({
			terminalId: "term-create-stall-late",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: async () => ({ output: "", truncated: false }),
			kill: async () => {},
			release: async () => {},
		});
		await createGate.promise;
		await Promise.resolve();
	});

	it("caps unresolved terminal creation promises before invoking more RPCs", async () => {
		const gates: Array<{
			promise: Promise<ClientBridgeTerminalHandle>;
			resolve: (value: ClientBridgeTerminalHandle | PromiseLike<ClientBridgeTerminalHandle>) => void;
			reject: (reason?: unknown) => void;
		}> = [];
		const createTerminal = mock(async () => {
			const gate = Promise.withResolvers<ClientBridgeTerminalHandle>();
			gates.push(gate);
			return gate.promise;
		});
		let killCount = 0;
		let releaseCount = 0;
		const cleanupDone = Promise.withResolvers<void>();
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal,
		};
		spyOn(Bun, "sleep").mockImplementation(async () => {});
		await Promise.resolve();
		await Promise.resolve();

		const diagnostics: string[] = [];
		for (let index = 0; index < 65; index++) {
			try {
				await new BashTool(makeSession(bridge)).execute(`call-create-cap-${index}`, { command: "echo hi" });
			} catch (error) {
				diagnostics.push(error instanceof Error ? error.message : String(error));
			}
		}

		expect(createTerminal).toHaveBeenCalledTimes(64);
		expect(diagnostics.some(message => message.includes("pending operation limit reached"))).toBe(true);
		for (const [index, gate] of gates.entries()) {
			gate.resolve({
				terminalId: `term-create-cap-${index}`,
				providerLeaseId: "test-lease",
				waitForExit: async () => ({ exitCode: 0, signal: null }),
				currentOutput: async () => ({ output: "", truncated: false }),
				kill: async () => {
					killCount++;
				},
				release: async () => {
					releaseCount++;
					if (releaseCount === 64) cleanupDone.resolve();
				},
			});
		}
		await cleanupDone.promise;
		expect(killCount).toBe(64);
		expect(releaseCount).toBe(64);
	});

	it("caps unresolved terminal exit lifecycles", async () => {
		const exitGates: Array<{
			promise: Promise<{ exitCode: number | null; signal: string | null }>;
			resolve: (value: { exitCode: number | null; signal: string | null }) => void;
		}> = [];
		let waitForExitCount = 0;
		const createTerminal = mock(async () => {
			const exitGate = Promise.withResolvers<{ exitCode: number | null; signal: string | null }>();
			exitGates.push(exitGate);
			return {
				terminalId: `term-exit-cap-${exitGates.length}`,
				providerLeaseId: "test-lease",
				waitForExit: async () => {
					waitForExitCount++;
					return exitGate.promise;
				},
				currentOutput: async () => ({ output: "", truncated: false }),
				kill: async () => {},
				release: async () => {},
			};
		});
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal,
		};
		const realSleep = Bun.sleep.bind(Bun);
		spyOn(Bun, "sleep").mockImplementation(async milliseconds => {
			if (milliseconds === 500) await realSleep(milliseconds);
		});
		const diagnostics: string[] = [];

		for (let index = 0; index < 65; index++) {
			try {
				await new BashTool(makeSession(bridge)).execute(`call-exit-cap-${index}`, {
					command: "sleep 60",
					timeout: 1,
				});
			} catch (error) {
				diagnostics.push(error instanceof Error ? error.message : String(error));
			}
		}

		expect(createTerminal).toHaveBeenCalledTimes(64);
		expect(waitForExitCount).toBe(64);
		expect(diagnostics.some(message => message.includes("pending operation limit reached"))).toBe(true);
		for (const gate of exitGates) gate.resolve({ exitCode: null, signal: "TERM" });
		await Promise.all(exitGates.map(gate => gate.promise));
		await Promise.resolve();
		await Promise.resolve();
	});

	it("invokes every release RPC when stalled kills saturate cleanup capacity", async () => {
		const killGate = Promise.withResolvers<void>();
		const exitGates: Array<{ resolve: (value: { exitCode: number | null; signal: string | null }) => void }> = [];
		let releaseCount = 0;
		let created = 0;
		const createTerminal = mock(async () => {
			const exitGate = Promise.withResolvers<{ exitCode: number | null; signal: string | null }>();
			exitGates.push(exitGate);
			created++;
			return {
				terminalId: `term-kill-cap-${created}`,
				providerLeaseId: "test-lease",
				waitForExit: async () => exitGate.promise,
				currentOutput: async () => ({ output: "", truncated: false }),
				kill: async () => killGate.promise,
				release: async () => {
					releaseCount++;
				},
			};
		});
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal,
		};
		const realSleep = Bun.sleep.bind(Bun);
		spyOn(Bun, "sleep").mockImplementation(async milliseconds => {
			if (milliseconds === 500) await realSleep(milliseconds);
		});

		await Promise.allSettled(
			Array.from({ length: 64 }, (_, index) =>
				new BashTool(makeSession(bridge)).execute(`call-kill-cap-${index}`, { command: "sleep 60", timeout: 1 }),
			),
		);
		expect(releaseCount).toBe(64);
		for (const gate of exitGates) gate.resolve({ exitCode: null, signal: "TERM" });
		await Promise.resolve();
		await Promise.resolve();
		await expect(
			new BashTool(makeSession(bridge)).execute("call-kill-cap-overflow", { command: "true" }),
		).rejects.toThrow("provider cleanup ownership incomplete");
		expect(createTerminal).toHaveBeenCalledTimes(64);
		killGate.resolve();
		await Promise.resolve();
		await Promise.resolve();
	});

	it("rejects before terminal creation when release ownership is saturated", async () => {
		const releaseGate = Promise.withResolvers<void>();
		let created = 0;
		const createTerminal = mock(async () => {
			created++;
			return {
				terminalId: `term-release-cap-${created}`,
				providerLeaseId: "test-lease",
				waitForExit: async () => ({ exitCode: 0, signal: null }),
				currentOutput: async () => ({ output: "", truncated: false }),
				kill: async () => {},
				release: async () => releaseGate.promise,
			};
		});
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal,
		};
		await Promise.allSettled(
			Array.from({ length: 64 }, (_, index) =>
				new BashTool(makeSession(bridge)).execute(`call-release-cap-${index}`, { command: "true" }),
			),
		);

		await expect(
			new BashTool(makeSession(bridge)).execute("call-release-cap-overflow", { command: "true" }),
		).rejects.toThrow("pending release limit reached");
		expect(createTerminal).toHaveBeenCalledTimes(64);
		releaseGate.resolve();
		await releaseGate.promise;
		await Promise.resolve();
		await Promise.resolve();
	});

	it("does not create an ACP terminal for a pre-aborted request", async () => {
		const createTerminal = mock(async () => {
			throw new Error("must not run");
		});
		const controller = new AbortController();
		controller.abort();
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal,
		};
		await expect(
			new BashTool(makeSession(bridge)).execute("call-pre-aborted", { command: "side-effect" }, controller.signal),
		).rejects.toThrow("aborted before ACP terminal creation");
		expect(createTerminal).not.toHaveBeenCalled();
	});

	it("quarantines a terminal that appears after creation is aborted", async () => {
		const createGate = Promise.withResolvers<ClientBridgeTerminalHandle>();
		const createStarted = Promise.withResolvers<void>();
		const killCalled = Promise.withResolvers<void>();
		const releaseCalled = Promise.withResolvers<void>();
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => {
				createStarted.resolve();
				return createGate.promise;
			},
		};
		const controller = new AbortController();
		const execution = new BashTool(makeSession(bridge)).execute(
			"call-create-aborted",
			{ command: "side-effect" },
			controller.signal,
		);
		await createStarted.promise;
		controller.abort();
		await expect(execution).rejects.toThrow("aborted during ACP terminal creation");
		createGate.resolve({
			terminalId: "term-create-aborted",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: async () => ({ output: "", truncated: false }),
			kill: async () => killCalled.resolve(),
			release: async () => releaseCalled.resolve(),
		});
		await killCalled.promise;
		await releaseCalled.promise;
	});

	it("fences the exact provider lease after late terminal cleanup fails", async () => {
		const createGate = Promise.withResolvers<ClientBridgeTerminalHandle>();
		const createStarted = Promise.withResolvers<void>();
		const quarantineCalled = Promise.withResolvers<void>();
		const quarantineProviderLease = mock(async (providerLeaseId: string, reason: string) => {
			expect(providerLeaseId).toBe("late-cleanup-lease");
			expect(reason).toBe("late ACP terminal creation cleanup did not settle");
			quarantineCalled.resolve();
		});
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease,
			createTerminal: async () => {
				createStarted.resolve();
				return createGate.promise;
			},
		};
		const controller = new AbortController();
		const execution = new BashTool(makeSession(bridge)).execute(
			"call-create-cleanup-failure",
			{ command: "side-effect" },
			controller.signal,
		);
		await createStarted.promise;
		controller.abort();
		await expect(execution).rejects.toThrow("aborted during ACP terminal creation");
		createGate.resolve({
			terminalId: "term-create-cleanup-failure",
			providerLeaseId: "late-cleanup-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: async () => ({ output: "", truncated: false }),
			kill: async () => {
				throw new Error("late kill unavailable");
			},
			release: async () => {
				throw new Error("late release unavailable");
			},
		});
		await quarantineCalled.promise;
		expect(quarantineProviderLease).toHaveBeenCalledTimes(1);
	});

	it("malformed release thenables do not leak pending capacity", async () => {
		const thenKey = ["th", "en"].join("");
		let created = 0;
		const createTerminal = mock(async () => {
			created++;
			return {
				terminalId: `term-malformed-release-${created}`,
				providerLeaseId: "test-lease",
				waitForExit: async () => ({ exitCode: 0, signal: null }),
				currentOutput: async () => ({ output: "", truncated: false }),
				kill: async () => {},
				release: (() =>
					Object.defineProperty({}, thenKey, {
						get() {
							throw new Error("bad release thenable");
						},
					})) as never,
			};
		});
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal,
		};
		for (let index = 0; index < 65; index++) {
			await expect(
				new BashTool(makeSession(bridge)).execute(`call-malformed-release-${index}`, { command: "true" }),
			).rejects.toThrow("bad release thenable");
		}
		expect(createTerminal).toHaveBeenCalledTimes(65);
	});

	it("kills and releases a terminal that appears after creation times out", async () => {
		const createGate = Promise.withResolvers<ClientBridgeTerminalHandle>();
		const killCalled = Promise.withResolvers<void>();
		const releaseCalled = Promise.withResolvers<void>();
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-create-late",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: async () => ({ output: "", truncated: false }),
			kill: async () => killCalled.resolve(),
			release: async () => releaseCalled.resolve(),
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => createGate.promise,
		};
		spyOn(Bun, "sleep").mockImplementation(async () => {});

		await expect(
			new BashTool(makeSession(bridge)).execute("call-create-late", { command: "echo hi" }),
		).rejects.toThrow("ACP terminal creation failed: did not settle within 500ms");
		createGate.resolve(handle);
		await killCalled.promise;
		await releaseCalled.promise;
	});

	it("releases the client terminal when waiting for exit fails", async () => {
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-exit-failure",
			providerLeaseId: "test-lease",
			waitForExit: async () => {
				throw new Error("client wait unavailable");
			},
			currentOutput: async () => ({ output: "", truncated: false }),
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};
		const releaseSpy = spyOn(handle, "release");

		const tool = new BashTool(makeSession(bridge));

		await expect(tool.execute("call-exit-failure", { command: "echo hi" })).rejects.toThrow(
			/client wait unavailable/,
		);
		expect(releaseSpy).toHaveBeenCalledTimes(1);
	});

	it("does not retain a full artifact claim when exit waiting fails", async () => {
		const stubText = `HEAD\n${"middle\n".repeat(400)}TAIL\n`;
		const saveArtifact = mock(async () => "105");
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-exit-failure-output",
			providerLeaseId: "test-lease",
			waitForExit: async () => {
				throw new Error("client wait unavailable");
			},
			currentOutput: async () => ({ output: stubText, truncated: false }),
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};

		let caught: unknown;
		try {
			await new BashTool(makeSession(bridge, { saveArtifact })).execute("call-exit-failure-output", {
				command: "wide-output",
			});
		} catch (error) {
			caught = error;
		}
		const message = caught instanceof Error ? caught.message : "";
		expect(message).not.toContain("artifact://105");
	});

	it("kills and releases the client terminal when the command times out", async () => {
		const pendingExit = Promise.withResolvers<{ exitCode: number | null; signal: string | null }>();
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-timeout",
			providerLeaseId: "test-lease",
			waitForExit: async () => pendingExit.promise,
			currentOutput: async () => ({ output: "", truncated: false }),
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};
		const killSpy = spyOn(handle, "kill");
		const releaseSpy = spyOn(handle, "release");

		const tool = new BashTool(makeSession(bridge));

		await expect(tool.execute("call-timeout", { command: "sleep 60", timeout: 1 })).rejects.toThrow(
			/Command timed out after 1 seconds/,
		);

		expect(killSpy).toHaveBeenCalledTimes(1);
		expect(releaseSpy).toHaveBeenCalledTimes(1);
		pendingExit.resolve({ exitCode: null, signal: "TERM" });
	});

	it("discloses client-reported partial output on ACP timeout", async () => {
		const pendingExit = Promise.withResolvers<{ exitCode: number | null; signal: string | null }>();
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-timeout-truncated",
			providerLeaseId: "test-lease",
			waitForExit: async () => pendingExit.promise,
			currentOutput: async () => ({ output: "REMOTE-PARTIAL\n", truncated: true }),
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};

		const tool = new BashTool(makeSession(bridge));
		await expect(tool.execute("call-timeout-truncated", { command: "sleep 60", timeout: 1 })).rejects.toThrow(
			/output truncated/,
		);
		pendingExit.resolve({ exitCode: null, signal: "TERM" });
	});

	it("does not retain a full artifact claim when terminal kill does not settle", async () => {
		const pendingExit = Promise.withResolvers<{ exitCode: number | null; signal: string | null }>();
		const stubText = `HEAD\n${"middle\n".repeat(400)}TAIL\n`;
		const saveArtifact = mock(async () => "104");
		const killGate = Promise.withResolvers<void>();
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-kill-stall",
			providerLeaseId: "test-lease",
			waitForExit: async () => pendingExit.promise,
			currentOutput: async () => ({ output: stubText, truncated: false }),
			kill: async () => killGate.promise,
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};

		let caught: unknown;
		try {
			await new BashTool(makeSession(bridge, { saveArtifact })).execute("call-kill-stall", {
				command: "sleep 60",
				timeout: 1,
			});
		} catch (error) {
			caught = error;
		}
		const message = caught instanceof Error ? caught.message : "";
		expect(message).toContain("Terminal kill failed: did not settle within 500ms");
		expect(message).not.toContain("artifact://104");
		pendingExit.resolve({ exitCode: null, signal: "TERM" });
		killGate.resolve();
		await killGate.promise;
	});

	it("artifacts oversized client output before surfacing a timeout", async () => {
		const pendingExit = Promise.withResolvers<{ exitCode: number | null; signal: string | null }>();
		const stubText = `HEAD\n${"middle\n".repeat(400)}TAIL\n`;
		const saveArtifact = mock(async () => "102");
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-timeout-output",
			providerLeaseId: "test-lease",
			waitForExit: async () => pendingExit.promise,
			currentOutput: async () => ({ output: stubText, truncated: false }),
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};

		const tool = new BashTool(makeSession(bridge, { saveArtifact }));
		let caught: unknown;
		try {
			await tool.execute("call-timeout-output", { command: "sleep 60", timeout: 1 });
		} catch (error) {
			caught = error;
		}
		expect(caught).toBeInstanceOf(Error);
		const message = caught instanceof Error ? caught.message : "";
		expect(message).toContain("Command timed out after 1 seconds");
		expect(message).not.toContain("artifact://102");

		expect(saveArtifact).toHaveBeenCalledWith(stubText, "bash-original");
		pendingExit.resolve({ exitCode: null, signal: "TERM" });
	});

	it("recovers and artifacts oversized ACP output when aborted", async () => {
		const pendingExit = Promise.withResolvers<{ exitCode: number | null; signal: string | null }>();
		const killGate = Promise.withResolvers<void>();
		let killSettled = false;
		const stubText = `HEAD\n${"middle\n".repeat(400)}TAIL\n`;
		const saveArtifact = mock(async () => "103");
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-abort-output",
			providerLeaseId: "test-lease",
			waitForExit: async () => pendingExit.promise,
			currentOutput: async () => {
				expect(killSettled).toBe(true);
				return { output: stubText, truncated: false };
			},
			kill: async () => {
				await killGate.promise;
				killSettled = true;
			},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};
		const killSpy = spyOn(handle, "kill");
		const releaseSpy = spyOn(handle, "release");
		const controller = new AbortController();
		const tool = new BashTool(makeSession(bridge, { saveArtifact }));

		let caught: unknown;
		try {
			await tool.execute("call-abort-output", { command: "sleep 60" }, controller.signal, update => {
				if (update.details?.terminalId === handle.terminalId) {
					controller.abort();
					setTimeout(() => killGate.resolve(), 25);
				}
			});
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(Error);
		const message = caught instanceof Error ? caught.message : "";
		expect(message).toContain("Command aborted");
		expect(message).toContain("TAIL");
		expect(message).not.toContain("artifact://103");
		expect(saveArtifact).toHaveBeenCalledWith(stubText, "bash-original");
		expect(killSpy).toHaveBeenCalledTimes(1);
		expect(releaseSpy).toHaveBeenCalledTimes(1);
		pendingExit.resolve({ exitCode: null, signal: "TERM" });
	});

	it("rewrites only the generated trailing footer when user output spoofs it", async () => {
		const controller = new AbortController();
		const spoof = "[raw output: artifact://105]";
		const stubText = `HEAD\n${"middle\n".repeat(400)}TAIL\n${spoof}\n`;
		const saveArtifact = mock(async () => {
			controller.abort();
			return "105";
		});
		const handle: ClientBridgeTerminalHandle = {
			terminalId: "term-footer-spoof",
			providerLeaseId: "test-lease",
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			currentOutput: async () => ({ output: stubText, truncated: false }),
			kill: async () => {},
			release: async () => {},
		};
		const bridge: ClientBridge = {
			capabilities: { terminal: true },
			quarantineProviderLease: async () => {},
			createTerminal: async () => handle,
		};

		let caught: unknown;
		try {
			await new BashTool(makeSession(bridge, { saveArtifact })).execute(
				"call-footer-spoof",
				{ command: "wide-output" },
				controller.signal,
			);
		} catch (error) {
			caught = error;
		}
		const message = caught instanceof Error ? caught.message : "";
		expect(message.match(/\[raw output: artifact:\/\/105\]/gu)).toHaveLength(1);
		expect(message).not.toContain("Read artifact://105 for retained output");
	});
});
