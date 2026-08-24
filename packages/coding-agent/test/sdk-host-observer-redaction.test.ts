import { describe, expect, it } from "bun:test";
import {
	BROKER_RUNTIME_CLOSE_CAPABILITY_FIELD,
	redactBrokerRuntimeCloseCapability,
	redactObservedRequestContent,
} from "../src/sdk/host/control/runtime-gate";

/**
 * Diagnostic observers receive the request SHAPE, never caller content. A
 * spawned child's seed task travels through `turn.prompt` `input.text`, so an
 * observer that saw the raw frame would receive the task verbatim.
 */
describe("observed request redaction", () => {
	it("strips prompt text while preserving operation and correlation fields", () => {
		const frame = {
			type: "control_request",
			id: "req-1",
			operation: "turn.prompt",
			input: { text: "seed-task-plaintext", clientRef: "ref-1" },
		};
		const observed = redactObservedRequestContent(frame) as { input: Record<string, unknown> };
		expect(JSON.stringify(observed)).not.toContain("seed-task-plaintext");
		expect(observed.input.text).toBe("[redacted 19 chars]");
		expect(observed.input.clientRef).toBe("ref-1");
		expect(observed.operation).toBe("turn.prompt");
		expect(observed.id).toBe("req-1");
	});

	it("redacts every caller-content field without inventing absent ones", () => {
		const frame = {
			type: "control_request",
			operation: "skill.invoke",
			input: { name: "demo", args: { secret: "arg-content" }, answer: "answer-content", images: [1, 2] },
		};
		const observed = redactObservedRequestContent(frame) as { input: Record<string, unknown> };
		const rendered = JSON.stringify(observed);
		expect(rendered).not.toContain("arg-content");
		expect(rendered).not.toContain("answer-content");
		expect(observed.input.images).toBe("[redacted 2 items]");
		expect(observed.input.name).toBe("demo");
		expect(Object.hasOwn(observed.input, "text")).toBe(false);
	});

	it("leaves content-free frames untouched and composes with capability redaction", () => {
		const plain = { type: "control_request", operation: "turn.abort", input: { mode: "turn" } };
		expect(redactObservedRequestContent(plain)).toBe(plain);
		const closeFrame = {
			type: "control_request",
			operation: "session.close",
			input: { sessionId: "child", [BROKER_RUNTIME_CLOSE_CAPABILITY_FIELD]: "broker-only" },
		};
		const observed = redactObservedRequestContent(redactBrokerRuntimeCloseCapability(closeFrame)) as {
			input: Record<string, unknown>;
		};
		expect(JSON.stringify(observed)).not.toContain("broker-only");
		expect(observed.input.sessionId).toBe("child");
	});
});
