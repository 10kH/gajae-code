import { expect, test } from "bun:test";

import { waitForTerminalStatus } from "../src/sdk/cli/session-cli";
import type { SessionAttachment, SessionRouter } from "../src/sdk/router";
import { SESSION_REQUEST_TIMEOUT_MS } from "../src/sdk/session-reconnect";

const SESSION_ID = "wait-budget-session";

function statusRouter(): { router: SessionRouter; budgets: (number | undefined)[] } {
	const budgets: (number | undefined)[] = [];
	const attachment: SessionAttachment = {
		sessionId: SESSION_ID,
		generation: 1,
		isCurrent: () => true,
		send: async () => {},
	};
	const router = {
		attachment: () => attachment,
		request: async (
			_sessionId: string,
			_frame: Record<string, unknown>,
			_generation?: number,
			_attachment?: SessionAttachment,
			options?: { timeoutMs?: number },
		) => {
			budgets.push(options?.timeoutMs);
			// A host that never settles the turn: the wait window, not the reply
			// budget, has to be what ends this loop.
			return { ok: true, result: { status: "in_flight" } };
		},
	} as unknown as SessionRouter;
	return { router, budgets };
}

test("send --wait polls turn.result inside its own wait window, not the session reply budget", async () => {
	const { router, budgets } = statusRouter();
	const waitMs = 300;
	const started = Date.now();
	const outcome = await waitForTerminalStatus(router, SESSION_ID, "client-ref", waitMs);
	const elapsed = Date.now() - started;

	expect(outcome).toMatchObject({ terminal: false, status: "in_flight" });
	expect(budgets.length).toBeGreaterThanOrEqual(2);
	// Without a per-poll budget every status query inherits the Router default, so a
	// wedged reply would outlive the wait the caller asked for.
	for (const timeoutMs of budgets) {
		expect(timeoutMs).toBeDefined();
		expect(timeoutMs!).toBeGreaterThan(0);
		expect(timeoutMs!).toBeLessThanOrEqual(waitMs);
		expect(timeoutMs!).toBeLessThan(SESSION_REQUEST_TIMEOUT_MS);
	}
	// Later polls get the remainder, never a fresh window.
	for (let index = 1; index < budgets.length; index++)
		expect(budgets[index]!).toBeLessThanOrEqual(budgets[index - 1]!);
	expect(elapsed).toBeLessThan(SESSION_REQUEST_TIMEOUT_MS);
});

test("an unbounded wait leaves the status poll on the transport default", async () => {
	const { router, budgets } = statusRouter();
	const settled = await Promise.race([
		waitForTerminalStatus(router, SESSION_ID, "client-ref", undefined).then(() => "returned" as const),
		Bun.sleep(250).then(() => "still-polling" as const),
	]);

	expect(settled).toBe("still-polling");
	expect(budgets.length).toBeGreaterThanOrEqual(1);
	expect(budgets.every(timeoutMs => timeoutMs === undefined)).toBe(true);
});
