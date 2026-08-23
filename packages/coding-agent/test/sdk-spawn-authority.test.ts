import { describe, expect, it } from "bun:test";
import { createHash, createHmac } from "node:crypto";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	isSpawnClaimV2,
	SpawnAuthorityStore,
} from "../src/sdk/broker/spawn-authority";
import { Broker } from "../src/sdk/broker/broker";

const identityKey = "a".repeat(64);
const bindingMac = "b".repeat(64);
const temp = () => fs.mkdtemp(path.join(os.tmpdir(), "gjc-spawn-authority-"));

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

		const journal = await Bun.file(recovered.file).text();
		const rows = journal.split("\n").filter(Boolean).map(line => Bun.JSON5.parse(line) as { claim: Record<string, unknown> });
		const latest = rows.at(-1)!;
		latest.claim.state = "dispatching";
		latest.claim.updatedAt = Number(latest.claim.updatedAt) + 1;
		const canonical = (value: unknown): string => {
			if (value === null || typeof value !== "object") return JSON.stringify(value);
			if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
			const record = value as Record<string, unknown>;
			return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
		};
		const integrity = createHmac("sha256", Buffer.from(identityKey, "hex")).update(canonical(latest.claim)).digest("hex");
		await fs.writeFile(recovered.file, `${journal}${JSON.stringify({ version: 1, claim: latest.claim, integrity })}\n`);
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
				masterCapabilityVerifier: {
					verifyMasterCapability: async (_ownerSessionId, rawCapability) => ({ allowed: rawCapability === capability }),
				},
			});
			await broker.start();
			try {
				const response = await broker.handleRequest(
					"session.spawn",
					{ task, masterCapability: capability, ownerSessionId: "master-1", attestationEpoch: "epoch-1", cwd: agentDir },
					"raw-idempotency-key",
				);
				expect(response).toMatchObject({ ok: true, result: { code: "spawn_admitted", phase: "prepared" } });
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
