import { describe, expect, it } from "bun:test";
import { Agent, type AgentTool, type ManagedAttemptOutcome } from "@gajae-code/agent-core";
import { createMockModel } from "@gajae-code/ai/providers/mock";

function echoTool(calls: unknown[]): AgentTool {
	return {
		name: "echo",
		label: "Echo",
		description: "Returns a deterministic result.",
		parameters: { type: "object", properties: {} },
		execute: async (_id, args) => {
			calls.push(args);
			return { content: [{ type: "text", text: "ok" }], details: {} };
		},
	};
}

describe("escaped-non-ASCII tool arguments", () => {
	it("managed: discards the defective turn and reports escaped_arguments_discarded", async () => {
		const mock = createMockModel({
			responses: [
				{ content: [{ type: "toolCall", name: "echo", arguments: { text: "병목" }, escapedNonAsciiArguments: true }] },
			],
		});
		const executed: unknown[] = [];
		const agent = new Agent({
			initialState: { model: mock.model, systemPrompt: ["test"], tools: [echoTool(executed)], messages: [] },
			streamFn: mock.stream,
		});
		const outcomes: ManagedAttemptOutcome[] = [];

		await agent.prompt("run", {
			fallbackManaged: true,
			onManagedAttemptOutcome: outcome => {
				outcomes.push(outcome);
				return { type: "terminal", terminal: { stopReason: "error" } };
			},
		});

		expect(outcomes).toHaveLength(1);
		expect(outcomes[0]?.type).toBe("escaped_arguments_discarded");
		if (outcomes[0]?.type === "escaped_arguments_discarded") {
			expect(
				outcomes[0].message.content.some(
					block => block.type === "toolCall" && block.escapedNonAsciiArguments === true,
				),
			).toBe(true);
		}
		// The defective turn was removed from usable history and the tool never ran.
		expect(executed).toHaveLength(0);
		expect(
			agent.state.messages.some(
				message =>
					message.role === "assistant" &&
					Array.isArray(message.content) &&
					message.content.some(block => block.type === "toolCall" && block.escapedNonAsciiArguments === true),
			),
		).toBe(false);
	});

	it("unmanaged: rejects the call per-call with an actionable error instead of executing it", async () => {
		const mock = createMockModel({
			responses: [
				{ content: [{ type: "toolCall", name: "echo", arguments: { text: "병목" }, escapedNonAsciiArguments: true }] },
				{ content: ["done after rejection"] },
			],
		});
		const executed: unknown[] = [];
		const agent = new Agent({
			initialState: { model: mock.model, systemPrompt: ["test"], tools: [echoTool(executed)], messages: [] },
			streamFn: mock.stream,
		});

		await agent.prompt("run");

		expect(executed).toHaveLength(0);
		const toolResults = agent.state.messages.filter(message => message.role === "toolResult");
		expect(toolResults).toHaveLength(1);
		const result = toolResults[0] as { isError?: boolean; content?: Array<{ type: string; text?: string }> };
		expect(result.isError).toBe(true);
		const text = (result.content ?? [])
			.map(block => (block.type === "text" ? (block.text ?? "") : ""))
			.join(" ");
		expect(text).toContain("\\uXXXX escapes");
		expect(text).toContain("was not executed");
	});

	it("managed: a clean tool call executes normally with no outcome", async () => {
		const mock = createMockModel({
			responses: [{ content: [{ type: "toolCall", name: "echo", arguments: { text: "병목" } }] }, { content: ["ok"] }],
		});
		const executed: unknown[] = [];
		const agent = new Agent({
			initialState: { model: mock.model, systemPrompt: ["test"], tools: [echoTool(executed)], messages: [] },
			streamFn: mock.stream,
		});
		const outcomes: ManagedAttemptOutcome[] = [];

		await agent.prompt("run", {
			fallbackManaged: true,
			onManagedAttemptOutcome: outcome => {
				outcomes.push(outcome);
				return { type: "terminal", terminal: { stopReason: "error" } };
			},
		});

		expect(executed).toHaveLength(1);
		expect(outcomes.filter(outcome => outcome.type === "escaped_arguments_discarded")).toHaveLength(0);
	});
});
