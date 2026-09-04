import { describe, expect, it } from "bun:test";
import { lookupSessionApiKey, resolveLiveSessionApiKeyModel } from "../src/sdk/session-api-key";

describe("lookupSessionApiKey (#5081)", () => {
	it("uses getApiKey(model) when the active model matches the provider, even if getApiKeyForProvider is empty", async () => {
		const calls: string[] = [];
		const key = await lookupSessionApiKey(
			{
				async getApiKey(model) {
					calls.push(`model:${model.provider}`);
					return "model-scoped-token";
				},
				async getApiKeyForProvider(provider) {
					calls.push(`provider:${provider}`);
					return undefined;
				},
			},
			"anthropic",
			"parent-credential-scope",
			{ provider: "anthropic" },
		);
		expect(key).toBe("model-scoped-token");
		expect(calls).toEqual(["model:anthropic"]);
	});

	it("falls back to getApiKeyForProvider when the matching model-scoped lookup misses", async () => {
		const calls: string[] = [];
		const key = await lookupSessionApiKey(
			{
				async getApiKey(model) {
					calls.push(`model:${model.provider}`);
					return undefined;
				},
				async getApiKeyForProvider(provider) {
					calls.push(`provider:${provider}`);
					return "provider-token";
				},
			},
			"anthropic",
			"scope",
			{ provider: "anthropic" },
		);
		expect(key).toBe("provider-token");
		expect(calls).toEqual(["model:anthropic", "provider:anthropic"]);
	});

	it("falls back to getApiKeyForProvider when no model is bound", async () => {
		const key = await lookupSessionApiKey(
			{
				async getApiKey() {
					throw new Error("getApiKey should not run");
				},
				async getApiKeyForProvider() {
					return "provider-token";
				},
			},
			"anthropic",
			"scope",
			undefined,
		);
		expect(key).toBe("provider-token");
	});

	it("throws provider_unavailable without leaking a token when both lookups miss", async () => {
		try {
			await lookupSessionApiKey(
				{
					async getApiKey() {
						return undefined;
					},
					async getApiKeyForProvider() {
						return undefined;
					},
				},
				"anthropic",
				"scope",
				{ provider: "anthropic" },
			);
			throw new Error("expected throw");
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			expect((error as Error).message).toBe('No API key found for provider "anthropic"');
			expect((error as { code?: string }).code).toBe("provider_unavailable");
		}
	});

	it("prefers the live model over the captured construction model", () => {
		const live = { provider: "anthropic", baseUrl: "https://live.example" };
		const captured = { provider: "anthropic", baseUrl: "https://captured.example" };
		expect(resolveLiveSessionApiKeyModel(live, captured)).toEqual(live);
		expect(resolveLiveSessionApiKeyModel(undefined, captured)).toEqual(captured);
	});

	it("retries without sessionId when the scoped lookups miss (architect child vs --no-session)", async () => {
		const calls: string[] = [];
		const key = await lookupSessionApiKey(
			{
				async getApiKey(model, sessionId) {
					calls.push(`model:${model.provider}:${sessionId ?? "none"}`);
					return sessionId ? undefined : "broker-oauth-token";
				},
				async getApiKeyForProvider(provider, sessionId) {
					calls.push(`provider:${provider}:${sessionId ?? "none"}`);
					return undefined;
				},
			},
			"anthropic",
			"parent-sid",
			{ provider: "anthropic" },
		);
		expect(key).toBe("broker-oauth-token");
		expect(calls).toEqual([
			"model:anthropic:parent-sid",
			"provider:anthropic:parent-sid",
			"model:anthropic:none",
		]);
	});
});
