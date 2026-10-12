import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { getAgentDir, getSessionsDir } from "@gajae-code/utils";
import { type GcStoreAdapter, runGjcGcCommand } from "../src/gjc-runtime/gc-runtime";

const LOADED_PROBE = path.join(import.meta.dir, "fixtures", "gc-agent-dir-loaded-probe.ts");

const tempDirs: string[] = [];

afterEach(async () => {
	for (const dir of tempDirs.splice(0)) {
		await fs.rm(dir, { recursive: true, force: true });
	}
});

async function makeRepo(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-gc-agent-trust-"));
	tempDirs.push(dir);
	return dir;
}

function gcEnv(root: string, agentDir: string, key: "GJC_CODING_AGENT_DIR" | "PI_CODING_AGENT_DIR"): NodeJS.ProcessEnv {
	return {
		[key]: agentDir,
		GJC_HARNESS_ROOT_REGISTRY_DIR: path.join(root, "harness-roots"),
		TMPDIR: path.join(root, "tmp"),
	};
}

async function diskSessionsRoot(root: string, env: NodeJS.ProcessEnv): Promise<string> {
	const result = await runGjcGcCommand(["--disk", "--json"], root, env, []);
	expect(result.status).not.toBe(2);
	const report = JSON.parse(result.stdout) as {
		disk: { surfaces: { sessions: { root: string }; backups: { root: string }; natives: { root: string } } };
	};
	return report.disk.surfaces.sessions.root;
}

describe("gjc gc agent dir provenance", () => {
	test("refuses a project dotenv GJC_CODING_AGENT_DIR", async () => {
		const root = await makeRepo();
		const attacker = path.join(root, "attacker", "agent");
		await fs.mkdir(attacker, { recursive: true });
		await Bun.write(path.join(root, ".env"), `GJC_CODING_AGENT_DIR=${attacker}\n`);

		const sessions = await diskSessionsRoot(root, gcEnv(root, attacker, "GJC_CODING_AGENT_DIR"));
		expect(sessions.startsWith(attacker)).toBe(false);
		expect(sessions).toBe(getSessionsDir(getAgentDir()));
	});

	test("refuses a project dotenv PI_CODING_AGENT_DIR", async () => {
		const root = await makeRepo();
		const attacker = path.join(root, "attacker", "agent");
		await fs.mkdir(attacker, { recursive: true });
		await Bun.write(path.join(root, ".env"), `PI_CODING_AGENT_DIR=${attacker}\n`);

		const sessions = await diskSessionsRoot(root, gcEnv(root, attacker, "PI_CODING_AGENT_DIR"));
		expect(sessions.startsWith(attacker)).toBe(false);
		expect(sessions).toBe(getSessionsDir(getAgentDir()));
	});

	test("refuses a dynamic project dotenv GJC_CODING_AGENT_DIR", async () => {
		const root = await makeRepo();
		const attacker = path.join(root, "attacker", "agent");
		await fs.mkdir(attacker, { recursive: true });
		await Bun.write(path.join(root, ".env"), "GJC_CODING_AGENT_DIR=$HOME/planted\n");

		const sessions = await diskSessionsRoot(root, gcEnv(root, attacker, "GJC_CODING_AGENT_DIR"));
		expect(sessions.startsWith(attacker)).toBe(false);
		expect(sessions).toBe(getSessionsDir(getAgentDir()));
	});

	test("keeps an operator agent dir the project does not declare", async () => {
		const root = await makeRepo();
		const operator = path.join(root, "operator", "agent");
		await fs.mkdir(operator, { recursive: true });
		await Bun.write(path.join(root, ".env"), "UNRELATED=1\n");

		const sessions = await diskSessionsRoot(root, gcEnv(root, operator, "GJC_CODING_AGENT_DIR"));
		expect(sessions).toBe(getSessionsDir(operator));
	});

	test("keeps an operator agent dir that differs from the project dotenv", async () => {
		const root = await makeRepo();
		const attacker = path.join(root, "attacker", "agent");
		const operator = path.join(root, "operator", "agent");
		await fs.mkdir(attacker, { recursive: true });
		await fs.mkdir(operator, { recursive: true });
		await Bun.write(path.join(root, ".env"), `GJC_CODING_AGENT_DIR=${attacker}\n`);

		const sessions = await diskSessionsRoot(root, gcEnv(root, operator, "GJC_CODING_AGENT_DIR"));
		expect(sessions).toBe(getSessionsDir(operator));
	});

	test("keeps an operator PI_CODING_AGENT_DIR the project does not declare", async () => {
		const root = await makeRepo();
		const operator = path.join(root, "operator", "agent");
		await fs.mkdir(operator, { recursive: true });
		await Bun.write(path.join(root, ".env"), "UNRELATED=1\n");

		const sessions = await diskSessionsRoot(root, gcEnv(root, operator, "PI_CODING_AGENT_DIR"));
		expect(sessions).toBe(getSessionsDir(operator));
	});

	test("rejects a project-loaded agent dir after its dotenv declaration changes", async () => {
		const root = await makeRepo();
		const attacker = path.join(root, "attacker", "agent");
		const rewritten = path.join(root, "rewritten", "agent");
		await fs.mkdir(attacker, { recursive: true });
		await Bun.write(path.join(root, ".env"), `GJC_CODING_AGENT_DIR=${attacker}\n`);
		const adapter: GcStoreAdapter = {
			store: "file_locks",
			async collect() {
				await Bun.write(path.join(root, ".env"), `GJC_CODING_AGENT_DIR=${rewritten}\n`);
				return { records: [], errors: [] };
			},
			async prune() {
				return { removed: false };
			},
		};

		const result = await runGjcGcCommand(["--disk", "--json"], root, gcEnv(root, attacker, "GJC_CODING_AGENT_DIR"), [
			adapter,
		]);
		expect(result.status).not.toBe(2);
		const report = JSON.parse(result.stdout) as {
			disk: { surfaces: Record<string, { root: string }> };
		};
		for (const surface of Object.values(report.disk.surfaces)) {
			expect(surface.root.startsWith(attacker)).toBe(false);
			expect(surface.root.startsWith(rewritten)).toBe(false);
		}
		expect(report.disk.surfaces.sessions?.root).toBe(getSessionsDir(getAgentDir()));
	});

	test("rejects a project-loaded agent dir after the declaration changes before gc", async () => {
		for (const key of ["GJC_CODING_AGENT_DIR", "PI_CODING_AGENT_DIR"] as const) {
			const root = await makeRepo();
			const attacker = path.join(root, "attacker", "agent");
			const rewritten = path.join(root, "rewritten", "agent");
			await fs.mkdir(attacker, { recursive: true });
			await Bun.write(path.join(root, ".env"), `${key}=${attacker}\n`);
			const dropped = await runLoadedProbe(root, ["drop", key], {});
			expect(dropped.loaded).toBe(attacker);
			expect(dropped.sessions?.startsWith(attacker)).toBe(false);
			expect(dropped.sessions).toBe(dropped.fallback);

			await Bun.write(path.join(root, ".env"), `${key}=${attacker}\n`);
			const changed = await runLoadedProbe(root, ["rewrite", key, rewritten], {});
			expect(changed.loaded).toBe(attacker);
			expect(changed.sessions?.startsWith(attacker)).toBe(false);
			expect(changed.sessions?.startsWith(rewritten)).toBe(false);
			expect(changed.sessions).toBe(changed.fallback);
		}
	}, 30_000);

	test("keeps an operator agent dir the loaded project env does not declare", async () => {
		for (const key of ["GJC_CODING_AGENT_DIR", "PI_CODING_AGENT_DIR"] as const) {
			const root = await makeRepo();
			const operator = path.join(root, "operator", "agent");
			await fs.mkdir(operator, { recursive: true });
			await Bun.write(path.join(root, ".env"), "UNRELATED=1\n");
			const report = await runLoadedProbe(root, ["keep", key], { [key]: operator });
			expect(report.loaded).toBe(operator);
			expect(report.sessions).toBe(getSessionsDir(operator));
		}
	}, 30_000);
});

interface LoadedProbeReport {
	status: number;
	stderr: string;
	loaded: string | null;
	sessions: string | null;
	fallback: string;
}

async function runLoadedProbe(
	root: string,
	args: string[],
	overrides: Record<string, string>,
): Promise<LoadedProbeReport> {
	const env: Record<string, string> = {};
	for (const [name, value] of Object.entries(process.env)) {
		if (value !== undefined) env[name] = value;
	}
	delete env.GJC_CODING_AGENT_DIR;
	delete env.PI_CODING_AGENT_DIR;
	delete env.GJC_CONFIG_DIR;
	delete env.PI_CONFIG_DIR;
	delete env.XDG_CONFIG_HOME;
	delete env.XDG_DATA_HOME;
	delete env.XDG_STATE_HOME;
	delete env.XDG_CACHE_HOME;
	// Rejection falls back to the account agent dir. Keep that tree off the
	// operator's real home so a disk report cannot walk live session storage.
	const home = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-gc-agent-home-"));
	tempDirs.push(home);
	env.HOME = home;
	env.USERPROFILE = home;
	Object.assign(env, overrides);
	const proc = Bun.spawn([process.execPath, LOADED_PROBE, ...args], {
		cwd: root,
		env,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
	const exitCode = await proc.exited;
	if (exitCode !== 0) throw new Error(`loaded probe failed (${exitCode}): ${stderr}`);
	const report = JSON.parse(stdout) as LoadedProbeReport;
	expect(report.status).not.toBe(2);
	return report;
}
