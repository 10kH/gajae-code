import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	createSpawnSubstrateProvider,
	type SpawnSubstrateProviderDependencies,
} from "../src/sdk/broker/spawn-substrate";
import type { SpawnSubstrateLaunchSpec, SpawnSubstrateProof } from "../src/sdk/broker/spawn-authority";
import type { ManagedTmuxLaunchProof } from "../src/gjc-runtime/tmux-sessions";

const temporaryDirectories: string[] = [];

const launchSpec = (cwd = "/repo"): SpawnSubstrateLaunchSpec => ({
	childSessionId: "child-session",
	cwd,
	argv: ["child-command", "--safe"],
	env: { CHILD_SETTING: "enabled" },
});

const managedProof = (overrides: Partial<ManagedTmuxLaunchProof> = {}): ManagedTmuxLaunchProof => ({
	name: "managed-child",
	nativeSessionId: "$42",
	serverPid: 700,
	serverStartTime: "darwin:100",
	ownerGeneration: "owner-generation",
	sessionId: "child-session",
	sessionStateFile: "/repo/.gjc/_session-child-session/runtime/tmux-sessions/managed-child.json",
	pid: 701,
	providerIdentity: '["native-tmux","tmux",null,null]',
	...overrides,
});

const substrateProof = (managed = managedProof()): SpawnSubstrateProof => ({
	substrateKind: "tmux",
	providerIdentity: managed.providerIdentity,
	nativeSessionId: managed.nativeSessionId,
	pid: managed.pid,
	processIncarnation: "darwin:701",
	stateFileProof: {
		sessionName: managed.name,
		sessionId: managed.sessionId,
		sessionStateFile: managed.sessionStateFile,
		ownerGeneration: managed.ownerGeneration,
		serverPid: managed.serverPid,
		serverStartTime: managed.serverStartTime,
	},
});

function managedDependencies(
	overrides: Partial<SpawnSubstrateProviderDependencies> = {},
): SpawnSubstrateProviderDependencies {
	return {
		platform: "darwin",
		selectMultiplexer: () => "tmux",
		launchManaged: () => managedProof(),
		verifyManaged: () => "verified",
		closeManaged: async () => {},
		processIncarnation: () => "darwin:701",
		...overrides,
	};
}

afterEach(async () => {
	await Promise.all(temporaryDirectories.splice(0).map(directory => fs.rm(directory, { recursive: true, force: true })));
});

describe("Broker spawn substrate provider", () => {
	it("captures the managed provider, native session, server, pid, and owner proof inputs", async () => {
		const provider = createSpawnSubstrateProvider(managedDependencies());
		const result = await provider.launch(launchSpec());
		expect(result).toEqual({
			ok: true,
			proof: substrateProof(),
		});
	});

	it("uses the psmux substrate kind only for the Windows multiplexer selection", async () => {
		const psmux = managedProof({
			providerIdentity: '["windows-psmux","C:\\\\psmux.exe","namespace","volume:42"]',
			psmuxIncarnation: "psmux-incarnation",
		});
		const provider = createSpawnSubstrateProvider({
			platform: "win32",
			selectMultiplexer: () => "psmux",
			launchManaged: () => psmux,
			verifyManaged: () => "verified",
			closeManaged: async () => {},
			processIncarnation: () => "windows:701",
		});
		const result = await provider.launch(launchSpec("C:\\repo"));
		expect(result).toEqual({
			ok: true,
			proof: {
				...substrateProof(psmux),
				substrateKind: "psmux",
				processIncarnation: "windows:701",
				stateFileProof: {
					...substrateProof(psmux).stateFileProof,
					psmuxIncarnation: "psmux-incarnation",
				},
			},
		});
	});

	it("returns a typed proof failure after managed tagging or identity failure without falling back to headless", async () => {
		let headlessStarted = false;
		const provider = createSpawnSubstrateProvider(
			managedDependencies({
				launchManaged: () => {
					throw new Error("tag round-trip failed");
				},
				startHeadless: () => {
					headlessStarted = true;
					return { pid: 999, terminate() {} };
				},
			}),
		);
		await expect(provider.launch(launchSpec())).resolves.toEqual({
			ok: false,
			code: "substrate_proof_failed",
			message: "The selected spawn substrate could not be proven exactly.",
		});
		expect(headlessStarted).toBeFalse();
	});

	it("reports a reused pane PID with a different OS incarnation as a mismatch", async () => {
		const provider = createSpawnSubstrateProvider(
			managedDependencies({ processIncarnation: () => "darwin:replacement" }),
		);
		expect(await provider.verify(substrateProof())).toBe("mismatch");
	});

	it("refuses a close when the exact managed proof no longer matches", async () => {
		let closeCalls = 0;
		const provider = createSpawnSubstrateProvider(
			managedDependencies({
				verifyManaged: () => "mismatch",
				closeManaged: async () => {
					closeCalls++;
				},
			}),
		);
		expect(await provider.close(substrateProof())).toEqual({ ok: false, code: "substrate_mismatch" });
		expect(closeCalls).toBe(0);
	});

	it("uses identity-fenced headless only when no safe multiplexer provider exists", async () => {
		const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-spawn-substrate-"));
		temporaryDirectories.push(cwd);
		let terminated = false;
		const provider = createSpawnSubstrateProvider({
			platform: "darwin",
			selectMultiplexer: () => "none",
			startHeadless: () => ({ pid: 991, terminate: () => (terminated = true) }),
			processIncarnation: () => "darwin:991",
		});
		const result = await provider.launch({
			...launchSpec(cwd),
			argv: ["known-low-entropy-task"],
			env: { SPAWN_CAPABILITY: "transient-capability" },
		});
		expect(result.ok).toBeTrue();
		if (!result.ok) throw new Error("headless provider was not selected");
		expect(result.proof).toMatchObject({
			substrateKind: "headless",
			pid: 991,
			processIncarnation: "darwin:991",
		});
		const stateFile = result.proof.stateFileProof?.stateFile;
		expect(typeof stateFile).toBe("string");
		const stateText = await Bun.file(stateFile as string).text();
		expect(stateText).not.toContain("known-low-entropy-task");
		expect(stateText).not.toContain("transient-capability");
		expect(terminated).toBeFalse();
	});

	it("returns gone only after the durable headless proof matches an absent process", async () => {
		const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-spawn-substrate-"));
		temporaryDirectories.push(cwd);
		let live = true;
		const provider = createSpawnSubstrateProvider({
			platform: "darwin",
			selectMultiplexer: () => "none",
			startHeadless: () => ({ pid: 992, terminate() {} }),
			processIncarnation: () => (live ? "darwin:992" : undefined),
			isProcessGone: () => true,
		});
		const launched = await provider.launch(launchSpec(cwd));
		expect(launched.ok).toBeTrue();
		if (!launched.ok) throw new Error("headless substrate did not launch");
		live = false;
		expect(await provider.verify(launched.proof)).toBe("gone");
		expect(await provider.close(launched.proof)).toEqual({ ok: false, code: "substrate_gone" });
	});

	it("closes only the requested exact sibling proof", async () => {
		const first = managedProof();
		const sibling = managedProof({
			name: "managed-sibling",
			nativeSessionId: "$43",
			pid: 702,
			sessionId: "sibling-session",
			ownerGeneration: "sibling-generation",
		});
		const closed: string[] = [];
		const provider = createSpawnSubstrateProvider(
			managedDependencies({
				launchManaged: () => first,
				verifyManaged: proof => (proof.name === first.name || proof.name === sibling.name ? "verified" : "mismatch"),
				closeManaged: async proof => {
					closed.push(proof.name);
				},
			}),
		);
		expect(await provider.close(substrateProof(first))).toEqual({ ok: true });
		expect(closed).toEqual([first.name]);
		expect(closed).not.toContain(sibling.name);
	});
});
