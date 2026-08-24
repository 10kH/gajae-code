import { describe, expect, it } from "bun:test";
import { resolveCursorWireModelForTest, streamCursor } from "../src/providers/cursor";
import type { AgentRunRequest } from "../src/providers/cursor/gen/agent_pb";
import type { Context, Model } from "../src/types";

const baseCursorModel: Model<"cursor-agent"> = {
	id: "cursor-composer-2.5",
	name: "Cursor Composer 2.5",
	api: "cursor-agent",
	provider: "cursor",
	baseUrl: "https://api2.cursor.sh",
	reasoning: false,
	input: ["text"],
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	contextWindow: 1,
	maxTokens: 1,
};

function cursorModel(id: string): Model<"cursor-agent"> {
	return { ...baseCursorModel, id, name: id };
}

function captureCursorRequest(model: Model<"cursor-agent">): Promise<AgentRunRequest> {
	const { promise, resolve, reject } = Promise.withResolvers<AgentRunRequest>();
	streamCursor(
		model,
		{
			messages: [{ role: "user", content: "capture this request", timestamp: 0 }],
		} satisfies Context,
		{
			apiKey: "test-token",
			onPayload: payload => {
				if (payload && typeof payload === "object" && "$typeName" in payload) {
					resolve(payload as AgentRunRequest);
				} else {
					reject(new Error("Cursor payload was not an AgentRunRequest"));
				}
				// The payload callback runs before any transport is opened, so the
				// request contract can be captured without a network connection.
				throw new Error("stop after capturing Cursor payload");
			},
		},
	);
	return promise;
}

describe("Cursor requested model wire translation", () => {
	it.each([
		[
			"gpt-5.4-mini-low",
			{ modelId: "gpt-5.4-mini", parameters: [{ id: "reasoning", value: "low" }], translated: true },
		],
		[
			"gpt-5.6-sol-high",
			{ modelId: "gpt-5.6-sol", parameters: [{ id: "reasoning", value: "high" }], translated: true },
		],
		[
			"gpt-5.6-sol-xhigh-fast",
			{
				modelId: "gpt-5.6-sol-fast",
				parameters: [{ id: "reasoning", value: "xhigh" }],
				translated: true,
			},
		],
		[
			"gpt-5.1-codex-max-high",
			{ modelId: "gpt-5.1-codex-max", parameters: [{ id: "reasoning", value: "high" }], translated: true },
		],
	])("translates %s to Cursor requestedModel fields", (id, expected) => {
		const resolved = resolveCursorWireModelForTest(cursorModel(id));
		expect({
			modelId: resolved.modelId,
			parameters: resolved.parameters.map(parameter => ({ id: parameter.id, value: parameter.value })),
			translated: resolved.translated,
		}).toEqual(expected);
	});

	it.each([
		"gpt-5.6-sol-fast",
		"gpt-5.6-sol",
		"gpt-5.6-sol-none",
		"gpt-5.6-sol-none-fast",
		"gpt-5.1-codex-max",
		"gpt-5.1-codex-max-fast",
		"native",
		"claude-sonnet-4-5",
	])("passes through %s without a requested model translation", id => {
		const resolved = resolveCursorWireModelForTest(cursorModel(id));
		expect({
			modelId: resolved.modelId,
			parameters: resolved.parameters.map(parameter => ({ id: parameter.id, value: parameter.value })),
			translated: resolved.translated,
		}).toEqual({
			modelId: id,
			parameters: [],
			translated: false,
		});
	});

	it.each([
		"gpt-5.6-sol-fast",
		"gpt-5.6-sol",
		"gpt-5.6-sol-none",
		"gpt-5.1-codex-max",
		"native",
		"claude-sonnet-4-5",
	])("omits requestedModel from the captured AgentRunRequest for native/pass-through %s", async id => {
		const payload = await captureCursorRequest(cursorModel(id));
		expect(payload.modelDetails?.modelId).toBe(id);
		expect(payload.requestedModel).toBeUndefined();
	});
});
