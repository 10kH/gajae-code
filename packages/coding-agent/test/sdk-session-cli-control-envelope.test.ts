import { describe, expect, test } from "bun:test";
import { controlRequestFrame } from "../src/sdk/cli/session-cli";

describe("sdk session raw control envelope", () => {
	test("forwards terminal abort authority as envelope flags, not input fields", () => {
		const input = { mode: "terminal", scope: "owned", operator: true };
		expect(
			controlRequestFrame("turn.abort", input, {
				confirm: true,
				idempotencyKey: "gajae-abort-test-key",
			}),
		).toEqual({
			type: "control_request",
			operation: "turn.abort",
			input,
			confirm: true,
			idempotencyKey: "gajae-abort-test-key",
		});
		expect(input).toEqual({ mode: "terminal", scope: "owned", operator: true });
	});

	test("omits an absent idempotency key for ordinary controls", () => {
		expect(controlRequestFrame("thinking.cycle", {}, { confirm: false })).toEqual({
			type: "control_request",
			operation: "thinking.cycle",
			input: {},
			confirm: false,
		});
	});
});
