import { describe, expect, it } from "bun:test";
import {
	renderSpawnTable,
	runSdkSpawn,
	safeSpawnRender,
	SdkMasterCliError,
} from "@gajae-code/coding-agent/sdk/cli/master-cli";

const task = "secret-task-fixture";
const capability = "secret-capability-fixture";

const masterEnv = { GJC_MASTER_CAPABILITY: capability, GJC_SESSION_ID: "master-cli-owner" };
const epoch = async () => "epoch-cli";

describe("gjc sdk spawn CLI", () => {
	it("requires --cwd and --prompt", async () => {
		await expect(runSdkSpawn({ prompt: task }, { env: masterEnv, resolveAttestationEpoch: epoch })).rejects.toMatchObject({
			code: "invalid_input",
			exitCode: 2,
		});
		await expect(runSdkSpawn({ cwd: "/tmp" }, { env: masterEnv, resolveAttestationEpoch: epoch })).rejects.toMatchObject({
			code: "invalid_input",
			exitCode: 2,
		});
	});

	it("refuses without a live master context", async () => {
		await expect(
			runSdkSpawn({ cwd: "/tmp", prompt: task }, { env: {}, resolveAttestationEpoch: epoch }),
		).rejects.toMatchObject({ code: "master_context_required" });
		await expect(
			runSdkSpawn(
				{ cwd: "/tmp", prompt: task },
				{ env: masterEnv, resolveAttestationEpoch: async () => undefined },
			),
		).rejects.toMatchObject({ code: "master_context_required" });
	});

	it("dispatches with a fresh idempotency key and the transient capability", async () => {
		const keys: string[] = [];
		const inputs: Record<string, unknown>[] = [];
		const dispatch = async (_agentDir: string, input: Record<string, unknown>, idempotencyKey: string) => {
			keys.push(idempotencyKey);
			inputs.push(input);
			return {
				ok: true,
				result: {
					code: "spawn_accepted",
					claimId: "claim-1",
					sessionId: "child-1",
					substrateKind: "tmux",
					seed: { phase: "accepted", clientRef: "ref-1", commandId: "cmd-1", turnId: "turn-1", status: "accepted" },
				},
			};
		};
		const deps = { env: masterEnv, resolveAttestationEpoch: epoch, dispatch };
		const first = await runSdkSpawn({ cwd: "/tmp", prompt: task, agentDir: "/tmp/agent" }, deps);
		const second = await runSdkSpawn({ cwd: "/tmp", prompt: task, agentDir: "/tmp/agent" }, deps);
		expect(keys).toHaveLength(2);
		expect(keys[0]).not.toBe(keys[1]);
		expect(inputs[0]).toMatchObject({
			task,
			masterCapability: capability,
			ownerSessionId: "master-cli-owner",
			attestationEpoch: "epoch-cli",
			cwd: "/tmp",
		});
		expect(first.exitCode).toBe(0);
		expect(second.rendered.code).toBe("spawn_accepted");
	});

	it("renders only safe fields for every outcome and never echoes input", async () => {
		const outcomes: unknown[] = [
			{
				ok: true,
				result: {
					code: "spawn_accepted",
					claimId: "claim-1",
					sessionId: "child-1",
					substrateKind: "headless",
					seed: { phase: "accepted", clientRef: "ref-1", status: "accepted" },
					task,
					masterCapability: capability,
				},
			},
			{ ok: false, error: { code: "spawn_in_progress", message: "session.spawn is dispatching" } },
			{ ok: false, error: { code: "terminal_uncertain", message: "session.spawn outcome is uncertain" } },
			{ ok: false, error: { code: "idempotency_conflict", message: "idempotency key conflicts" } },
		];
		for (const outcome of outcomes) {
			const { rendered, exitCode } = safeSpawnRender(outcome);
			const text = `${JSON.stringify(rendered)}\n${renderSpawnTable(rendered)}`;
			expect(text).not.toContain(task);
			expect(text).not.toContain(capability);
			if ((outcome as { ok: boolean }).ok) {
				expect(exitCode).toBe(0);
				// Unsafe extra fields are dropped by the allowlist projection.
				expect(Object.keys(rendered).sort()).toEqual(["claimId", "code", "seed", "sessionId", "substrateKind"]);
			} else {
				expect(exitCode).toBe(1);
				expect(rendered.error?.code).toBeDefined();
			}
		}
	});

	it("exposes typed errors for scripting", () => {
		const error = new SdkMasterCliError("master_context_required", "no master", 1);
		expect(error.code).toBe("master_context_required");
		expect(error.exitCode).toBe(1);
	});
});
