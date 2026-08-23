import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { completeLaunchWorktree, prepareLaunchWorktree, stageLaunchWorktree } from "../src/gjc-runtime/launch-worktree";

const tempDirs: string[] = [];

afterEach(async () => {
	for (const dir of tempDirs.splice(0)) {
		const bucket = path.join(path.dirname(dir), `${path.basename(dir)}.gajae-code-worktrees`);
		Bun.spawnSync(["git", "worktree", "prune"], { cwd: dir, stdout: "pipe", stderr: "pipe" });
		await fs.rm(bucket, { recursive: true, force: true });
		await fs.rm(dir, { recursive: true, force: true });
	}
});

function git(cwd: string, args: string[]) {
	const result = Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
	if (result.exitCode !== 0) throw new Error(result.stderr.toString());
}

async function createRepo(): Promise<string> {
	const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "gjc-stage-")));
	tempDirs.push(root);
	git(root, ["init", "--initial-branch=main"]);
	git(root, ["config", "user.email", "test@example.test"]);
	git(root, ["config", "user.name", "test"]);
	await Bun.write(path.join(root, "README.md"), "# staged\n");
	git(root, ["add", "."]);
	git(root, ["commit", "-m", "init"]);
	return root;
}

describe("staged launch worktree", () => {
	it("resolves the target worktree without creating it", async () => {
		const repo = await createRepo();
		const bucket = path.join(path.dirname(repo), `${path.basename(repo)}.gajae-code-worktrees`);

		const staged = stageLaunchWorktree(repo, ["--worktree", "task-a"]);

		// Staging exists so a caller can decide something about the target path
		// before anything is created; creating it here would defeat that.
		expect(staged.plan.enabled).toBe(true);
		expect(staged.plan.enabled && path.dirname(staged.plan.worktreePath)).toBe(bucket);
		expect(await fs.exists(bucket)).toBe(false);
	});

	it("creates exactly the staged path when completed", async () => {
		const repo = await createRepo();
		const staged = stageLaunchWorktree(repo, ["--worktree", "task-a"]);

		const prepared = completeLaunchWorktree(repo, staged);

		expect(staged.plan.enabled && prepared.cwd).toBe(staged.plan.enabled ? staged.plan.worktreePath : "");
		expect(await fs.exists(prepared.cwd)).toBe(true);
	});

	it("stages nothing for a launch without a worktree", async () => {
		const repo = await createRepo();

		const staged = stageLaunchWorktree(repo, ["--", "hello"]);

		expect(staged.plan.enabled).toBe(false);
		expect(staged.remainingArgs).toEqual(["--", "hello"]);
		expect(completeLaunchWorktree(repo, staged).cwd).toBe(repo);
	});

	it("keeps prepareLaunchWorktree equivalent to stage-then-complete", async () => {
		const direct = await createRepo();
		const split = await createRepo();

		const viaPrepare = prepareLaunchWorktree(direct, ["--worktree", "task-a", "--", "hello"]);
		const viaSplit = completeLaunchWorktree(
			split,
			stageLaunchWorktree(split, ["--worktree", "task-a", "--", "hello"]),
		);

		expect(viaSplit.args).toEqual(viaPrepare.args);
		expect(path.basename(viaSplit.cwd)).toBe(path.basename(viaPrepare.cwd));
		expect(viaSplit.worktree.enabled).toBe(viaPrepare.worktree.enabled);
	});
});
