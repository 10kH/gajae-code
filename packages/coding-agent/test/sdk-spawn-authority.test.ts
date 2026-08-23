import { describe, expect, it } from "bun:test";
import { createHash, createHmac } from "node:crypto";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	isSpawnClaimV2,
	type SeedDeliveryV2,
	SpawnAuthorityStore,
	type SpawnClaimV2,
} from "../src/sdk/broker/spawn-authority";
import { getBrokerIdentityKey } from "../src/sdk/broker/identity";
import { Broker } from "../src/sdk/broker/broker";

const identityKey = "a".repeat(64);
const bindingMac = "b".repeat(64);
const temp = () => fs.mkdtemp(path.join(os.tmpdir(), "gjc-spawn-authority-"));

const spawnSubstrateFake = {
	launch: async () => ({
		ok: true as const,
		proof: { substrateKind: "headless" as const, providerIdentity: "test-provider", pid: 4242, processIncarnation: "inc-4242" },
	}),
	verify: async () => "verified" as const,
	close: async () => ({ ok: true }),
};
const spawnPromptLayerFake = {
	awaitRegistration: async (input: { childId: string }) => ({
		ok: true as const,
		registration: { sessionId: input.childId, endpointGeneration: 1, pid: 4242 },
	}),
	dispatch: async () => ({ kind: "accepted" as const, commandId: "cmd-1", turnId: "turn-1", acceptedAt: Date.now() }),
	reconcile: async () => ({ status: "terminal_ok" as const, commandId: "cmd-1", turnId: "turn-1" }),
};

describe("SpawnAuthorityStore", () => {
	it("creates one durable prepared claim for concurrent same-identity callers", async () => {
		const agentDir = await temp();
		const gate = Promise.withResolvers<void>();
		let blocked = false;
		const store = new SpawnAuthorityStore(agentDir, identityKey, {
			beforeSyncForTest: async () => {
				if (blocked) return;
				blocked = true;
				await gate.promise;
			},
		});
		await store.open();
		const first = store.claimOrJoin("identity", bindingMac);
		while (!blocked) await Bun.sleep(1);
		const second = store.claimOrJoin("identity", bindingMac);
		gate.resolve();
		const [owner, joiner] = await Promise.all([first, second]);
		expect(owner.kind).toBe("owner");
		expect(joiner.kind).toBe("in_progress");
		expect(owner.claim.claimId).toBe(joiner.claim.claimId);
		expect(owner.claim).toMatchObject({ state: "prepared", preSendLease: { status: "owned" } });
		expect((await Bun.file(store.file).text()).split("\n").filter(Boolean)).toHaveLength(1);
	});

	it("rejects a structural-binding mismatch without changing the claim", async () => {
		const agentDir = await temp();
		const store = new SpawnAuthorityStore(agentDir, identityKey);
		await store.open();
		const initial = await store.claimOrJoin("identity", bindingMac);
		await store.releaseOwner("identity");
		const conflict = await store.claimOrJoin("identity", "c".repeat(64));
		expect(initial.kind).toBe("owner");
		expect(conflict.kind).toBe("idempotency_conflict");
		expect(conflict.claim).toEqual(initial.claim);
		expect((await Bun.file(store.file).text()).split("\n").filter(Boolean)).toHaveLength(1);
	});

	it("rotates exactly one recovery lease for a prepared claim and refuses later states", async () => {
		const agentDir = await temp();
		const firstStore = new SpawnAuthorityStore(agentDir, identityKey);
		await firstStore.open();
		const first = await firstStore.claimOrJoin("identity", bindingMac);
		expect(first.kind).toBe("owner");
		const recovered = new SpawnAuthorityStore(agentDir, identityKey);
		await recovered.open();
		const [owner, joiner] = await Promise.all([
			recovered.claimOrJoin("identity", bindingMac),
			recovered.claimOrJoin("identity", bindingMac),
		]);
		expect(owner.kind).toBe("owner");
		expect(joiner.kind).toBe("in_progress");
		if (owner.kind !== "owner" || first.kind !== "owner") throw new Error("claim ownership was not granted");
		expect(owner.recovery).toBe(true);
		expect(owner.claim.preSendLease?.epoch).not.toBe(first.claim.preSendLease?.epoch);

		await recovered.persistTransition("identity", {
			claimId: owner.claim.claimId,
			from: "prepared",
			to: "substrate_starting",
			childId: "child-1",
		});
		await recovered.releaseOwner("identity");
		const restarted = new SpawnAuthorityStore(agentDir, identityKey);
		await restarted.open();
		expect((await restarted.claimOrJoin("identity", bindingMac)).kind).toBe("replay");
	});

	it("does not publish authority when fsync preparation fails", async () => {
		const agentDir = await temp();
		const store = new SpawnAuthorityStore(agentDir, identityKey, {
			beforeSyncForTest: () => {
				throw new Error("injected sync failure");
			},
		});
		await store.open();
		await expect(store.claimOrJoin("identity", bindingMac)).rejects.toThrow("injected sync failure");
		expect(store.claims()).toHaveLength(0);
	});

	it("strictly rejects sensitive or generic-hash claim fields", () => {
		const base = {
			version: 2,
			claimId: "claim",
			lifecycleIdentity: "identity",
			bindingMac,
			state: "prepared",
			createdAt: 1,
			updatedAt: 1,
		};
		expect(isSpawnClaimV2(base)).toBe(true);
		for (const field of ["task", "prompt", "rawCapability", "taskDigest", "idempotencyKey", "fingerprint", "requestHash", "endpointCredential", "childStderr"])
			expect(isSpawnClaimV2({ ...base, [field]: "forbidden" })).toBe(false);
	});

	describe("Broker spawn admission", () => {
		it("keeps low-entropy task and capability material out of claim, ledger, and response", async () => {
			const agentDir = await temp();
			const task = "task-0000";
			const capability = "capability-0000";
			const broker = new Broker({
				agentDir,
				spawnSubstrateProvider: spawnSubstrateFake,
				spawnPromptLayer: spawnPromptLayerFake,
				masterCapabilityVerifier: {
					verifyMasterCapability: async (_ownerSessionId, rawCapability, _attestationEpoch) => ({ allowed: rawCapability === capability }),
				},
			});
			await broker.start();
			try {
				const response = await broker.handleRequest(
					"session.spawn",
					{ task, masterCapability: capability, ownerSessionId: "master-1", attestationEpoch: "epoch-1", cwd: agentDir },
					"raw-idempotency-key",
				);
				expect(response).toMatchObject({ ok: true, result: { code: "spawn_accepted", seed: { phase: "accepted", status: "accepted" } } });
				const lookup = await broker.handleRequest(
					"broker.lookup_lifecycle",
					{ operation: "session.spawn", fingerprint: "not-a-spawn-fingerprint" },
					"raw-idempotency-key",
				);
				expect(lookup).toMatchObject({ ok: false, error: { code: "invalid_input" } });
				const artifacts = await Promise.all([
					Bun.file(path.join(agentDir, "sdk", "spawn-authority.jsonl")).text(),
					Bun.file(path.join(agentDir, "sdk", "lifecycle-ledger.jsonl")).text(),
				]);
				for (const candidate of [
					task,
					capability,
					createHash("sha256").update(task).digest("hex"),
					createHash("sha256").update(capability).digest("hex"),
					createHmac("sha256", "test-key").update(task).digest("hex"),
					createHmac("sha256", "test-key").update(capability).digest("hex"),
					"raw-idempotency-key",
				]) {
					expect(artifacts.join("\n")).not.toContain(candidate);
					expect(JSON.stringify(response)).not.toContain(candidate);
				}
			} finally {
				await broker.stop();
			}
		});
	});
});

describe("Broker spawn flow driver", () => {
	const verifier = {
		verifyMasterCapability: async () => ({ allowed: true }),
	};
	const spawnInput = (task = "flow-task") => ({
		task,
		masterCapability: "flow-capability",
		ownerSessionId: "master-flow",
		attestationEpoch: "epoch-flow",
		cwd: process.cwd(),
	});
	async function latestClaim(agentDir: string): Promise<SpawnClaimV2 | undefined> {
		const source = await Bun.file(path.join(agentDir, "sdk", "spawn-authority.jsonl")).text();
		const lines = source.split("\n").filter(Boolean);
		const last = lines.at(-1);
		if (!last) return undefined;
		return (JSON.parse(last) as { claim: SpawnClaimV2 }).claim;
	}

	it("fences every effect behind a durable transition and dispatches exactly once", async () => {
		const agentDir = await temp();
		const observed: { atLaunch?: string; atDispatch?: string; leaseAtDispatch?: string; launches: number; dispatches: number } = {
			launches: 0,
			dispatches: 0,
		};
		const broker = new Broker({
			agentDir,
			masterCapabilityVerifier: verifier,
			spawnSubstrateProvider: {
				launch: async () => {
					observed.launches += 1;
					observed.atLaunch = (await latestClaim(agentDir))?.state;
					return {
						ok: true as const,
						proof: { substrateKind: "headless" as const, providerIdentity: "flow-provider", pid: 999, processIncarnation: "inc-999" },
					};
				},
				verify: async () => "verified" as const,
				close: async () => ({ ok: true }),
			},
			spawnPromptLayer: {
				awaitRegistration: async (input: { childId: string }) => ({
					ok: true as const,
					registration: { sessionId: input.childId, endpointGeneration: 1, pid: 999 },
				}),
				dispatch: async () => {
					observed.dispatches += 1;
					const claim = await latestClaim(agentDir);
					observed.atDispatch = claim?.state;
					observed.leaseAtDispatch = claim?.preSendLease?.status;
					return { kind: "accepted" as const, commandId: "cmd-flow", turnId: "turn-flow", acceptedAt: 1234 };
				},
				reconcile: async () => ({ status: "unknown" as const }),
			},
		});
		await broker.start();
		try {
			const [first, second] = await Promise.all([
				broker.handleRequest("session.spawn", spawnInput(), "flow-key"),
				broker.handleRequest("session.spawn", spawnInput(), "flow-key"),
			]);
			const responses = [first, second] as { ok: boolean }[];
			const success = responses.filter(response => response.ok);
			expect(success).toHaveLength(1);
			expect(success[0]).toMatchObject({
				ok: true,
				result: { code: "spawn_accepted", substrateKind: "headless", seed: { phase: "accepted", commandId: "cmd-flow", turnId: "turn-flow" } },
			});
			expect(responses.find(response => !response.ok)).toMatchObject({
				ok: false,
				error: { code: expect.stringMatching(/^(spawn_in_progress|idempotency_conflict)$/) },
			});
			expect(observed.launches).toBe(1);
			expect(observed.dispatches).toBe(1);
			expect(observed.atLaunch).toBe("substrate_starting");
			expect(observed.atDispatch).toBe("dispatching");
			expect(observed.leaseAtDispatch).toBe("consumed");
			const replay = await broker.handleRequest("session.spawn", spawnInput(), "flow-key");
			expect(replay).toMatchObject({ ok: true, result: { code: "spawn_replayed" } });
			expect(observed.launches).toBe(1);
			expect(observed.dispatches).toBe(1);
		} finally {
			await broker.stop();
		}
	});

	it("retains dispatch uncertainty and replays only through Q26", async () => {
		const agentDir = await temp();
		let dispatches = 0;
		let reconciles = 0;
		const broker = new Broker({
			agentDir,
			masterCapabilityVerifier: verifier,
			spawnSubstrateProvider: {
				launch: async () => ({
					ok: true as const,
					proof: { substrateKind: "headless" as const, providerIdentity: "flow-provider", pid: 998, processIncarnation: "inc-998" },
				}),
				verify: async () => "verified" as const,
				close: async () => ({ ok: true }),
			},
			spawnPromptLayer: {
				awaitRegistration: async (input: { childId: string }) => ({
					ok: true as const,
					registration: { sessionId: input.childId, endpointGeneration: 1, pid: 998 },
				}),
				dispatch: async () => {
					dispatches += 1;
					return { kind: "uncertain" as const };
				},
				reconcile: async () => {
					reconciles += 1;
					return { status: "terminal_ok" as const, commandId: "cmd-q26", turnId: "turn-q26", acceptedAt: 77 };
				},
			},
		});
		await broker.start();
		try {
			const first = await broker.handleRequest("session.spawn", spawnInput(), "uncertain-key");
			expect(first).toMatchObject({ ok: false, error: { code: "terminal_uncertain" } });
			expect(dispatches).toBe(1);
			// The uncertain claim is terminal for new task input; Q26 replay path is
			// exercised for dispatching claims via broker restart recovery below.
			const again = await broker.handleRequest("session.spawn", spawnInput("different-task"), "uncertain-key");
			expect(again).toMatchObject({ ok: false, error: { code: "terminal_uncertain" } });
			expect(dispatches).toBe(1);
			expect(reconciles).toBe(0);
		} finally {
			await broker.stop();
		}
	});

	it("rejects before handoff, closes the substrate exactly, and stays terminal", async () => {
		const agentDir = await temp();
		let closes = 0;
		const broker = new Broker({
			agentDir,
			masterCapabilityVerifier: verifier,
			spawnSubstrateProvider: {
				launch: async () => ({
					ok: true as const,
					proof: { substrateKind: "headless" as const, providerIdentity: "flow-provider", pid: 997, processIncarnation: "inc-997" },
				}),
				verify: async () => "verified" as const,
				close: async () => {
					closes += 1;
					return { ok: true };
				},
			},
			spawnPromptLayer: {
				awaitRegistration: async (input: { childId: string }) => ({
					ok: true as const,
					registration: { sessionId: input.childId, endpointGeneration: 1, pid: 997 },
				}),
				dispatch: async () => ({ kind: "pre_send_rejected" as const }),
				reconcile: async () => ({ status: "unknown" as const }),
			},
		});
		await broker.start();
		try {
			const first = await broker.handleRequest("session.spawn", spawnInput(), "rejected-key");
			expect(first).toMatchObject({ ok: false, error: { code: "spawn_failed" } });
			expect(closes).toBe(1);
			expect((await latestClaim(agentDir))?.state).toBe("pre_send_rejected");
			const replay = await broker.handleRequest("session.spawn", spawnInput(), "rejected-key");
			expect(replay).toMatchObject({ ok: false, error: { code: "spawn_failed" } });
			expect(closes).toBe(1);
		} finally {
			await broker.stop();
		}
	});

	it("recovers restart windows without a replacement child or second prompt", async () => {
		const agentDir = await temp();
		const brokerKey = await getBrokerIdentityKey(agentDir);
		const store = new SpawnAuthorityStore(agentDir, brokerKey);
		await store.open();
		const mac = "c".repeat(64);
		// substrate_starting without exact proof: retained uncertainty.
		const starting = await store.claimOrJoin("recover-starting", mac);
		if (starting.kind !== "owner") throw new Error("expected owner");
		await store.persistTransition("recover-starting", {
			claimId: starting.claim.claimId,
			from: "prepared",
			to: "substrate_starting",
			childId: "child-starting",
		});
		// dispatching: Q26-only reconciliation to accepted.
		const dispatching = await store.claimOrJoin("recover-dispatching", mac);
		if (dispatching.kind !== "owner") throw new Error("expected owner");
		await store.persistTransition("recover-dispatching", {
			claimId: dispatching.claim.claimId,
			from: "prepared",
			to: "substrate_starting",
			childId: "child-dispatching",
		});
		const authorityNow = Date.now();
		await store.persistTransition("recover-dispatching", {
			claimId: dispatching.claim.claimId,
			from: "substrate_starting",
			to: "authority_active",
			childId: "child-dispatching",
			authority: {
				version: 1,
				authorityId: "authority-dispatching",
				claimId: dispatching.claim.claimId,
				childId: "child-dispatching",
				ownerSessionId: "master-flow",
				lifecycleIdentity: "recover-dispatching",
				substrateKind: "headless",
				providerIdentity: "flow-provider",
				pid: 996,
				processIncarnation: "inc-996",
				closeState: "active",
				createdAt: authorityNow,
				updatedAt: authorityNow,
			},
		});
		const seed: SeedDeliveryV2 = { version: 2, phase: "prepared", clientRef: "client-ref-q26" };
		await store.persistTransition("recover-dispatching", {
			claimId: dispatching.claim.claimId,
			from: "authority_active",
			to: "seed_prepared",
			seed,
		});
		const prepared = (await store.claimOrJoin("recover-dispatching", mac)) as { kind: string; claim: SpawnClaimV2 };
		await store.persistTransition("recover-dispatching", {
			claimId: dispatching.claim.claimId,
			from: "seed_prepared",
			to: "dispatching",
			leaseEpoch: prepared.claim.preSendLease?.epoch ?? "",
			seed: { ...seed, phase: "dispatching" },
		});
		let launches = 0;
		let dispatchesAfterRestart = 0;
		const reconciled: string[] = [];
		const broker = new Broker({
			agentDir,
			masterCapabilityVerifier: verifier,
			spawnSubstrateProvider: {
				launch: async () => {
					launches += 1;
					return { ok: false as const, code: "substrate_unavailable" as const, message: "no launches during recovery" };
				},
				verify: async () => "verified" as const,
				close: async () => ({ ok: true }),
			},
			spawnPromptLayer: {
				awaitRegistration: async () => ({ ok: false as const }),
				dispatch: async () => {
					dispatchesAfterRestart += 1;
					return { kind: "uncertain" as const };
				},
				reconcile: async (input: { clientRef: string }) => {
					reconciled.push(input.clientRef);
					return { status: "terminal_ok" as const, commandId: "cmd-recovered", turnId: "turn-recovered", acceptedAt: 42 };
				},
			},
		});
		await broker.start();
		try {
			const recovered = new SpawnAuthorityStore(agentDir, brokerKey);
			await recovered.open();
			expect(recovered.claim("recover-starting")?.state).toBe("uncertain");
			const advanced = recovered.claim("recover-dispatching");
			expect(advanced?.state).toBe("accepted");
			expect(advanced?.seed).toMatchObject({ phase: "accepted", clientRef: "client-ref-q26", commandId: "cmd-recovered", turnId: "turn-recovered" });
			expect(reconciled).toEqual(["client-ref-q26"]);
			expect(launches).toBe(0);
			expect(dispatchesAfterRestart).toBe(0);
		} finally {
			await broker.stop();
		}
	});
});
