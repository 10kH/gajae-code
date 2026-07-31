import { afterEach, describe, expect, it } from "bun:test";
import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Agent } from "@gajae-code/agent-core";
import type { AssistantMessage, Context, ToolResultMessage } from "@gajae-code/ai";
import { getBundledModel } from "@gajae-code/ai/models";
import { AssistantMessageEventStream } from "@gajae-code/ai/utils/event-stream";
import { ModelRegistry } from "@gajae-code/coding-agent/config/model-registry";
import { Settings } from "@gajae-code/coding-agent/config/settings";
import { SETTINGS_SCHEMA } from "@gajae-code/coding-agent/config/settings-schema";
import { AgentSession } from "@gajae-code/coding-agent/session/agent-session";
import { AuthStorage } from "@gajae-code/coding-agent/session/auth-storage";
import { SessionManager } from "@gajae-code/coding-agent/session/session-manager";
import { TempDir, withTimeout } from "@gajae-code/utils";

const SPILL_URI = /artifact:\/\/(\d+)/;

describe("AgentSession pre-admission artifact spill", () => {
	let tempDir: TempDir | undefined;
	let session: AgentSession | undefined;
	let authStorage: AuthStorage | undefined;

	afterEach(async () => {
		await session?.dispose();
		authStorage?.close();
		tempDir?.removeSync();
	});

	it("spills oversized UTF-8 tool results before provider admission and rehydrates byte-exactly", async () => {
		tempDir = TempDir.createSync("@gjc-pre-admission-spill-");
		authStorage = await AuthStorage.create(path.join(tempDir.path(), "auth.db"));
		authStorage.setRuntimeApiKey("anthropic", "test-key");
		const model = getBundledModel("anthropic", "claude-sonnet-4-5");
		if (!model) throw new Error("Expected bundled Anthropic model");

		let providerContext: Context | undefined;
		let resolveWrite!: () => void;
		const writeGate = new Promise<void>(resolve => {
			resolveWrite = resolve;
		});
		let sessionRef: AgentSession | undefined;
		const agent = new Agent({
			initialState: {
				model: { ...model, contextWindow: 200_000, maxTokens: 128_000 },
				systemPrompt: ["Test"],
				tools: [],
				messages: [],
			},
			transformContext: async messages => {
				await sessionRef?.awaitPendingContextTransformations();
				return messages;
			},
			streamFn: (_model, context) => {
				providerContext = context;
				const stream = new AssistantMessageEventStream();
				queueMicrotask(() => {
					const message: AssistantMessage = {
						role: "assistant",
						content: [{ type: "text", text: "done" }],
						api: "anthropic-messages",
						provider: "anthropic",
						model: "claude-sonnet-4-5",
						stopReason: "stop",
						usage: {
							input: 0,
							output: 0,
							cacheRead: 0,
							cacheWrite: 0,
							totalTokens: 0,
							cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
						},
						timestamp: Date.now(),
					};
					stream.push({ type: "start", partial: message });
					stream.push({ type: "done", reason: "stop", message });
				});
				return stream;
			},
		});
		const sessionManager = SessionManager.create(tempDir.path(), tempDir.path());
		sessionManager.appendMessage({ role: "user", content: "seed", timestamp: Date.now() });
		const saveArtifactReceipt = sessionManager.saveArtifactReceipt.bind(sessionManager);
		(
			sessionManager as unknown as { saveArtifactReceipt: typeof sessionManager.saveArtifactReceipt }
		).saveArtifactReceipt = async (content, toolType) => {
			await writeGate;
			return await saveArtifactReceipt(content, toolType);
		};
		session = new AgentSession({
			agent,
			sessionManager,
			settings: Settings.isolated({ "tools.preAdmissionArtifactSpill": true }),
			modelRegistry: new ModelRegistry(authStorage),
		});
		sessionRef = session;

		const fullText = `${"h".repeat(4095)}😀${"middle\n".repeat(10_000)}😀${"t".repeat(4095)}`;
		const toolResult: ToolResultMessage = {
			role: "toolResult",
			toolCallId: "large-read",
			toolName: "read",
			content: [{ type: "text", text: fullText }],
			isError: false,
			timestamp: Date.now(),
		};
		agent.emitExternalEvent({ type: "message_end", message: toolResult });
		const prompt = session.prompt("continue without waiting for spill completion");
		await Bun.sleep(25);
		expect(providerContext).toBeUndefined();
		resolveWrite();
		await withTimeout(prompt, 1_000, "Provider did not resume after artifact spill");

		const preview = toolResult.content.find(block => block.type === "text");
		expect(preview?.type).toBe("text");
		if (preview?.type !== "text") throw new Error("Expected text preview");
		expect(preview.text).toStartWith("h".repeat(4095));
		expect(preview.text).toEndWith("t".repeat(4095));
		expect(Buffer.from(preview.text, "utf8").toString("utf8")).not.toContain("�");
		expect(preview.text).toContain(crypto.createHash("sha256").update(fullText).digest("hex"));
		const artifactId = preview.text.match(SPILL_URI)?.[1];
		expect(artifactId).toBeDefined();
		if (!artifactId) throw new Error("Expected artifact URI");
		expect(toolResult.details?.meta?.truncation?.artifactId).toBe(artifactId);
		expect(
			providerContext?.messages.some(message => JSON.stringify(message).includes(`artifact://${artifactId}`)),
		).toBe(true);

		const artifactPath = await sessionManager.getArtifactPath(artifactId);
		expect(artifactPath).not.toBeNull();
		if (!artifactPath) throw new Error("Expected artifact path");
		expect(await fs.readFile(artifactPath, "utf8")).toBe(fullText);
		const resumed = await SessionManager.open(sessionManager.getSessionFile()!);
		expect(await resumed.getArtifactPath(artifactId)).toBe(artifactPath);

		await session.dispose();
		session = undefined;
		await sessionManager.dropSession(sessionManager.getSessionFile()!);
		expect(
			await fs.stat(path.dirname(artifactPath)).then(
				() => true,
				() => false,
			),
		).toBe(false);
	});

	it("bounds stalled saves per SessionManager without starving an unrelated session", async () => {
		tempDir = TempDir.createSync("@gjc-pre-admission-save-admission-");
		const model = getBundledModel("anthropic", "claude-sonnet-4-5");
		if (!model) throw new Error("Expected bundled Anthropic model");

		const createAgentSession = (sessionManager: SessionManager) => {
			const agent = new Agent({
				initialState: {
					model: { ...model, contextWindow: 200_000, maxTokens: 128_000 },
					systemPrompt: ["Test"],
					tools: [],
					messages: [],
				},
			});
			const agentSession = new AgentSession({
				agent,
				sessionManager,
				settings: Settings.isolated({ "tools.preAdmissionArtifactSpill": true }),
				modelRegistry: {} as never,
			});
			return { agent, session: agentSession };
		};
		const ownerManager = SessionManager.create(tempDir.path(), path.join(tempDir.path(), "owner"));
		const foreignManager = SessionManager.create(tempDir.path(), path.join(tempDir.path(), "foreign"));
		ownerManager.appendMessage({ role: "user", content: "seed", timestamp: Date.now() });
		foreignManager.appendMessage({ role: "user", content: "seed", timestamp: Date.now() });

		let resolveOwner!: () => void;
		let resolveForeign!: () => void;
		const ownerGate = new Promise<void>(resolve => {
			resolveOwner = resolve;
		});
		const foreignGate = new Promise<void>(resolve => {
			resolveForeign = resolve;
		});
		let ownerCalls = 0;
		let foreignCalls = 0;
		(
			ownerManager as unknown as { saveArtifactReceipt: typeof ownerManager.saveArtifactReceipt }
		).saveArtifactReceipt = async (_content, _toolType) => {
			ownerCalls++;
			await ownerGate;
			return undefined;
		};
		(
			foreignManager as unknown as { saveArtifactReceipt: typeof foreignManager.saveArtifactReceipt }
		).saveArtifactReceipt = async (_content, _toolType) => {
			foreignCalls++;
			await foreignGate;
			return undefined;
		};

		const owner = createAgentSession(ownerManager);
		const foreign = createAgentSession(foreignManager);
		session = owner.session;
		const emitLargeResult = (agent: Agent, toolCallId: string): ToolResultMessage => {
			const message: ToolResultMessage = {
				role: "toolResult",
				toolCallId,
				toolName: "read",
				content: [{ type: "text", text: `${toolCallId}:${"x".repeat(100_000)}` }],
				isError: false,
				timestamp: Date.now(),
			};
			agent.emitExternalEvent({ type: "message_end", message });
			return message;
		};

		emitLargeResult(owner.agent, "owner-1");
		await owner.session.awaitPendingContextTransformations();
		emitLargeResult(owner.agent, "owner-2");
		await owner.session.awaitPendingContextTransformations();
		const exhausted = emitLargeResult(owner.agent, "owner-3");
		await owner.session.awaitPendingContextTransformations();
		expect(ownerCalls).toBe(2);
		const exhaustedPreview = exhausted.content.find(block => block.type === "text");
		if (exhaustedPreview?.type !== "text") throw new Error("Expected capacity failure preview");
		expect(exhaustedPreview.text).toContain("capacity exhausted");
		expect(exhausted.details?.meta?.truncation?.sourceCaptureIncomplete).toBe(true);

		resolveOwner();
		await Bun.sleep(0);
		emitLargeResult(owner.agent, "owner-4");
		await owner.session.awaitPendingContextTransformations();
		expect(ownerCalls).toBe(3);

		const foreignResult = emitLargeResult(foreign.agent, "foreign-1");
		await foreign.session.awaitPendingContextTransformations();
		expect(foreignCalls).toBe(1);
		const foreignPreview = foreignResult.content.find(block => block.type === "text");
		if (foreignPreview?.type !== "text") throw new Error("Expected foreign failure preview");
		expect(foreignPreview.text).toContain("did not settle within");

		resolveForeign();
		await Bun.sleep(0);
		await foreign.session.dispose();
	});

	it("labels hard-capped pre-admission artifacts as retained output", async () => {
		tempDir = TempDir.createSync("@gjc-pre-admission-capped-");
		const model = getBundledModel("anthropic", "claude-sonnet-4-5");
		if (!model) throw new Error("Expected bundled Anthropic model");
		const agent = new Agent({
			initialState: {
				model: { ...model, contextWindow: 200_000, maxTokens: 128_000 },
				systemPrompt: ["Test"],
				tools: [],
				messages: [],
			},
		});
		const sessionManager = SessionManager.create(tempDir.path(), tempDir.path());
		sessionManager.appendMessage({ role: "user", content: "seed", timestamp: Date.now() });
		session = new AgentSession({
			agent,
			sessionManager,
			settings: Settings.isolated({ "tools.preAdmissionArtifactSpill": true }),
			modelRegistry: {} as never,
		});
		const fullText = `HEAD${"x".repeat(11 * 1024 * 1024)}TAIL`;
		const toolResult: ToolResultMessage = {
			role: "toolResult",
			toolCallId: "capped-artifact",
			toolName: "read",
			content: [{ type: "text", text: fullText }],
			isError: false,
			timestamp: Date.now(),
		};
		agent.emitExternalEvent({ type: "message_end", message: toolResult });
		await session.awaitPendingContextTransformations();
		const preview = toolResult.content.find(block => block.type === "text");
		expect(preview?.type).toBe("text");
		if (preview?.type !== "text") throw new Error("Expected text preview");
		expect(preview.text).toContain("retained output: artifact://");
		expect(preview.text).not.toContain("full output: artifact://");
		expect(toolResult.details?.meta?.truncation?.artifactTruncatedBytes).toBeGreaterThan(0);
		expect(toolResult.details?.meta?.truncation?.sourceCaptureIncomplete).toBe(true);
		const artifactId = preview.text.match(SPILL_URI)?.[1];
		expect(artifactId).toBeDefined();
		if (!artifactId) throw new Error("Expected artifact URI");
		const artifactPath = await sessionManager.getArtifactPath(artifactId);
		expect(artifactPath).not.toBeNull();
		if (!artifactPath) throw new Error("Expected artifact path");
		const stored = await fs.readFile(artifactPath, "utf8");
		expect(stored).toContain("artifact truncated after");
		expect(stored).not.toContain("TAIL");
	});

	it("honors the absolute inline cap and preserves prior loss evidence", async () => {
		tempDir = TempDir.createSync("@gjc-pre-admission-inline-cap-");
		const model = getBundledModel("anthropic", "claude-sonnet-4-5");
		if (!model) throw new Error("Expected bundled Anthropic model");
		const agent = new Agent({
			initialState: {
				model: { ...model, contextWindow: 200_000, maxTokens: 128_000 },
				systemPrompt: ["Test"],
				tools: [],
				messages: [],
			},
		});
		const sessionManager = SessionManager.create(tempDir.path(), tempDir.path());
		sessionManager.appendMessage({ role: "user", content: "seed", timestamp: Date.now() });
		session = new AgentSession({
			agent,
			sessionManager,
			settings: Settings.isolated({
				"tools.preAdmissionArtifactSpill": true,
				"tools.maxInlineResultBytes": 1,
			}),
			modelRegistry: {} as never,
		});
		const toolResult: ToolResultMessage = {
			role: "toolResult",
			toolCallId: "prior-loss",
			toolName: "bash",
			content: [{ type: "text", text: `HEAD${"middle".repeat(20_000)}TAIL` }],
			isError: false,
			timestamp: Date.now(),
			details: {
				meta: {
					truncation: {
						direction: "tail",
						truncatedBy: "bytes",
						totalLines: 1,
						totalBytes: 200_000,
						outputLines: 1,
						outputBytes: 120_008,
						sourceTruncatedBytes: 17,
						artifactTruncatedBytes: 9,
						sourceCaptureIncomplete: true,
					},
				},
			},
		};
		agent.emitExternalEvent({ type: "message_end", message: toolResult });
		await session.awaitPendingContextTransformations();
		const preview = toolResult.content.find(block => block.type === "text");
		expect(preview?.type).toBe("text");
		if (preview?.type !== "text") throw new Error("Expected text preview");
		expect(Buffer.byteLength(preview.text, "utf8")).toBeLessThanOrEqual(1024);
		expect(preview.text).toContain("retained output: artifact://");
		expect(toolResult.details?.meta?.truncation?.sourceTruncatedBytes).toBe(17);
		expect(toolResult.details?.meta?.truncation?.artifactTruncatedBytes).toBeGreaterThanOrEqual(9);
		expect(toolResult.details?.meta?.truncation?.sourceCaptureIncomplete).toBe(true);
	});

	it("keeps ordinary inherited truncation non-full during pre-admission re-spill", async () => {
		tempDir = TempDir.createSync("@gjc-pre-admission-visible-truncation-");
		const model = getBundledModel("anthropic", "claude-sonnet-4-5");
		if (!model) throw new Error("Expected bundled Anthropic model");
		const agent = new Agent({
			initialState: {
				model: { ...model, contextWindow: 200_000, maxTokens: 128_000 },
				systemPrompt: ["Test"],
				tools: [],
				messages: [],
			},
		});
		const sessionManager = SessionManager.create(tempDir.path(), tempDir.path());
		sessionManager.appendMessage({ role: "user", content: "seed", timestamp: Date.now() });
		session = new AgentSession({
			agent,
			sessionManager,
			settings: Settings.isolated({
				"tools.preAdmissionArtifactSpill": true,
				"tools.maxInlineResultBytes": 1,
			}),
			modelRegistry: {} as never,
		});
		const visible = `HEAD${"middle".repeat(20_000)}TAIL`;
		const toolResult: ToolResultMessage = {
			role: "toolResult",
			toolCallId: "visible-truncation",
			toolName: "bash",
			content: [{ type: "text", text: visible }],
			isError: false,
			timestamp: Date.now(),
			details: {
				meta: {
					truncation: {
						direction: "tail",
						truncatedBy: "bytes",
						totalLines: 10_000,
						totalBytes: 200_000,
						outputLines: 100,
						outputBytes: Buffer.byteLength(visible),
						shownRange: { start: 9_901, end: 10_000 },
					},
				},
			},
		};
		agent.emitExternalEvent({ type: "message_end", message: toolResult });
		await session.awaitPendingContextTransformations();
		const preview = toolResult.content.find(block => block.type === "text");
		if (preview?.type !== "text") throw new Error("Expected text preview");
		expect(preview.text).toContain("retained output: artifact://");
		expect(preview.text).not.toContain("full output: artifact://");
		expect(toolResult.details?.meta?.truncation?.sourceCaptureIncomplete).toBe(true);
		expect(toolResult.details?.meta?.truncation?.shownRange).toBeUndefined();
	});

	it("preserves canonical tool-result bytes when pre-admission spilling is disabled by default", async () => {
		const model = getBundledModel("anthropic", "claude-sonnet-4-5");
		if (!model) throw new Error("Expected bundled Anthropic model");
		const agent = new Agent({
			initialState: {
				model: { ...model, contextWindow: 200_000, maxTokens: 128_000 },
				systemPrompt: ["Test"],
				tools: [],
				messages: [],
			},
		});
		const sessionManager = SessionManager.inMemory();
		session = new AgentSession({
			agent,
			sessionManager,
			settings: Settings.isolated(),
			modelRegistry: {} as never,
		});
		const toolResult: ToolResultMessage = {
			role: "toolResult",
			toolCallId: "default-off",
			toolName: "read",
			content: [{ type: "text", text: "😀".repeat(20_000) }],
			isError: false,
			timestamp: Date.now(),
		};
		const expectedBytes = Buffer.from(JSON.stringify(toolResult));

		agent.emitExternalEvent({ type: "message_end", message: toolResult });
		await session.awaitPendingContextTransformations();
		await Bun.sleep(0);

		const persisted = sessionManager.getBranch().at(-1);
		expect(persisted?.type).toBe("message");
		if (persisted?.type !== "message") throw new Error("Expected persisted tool result");
		expect(Buffer.from(JSON.stringify(persisted.message))).toEqual(expectedBytes);
		expect(JSON.stringify(persisted.message)).not.toContain("artifact://");
		expect(persisted.message).not.toHaveProperty("details");
	});

	it("defaults pre-admission spill off and preserves an explicit setting through the settings schema", () => {
		expect(SETTINGS_SCHEMA["tools.preAdmissionArtifactSpill"].default).toBe(false);
		expect(Settings.isolated().get("tools.preAdmissionArtifactSpill")).toBe(false);
		expect(
			Settings.isolated({ "tools.preAdmissionArtifactSpill": true }).get("tools.preAdmissionArtifactSpill"),
		).toBe(true);
	});

	it("keeps in-memory pre-admission tool results inline without dangling artifact URLs", async () => {
		const model = getBundledModel("anthropic", "claude-sonnet-4-5");
		if (!model) throw new Error("Expected bundled Anthropic model");
		const agent = new Agent({
			initialState: {
				model: { ...model, contextWindow: 200_000, maxTokens: 128_000 },
				systemPrompt: ["Test"],
				tools: [],
				messages: [],
			},
		});
		const sessionManager = SessionManager.inMemory();
		session = new AgentSession({
			agent,
			sessionManager,
			settings: Settings.isolated({ "tools.preAdmissionArtifactSpill": true }),
			modelRegistry: {} as never,
		});
		const toolResult: ToolResultMessage = {
			role: "toolResult",
			toolCallId: "in-memory-enabled",
			toolName: "read",
			content: [{ type: "text", text: "😀".repeat(20_000) }],
			isError: false,
			timestamp: Date.now(),
		};

		agent.emitExternalEvent({ type: "message_end", message: toolResult });
		await session.awaitPendingContextTransformations();
		await Bun.sleep(0);

		const persisted = sessionManager.getBranch().at(-1);
		expect(persisted?.type).toBe("message");
		if (persisted?.type !== "message") throw new Error("Expected persisted tool result");
		expect(persisted.message).toEqual(toolResult);
		expect(JSON.stringify(persisted.message)).not.toContain("artifact://");
	});
	it("keeps the canonical inline tool result when artifact writing fails", async () => {
		tempDir = TempDir.createSync("@gjc-pre-admission-spill-failure-");
		const model = getBundledModel("anthropic", "claude-sonnet-4-5");
		if (!model) throw new Error("Expected bundled Anthropic model");
		const agent = new Agent({
			initialState: {
				model: { ...model, contextWindow: 200_000, maxTokens: 128_000 },
				systemPrompt: ["Test"],
				tools: [],
				messages: [],
			},
		});
		const sessionManager = SessionManager.inMemory(tempDir.path());
		(sessionManager as unknown as { saveArtifact: typeof sessionManager.saveArtifact }).saveArtifact = async () => {
			throw new Error("simulated artifact write failure");
		};
		session = new AgentSession({
			agent,
			sessionManager,
			settings: Settings.isolated({ "tools.preAdmissionArtifactSpill": true }),
			modelRegistry: {} as never,
		});
		const fullText = "💥".repeat(30_000);
		const toolResult: ToolResultMessage = {
			role: "toolResult",
			toolCallId: "write-failure",
			toolName: "read",
			content: [{ type: "text", text: fullText }],
			isError: false,
			timestamp: Date.now(),
		};

		agent.emitExternalEvent({ type: "message_end", message: toolResult });
		await session.awaitPendingContextTransformations();
		await Bun.sleep(0);

		const persisted = sessionManager.getBranch().at(-1);
		expect(persisted?.type).toBe("message");
		if (persisted?.type !== "message") throw new Error("Expected persisted tool result");
		expect(persisted.message).toEqual(toolResult);
		expect(JSON.stringify(persisted.message)).not.toContain("artifact://");
	});
});
