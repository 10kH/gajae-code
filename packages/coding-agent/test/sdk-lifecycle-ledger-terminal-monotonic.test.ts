import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { LifecycleLedger } from "../src/sdk/broker/lifecycle-ledger";

const roots: string[] = [];

async function temporaryAgentDir(): Promise<string> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-ledger-terminal-monotonic-"));
	roots.push(root);
	return root;
}

afterEach(async () => {
	for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});

describe("lifecycle ledger terminal monotonicity", () => {
	it("does not downgrade a proven terminal row to terminal_uncertain", async () => {
		const agentDir = await temporaryAgentDir();
		const ledger = await new LifecycleLedger(agentDir).open();
		const response = { ok: true, result: { sessionId: "S" } };
		await ledger.begin("create-S", "create-S-request");
		await ledger.transition("create-S", "effect_started");
		await ledger.transition("create-S", "terminal_ok", { response });
		const file = Bun.file(path.join(agentDir, "sdk", "lifecycle-ledger.jsonl"));
		const before = await file.text();

		const downgraded = await ledger.transition("create-S", "terminal_uncertain", {
			response: { ok: false, error: { code: "cleanup_pending", cleanup: { sessionId: "S" } } },
		});

		expect(downgraded.state).toBe("terminal_ok");
		expect(downgraded.response).toEqual(response);
		expect(await file.text()).toBe(before);
		const reopened = await new LifecycleLedger(agentDir).open();
		expect(reopened.get("create-S")?.state).toBe("terminal_ok");
		expect(reopened.get("create-S")?.response).toEqual(response);
	});

	it("preserves a proven error and permits resolution of uncertainty", async () => {
		const agentDir = await temporaryAgentDir();
		const ledger = await new LifecycleLedger(agentDir).open();
		await ledger.begin("request", "hash");
		await ledger.transition("request", "terminal_uncertain");
		await ledger.transition("request", "terminal_error", { response: { ok: false } });
		const result = await ledger.transition("request", "terminal_ok", { response: { ok: true } });
		expect(result.state).toBe("terminal_error");
		expect(result.response).toEqual({ ok: false });
		expect((await new LifecycleLedger(agentDir).open()).get("request")?.state).toBe("terminal_error");
	});

	it("keeps reporting a proven terminal result instead of a later uncertain one", async () => {
		const agentDir = await temporaryAgentDir();
		const ledger = await new LifecycleLedger(agentDir).open();
		await ledger.begin("delete-S", "delete-S-request");
		await ledger.transition("delete-S", "effect_started");
		await ledger.transition("delete-S", "terminal_ok", { response: { ok: true } });
		await ledger.transition("delete-S", "terminal_uncertain");

		// `terminal_uncertain` is accepted-after-uncertain only; a proven row stays replay.
		expect(await ledger.begin("delete-S", "delete-S-request")).toMatchObject({ kind: "replay" });
	});
});
