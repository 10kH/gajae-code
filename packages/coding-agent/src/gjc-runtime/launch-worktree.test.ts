import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { evacuatePreWorktreeTarget, isReplaceableWorktreeTarget, restorePreWorktreeGjc } from "./launch-worktree";

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
	tempDirs.push(dir);
	return dir;
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

describe("isReplaceableWorktreeTarget", () => {
	test("accepts a real directory holding only .gjc", () => {
		const root = makeTempDir("gjc-replaceable-");
		const target = path.join(root, "wt");
		fs.mkdirSync(path.join(target, ".gjc"), { recursive: true });
		expect(isReplaceableWorktreeTarget(target)).toBe(true);
	});

	test("rejects other content", () => {
		const root = makeTempDir("gjc-replaceable-");
		const target = path.join(root, "wt");
		fs.mkdirSync(target, { recursive: true });
		fs.writeFileSync(path.join(target, "file.txt"), "x");
		expect(isReplaceableWorktreeTarget(target)).toBe(false);
	});

	test("rejects a symlinked target even when the resolved dir holds only .gjc", () => {
		const root = makeTempDir("gjc-replaceable-");
		const real = path.join(root, "real");
		fs.mkdirSync(path.join(real, ".gjc"), { recursive: true });
		const link = path.join(root, "link");
		fs.symlinkSync(real, link, "dir");
		expect(isReplaceableWorktreeTarget(link)).toBe(false);
	});
});

describe("evacuatePreWorktreeTarget", () => {
	test("rejects a symlinked .gjc before evacuation", () => {
		const root = makeTempDir("gjc-evacuate-");
		const target = path.join(root, "wt");
		fs.mkdirSync(target, { recursive: true });
		const outside = path.join(root, "outside");
		fs.mkdirSync(outside, { recursive: true });
		fs.symlinkSync(outside, path.join(target, ".gjc"), "dir");

		expect(() => evacuatePreWorktreeTarget(target)).toThrow(/worktree_path_conflict/);
		// The symlink target must be left untouched — evacuation must not follow it.
		expect(fs.existsSync(outside)).toBe(true);
		expect(fs.existsSync(path.join(root, ".gjc-pre-wt-wt"))).toBe(false);
	});
});

describe("restorePreWorktreeGjc", () => {
	test("rejects a symlinked overlay destination", () => {
		const root = makeTempDir("gjc-restore-");
		const worktree = path.join(root, "wt");
		fs.mkdirSync(worktree, { recursive: true });
		const outside = path.join(root, "outside");
		fs.mkdirSync(outside, { recursive: true });
		// A tracked `.gjc` symlink that `git worktree add` would have checked out.
		fs.symlinkSync(outside, path.join(worktree, ".gjc"), "dir");

		const stash = path.join(root, ".gjc-pre-wt-wt");
		fs.mkdirSync(stash, { recursive: true });
		fs.writeFileSync(path.join(stash, "seed.txt"), "seed");

		expect(() => restorePreWorktreeGjc(stash, worktree)).toThrow(/worktree_path_conflict/);
		// The overlay must not have leaked into the symlink target.
		expect(fs.existsSync(path.join(outside, "seed.txt"))).toBe(false);
	});
});
