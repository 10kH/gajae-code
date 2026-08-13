import { describe, expect, it } from "bun:test";
import { Agent } from "@gajae-code/agent-core";
import { agentLoop } from "@gajae-code/agent-core/agent-loop";
import type { AgentContext, AgentEvent, AgentLoopConfig, AgentMessage, AgentTool } from "@gajae-code/agent-core/types";
import type { Message } from "@gajae-code/ai";
import { createMockModel } from "@gajae-code/ai/providers/mock";
import * as z from "zod/v4";
import { createUserMessage } from "./helpers";

function identityConverter(messages: AgentMessage[]): Message[] {
	return messages.filter(m => m.role === "user" || m.role === "assistant" || m.role === "toolResult") as Message[];
}

const askSchema = z.object({ question: z.string() });

// Decodes cleanly, but a mistyped nibble anywhere in it would be
// indistinguishable from the correct text.
const QUESTION = "마지막 병목";

function askTool(executed: Array<Record<string, unknown>>): AgentTool<typeof askSchema, Record<string, never>> {
	return {
		name: "ask",
		label: "Ask",
		description: "Ask the user a question",
		parameters: askSchema,
		async execute(_id, params) {
			executed.push(params as Record<string, unknown>);
			return { content: [{ type: "text", text: "answered" }], details: {} };
		},
	};
}

/** A turn whose raw arguments arrived spelled as `\uXXXX` instead of literal UTF-8. */
function escapedTurn(id: string, stopReason?: "aborted" | "error") {
	return {
		content: [
			{
				type: "toolCall" as const,
				id,
				name: "ask",
				arguments: { question: QUESTION },
				escapedNonAsciiArguments: true,
			},
		],
		...(stopReason ? { stopReason } : {}),
	};
}

function escapedTurnWithText(id: string) {
	return {
		content: [{ type: "text" as const, text: "I will ask." }, ...escapedTurn(id).content],
	};
}

/** The same turn as the model would have produced it with literal UTF-8 on the wire. */
function literalTurn(id: string) {
	return { content: [{ type: "toolCall" as const, id, name: "ask", arguments: { question: QUESTION } }] };
}

describe("agentLoop: ASCII-escaped non-ASCII argument guard", () => {
	it("resamples the turn instead of executing or reporting escaped arguments", async () => {
		const executed: Array<Record<string, unknown>> = [];
		const context: AgentContext = { systemPrompt: [""], messages: [], tools: [askTool(executed)] };
		const mock = createMockModel({
			responses: [escapedTurn("tc-1"), literalTurn("tc-2"), { content: ["done"] }],
		});
		const config: AgentLoopConfig = { model: mock.model, convertToLlm: identityConverter };

		const toolResults: Array<{ isError?: boolean; text: string }> = [];
		const stream = agentLoop([createUserMessage("ask me")], context, config, undefined, mock.stream);
		for await (const event of stream) {
			if (event.type === "tool_execution_end") {
				const first = event.result.content?.[0];
				toolResults.push({ isError: event.isError, text: first?.type === "text" ? first.text : "" });
			}
		}

		// The resampled call ran; the defective one neither ran nor produced an error.
		expect(executed).toEqual([{ question: QUESTION }]);
		expect(toolResults).toHaveLength(1);
		expect(toolResults[0].isError).toBeFalsy();
		// The resample must not replay the escaped arguments back to the model as
		// its own prior output: the retried request carries no assistant turn.
		const resampleRequest = mock.model.calls[1];
		expect(resampleRequest).toBeDefined();
		expect(resampleRequest.context.messages.some(message => message.role === "assistant")).toBe(false);
	});

	it("publishes and stores only the accepted assistant lifecycle", async () => {
		const executed: Array<Record<string, unknown>> = [];
		const mock = createMockModel({
			responses: [escapedTurn("tc-defective"), literalTurn("tc-accepted"), { content: ["done"] }],
		});
		const agent = new Agent({
			initialState: {
				systemPrompt: [""],
				model: mock.model,
				tools: [askTool(executed)],
				messages: [],
			},
			convertToLlm: identityConverter,
			streamFn: mock.stream,
		});
		const events: AgentEvent[] = [];
		agent.subscribe(event => events.push(event));

		await agent.prompt("ask me");

		const assistantEnds = events.filter(
			(event): event is Extract<AgentEvent, { type: "message_end" }> =>
				event.type === "message_end" && event.message.role === "assistant",
		);
		expect(assistantEnds).toHaveLength(2);
		expect(
			assistantEnds.some(event =>
				event.message.role === "assistant"
					? event.message.content.some(block => block.type === "toolCall" && block.id === "tc-defective")
					: false,
			),
		).toBe(false);
		expect(
			agent.state.messages.some(
				message =>
					message.role === "assistant" &&
					message.content.some(block => block.type === "toolCall" && block.id === "tc-defective"),
			),
		).toBe(false);
		expect(events.filter(event => event.type === "turn_start")).toHaveLength(3);
		expect(events.filter(event => event.type === "turn_end")).toHaveLength(2);
	});

	it("preserves all pre-existing history and removes only the defective assistant turn", async () => {
		const executed: Array<Record<string, unknown>> = [];
		const priorAssistant = {
			role: "assistant" as const,
			content: [{ type: "text" as const, text: "prior answer" }],
			api: "mock" as const,
			provider: "mock",
			model: "mock-model",
			usage: {
				input: 0,
				output: 0,
				cacheRead: 0,
				cacheWrite: 0,
				totalTokens: 0,
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
			},
			stopReason: "stop" as const,
			timestamp: 1,
		};
		const priorUser = createUserMessage("prior question");
		const context: AgentContext = {
			systemPrompt: ["system authority"],
			messages: [priorUser, priorAssistant],
			tools: [askTool(executed)],
		};
		const mock = createMockModel({ responses: [escapedTurn("tc-1"), literalTurn("tc-2"), { content: ["done"] }] });
		const config: AgentLoopConfig = { model: mock.model, convertToLlm: identityConverter };

		const stream = agentLoop([createUserMessage("ask me")], context, config, undefined, mock.stream);
		for await (const _event of stream) {
			// drain
		}

		expect(context.systemPrompt).toEqual(["system authority"]);
		expect(context.messages[0]).toBe(priorUser);
		expect(context.messages[1]).toBe(priorAssistant);
		expect(
			context.messages.filter(
				message =>
					message.role === "assistant" &&
					message.content.some(block => block.type === "toolCall" && block.id === "tc-1"),
			),
		).toHaveLength(0);
	});

	it("does not resample cancelled or errored turns", async () => {
		for (const stopReason of ["aborted", "error"] as const) {
			const executed: Array<Record<string, unknown>> = [];
			const context: AgentContext = { systemPrompt: [""], messages: [], tools: [askTool(executed)] };
			const mock = createMockModel({ responses: [escapedTurn(`tc-${stopReason}`, stopReason)] });
			const config: AgentLoopConfig = { model: mock.model, convertToLlm: identityConverter };
			const events: AgentEvent[] = [];

			const stream = agentLoop([createUserMessage("ask me")], context, config, undefined, mock.stream);
			for await (const event of stream) events.push(event);

			expect(mock.calls).toHaveLength(1);
			expect(executed).toHaveLength(0);
			expect(events.filter(event => event.type === "tool_execution_start")).toHaveLength(1);
			expect(events.filter(event => event.type === "tool_execution_end")).toHaveLength(1);
			const messageEnd = events.findLast(
				(event): event is Extract<AgentEvent, { type: "message_end" }> =>
					event.type === "message_end" && event.message.role === "assistant",
			);
			expect(messageEnd?.message.role === "assistant" ? messageEnd.message.stopReason : undefined).toBe(stopReason);
		}
	});

	it("does not retract a turn after visible text has streamed", async () => {
		const executed: Array<Record<string, unknown>> = [];
		const context: AgentContext = { systemPrompt: [""], messages: [], tools: [askTool(executed)] };
		const mock = createMockModel({ responses: [escapedTurnWithText("tc-visible"), { content: ["done"] }] });
		const config: AgentLoopConfig = { model: mock.model, convertToLlm: identityConverter };
		const toolEnds: AgentEvent[] = [];

		const stream = agentLoop([createUserMessage("ask me")], context, config, undefined, mock.stream);
		for await (const event of stream) if (event.type === "tool_execution_end") toolEnds.push(event);

		expect(mock.calls).toHaveLength(2);
		expect(executed).toHaveLength(0);
		expect(toolEnds).toHaveLength(1);
		expect(toolEnds[0]?.type === "tool_execution_end" ? toolEnds[0].isError : false).toBe(true);
	});

	it("delivers every assistant stream callback exactly once after visible text commits the turn", async () => {
		const executed: Array<Record<string, unknown>> = [];
		const context: AgentContext = { systemPrompt: [""], messages: [], tools: [askTool(executed)] };
		const mock = createMockModel({ responses: [escapedTurnWithText("tc-visible"), { content: ["done"] }] });
		const callbackTypes: string[] = [];
		const config: AgentLoopConfig = {
			model: mock.model,
			convertToLlm: identityConverter,
			onAssistantMessageEvent: (_message, event) => callbackTypes.push(event.type),
		};

		const stream = agentLoop([createUserMessage("ask me")], context, config, undefined, mock.stream);
		for await (const _event of stream) {
			// drain
		}

		expect(callbackTypes).toEqual([
			"text_start",
			"text_delta",
			"text_end",
			"toolcall_start",
			"toolcall_delta",
			"toolcall_end",
			"text_start",
			"text_delta",
			"text_end",
		]);
	});

	it("executes no calls from a mixed batch before validating the whole turn", async () => {
		const executed: Array<Record<string, unknown>> = [];
		const context: AgentContext = { systemPrompt: [""], messages: [], tools: [askTool(executed)] };
		const mock = createMockModel({
			responses: [
				{
					content: [
						{ type: "toolCall", id: "tc-clean-never", name: "ask", arguments: { question: "ASCII" } },
						...escapedTurn("tc-escaped").content,
					],
				},
				literalTurn("tc-retry"),
				{ content: ["done"] },
			],
		});
		const config: AgentLoopConfig = { model: mock.model, convertToLlm: identityConverter };
		const toolEvents: AgentEvent[] = [];

		const stream = agentLoop([createUserMessage("ask me")], context, config, undefined, mock.stream);
		for await (const event of stream) {
			if (event.type === "tool_execution_start" || event.type === "tool_execution_end") toolEvents.push(event);
		}

		expect(executed).toEqual([{ question: QUESTION }]);
		expect(toolEvents.map(event => ("toolCallId" in event ? event.toolCallId : undefined))).toEqual([
			"tc-retry",
			"tc-retry",
		]);
	});

	it("recovers on the second resample with clean history and one tool publication", async () => {
		const executed: Array<Record<string, unknown>> = [];
		const context: AgentContext = { systemPrompt: [""], messages: [], tools: [askTool(executed)] };
		const mock = createMockModel({
			responses: [escapedTurn("tc-1"), escapedTurn("tc-2"), literalTurn("tc-3"), { content: ["done"] }],
		});
		const config: AgentLoopConfig = { model: mock.model, convertToLlm: identityConverter };
		const toolEnds: AgentEvent[] = [];

		const stream = agentLoop([createUserMessage("ask me")], context, config, undefined, mock.stream);
		for await (const event of stream) if (event.type === "tool_execution_end") toolEnds.push(event);

		expect(mock.calls).toHaveLength(4);
		expect(mock.calls[1]?.context.messages.some(message => message.role === "assistant")).toBe(false);
		expect(mock.calls[2]?.context.messages.some(message => message.role === "assistant")).toBe(false);
		expect(executed).toEqual([{ question: QUESTION }]);
		expect(toolEnds).toHaveLength(1);
	});

	it("resets the resample budget after each accepted logical turn", async () => {
		const executed: Array<Record<string, unknown>> = [];
		const context: AgentContext = { systemPrompt: [""], messages: [], tools: [askTool(executed)] };
		const mock = createMockModel({
			responses: [
				escapedTurn("tc-1a"),
				literalTurn("tc-1b"),
				escapedTurn("tc-2a"),
				escapedTurn("tc-2b"),
				literalTurn("tc-2c"),
				{ content: ["done"] },
			],
		});
		const config: AgentLoopConfig = { model: mock.model, convertToLlm: identityConverter };

		const stream = agentLoop([createUserMessage("ask twice")], context, config, undefined, mock.stream);
		for await (const _event of stream) {
			// drain
		}

		expect(executed).toEqual([{ question: QUESTION }, { question: QUESTION }]);
		expect(mock.calls).toHaveLength(6);
	});

	it("rejects the call once the resample budget is spent", async () => {
		const executed: Array<Record<string, unknown>> = [];
		const context: AgentContext = { systemPrompt: [""], messages: [], tools: [askTool(executed)] };
		const mock = createMockModel({
			responses: [escapedTurn("tc-1"), escapedTurn("tc-2"), escapedTurn("tc-3"), { content: ["recovered"] }],
		});
		const config: AgentLoopConfig = { model: mock.model, convertToLlm: identityConverter };

		const toolResults: Array<{ isError?: boolean; text: string }> = [];
		const stream = agentLoop([createUserMessage("ask me")], context, config, undefined, mock.stream);
		for await (const event of stream) {
			if (event.type === "tool_execution_end") {
				const first = event.result.content?.[0];
				toolResults.push({ isError: event.isError, text: first?.type === "text" ? first.text : "" });
			}
		}

		expect(executed).toHaveLength(0);
		expect(toolResults).toHaveLength(1);
		expect(toolResults[0].isError).toBe(true);
		expect(toolResults[0].text).toContain("\\uXXXX");
		expect(toolResults[0].text).toContain("literal UTF-8");
		expect(toolResults[0].text.toLowerCase()).toContain("re-issue");
	});

	it("still reaches the malformed-turn circuit breaker after persistent escaped calls", async () => {
		const executed: Array<Record<string, unknown>> = [];
		const context: AgentContext = { systemPrompt: [""], messages: [], tools: [askTool(executed)] };
		let calls = 0;
		const mock = createMockModel({
			handler: () => {
				calls += 1;
				if (calls > 20) return { content: ["runaway"] };
				return escapedTurn(`tc-${calls}`);
			},
		});
		const config: AgentLoopConfig = { model: mock.model, convertToLlm: identityConverter };

		const stream = agentLoop([createUserMessage("ask me")], context, config, undefined, mock.stream);
		for await (const _event of stream) {
			// drain
		}
		const produced = await stream.result();
		const lastAssistant = produced.findLast(message => message.role === "assistant");

		expect(calls).toBeLessThan(20);
		expect(executed).toHaveLength(0);
		expect(lastAssistant?.role === "assistant" ? lastAssistant.stopReason : undefined).toBe("error");
		expect(lastAssistant?.role === "assistant" ? lastAssistant.errorMessage : undefined).toContain(
			"consecutive turns of malformed tool calls",
		);
	});

	it("leaves managed fallback handling unchanged", async () => {
		const executed: Array<Record<string, unknown>> = [];
		const context: AgentContext = { systemPrompt: [""], messages: [], tools: [askTool(executed)] };
		const mock = createMockModel({ responses: [escapedTurn("tc-managed"), { content: ["done"] }] });
		const config: AgentLoopConfig = {
			model: mock.model,
			convertToLlm: identityConverter,
			fallbackManaged: true,
		};
		const toolResults: AgentEvent[] = [];

		const stream = agentLoop([createUserMessage("ask me")], context, config, undefined, mock.stream);
		for await (const event of stream) if (event.type === "tool_execution_end") toolResults.push(event);

		expect(mock.calls).toHaveLength(2);
		expect(executed).toHaveLength(0);
		expect(toolResults).toHaveLength(1);
		expect(toolResults[0]?.type === "tool_execution_end" ? toolResults[0].isError : false).toBe(true);
	});

	it("executes literal UTF-8 arguments untouched", async () => {
		const executed: Array<Record<string, unknown>> = [];
		const context: AgentContext = { systemPrompt: [""], messages: [], tools: [askTool(executed)] };
		const mock = createMockModel({ responses: [literalTurn("tc-1"), { content: ["done"] }] });
		const config: AgentLoopConfig = { model: mock.model, convertToLlm: identityConverter };

		const stream = agentLoop([createUserMessage("ask me")], context, config, undefined, mock.stream);
		for await (const _ of stream) {
			// drain
		}

		expect(executed).toEqual([{ question: QUESTION }]);
	});
});
