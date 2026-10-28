/**
 * Tests for Kiro native reasoning support via reasoningContentEvent
 * and additionalModelRequestFields.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { Effort } from "../src/model-thinking";
import { crc32 } from "../src/providers/aws-eventstream";
import { buildKiroAdditionalModelRequestFields } from "../src/providers/kiro-api-key";
import { streamKiroCodeWhisperer } from "../src/providers/kiro-codewhisperer";
import type { AssistantMessage, Context, Model } from "../src/types";

const PROFILE_ARN = "arn:aws:codewhisperer:us-east-1:123456789012:profile/social-profile";

afterEach(() => {
	(globalThis.fetch as any) = undefined;
});

function encodeStringHeader(name: string, value: string): Uint8Array {
	const nameBytes = new TextEncoder().encode(name);
	const valueBytes = new TextEncoder().encode(value);
	const header = new Uint8Array(1 + nameBytes.length + 1 + 2 + valueBytes.length);
	const view = new DataView(header.buffer);
	let offset = 0;
	view.setUint8(offset, nameBytes.length);
	offset += 1;
	header.set(nameBytes, offset);
	offset += nameBytes.length;
	view.setUint8(offset, 7);
	offset += 1;
	view.setUint16(offset, valueBytes.length, false);
	offset += 2;
	header.set(valueBytes, offset);
	return header;
}

function encodeEventStreamFrame(eventType: string, payload: Record<string, unknown>): Uint8Array {
	const headers = [
		encodeStringHeader(":message-type", "event"),
		encodeStringHeader(":event-type", eventType),
		encodeStringHeader(":content-type", "application/json"),
	];
	const headerLength = headers.reduce((total, header) => total + header.length, 0);
	const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
	const frameLength = 4 + 4 + 4 + headerLength + payloadBytes.length + 4;
	const frame = new Uint8Array(frameLength);
	const view = new DataView(frame.buffer);
	view.setUint32(0, frameLength, false);
	view.setUint32(4, headerLength, false);
	view.setUint32(8, crc32(frame.subarray(0, 8)), false);
	let offset = 12;
	for (const header of headers) {
		frame.set(header, offset);
		offset += header.length;
	}
	frame.set(payloadBytes, offset);
	view.setUint32(frameLength - 4, crc32(frame.subarray(0, frameLength - 4)), false);
	return frame;
}

function eventStreamResponse(events: Array<{ type: string; payload: Record<string, unknown> }>): Response {
	const frames = events.map(e => encodeEventStreamFrame(e.type, e.payload));
	const length = frames.reduce((total, frame) => total + frame.length, 0);
	const body = new Uint8Array(length);
	let offset = 0;
	for (const frame of frames) {
		body.set(frame, offset);
		offset += frame.length;
	}
	return new Response(body, {
		status: 200,
		headers: { "Content-Type": "application/vnd.amazon.eventstream" },
	});
}

async function runStream(
	events: Array<{ type: string; payload: Record<string, unknown> }>,
	model: Model<"kiro-codewhisperer-stream">,
	options: { reasoning?: Effort | boolean } = {},
): Promise<{ request: Record<string, unknown>; message: AssistantMessage; eventTypes: string[] }> {
	let request: Record<string, unknown> | undefined;
	(globalThis.fetch as any) = async (_input: string | URL | Request, init?: RequestInit) => {
		if (!(init?.body instanceof Uint8Array)) throw new Error("expected encoded Kiro request body");
		request = JSON.parse(new TextDecoder().decode(init.body)) as Record<string, unknown>;
		return eventStreamResponse(events);
	};
	let message: AssistantMessage | undefined;
	const eventTypes: string[] = [];
	for await (const event of streamKiroCodeWhisperer(
		model,
		{ messages: [{ role: "user", content: "Test", timestamp: 1 }] } satisfies Context,
		{ apiKey: JSON.stringify({ token: "social-access-token", profileArn: PROFILE_ARN }), ...options },
	)) {
		eventTypes.push(event.type);
		if (event.type === "done") message = event.message;
	}
	if (!request || !message) throw new Error("Stream did not produce a request and final message");
	return { request, message, eventTypes };
}

describe("Kiro native reasoning", () => {
	test("buildKiroAdditionalModelRequestFields returns correct format for Claude 4.6+", () => {
		const model: Model<"kiro-codewhisperer-stream"> = {
			id: "claude-opus-4.6",
			name: "Claude Opus 4.6",
			api: "kiro-codewhisperer-stream",
			provider: "kiro",
			baseUrl: "",
			reasoning: true,
			input: ["text"],
			output: ["text"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 200_000,
			maxTokens: 8_192,
		};

		const fields = buildKiroAdditionalModelRequestFields(model, Effort.High);
		expect(fields).toBeDefined();
		expect(fields?.thinking).toEqual({ type: "adaptive", display: "summarized" });
		expect((fields as any)?.output_config?.effort).toBe(Effort.High);
	});

	test("buildKiroAdditionalModelRequestFields returns undefined for Claude when reasoning disabled", () => {
		const model: Model<"kiro-codewhisperer-stream"> = {
			id: "claude-opus-4.6",
			name: "Claude Opus 4.6",
			api: "kiro-codewhisperer-stream",
			provider: "kiro",
			baseUrl: "",
			reasoning: false,
			input: ["text"],
			output: ["text"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 200_000,
			maxTokens: 8_192,
		};

		const fields = buildKiroAdditionalModelRequestFields(model, false);
		expect(fields).toBeUndefined();
	});

	test("buildKiroAdditionalModelRequestFields returns correct format for GPT 5.6", () => {
		const model: Model<"kiro-codewhisperer-stream"> = {
			id: "gpt-5.6-luna",
			name: "GPT 5.6 Luna",
			api: "kiro-codewhisperer-stream",
			provider: "kiro",
			baseUrl: "",
			reasoning: true,
			input: ["text"],
			output: ["text"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 272_000,
			maxTokens: 128_000,
		};

		const fields = buildKiroAdditionalModelRequestFields(model, Effort.High);
		expect(fields).toBeDefined();
		expect(fields?.reasoning).toBeDefined();
		expect((fields as any)?.reasoning?.effort).toBe(Effort.High);
	});

	test("parses reasoningContentEvent with text", async () => {
		const model: Model<"kiro-codewhisperer-stream"> = {
			id: "claude-opus-4.6",
			name: "Claude Opus 4.6",
			api: "kiro-codewhisperer-stream",
			provider: "kiro",
			baseUrl: "",
			reasoning: true,
			input: ["text"],
			output: ["text"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 200_000,
			maxTokens: 8_192,
		};

		const { message, eventTypes } = await runStream(
			[
				{ type: "reasoningContentEvent", payload: { text: "thinking " } },
				{ type: "reasoningContentEvent", payload: { text: "about problem" } },
				{ type: "assistantResponseEvent", payload: { content: "answer" } },
			],
			model,
			{ reasoning: Effort.High },
		);

		const thinkingBlock = message.content.find(b => b.type === "thinking");
		expect(thinkingBlock).toBeDefined();
		expect((thinkingBlock as any)?.thinking).toBe("thinking about problem");
		expect(eventTypes).toContain("thinking_start");
		expect(eventTypes).toContain("thinking_delta");
	});

	test("parses reasoningContentEvent with signature", async () => {
		const model: Model<"kiro-codewhisperer-stream"> = {
			id: "claude-opus-4.6",
			name: "Claude Opus 4.6",
			api: "kiro-codewhisperer-stream",
			provider: "kiro",
			baseUrl: "",
			reasoning: true,
			input: ["text"],
			output: ["text"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 200_000,
			maxTokens: 8_192,
		};

		const { message } = await runStream(
			[
				{ type: "reasoningContentEvent", payload: { signature: "abc123" } },
				{ type: "assistantResponseEvent", payload: { content: "answer" } },
			],
			model,
		);

		const thinkingBlock = message.content.find(b => b.type === "thinking");
		expect(thinkingBlock).toBeDefined();
		expect((thinkingBlock as any)?.thinkingSignature).toBe("kiro:signature:abc123");
	});

	test("parses reasoningContentEvent with redactedContent", async () => {
		const model: Model<"kiro-codewhisperer-stream"> = {
			id: "claude-opus-4.6",
			name: "Claude Opus 4.6",
			api: "kiro-codewhisperer-stream",
			provider: "kiro",
			baseUrl: "",
			reasoning: true,
			input: ["text"],
			output: ["text"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 200_000,
			maxTokens: 8_192,
		};

		const { message } = await runStream(
			[
				{
					type: "reasoningContentEvent",
					payload: { redactedContent: "private_data_blob" },
				},
				{ type: "assistantResponseEvent", payload: { content: "answer" } },
			],
			model,
		);

		const thinkingBlock = message.content.find(b => b.type === "thinking");
		expect(thinkingBlock).toBeDefined();
		expect((thinkingBlock as any)?.thinkingSignature).toBe("kiro:redactedContent:private_data_blob");
	});

	test("two-turn replay with thinking signature", async () => {
		const model: Model<"kiro-codewhisperer-stream"> = {
			id: "claude-opus-4.6",
			name: "Claude Opus 4.6",
			api: "kiro-codewhisperer-stream",
			provider: "kiro",
			baseUrl: "",
			reasoning: true,
			input: ["text"],
			output: ["text"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 200_000,
			maxTokens: 8_192,
		};

		// First turn with reasoning: build request and capture assistant message with signature
		const { message: firstMessage } = await runStream(
			[
				{ type: "reasoningContentEvent", payload: { text: "analyzing...", signature: "sig1" } },
				{ type: "assistantResponseEvent", payload: { content: "result" } },
			],
			model,
			{ reasoning: Effort.High },
		);

		const thinkingBlock = firstMessage.content.find(
			b => b.type === "thinking" && (b as any).thinkingSignature === "kiro:signature:sig1",
		);
		expect(thinkingBlock).toBeDefined();

		// Second turn: build request with first turn's message in history
		let secondRequest: Record<string, unknown> | undefined;
		(globalThis.fetch as any) = async (_input: string | URL | Request, init?: RequestInit) => {
			if (!(init?.body instanceof Uint8Array)) throw new Error("expected encoded Kiro request body");
			secondRequest = JSON.parse(new TextDecoder().decode(init.body)) as Record<string, unknown>;
			return eventStreamResponse([
				{ type: "assistantResponseEvent", payload: { content: "follow-up answer" } },
			]);
		};

		const secondMessage: AssistantMessage | undefined = await (async () => {
			for await (const event of streamKiroCodeWhisperer(
				model,
				{
					messages: [
						{ role: "user", content: "First question", timestamp: 1 },
						firstMessage,
						{ role: "user", content: "Second question", timestamp: 2 },
					],
				} satisfies Context,
				{ apiKey: JSON.stringify({ token: "social-access-token", profileArn: PROFILE_ARN }), reasoning: Effort.High },
			)) {
				if (event.type === "done") return event.message;
			}
			return undefined;
		})();

		expect(secondMessage).toBeDefined();
		expect(secondRequest).toBeDefined();

		// Verify the second request's history includes the first turn's thinking signature
		const history = (secondRequest as any)?.conversationState?.history;
		expect(history).toBeDefined();
		expect(Array.isArray(history)).toBe(true);

		// First message in history should be the first user message
		const firstHistoryUserMsg = history?.[0];
		expect(firstHistoryUserMsg?.userInputMessage?.content).toBe("First question");

		// Second message in history should be the assistant's response with signature
		const assistantHistoryMsg = history?.[1];
		expect(assistantHistoryMsg?.assistantResponseMessage).toBeDefined();
		expect(assistantHistoryMsg?.assistantResponseMessage?.content).toContain("result");
		expect((assistantHistoryMsg?.assistantResponseMessage as any)?.reasoningContent?.signature).toBe(
			"kiro:signature:sig1",
		);
	});

	test("prompt prefix is absent when native fields are sent", async () => {
		const model: Model<"kiro-codewhisperer-stream"> = {
			id: "claude-opus-4.6",
			name: "Claude Opus 4.6",
			api: "kiro-codewhisperer-stream",
			provider: "kiro",
			baseUrl: "",
			reasoning: true,
			input: ["text"],
			output: ["text"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 200_000,
			maxTokens: 8_192,
		};

		const originalSystemPrompt = "You are a helpful assistant.";
		let request: Record<string, unknown> | undefined;
		(globalThis.fetch as any) = async (_input: string | URL | Request, init?: RequestInit) => {
			if (!(init?.body instanceof Uint8Array)) throw new Error("expected encoded Kiro request body");
			request = JSON.parse(new TextDecoder().decode(init.body)) as Record<string, unknown>;
			return eventStreamResponse([{ type: "assistantResponseEvent", payload: { content: "answer" } }]);
		};

		for await (const _event of streamKiroCodeWhisperer(
			model,
			{
				systemPrompt: [originalSystemPrompt],
				messages: [{ role: "user", content: "Test", timestamp: 1 }],
			} satisfies Context,
			{ apiKey: JSON.stringify({ token: "social-access-token", profileArn: PROFILE_ARN }), reasoning: Effort.High },
		)) {
			if (_event.type === "done") break;
		}

		expect(request).toBeDefined();
		const content = (request as any)?.conversationState?.currentMessage?.userInputMessage?.content;
		expect(content).toBeDefined();

		// When native reasoning is enabled (additionalModelRequestFields is sent),
		// the prompt should not include the thinking mode prefix
		expect(content).not.toContain("<thinking_mode>");
		expect(content).not.toContain("<max_thinking_length>");
		expect(content).toContain(originalSystemPrompt);

		// additionalModelRequestFields should be present
		expect((request as any)?.additionalModelRequestFields).toBeDefined();
		expect(((request as any)?.additionalModelRequestFields as any)?.thinking?.type).toBe("adaptive");
	});
});
