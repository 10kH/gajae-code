import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { CliConfig } from "@gajae-code/utils/cli";
import Plugin from "../src/commands/plugin";

const TEST_CONFIG: CliConfig = {
	bin: "gjc",
	version: "0.0.0-test",
	commands: new Map(),
};

let tempRoot: string | undefined;

const agentDirs: string[] = [];

async function runPluginCommand(
	args: string[],
	cwd: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
	// Isolate the user scope: without this the child process reads the real
	// ~/.gjc/agent registry and inherits whatever the developer has installed.
	const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-plugin-command-agent-"));
	agentDirs.push(agentDir);
	const proc = Bun.spawn({
		cmd: [process.execPath, path.join(import.meta.dir, "../src/cli.ts"), "plugin", ...args],
		cwd,
		env: { ...process.env, GJC_CODING_AGENT_DIR: agentDir },
		stdout: "pipe",
		stderr: "pipe",
	});
	const [exitCode, stdout, stderr] = await Promise.all([
		proc.exited,
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	return { exitCode, stdout, stderr };
}

async function makeTempProject(): Promise<string> {
	tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-plugin-command-"));
	return tempRoot;
}

describe("Plugin command scope parsing", () => {
	afterEach(async () => {
		if (tempRoot) {
			await fs.rm(tempRoot, { recursive: true, force: true });
			tempRoot = undefined;
		}
		for (const dir of agentDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true });
	});
	it("rejects invalid scope values", async () => {
		const command = new Plugin(["install", "--scope", "porject"], TEST_CONFIG);
		await expect(command.parse(Plugin)).rejects.toThrow(/Expected --scope to be one of: user, project/);
	});

	it("lists installed GJC plugin bundles in text and JSON output", async () => {
		const cwd = await makeTempProject();
		const fixture = path.join(import.meta.dir, "fixtures/gjc-plugins/valid-six-surface-bundle");

		const install = await runPluginCommand(["install", fixture, "--project"], cwd);
		expect(install.exitCode).toBe(0);
		expect(install.stderr).toBe("");

		const textList = await runPluginCommand(["list"], cwd);
		expect(textList.exitCode).toBe(0);
		expect(textList.stderr).toBe("");
		expect(textList.stdout).toContain("GJC Plugin Bundles:");
		expect(textList.stdout).toContain("valid-six-surface-bundle@1.0.0");
		expect(textList.stdout).toContain("(project)");

		const jsonList = await runPluginCommand(["list", "--json"], cwd);
		expect(jsonList.exitCode).toBe(0);
		expect(jsonList.stderr).toBe("");
		// `gjc` now carries safe lifecycle summaries keyed by canonical identity
		// (kind, scope, name) rather than raw registry entries.
		const parsed = JSON.parse(jsonList.stdout) as {
			gjc?: Array<{ identity: { kind: string; scope: string; name: string }; version: string }>;
		};
		expect(parsed.gjc).toEqual([
			expect.objectContaining({
				identity: { kind: "gjc-bundle", scope: "project", name: "valid-six-surface-bundle" },
				version: "1.0.0",
			}),
		]);
		// Safe summaries never expose the raw source locator or the install path.
		expect(jsonList.stdout).not.toContain("pluginRoot");
		expect(jsonList.stdout).not.toContain("copiedFiles");
	});
});
