import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { Agent } from "@gajae-code/agent-core";
import * as compactionModule from "@gajae-code/agent-core/compaction";
import type { AssistantMessage } from "@gajae-code/ai";
import { getBundledModel } from "@gajae-code/ai/models";
import { ModelRegistry } from "@gajae-code/coding-agent/config/model-registry";
import { Settings } from "@gajae-code/coding-agent/config/settings";
import { loadExtensions } from "@gajae-code/coding-agent/extensibility/extensions/loader";
import { ExtensionRunner } from "@gajae-code/coding-agent/extensibility/extensions/runner";
import { AgentSession } from "@gajae-code/coding-agent/session/agent-session";
import { AuthStorage } from "@gajae-code/coding-agent/session/auth-storage";
import { SessionManager } from "@gajae-code/coding-agent/session/session-manager";
import { getProjectAgentDir, TempDir } from "@gajae-code/utils";

function assistantMessage(): AssistantMessage {
	return {
		role: "assistant",
		content: [],
		api: "anthropic-messages",
		provider: "anthropic",
		model: "claude-sonnet-4-5",
		stopReason: "stop",
		usage: {
			input: 190000,
			output: 1000,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 191000,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		},
		timestamp: Date.now(),
	} as AssistantMessage;
}

describe("AgentSession state-aware compaction", () => {
	let tempDir: TempDir;
	let session: AgentSession;
	let sessionManager: SessionManager;
	let authStorage: AuthStorage;
	let compactSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(async () => {
		tempDir = TempDir.createSync("@pi-state-aware-compaction-");
		const extensionsDir = path.join(getProjectAgentDir(tempDir.path()), "extensions");
		fs.mkdirSync(extensionsDir, { recursive: true });
		const extensionPath = path.join(extensionsDir, "compact.ts");
		fs.writeFileSync(extensionPath, "export default function(pi) {}");
		authStorage = await AuthStorage.create(path.join(tempDir.path(), "testauth.db"));
		authStorage.setRuntimeApiKey("anthropic", "test-key");
		const modelRegistry = new ModelRegistry(authStorage);
		sessionManager = SessionManager.create(tempDir.path(), tempDir.path());
		const extensionsResult = await loadExtensions([extensionPath], tempDir.path());
		const extensionRunner = new ExtensionRunner(
			extensionsResult.extensions,
			extensionsResult.runtime,
			tempDir.path(),
			sessionManager,
			modelRegistry,
		);
		const bundledModel = getBundledModel("anthropic", "claude-sonnet-4-5");
		if (!bundledModel) throw new Error("Expected built-in anthropic model");
		const agent = new Agent({
			initialState: {
				model: { ...bundledModel, contextWindow: 200_000 },
				systemPrompt: ["Test"],
				tools: [],
				messages: [],
			},
		});
		sessionManager.appendMessage({ role: "user", content: "hello", timestamp: Date.now() });
		session = new AgentSession({
			agent,
			sessionManager,
			settings: Settings.isolated({
				"compaction.autoContinue": true,
				"contextPromotion.enabled": false,
				"todo.reminders": false,
			}),
			modelRegistry,
			extensionRunner,
		});
		compactSpy = vi.spyOn(compactionModule, "compact").mockImplementation(async preparation => ({
			summary: "compacted",
			shortSummary: undefined,
			firstKeptEntryId: preparation.firstKeptEntryId,
			tokensBefore: preparation.tokensBefore,
			details: {},
		}));
	});

	afterEach(async () => {
		await session.dispose();
		authStorage.close();
		tempDir.removeSync();
		vi.restoreAllMocks();
	});

	async function compact(): Promise<void> {
		const message = assistantMessage();
		sessionManager.appendMessage(message);
		session.agent.emitExternalEvent({ type: "message_end", message });
		session.agent.emitExternalEvent({ type: "agent_end", messages: [message] });
		for (let i = 0; i < 20; i++) await Promise.resolve();
		await session.waitForIdle();
		await new Promise(resolve => setTimeout(resolve, 25));
		await session.waitForIdle();
	}

	it("skips synthetic auto-continue when no unfinished work exists", async () => {
		const promptSpy = vi.spyOn(session.agent, "prompt").mockResolvedValue();
		const notices: string[] = [];
		session.subscribe(event => {
			if (event.type === "notice") notices.push(event.message);
		});
		await compact();
		expect(promptSpy).not.toHaveBeenCalled();
		expect(notices).toContain("Auto-continue skipped: no unfinished work detected");
	});

	it("continues when an active todo remains", async () => {
		session.setTodoPhases([{ name: "Work", tasks: [{ content: "Finish compaction", status: "in_progress" }] }]);
		const promptSpy = vi.spyOn(session.agent, "prompt").mockResolvedValue();
		await compact();
		expect(promptSpy).toHaveBeenCalledTimes(1);
	});

	it("passes active goal and open todos to the summarizer", async () => {
		session.setGoalModeState({
			enabled: true,
			mode: "active",
			goal: {
				id: "goal-1",
				objective: "Finish state-aware compaction",
				status: "active",
				tokensUsed: 0,
				timeUsedSeconds: 0,
				createdAt: 0,
				updatedAt: 0,
			},
		});
		session.setTodoPhases([
			{ name: "Work", tasks: [{ content: "Preserve the active state", status: "in_progress" }] },
		]);

		for (let index = 0; index < 8; index++) {
			sessionManager.appendMessage({
				role: "user",
				content: "state context ".repeat(10_000),
				timestamp: Date.now() + index,
			});
		}
		await session.compact();

		expect(compactSpy).toHaveBeenCalledTimes(1);
		const options = compactSpy.mock.calls[0]?.[5];
		expect(options?.extraContext).toEqual(
			expect.arrayContaining([expect.stringContaining("Active goal:"), expect.stringContaining("Open todos:")]),
		);
	});
});
