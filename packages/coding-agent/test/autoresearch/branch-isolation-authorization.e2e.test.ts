/**
 * End-to-end authorization check for the autoresearch research-only boundary.
 *
 * The unit coverage in `test/workflow-mutation-guard.test.ts` stubs
 * `getCurrentAutoresearchBranch`, which proves the guard's branching logic but
 * NOT that the real git read wires up. This suite drives the whole path against
 * a real repository: real `git init`, real branch creation through
 * `ensureAutoresearchBranch`, real `git checkout`, and the real guard decision
 * with nothing mocked.
 *
 * That distinction matters because the authorization is deliberately read live
 * from the worktree rather than from recorded mission intent — a user can switch
 * branches mid-mission, and a stubbed test cannot catch a regression in the
 * actual branch read.
 */
import { afterEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import * as nodeFs from "node:fs";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { AgentTool } from "@gajae-code/agent-core";
import { ensureAutoresearchBranch, getCurrentAutoresearchBranch } from "../../src/autoresearch/git";
import { activeSnapshotPath, modeStatePath, sessionStateDir } from "../../src/gjc-runtime/session-layout";
import { getWorkflowMutationDecision } from "../../src/skill-state/workflow-mutation-guard";

const TEST_SESSION_ID = "session-branch-isolation";
const tempRoots: string[] = [];

afterEach(async () => {
	await Promise.all(tempRoots.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

function runGit(cwd: string, ...args: string[]): string {
	return execFileSync("git", ["-C", cwd, ...args], {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();
}

/**
 * A real git repository with one baseline commit and a product file to target.
 *
 * `.gjc/` is gitignored exactly as it is in a real GJC repo. That matters here:
 * mission state files are untracked, and an untracked-dirty worktree makes
 * `ensureAutoresearchBranch` take its degraded path (stay on the current branch
 * and warn) instead of creating the isolation branch.
 */
function initRepo(): string {
	const dir = nodeFs.mkdtempSync(path.join(os.tmpdir(), "gjc-autoresearch-branch-auth-"));
	tempRoots.push(dir);
	runGit(dir, "init", "-b", "main");
	runGit(dir, "config", "user.email", "test@example.com");
	runGit(dir, "config", "user.name", "Autoresearch Branch Auth Test");
	nodeFs.mkdirSync(path.join(dir, "src"), { recursive: true });
	nodeFs.writeFileSync(path.join(dir, "src", "product.ts"), "export const x = 1;\n", "utf8");
	nodeFs.writeFileSync(path.join(dir, ".gitignore"), ".gjc/\n", "utf8");
	runGit(dir, "add", ".");
	runGit(dir, "commit", "-m", "baseline");
	return dir;
}

/** Seed a live autoresearch mission posture the guard will resolve. */
async function activateMission(cwd: string, phase = "research"): Promise<void> {
	const now = new Date().toISOString();
	await fs.mkdir(sessionStateDir(cwd, TEST_SESSION_ID), { recursive: true });
	await Bun.write(
		activeSnapshotPath(cwd, TEST_SESSION_ID),
		`${JSON.stringify(
			{
				version: 1,
				active: true,
				skill: "autoresearch",
				phase,
				updated_at: now,
				active_skills: [
					{ skill: "autoresearch", phase, active: true, updated_at: now, session_id: TEST_SESSION_ID },
				],
			},
			null,
			2,
		)}\n`,
	);
	await Bun.write(
		modeStatePath(cwd, TEST_SESSION_ID, "autoresearch"),
		`${JSON.stringify({ active: true, current_phase: phase, session_id: TEST_SESSION_ID }, null, 2)}\n`,
	);
}

function writeTool(): AgentTool {
	return {
		name: "write",
		label: "write",
		description: "write",
		parameters: {} as never,
		execute: async () => ({ content: [{ type: "text" as const, text: "ok" }] }),
	} as AgentTool;
}

async function decideProductWrite(cwd: string) {
	return getWorkflowMutationDecision({
		cwd,
		sessionId: TEST_SESSION_ID,
		tool: writeTool(),
		args: { path: "src/product.ts", content: "export const x = 2;\n" },
	});
}

describe("autoresearch branch-isolation authorization (real git, nothing stubbed)", () => {
	it("blocks product mutation on the user's branch and allows it once isolated on autoresearch/*", async () => {
		const cwd = initRepo();
		await activateMission(cwd);

		// On `main`: the mission would be editing the user's working branch.
		expect(await getCurrentAutoresearchBranch(cwd)).toBeNull();
		const onMain = await decideProductWrite(cwd);
		expect(onMain.blocked).toBe(true);
		expect(onMain.message).toContain("research-only");

		// Create the isolation branch through the real production helper.
		const ensured = await ensureAutoresearchBranch(cwd, "decode throughput");
		expect(ensured.ok).toBe(true);
		const branch = runGit(cwd, "branch", "--show-current");
		expect(branch.startsWith("autoresearch/")).toBe(true);
		expect(await getCurrentAutoresearchBranch(cwd)).toBe(branch);

		// Same mission, same tool, same target — now authorized by isolation.
		const onBranch = await decideProductWrite(cwd);
		expect(onBranch.blocked).toBe(false);
	});

	it("re-blocks as soon as the worktree leaves the autoresearch branch mid-mission", async () => {
		const cwd = initRepo();
		await activateMission(cwd);
		const ensured = await ensureAutoresearchBranch(cwd, "mid mission switch");
		expect(ensured.ok).toBe(true);
		expect((await decideProductWrite(cwd)).blocked).toBe(false);

		// The whole reason the branch is read live rather than cached from mission
		// state: a user can switch away while the mission is still active.
		runGit(cwd, "checkout", "main");
		expect(await getCurrentAutoresearchBranch(cwd)).toBeNull();

		const afterSwitch = await decideProductWrite(cwd);
		expect(afterSwitch.blocked).toBe(true);
		expect(afterSwitch.message).toContain("research-only");
	});

	it("does not authorize a lookalike branch name that is not autoresearch/*", async () => {
		const cwd = initRepo();
		await activateMission(cwd);

		// `autoresearch-scratch` shares a prefix-ish name but is not the isolated
		// namespace, so keep/discard containment does not apply to it.
		runGit(cwd, "checkout", "-b", "autoresearch-scratch");
		expect(await getCurrentAutoresearchBranch(cwd)).toBeNull();

		expect((await decideProductWrite(cwd)).blocked).toBe(true);
	});

	it("releases mutation at a terminal mission phase even on the user's branch", async () => {
		const cwd = initRepo();
		await activateMission(cwd, "complete");

		expect(await getCurrentAutoresearchBranch(cwd)).toBeNull();
		expect((await decideProductWrite(cwd)).blocked).toBe(false);
	});
});
