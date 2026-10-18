import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import { Agent, type AgentTool } from "@gajae-code/agent-core";
import type { Model } from "@gajae-code/ai";
import * as z from "zod/v4";
import { Settings } from "../src/config/settings";
import { AgentSession } from "../src/session/agent-session";
import { SessionManager } from "../src/session/session-manager";
import { buildDiscoveryMetadataMessage, DiscoveryProxyTool } from "../src/tools/discovery-proxy";

function createModel(): Model<"openai-responses"> {
	return {
		id: "mock",
		name: "mock",
		api: "openai-responses",
		provider: "openai",
		baseUrl: "https://example.invalid",
		reasoning: false,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 8192,
		maxTokens: 2048,
	};
}

function createBasicTool(name: string, label: string): AgentTool {
	const schema = z.object({ value: z.string() });
	return {
		name,
		label,
		description: `${label} tool`,
		parameters: schema,
		strict: true,
		loadMode: "discoverable" as const,
		async execute() {
			return { content: [{ type: "text", text: `${name} executed` }] };
		},
	};
}

describe("Tool Discovery Cache Prefix Preservation", () => {
	const sessions: AgentSession[] = [];
	const tempDirs: string[] = [];

	afterEach(async () => {
		for (const session of sessions.splice(0)) {
			await session.dispose();
		}
		for (const tempDir of tempDirs.splice(0)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it("should measure current behavior: rebuild called on initial activation", async () => {
		const readTool = createBasicTool("read", "Read");
		const discoverableTool = createBasicTool("discovered_tool", "Discovered Tool");

		const toolRegistry = new Map<string, AgentTool>([
			[readTool.name, readTool],
			[discoverableTool.name, discoverableTool],
		]);

		const agent = new Agent({
			initialState: {
				model: createModel(),
				systemPrompt: ["initial"],
				tools: [readTool],
				messages: [],
			},
		});

		let rebuildCount = 0;
		const rebuildCalls: { toolNames: string[] }[] = [];

		const session = new AgentSession({
			agent,
			sessionManager: SessionManager.inMemory(),
			settings: Settings.isolated({ "tools.discoveryMode": "all" }),
			modelRegistry: {
				withConsumerLease: async <T>(body: () => T | Promise<T>): Promise<T> => await body(),
			} as never,
			toolRegistry,
			deploymentId: "test-deployment",
			getDiscoverableTools: () => [discoverableTool],
			rebuildSystemPrompt: async toolNames => {
				rebuildCount++;
				rebuildCalls.push({ toolNames: [...toolNames] });
				return {
					systemPrompt: [`tools:${toolNames.join(",")}`],
				};
			},
		});
		sessions.push(session);

		const activeToolsInitial = session.getActiveToolNames();
		console.log("Initial active tools:", activeToolsInitial);
		expect(activeToolsInitial).toContain("read");

		const rebuildCountBefore = rebuildCount;

		// Activate the discoverable tool (before any messages - initial activation)
		const activated = await session.activateDiscoveredTools(["discovered_tool"]);
		console.log("Activated tools:", activated);
		console.log("System prompt rebuild calls:", rebuildCount - rebuildCountBefore);

		const activeToolsAfter = session.getActiveToolNames();
		expect(activeToolsAfter).toContain("discovered_tool");
		// Initial activation: rebuild is called
		expect(rebuildCount - rebuildCountBefore).toBeGreaterThan(0);
	});

	it("should preserve cache prefix: no rebuild on mid-session activation", async () => {
		const readTool = createBasicTool("read", "Read");
		const discoverableTool1 = createBasicTool("discovered_tool_1", "Discovered Tool 1");
		const discoverableTool2 = createBasicTool("discovered_tool_2", "Discovered Tool 2");

		const toolRegistry = new Map<string, AgentTool>([
			[readTool.name, readTool],
			[discoverableTool1.name, discoverableTool1],
			[discoverableTool2.name, discoverableTool2],
		]);

		const agent = new Agent({
			initialState: {
				model: createModel(),
				systemPrompt: ["initial"],
				tools: [readTool],
				messages: [],
			},
		});

		let rebuildCount = 0;

		const session = new AgentSession({
			agent,
			sessionManager: SessionManager.inMemory(),
			settings: Settings.isolated({ "tools.discoveryMode": "all" }),
			modelRegistry: {
				withConsumerLease: async <T>(body: () => T | Promise<T>): Promise<T> => await body(),
			} as never,
			toolRegistry,
			deploymentId: "test-deployment",
			getDiscoverableTools: () => [discoverableTool1, discoverableTool2],
			rebuildSystemPrompt: async toolNames => {
				rebuildCount++;
				return {
					systemPrompt: [`tools:${toolNames.join(",")}`],
				};
			},
		});
		sessions.push(session);

		// Add a message to simulate mid-session state
		agent.appendMessage({
			role: "user",
			content: [{ type: "text", text: "Hello" }],
		});

		const initialMessageCount = agent.state.messages.length;
		console.log("Initial messages:", initialMessageCount);

		const rebuildCountBefore = rebuildCount;

		// Activate tool mid-session
		const activated = await session.activateDiscoveredTools(["discovered_tool_1"]);
		console.log("Activated tools:", activated);
		console.log("System prompt rebuild calls:", rebuildCount - rebuildCountBefore);

		const finalMessageCount = agent.state.messages.length;
		console.log("Final messages:", finalMessageCount);

		// Mid-session activation: NO rebuild (cache-prefix stable)
		expect(rebuildCount - rebuildCountBefore).toBe(0);
		// A developer message should be appended
		expect(finalMessageCount).toBeGreaterThan(initialMessageCount);
		// The appended message should contain the tool metadata
		const lastMessage = agent.state.messages[agent.state.messages.length - 1];
		expect(lastMessage.role).toBe("developer");
		const messageText = lastMessage.content
			.filter(part => part.type === "text")
			.map(part => part.text)
			.join("");
		expect(messageText).toContain("discovered_tool_1");
	});

	it("should build discovery metadata message correctly", () => {
		const toolsMetadata = [
			{
				name: "tool_a",
				label: "Tool A",
				description: "A test tool",
				parameters: { type: "object", properties: { arg: { type: "string" } } },
			},
		];

		const message = buildDiscoveryMetadataMessage(toolsMetadata);
		console.log("Discovery metadata message:", message);
		expect(message).toContain("tool_a");
		expect(message).toContain("call_discovered_tool");
	});

	it("should create discovery proxy tool with dispatch capability", async () => {
		const testTool = createBasicTool("test_tool", "Test");
		const toolRegistry = new Map([[testTool.name, testTool]]);
		const activeNames = [testTool.name];

		const proxy = new DiscoveryProxyTool({
			getToolRegistry: () => toolRegistry,
			getActiveToolNames: () => activeNames,
		});

		expect(proxy.name).toBe("call_discovered_tool");
		expect(proxy.loadMode).toBe("essential");

		// Test proxy execution
		const result = await proxy.execute("tool-call-id", { toolName: "test_tool", arguments: { value: "test" } });
		expect(result.content).toContainEqual({ type: "text", text: "test_tool executed" });
	});
});
