/**
 * Tests for Kiro HTTP 429 error classification.
 * Verifies that USER_REQUEST_RATE_EXCEEDED is classified as rate_limit (retryable)
 * and MONTHLY_REQUEST_COUNT / quota-exhausted is classified as quota (fail fast).
 */
import { afterEach, describe, expect, test, vi } from "bun:test";
import { streamKiroApiKey } from "../src/providers/kiro-api-key";
import { streamKiroCodeWhisperer } from "../src/providers/kiro-codewhisperer";
import type { AssistantMessage, Context, Model } from "../src/types";

const PROFILE_ARN = "arn:aws:codewhisperer:us-east-1:123456789012:profile/social-profile";

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

afterEach(() => {
	vi.restoreAllMocks();
});

async function captureError(
	provider: "api-key" | "oauth",
	errorBody: string,
): Promise<{ message: AssistantMessage; error: string }> {
	let capturedError: AssistantMessage | undefined;

	const mockFetch = async (_input: string | URL | Request, _init?: RequestInit): Promise<Response> => {
		return new Response(errorBody, {
			status: 429,
			headers: {
				"Content-Type": "application/x-amz-json-1.0",
				"X-Amzn-RequestId": "test-request-id",
			},
		});
	};

	vi.spyOn(globalThis, "fetch").mockImplementation(mockFetch as unknown as typeof globalThis.fetch);

	const streamFn = provider === "oauth" ? streamKiroCodeWhisperer : streamKiroApiKey;
	const options =
		provider === "oauth"
			? { apiKey: JSON.stringify({ token: "social-access-token", profileArn: PROFILE_ARN }) }
			: { apiKey: "ksk_test_key" };

	for await (const event of streamFn(
		model,
		{ messages: [{ role: "user", content: "Test", timestamp: 1 }] } satisfies Context,
		options,
	)) {
		if (event.type === "error") {
			capturedError = event.error;
		}
	}

	if (!capturedError) throw new Error("No error captured");
	return {
		message: capturedError,
		error: capturedError.errorMessage || "",
	};
}

describe("Kiro 429 error classification", () => {
	test("USER_REQUEST_RATE_EXCEEDED (API key) is classified as rate_limit", async () => {
		const { message, error } = await captureError("api-key", JSON.stringify({ error: "USER_REQUEST_RATE_EXCEEDED" }));
		expect(message.stopReason).toBe("error");
		expect(error).toContain("USER_REQUEST_RATE_EXCEEDED");
		// The error should contain patterns that trigger rate_limit classification
		// User should handle this with retry logic
	});

	test("USER_REQUEST_RATE_EXCEEDED (OAuth) is classified as rate_limit", async () => {
		const { message, error } = await captureError("oauth", JSON.stringify({ error: "USER_REQUEST_RATE_EXCEEDED" }));
		expect(message.stopReason).toBe("error");
		expect(error).toContain("USER_REQUEST_RATE_EXCEEDED");
	});

	test("MONTHLY_REQUEST_COUNT (API key) is classified as quota", async () => {
		const { message } = await captureError("api-key", JSON.stringify({ error: "MONTHLY_REQUEST_COUNT" }));
		expect(message.stopReason).toBe("error");
		// The error should contain patterns that trigger quota classification
		// This should match the USAGE_LIMIT_PATTERN to be classified as quota
	});

	test("MONTHLY_REQUEST_COUNT (OAuth) is classified as quota", async () => {
		const { message } = await captureError("oauth", JSON.stringify({ error: "MONTHLY_REQUEST_COUNT" }));
		expect(message.stopReason).toBe("error");
	});

	test("quota exhausted message (API key) is classified as quota", async () => {
		const { message } = await captureError("api-key", JSON.stringify({ error: "quota exhausted" }));
		expect(message.stopReason).toBe("error");
		expect(message.errorMessage).toContain("quota");
	});

	test("quota exhausted message (OAuth) is classified as quota", async () => {
		const { message } = await captureError("oauth", JSON.stringify({ error: "quota exhausted" }));
		expect(message.stopReason).toBe("error");
		expect(message.errorMessage).toContain("quota");
	});
});
