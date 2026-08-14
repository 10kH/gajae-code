import { afterEach, describe, expect, it } from "bun:test";
import { fetchOpenAICompatibleModels } from "../src/utils/discovery/openai-compatible";

const originalFetch = global.fetch;

afterEach(() => {
	global.fetch = originalFetch;
});

describe("fetchOpenAICompatibleModels contextWindow & maxTokens discovery", () => {
	it("parses max_model_len for contextWindow from OpenAI-compatible /v1/models response", async () => {
		global.fetch = (async (url: string | URL | Request) => {
			if (String(url).endsWith("/models")) {
				return new Response(
					JSON.stringify({
						object: "list",
						data: [
							{
								id: "Qwen3.6-35B-A3B-8bit",
								object: "model",
								max_model_len: 262144,
								max_tokens: 16384,
							},
						],
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				);
			}
			return new Response("Not found", { status: 404 });
		}) as typeof fetch;

		const models = await fetchOpenAICompatibleModels({
			api: "openai-completions",
			provider: "omlx",
			baseUrl: "http://127.0.0.1:8000/v1",
		});

		expect(models).not.toBeNull();
		expect(models!.length).toBe(1);
		expect(models![0].id).toBe("Qwen3.6-35B-A3B-8bit");
		expect(models![0].contextWindow).toBe(262144);
		expect(models![0].maxTokens).toBe(16384);
	});

	it("parses context_length as fallback when max_model_len is not present", async () => {
		global.fetch = (async (url: string | URL | Request) => {
			if (String(url).endsWith("/models")) {
				return new Response(
					JSON.stringify({
						data: [
							{
								id: "custom-local-model",
								context_length: 131072,
							},
						],
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				);
			}
			return new Response("Not found", { status: 404 });
		}) as typeof fetch;

		const models = await fetchOpenAICompatibleModels({
			api: "openai-completions",
			provider: "custom",
			baseUrl: "http://localhost:8080/v1",
		});

		expect(models).not.toBeNull();
		expect(models![0].contextWindow).toBe(131072);
	});
});
