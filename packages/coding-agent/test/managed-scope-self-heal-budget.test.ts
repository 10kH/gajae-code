import { afterEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	OWNER_ONLY_SELF_HEAL_MAX_ENTRIES,
	prepareManagedSessionScopeForWriteSync,
	resolveManagedScope,
} from "../src/session/internal/managed-session-scope";

const temporaryDirectories: string[] = [];

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		fs.rmSync(directory, { recursive: true, force: true });
	}
	vi.restoreAllMocks();
});

function fixture(): { cwd: string; agentDir: string; sessionsRoot: string } {
	const home = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-scope-selfheal-home-"));
	temporaryDirectories.push(home);
	const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-scope-selfheal-cwd-"));
	temporaryDirectories.push(cwd);
	const agentDir = path.join(home, "agent");
	const sessionsRoot = path.join(agentDir, "sessions");
	fs.mkdirSync(sessionsRoot, { recursive: true, mode: 0o700 });
	return { cwd, agentDir, sessionsRoot };
}

function scopeFor(input: { cwd: string; agentDir: string; sessionsRoot: string }) {
	const resolved = resolveManagedScope(input);
	if (resolved.kind !== "resolved") throw new Error(`resolve failed: ${resolved.code}`);
	return resolved.scope;
}

/** Fill the scope tree with far more owner-only descendants than the walk budget. */
function populateLargeTree(directory: string, entries: number): void {
	const perDir = 200;
	let created = 0;
	let bucket = 0;
	while (created < entries) {
		const dir = path.join(directory, `blob-${bucket}`);
		fs.mkdirSync(dir, { mode: 0o700 });
		created += 1;
		for (let i = 0; i < perDir && created < entries; i += 1) {
			fs.writeFileSync(path.join(dir, `${i}.bin`), "", { mode: 0o600 });
			created += 1;
		}
		bucket += 1;
	}
}

// The managed-scope prepare self-heal walk (`assertOwnerOnlyModesRecursive`) used
// to `lstat` every descendant of the `v2-<cwd>` tree on every session create. On a
// large `~/.gjc` that made ACP `session/new` take ~16s and blow past paseo's spawn
// timeout (#5565). The walk is now budgeted, so its cost is bounded by the budget
// rather than by the on-disk size of the scope tree.
describe.skipIf(process.platform === "win32")("managed scope owner-only self-heal budget", () => {
	it("does not lstat the whole scope tree on prepare when it far exceeds the budget", () => {
		const input = fixture();

		// First prepare succeeds and establishes the retained authority that gates
		// the self-heal walk on subsequent prepares.
		const first = prepareManagedSessionScopeForWriteSync(scopeFor(input));
		expect(first.kind).toBe("resolved");
		if (first.kind !== "resolved") return;

		const scopeDirectory = first.scope.directoryPath;
		const treeEntries = OWNER_ONLY_SELF_HEAL_MAX_ENTRIES + 4000;
		populateLargeTree(scopeDirectory, treeEntries);

		// Count only lstats aimed at descendants of the scope directory: the walk is
		// the sole heavy source, so a bounded count proves it early-exited instead of
		// scanning the whole tree.
		const scopePrefix = `${path.resolve(scopeDirectory)}${path.sep}`;
		let scopedLstats = 0;
		const realLstat = fs.lstatSync.bind(fs) as (...args: Parameters<typeof fs.lstatSync>) => unknown;
		vi.spyOn(fs, "lstatSync").mockImplementation(((...args: Parameters<typeof fs.lstatSync>) => {
			if (path.resolve(String(args[0])).startsWith(scopePrefix)) scopedLstats += 1;
			return realLstat(...args);
		}) as typeof fs.lstatSync);

		const second = prepareManagedSessionScopeForWriteSync(scopeFor(input));
		expect(second.kind).toBe("resolved");

		// A full walk would lstat every one of the `treeEntries` descendants; the
		// budgeted walk stops at (at most) the entry budget plus a small margin for
		// the non-walk stats the prepare performs on the scope root itself.
		expect(scopedLstats).toBeLessThanOrEqual(OWNER_ONLY_SELF_HEAL_MAX_ENTRIES + 256);
		expect(scopedLstats).toBeLessThan(treeEntries);
	});
});
