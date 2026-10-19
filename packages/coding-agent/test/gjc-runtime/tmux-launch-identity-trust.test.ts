import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Args } from "@gajae-code/coding-agent/cli/args";
import { launchDefaultTmuxIfNeeded, type TmuxLaunchContext } from "@gajae-code/coding-agent/gjc-runtime/launch-tmux";
import {
	__setCreateOwnerIsolationForTests,
	createGjcTmuxSession,
} from "@gajae-code/coding-agent/gjc-runtime/tmux-sessions";

const PLANTED_SESSION = "victim-tmux-493";
const PLANTED_COORDINATOR = "victim-coordinator-493";
const PLANTED_GJC_SESSION = "victim-session-493";
const OPERATOR_SESSION = "operator-tmux-493";
const OPERATOR_COORDINATOR = "operator-coordinator-493";
const OPERATOR_GJC_SESSION = "operator-session-493";

function args(): Args {
	return {
		messages: [],
		fileArgs: [],
		unknownFlags: new Map(),
		tmux: true,
	};
}

function ownerProbe(): NonNullable<TmuxLaunchContext["ownerIsolationProbe"]> {
	let serverCreated = false;
	return {
		readCallerCgroup: () => null,
		probeServer: () => {
			if (!serverCreated) {
				serverCreated = true;
				return { state: "absent" };
			}
			return {
				state: "safe",
				pid: 123,
				startTime: "42",
				cgroup: { classification: "not_applicable" },
			};
		},
		recordAttempt: () => {},
	};
}

function newSessionArgs(calls: string[][]): string[] {
	const found = calls.find(call => call[0] === "new-session");
	if (!found) throw new Error("expected new-session");
	return found;
}

function launchPins(cwd: string, env: NodeJS.ProcessEnv): { sessionName: string; inner: string } {
	const calls: string[][] = [];
	const handled = launchDefaultTmuxIfNeeded({
		parsed: args(),
		rawArgs: ["--tmux"],
		cwd,
		env: {
			GJC_PSMUX_DETECTION: "off",
			GJC_TMUX_COMMAND: "tmux",
			...env,
		},
		argv: ["bun", "packages/coding-agent/src/cli.ts"],
		execPath: process.execPath,
		platform: "darwin",
		tty: { stdin: true, stdout: true, columns: 80, rows: 24 },
		tmuxAvailable: true,
		existingBranchSessionName: null,
		currentBranch: "main",
		ownerIsolationProbe: ownerProbe(),
		spawnSync: (_command, spawnArgs) => {
			calls.push([...spawnArgs]);
			return { exitCode: 0, stdout: "$0" };
		},
	});
	expect(handled).toBe(true);
	const sessionArgs = newSessionArgs(calls);
	const nameIndex = sessionArgs.indexOf("-s");
	return { sessionName: sessionArgs[nameIndex + 1] ?? "", inner: sessionArgs.at(-1) ?? "" };
}

async function withRepo(
	body: string | undefined,
	run: (cwd: string, victimState: string) => Promise<void> | void,
): Promise<void> {
	const root = await mkdtemp(path.join(tmpdir(), "tmux-identity-"));
	const cwd = path.join(root, "repo");
	const victimState = path.join(root, "victim", "coordinator-state.json");
	await mkdir(cwd, { recursive: true });
	if (body !== undefined) await writeFile(path.join(cwd, ".env"), body);
	try {
		await run(cwd, victimState);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
}

describe("tmux launch identity provenance", () => {
	afterEach(() => {
		__setCreateOwnerIsolationForTests(null);
	});

	it("does not adopt project dotenv session, root, or state-file pins", async () => {
		await withRepo(undefined, async (cwd, victimState) => {
			await writeFile(
				path.join(cwd, ".env"),
				[
					`GJC_TMUX_SESSION=${PLANTED_SESSION}`,
					`GJC_COORDINATOR_SESSION_ID=${PLANTED_COORDINATOR}`,
					`GJC_SESSION_ID=${PLANTED_GJC_SESSION}`,
					`GJC_COORDINATOR_SESSION_STATE_FILE=${victimState}`,
					"",
				].join("\n"),
			);
			const launched = launchPins(cwd, {
				GJC_TMUX_SESSION: PLANTED_SESSION,
				GJC_COORDINATOR_SESSION_ID: PLANTED_COORDINATOR,
				GJC_SESSION_ID: PLANTED_GJC_SESSION,
				GJC_COORDINATOR_SESSION_STATE_FILE: victimState,
			});
			expect(launched.sessionName).not.toBe(PLANTED_SESSION);
			expect(launched.inner).not.toContain(victimState);
			expect(launched.inner).not.toContain(PLANTED_GJC_SESSION);
			expect(launched.inner).not.toContain(PLANTED_COORDINATOR);
			expect(launched.inner).not.toContain(path.join(path.dirname(victimState), "tmux-exit.json"));
		});
	});

	it("still uses operator tmux identity pins the project does not declare", async () => {
		await withRepo(undefined, async cwd => {
			const stateFile = path.join(cwd, "operator-state.json");
			const launched = launchPins(cwd, {
				GJC_TMUX_SESSION: OPERATOR_SESSION,
				GJC_COORDINATOR_SESSION_ID: OPERATOR_COORDINATOR,
				GJC_SESSION_ID: OPERATOR_GJC_SESSION,
				GJC_COORDINATOR_SESSION_STATE_FILE: stateFile,
			});
			expect(launched.sessionName).toBe(OPERATOR_SESSION);
			expect(launched.inner).toContain(OPERATOR_COORDINATOR);
			expect(launched.inner).toContain(stateFile);
			expect(launched.inner).toContain(path.join(cwd, "tmux-exit.json"));
		});
	});

	it("still uses an operator pin that differs from the project dotenv value", async () => {
		await withRepo(
			[
				`GJC_TMUX_SESSION=${PLANTED_SESSION}`,
				`GJC_COORDINATOR_SESSION_ID=${PLANTED_COORDINATOR}`,
				`GJC_SESSION_ID=${PLANTED_GJC_SESSION}`,
				"GJC_COORDINATOR_SESSION_STATE_FILE=/planted/state.json",
			].join("\n"),
			async cwd => {
				const stateFile = path.join(cwd, "operator-state.json");
				const launched = launchPins(cwd, {
					GJC_TMUX_SESSION: OPERATOR_SESSION,
					GJC_COORDINATOR_SESSION_ID: OPERATOR_COORDINATOR,
					GJC_SESSION_ID: OPERATOR_GJC_SESSION,
					GJC_COORDINATOR_SESSION_STATE_FILE: stateFile,
				});
				expect(launched.sessionName).toBe(OPERATOR_SESSION);
				expect(launched.inner).toContain(stateFile);
				expect(launched.inner).not.toContain(PLANTED_SESSION);
				expect(launched.inner).not.toContain("/planted/state.json");
			},
		);
	});

	it("still uses an operator pin that differs from the static declaration only by surrounding spaces", async () => {
		await withRepo(
			[
				`GJC_TMUX_SESSION=${OPERATOR_SESSION}`,
				`GJC_COORDINATOR_SESSION_ID=${OPERATOR_COORDINATOR}`,
				`GJC_SESSION_ID=${OPERATOR_GJC_SESSION}`,
				"GJC_COORDINATOR_SESSION_STATE_FILE=/declared/state.json",
			].join("\n"),
			async cwd => {
				const stateFile = path.join(cwd, "operator-state.json");
				const launched = launchPins(cwd, {
					GJC_TMUX_SESSION: ` ${OPERATOR_SESSION} `,
					GJC_COORDINATOR_SESSION_ID: ` ${OPERATOR_COORDINATOR} `,
					GJC_SESSION_ID: ` ${OPERATOR_GJC_SESSION} `,
					GJC_COORDINATOR_SESSION_STATE_FILE: ` ${stateFile} `,
				});
				expect(launched.sessionName).toBe(OPERATOR_SESSION);
				expect(launched.inner).toContain(OPERATOR_COORDINATOR);
				expect(launched.inner).toContain(stateFile);
				expect(launched.inner).not.toContain("/declared/state.json");
			},
		);
	});

	it("session create ignores a project dotenv session and state-file pin", async () => {
		const root = await mkdtemp(path.join(tmpdir(), "tmux-create-identity-"));
		const cwd = path.join(root, "repo");
		const victimState = path.join(root, "victim", "coordinator-state.json");
		await mkdir(cwd, { recursive: true });
		await writeFile(
			path.join(cwd, ".env"),
			[
				`GJC_TMUX_SESSION=${PLANTED_SESSION}`,
				`GJC_COORDINATOR_SESSION_ID=${PLANTED_COORDINATOR}`,
				`GJC_SESSION_ID=${PLANTED_GJC_SESSION}`,
				`GJC_COORDINATOR_SESSION_STATE_FILE=${victimState}`,
				"",
			].join("\n"),
		);
		const previous = process.cwd();
		let planned: string[] | undefined;
		__setCreateOwnerIsolationForTests({
			execute: plan => {
				if (!plan.ok) throw new Error(`plan failed: ${plan.diagnostic}`);
				planned = plan.execution.argv;
				return { ok: false, code: "scope_bootstrap_failed", diagnostic: "test-stop" };
			},
		});
		try {
			process.chdir(cwd);
			expect(() =>
				createGjcTmuxSession(
					{
						GJC_PSMUX_DETECTION: "off",
						GJC_TMUX_COMMAND: "tmux",
						GJC_TMUX_SESSION: PLANTED_SESSION,
						GJC_COORDINATOR_SESSION_ID: PLANTED_COORDINATOR,
						GJC_SESSION_ID: PLANTED_GJC_SESSION,
						GJC_COORDINATOR_SESSION_STATE_FILE: victimState,
					},
					{ platform: "darwin" },
				),
			).toThrow("test-stop");
		} finally {
			process.chdir(previous);
			__setCreateOwnerIsolationForTests(null);
			await rm(root, { recursive: true, force: true });
		}
		expect(planned).toBeDefined();
		const nameIndex = planned?.indexOf("-s") ?? -1;
		expect(planned?.[nameIndex + 1]).not.toBe(PLANTED_SESSION);
		expect(planned?.at(-1) ?? "").not.toContain(victimState);
		expect(planned?.at(-1) ?? "").not.toContain(PLANTED_GJC_SESSION);
	});
});
