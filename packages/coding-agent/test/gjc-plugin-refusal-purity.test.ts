import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { getAgentDir, setAgentDir } from "@gajae-code/utils";
import { installGjcBundle } from "../src/extensibility/gjc-plugins";
import { storedSourceLocatorForTest } from "../src/extensibility/gjc-plugins/lifecycle";

/**
 * A refused install must be observable as a pure read. The transaction used to
 * create the scope root and sweep orphan directories before consulting the
 * policy decision, so an `already_installed_use_upgrade` refusal still mutated
 * the filesystem.
 */

const fixturesRoot = path.join(import.meta.dir, "fixtures", "gjc-plugins");
const sixSurface = path.join(fixturesRoot, "valid-six-surface-bundle");
const tempDirs: string[] = [];
const originalAgentDir = getAgentDir();
let agentDir: string;

beforeEach(async () => {
	agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-refusal-agent-"));
	setAgentDir(agentDir);
});

afterEach(async () => {
	setAgentDir(originalAgentDir);
	for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true });
	await fs.rm(agentDir, { recursive: true, force: true });
});

async function mkProjectCwd(): Promise<string> {
	const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-refusal-"));
	tempDirs.push(cwd);
	return cwd;
}

async function treeOf(root: string): Promise<string[]> {
	try {
		const entries = await fs.readdir(root, { withFileTypes: true, recursive: true });
		return entries.map(entry => path.join(entry.parentPath ?? root, entry.name)).sort();
	} catch {
		return [];
	}
}

describe("GJC bundle refusal purity", () => {
	test("a refused install does not create the scope root", async () => {
		const cwd = await mkProjectCwd();
		const scopeRoot = path.join(cwd, ".gjc", "gjc-plugins");

		const first = await installGjcBundle({ cwd }, "project", sixSurface);
		expect(first.ok).toBe(true);
		const before = await treeOf(scopeRoot);

		const refused = await installGjcBundle({ cwd }, "project", sixSurface);
		expect(refused).toMatchObject({ ok: false, error: { code: "already_installed_use_upgrade" } });

		expect(await treeOf(scopeRoot)).toEqual(before);
	});

	test("a refused install into an untouched scope leaves no directory behind", async () => {
		const cwd = await mkProjectCwd();
		// Install into project, then refuse a second project install. The user
		// scope was never a target, so its root must not have been created.
		expect((await installGjcBundle({ cwd }, "project", sixSurface)).ok).toBe(true);
		const userRoot = path.join(agentDir, "gjc-plugins");
		const beforeUser = await treeOf(userRoot);

		const refused = await installGjcBundle({ cwd }, "project", sixSurface);
		expect(refused.ok).toBe(false);

		expect(await treeOf(userRoot)).toEqual(beforeUser);
	});

	test("a git ref is preserved when rebuilding the stored locator", () => {
		expect(storedSourceLocatorForTest({ kind: "git", uri: "https://h/o/r.git", ref: "v2", resolvedAt: "t" })).toBe(
			"https://h/o/r.git#v2",
		);
		// Without a ref, or for non-git kinds, the URI is used verbatim.
		expect(storedSourceLocatorForTest({ kind: "git", uri: "https://h/o/r.git", resolvedAt: "t" })).toBe(
			"https://h/o/r.git",
		);
		expect(storedSourceLocatorForTest({ kind: "path", uri: "/tmp/b", ref: "ignored", resolvedAt: "t" })).toBe(
			"/tmp/b",
		);
	});
});
