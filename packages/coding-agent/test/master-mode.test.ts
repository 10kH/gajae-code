import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getBundledModel } from "@gajae-code/ai";
import { Settings } from "@gajae-code/coding-agent/config/settings";
import {
	assertMasterLaunchDisposition,
	createMasterModeContext,
} from "@gajae-code/coding-agent/master-mode/context";
import {
	createMasterPeerSnapshotContributor,
	MASTER_PEER_SNAPSHOT_CUSTOM_TYPE,
} from "@gajae-code/coding-agent/master-mode/first-request";
import { createAgentSession } from "@gajae-code/coding-agent/sdk";
import type { SessionListOutcome } from "@gajae-code/coding-agent/sdk/lifecycle/service";
import { AuthStorage } from "@gajae-code/coding-agent/session/auth-storage";
import { SessionManager } from "@gajae-code/coding-agent/session/session-manager";
import { Snowflake } from "@gajae-code/utils";

const authStorages: AuthStorage[] = [];
const tempDirs: string[] = [];

async function createSession(master: boolean) {
	const tempDir = path.join(os.tmpdir(), `gjc-master-mode-${Snowflake.next()}`);
	tempDirs.push(tempDir);
	fs.mkdirSync(tempDir, { recursive: true });
	const settings = Settings.isolated({});
	settings.override("recipe.enabled", false);
	const authStorage = await AuthStorage.create(path.join(tempDir, "auth.db"));
	authStorages.push(authStorage);
	return createAgentSession({
		cwd: tempDir,
		agentDir: tempDir,
		sessionManager: SessionManager.inMemory(),
		authStorage,
		settings,
		model: getBundledModel("openai", "gpt-4o-mini"),
		disableExtensionDiscovery: true,
		extensions: [],
		skills: [],
		contextFiles: [],
		promptTemplates: [],
		slashCommands: [],
		enableMCP: false,
		enableLsp: false,
		notificationHostModeSupported: false,
		sdkHostModeSupported: false,
		...(master ? { masterModeContext: createMasterModeContext("repo", "master-owner", "epoch-test") } : {}),
	});
}

afterEach(() => {
	for (const authStorage of authStorages.splice(0)) authStorage.close();
	for (const tempDir of tempDirs.splice(0)) fs.rmSync(tempDir, { recursive: true, force: true });
});

function countOccurrences(haystack: string, needle: string): number {
	return haystack.split(needle).length - 1;
}

describe("master launch admission", () => {
	// Every noninteractive master route must fail admission. The prepared-input
	// non-TTY case is the dangerous one: it resolves to autoPrint with NO
	// nonInteractiveError, so a guard nested under that error is skipped.
	const routes = [
		{ name: "non-TTY with prepared input (autoPrint, no error)", isInteractive: false, autoPrint: true },
		{ name: "non-TTY with no input", isInteractive: false, autoPrint: false, nonInteractiveError: "no input" },
		{ name: "auto-print while a TTY is attached", isInteractive: true, autoPrint: true },
	];
	for (const route of routes) {
		it(`refuses --master on a ${route.name}`, () => {
			expect(() =>
				assertMasterLaunchDisposition({
					master: true,
					isInteractive: route.isInteractive,
					autoPrint: route.autoPrint,
					...(route.nonInteractiveError === undefined ? {} : { nonInteractiveError: route.nonInteractiveError }),
				}),
			).toThrow("--master requires an interactive TTY launch");
		});
	}

	it("admits an interactive master launch and ignores non-master routes", () => {
		expect(() =>
			assertMasterLaunchDisposition({ master: true, isInteractive: true, autoPrint: false }),
		).not.toThrow();
		expect(() =>
			assertMasterLaunchDisposition({ master: undefined, isInteractive: false, autoPrint: true }),
		).not.toThrow();
	});
});

describe("master mode prompt integration", () => {
	it("appends the master guidance block exactly once for master sessions", async () => {
		const { session } = await createSession(true);
		try {
			const prompt = session.systemPrompt.join("\n\n");
			expect(countOccurrences(prompt, "# Master Mode")).toBe(1);
			expect(prompt).toContain("gjc sdk spawn --cwd");
			// The guidance block is the LAST segment: appended after every other
			// prompt transformation.
			expect(session.systemPrompt.at(-1)).toContain("# Master Mode");
		} finally {
			await session.dispose();
		}
	});

	it("gives non-master sessions neither guidance nor peer data", async () => {
		const { session } = await createSession(false);
		try {
			const prompt = session.systemPrompt.join("\n\n");
			expect(prompt).not.toContain("# Master Mode");
			expect(prompt).not.toContain("gjc-master-peer-snapshot");
		} finally {
			await session.dispose();
		}
	});
});

describe("master peer snapshot contributor", () => {
	const resultFor = (cwd: string, worktreeRoot: string | null): SessionListOutcome =>
		({
		ok: true as const,
		operation: "session.list",
		result: {
			version: 1,
			scope: {
				version: 1,
				requested: "repo",
				requestAnchor: { cwd, worktreeRoot },
				resolved: worktreeRoot === null ? null : { kind: "repo", worktreeRoot },
				resolution: worktreeRoot === null ? "not-in-git-worktree" : "resolved",
			},
			status: worktreeRoot === null ? "not-in-git-worktree" : "populated",
			observedAt: "2026-08-23T00:00:00.000Z",
			indexSeq: 3,
			rows:
				worktreeRoot === null
					? []
					: [
							{ id: "peer-b", locator: { cwd, worktreeRoot, stateRoot: `${cwd}/.gjc/state` }, live: true },
							{ id: "master-owner", locator: { cwd, worktreeRoot, stateRoot: `${cwd}/.gjc/state` }, live: true },
							{ id: "peer-a", locator: { cwd, worktreeRoot, stateRoot: `${cwd}/.gjc/state` }, live: false },
						],
			warnings: [],
		},
	}) as unknown as SessionListOutcome;

	it("collects once, excludes self, and skips after a persisted injection", async () => {
		const cwd = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "gjc-master-contrib-")));
		tempDirs.push(cwd);
		let listCalls = 0;
		let persisted = false;
		const contributor = createMasterPeerSnapshotContributor({
			lifecycle: {
				list: async request => {
					listCalls += 1;
					const scope = (request.target as { scope?: { requestAnchor?: { cwd: string; worktreeRoot: string | null } } })
						.scope;
					return resultFor(scope?.requestAnchor?.cwd ?? cwd, scope?.requestAnchor?.worktreeRoot ?? null);
				},
			},
			ownerSessionId: "master-owner",
			scope: "repo",
			getCwd: () => cwd,
			hasPersistedInjection: () => persisted,
		});
		const first = await contributor();
		expect(listCalls).toBe(1);
		expect(first?.customType).toBe(MASTER_PEER_SNAPSHOT_CUSTOM_TYPE);
		expect(first?.content.startsWith("<gjc-master-peer-snapshot>")).toBe(true);
		expect(first?.content.endsWith("</gjc-master-peer-snapshot>")).toBe(true);
		expect(first?.content).not.toContain('"master-owner"');
		// Pre-accept cancellation persists nothing: the next attempt re-collects.
		const retry = await contributor();
		expect(listCalls).toBe(2);
		expect(retry).toBeDefined();
		// A persisted injection proves an accepted first request: later turns skip.
		persisted = true;
		expect(await contributor()).toBeUndefined();
		expect(listCalls).toBe(2);
	});

	it("degrades to undefined on lifecycle failure without throwing", async () => {
		const errors: unknown[] = [];
		const contributor = createMasterPeerSnapshotContributor({
			lifecycle: {
				list: async () => {
					throw new Error("broker unavailable");
				},
			},
			ownerSessionId: "master-owner",
			scope: "repo",
			getCwd: () => "/nonexistent-master-cwd",
			hasPersistedInjection: () => false,
		});
		// collectMasterPeerSnapshot converts list failures into an unavailable
		// snapshot; the contributor still renders it truthfully.
		const message = await contributor();
		expect(message === undefined || message.content.includes("unavailable")).toBe(true);
		expect(errors).toHaveLength(0);
	});
});
