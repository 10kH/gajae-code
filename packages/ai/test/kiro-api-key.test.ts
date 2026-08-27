import { describe, expect, test } from "bun:test";
import { isKiroApiKey, parseKiroApiEvents, toKiroModelId } from "../src/providers/kiro-api-key";

describe("isKiroApiKey", () => {
	test("accepts ksk_ keys", () => {
		expect(isKiroApiKey("ksk_abc")).toBe(true);
		expect(isKiroApiKey("  ksk_abc")).toBe(true);
	});
	test("rejects oauth bearers and empty values", () => {
		expect(isKiroApiKey(undefined)).toBe(false);
		expect(isKiroApiKey("")).toBe(false);
		expect(isKiroApiKey("eyJhbGciOi")).toBe(false);
		expect(isKiroApiKey("AWS_BEARER")).toBe(false);
	});
});

describe("toKiroModelId", () => {
	test("converts dash versions to Kiro dot form", () => {
		expect(toKiroModelId("claude-opus-4-8")).toBe("claude-opus-4.8");
		expect(toKiroModelId("claude-opus-4.8")).toBe("claude-opus-4.8");
		expect(toKiroModelId("auto")).toBe("auto");
	});
});

describe("parseKiroApiEvents", () => {
	test("parses content frames and leaves incomplete JSON", () => {
		const { events, remaining } = parseKiroApiEvents('{"content":"hi"}{"content":');
		expect(events).toEqual([{ type: "content", data: "hi" }]);
		expect(remaining).toBe('{"content":');
	});
	test("parses toolUse frames", () => {
		const { events } = parseKiroApiEvents('{"name":"read","toolUseId":"t1","input":"{}","stop":true}');
		expect(events[0]).toEqual({
			type: "toolUse",
			data: { name: "read", toolUseId: "t1", input: "{}", stop: true },
		});
	});
});
