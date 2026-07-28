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

/**
 * Existence- and metadata-sensitive snapshot. A plain entry listing cannot
 * distinguish a missing root from an empty one, and acquiring a scope lock
 * creates the root and mutates its mtime without changing the entry list.
 */
async function treeOf(root: string): Promise<string> {
	try {
		const stat = await fs.stat(root);
		const entries = await fs.readdir(root, { withFileTypes: true, recursive: true });
		const rows = await Promise.all(
			entries.map(async entry => {
				const full = path.join(entry.parentPath ?? root, entry.name);
				const child = await fs.stat(full);
				return `${path.relative(root, full)}:${child.isDirectory() ? "d" : "f"}:${child.size}`;
			}),
		);
		return `present:${stat.mtimeMs}:${rows.sort().join("|")}`;
	} catch {
		return "absent";
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

	test("a refused install leaves the untargeted opposite scope byte-identical", async () => {
		const cwd = await mkProjectCwd();
		const userRoot = path.join(agentDir, "gjc-plugins");
		expect((await installGjcBundle({ cwd }, "project", sixSurface)).ok).toBe(true);
		// A committing install legitimately locks both scopes, because the
		// collision decision spans them; that lock creates the opposite-scope
		// root. What a REFUSAL must not do is change it, since the refusal is
		// decided before any lock is acquired.
		const beforeUser = await treeOf(userRoot);

		const refused = await installGjcBundle({ cwd }, "project", sixSurface);
		expect(refused).toMatchObject({ ok: false, error: { code: "already_installed_use_upgrade" } });

		expect(await treeOf(userRoot)).toBe(beforeUser);
	});

	test("a refused install does not depend on the source being resolvable", async () => {
		const cwd = await mkProjectCwd();
		expect((await installGjcBundle({ cwd }, "project", sixSurface)).ok).toBe(true);
		const scopeRoot = path.join(cwd, ".gjc", "gjc-plugins");
		const before = await treeOf(scopeRoot);

		// A copy that declares the same name but is otherwise broken must still be
		// refused with the create-only error, not a compile/resolve failure.
		const broken = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-refusal-broken-"));
		tempDirs.push(broken);
		await fs.writeFile(
			path.join(broken, "gajae-plugin.json"),
			JSON.stringify({ name: "valid-six-surface-bundle", version: "9.9.9" }),
		);

		const refused = await installGjcBundle({ cwd }, "project", broken);
		expect(refused).toMatchObject({ ok: false, error: { code: "already_installed_use_upgrade" } });
		expect(await treeOf(scopeRoot)).toBe(before);
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
