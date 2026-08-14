import { describe, expect, test } from "bun:test";
import {
	InboundReactionSequencer,
	inboundReactionRetractPayload,
	inboundReactionSetPayload,
} from "../src/sdk/bus/inbound-reaction-ordering";

/** Deferred gate: records the transition and settles only when released. */
interface GatedCall {
	name: string;
	release: () => void;
}

function gatedEffect(name: string): { effect: () => Promise<void>; call: GatedCall } {
	let release!: () => void;
	const settled = new Promise<void>(resolve => {
		release = resolve;
	});
	return {
		effect: async () => {
			await settled;
		},
		call: { name, release },
	};
}

describe("inbound reaction transition ordering", () => {
	test("concurrent accepted then consumed serialize and the terminal state stays final", async () => {
		const sequencer = new InboundReactionSequencer();
		const order: string[] = [];
		const accepted = gatedEffect("queued");
		const consumed = gatedEffect("consumed");

		// Router-style concurrent dispatch: neither callback awaits the other.
		const acceptedPromise = sequencer.apply(701, {
			terminal: false,
			effect: async () => {
				order.push("queued");
				await accepted.effect();
			},
		});
		const consumedPromise = sequencer.apply(701, {
			terminal: true,
			effect: async () => {
				order.push("consumed");
				await consumed.effect();
			},
		});

		// Only the first (accepted) transition may run; consumed is queued behind it.
		await Bun.sleep(20);
		expect(order).toEqual(["queued"]);
		expect(sequencer.isTerminal(701)).toBe(false);

		accepted.call.release();
		await Bun.sleep(20);
		expect(order).toEqual(["queued", "consumed"]);
		consumed.call.release();
		await Promise.all([acceptedPromise, consumedPromise]);
		expect(sequencer.isTerminal(701)).toBe(true);
	});

	test("a late accepted ack after a terminal retraction is a no-op", async () => {
		const sequencer = new InboundReactionSequencer();
		const effects: string[] = [];

		await sequencer.apply(702, {
			terminal: true,
			effect: async () => {
				effects.push("retract");
			},
		});
		expect(sequencer.isTerminal(702)).toBe(true);

		// A stale accepted ack arriving afterwards must not run its effect.
		await sequencer.apply(702, {
			terminal: false,
			effect: async () => {
				effects.push("queued");
			},
		});
		expect(effects).toEqual(["retract"]);
	});

	test("a failed terminal transition does not close the update", async () => {
		const sequencer = new InboundReactionSequencer();
		const effects: string[] = [];
		await sequencer
			.apply(703, {
				terminal: true,
				effect: async () => {
					effects.push("failing-retract");
					throw new Error("bot api unavailable");
				},
			})
			.catch(() => undefined);
		expect(sequencer.isTerminal(703)).toBe(false);
		// The update remains correctable: a later transition still runs.
		await sequencer.apply(703, {
			terminal: true,
			effect: async () => {
				effects.push("retry-retract");
			},
		});
		expect(effects).toEqual(["failing-retract", "retry-retract"]);
		expect(sequencer.isTerminal(703)).toBe(true);
	});

	test("distinct update ids do not serialize against each other", async () => {
		const sequencer = new InboundReactionSequencer();
		const order: string[] = [];
		const first = gatedEffect("first");

		const firstPromise = sequencer.apply(801, {
			terminal: false,
			effect: async () => {
				order.push("first");
				await first.effect();
			},
		});
		await Bun.sleep(20);
		// A different update id runs while 801 is still gated.
		await sequencer.apply(802, {
			terminal: true,
			effect: async () => {
				order.push("second");
			},
		});
		expect(order).toEqual(["first", "second"]);
		first.call.release();
		await firstPromise;
	});

	test("set payload maps an emoji marker to the Bot API reaction array", () => {
		expect(inboundReactionSetPayload("42", 5001, "👀")).toEqual({
			chat_id: "42",
			message_id: 5001,
			reaction: [{ type: "emoji", emoji: "👀" }],
		});
		expect(inboundReactionSetPayload("42", 5002, "✅")).toEqual({
			chat_id: "42",
			message_id: 5002,
			reaction: [{ type: "emoji", emoji: "✅" }],
		});
	});

	test("retract payload is the empty reaction array, never an empty emoji string", () => {
		expect(inboundReactionRetractPayload("42", 5003)).toEqual({
			chat_id: "42",
			message_id: 5003,
			reaction: [],
		});
		const serialized = JSON.stringify(inboundReactionRetractPayload("42", 5003));
		expect(serialized).toContain('"reaction":[]');
		expect(serialized).not.toContain('{"type":"emoji","emoji":""}');
	});
});
