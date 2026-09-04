import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { getAgentDir, setAgentDir } from "@gajae-code/utils";
import { buildPluginMcpConfigs, installGjcBundle, registryPathForScope } from "../src/extensibility/gjc-plugins";
import { isPluginMcpPublicNetworkBound } from "../src/runtime-mcp/plugin-network-boundary";

const fixturesRoot = path.join(import.meta.dir, "fixtures", "gjc-plugins");
const sixSurface = path.join(fixturesRoot, "valid-six-surface-bundle");
const tempDirs: string[] = [];
const originalAgentDir = getAgentDir();
let agentDir: string;

beforeEach(async () => {
	agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-mcp-configs-agent-"));
	setAgentDir(agentDir);
});

afterEach(async () => {
	setAgentDir(originalAgentDir);
	for (const d of tempDirs.splice(0)) await fs.rm(d, { recursive: true, force: true });
	await fs.rm(agentDir, { recursive: true, force: true });
});

describe("plugin MCP runtime config conversion", () => {
	test("converts a bundled stdio MCP into a root-confined runtime config", async () => {
		const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-mcp-"));
		tempDirs.push(cwd);
		const r = await installGjcBundle({ cwd }, "project", sixSurface);
		expect(r.ok).toBe(true);
		const { configs, quarantine } = await buildPluginMcpConfigs({ cwd });
		expect(quarantine).toHaveLength(0);
		const docs = configs.domain_docs;
		expect(docs.type).toBe("stdio");
		const bun = Bun.which("bun");
		if (!bun) throw new Error("bun launcher missing");
		expect(docs.command).toBe(await fs.realpath(bun));
		// cwd is confined to the installed plugin root.
		const installedRoot = path.join(cwd, ".gjc", "gjc-plugins", "valid-six-surface-bundle");
		expect(docs.args?.slice(0, 5)).toEqual([
			`--config=${os.devNull}`,
			"--no-env-file",
			"--no-install",
			"--eval",
			expect.any(String),
		]);
		const separator = docs.args?.indexOf("--") ?? -1;
		expect(docs.args?.[separator + 1]).toBe(path.join(installedRoot, "mcp/domain-docs.ts"));
		expect(docs.args?.[separator + 2]).toBe(registryPathForScope("project", cwd));
		expect(docs.args?.[separator + 3]).toMatch(/^[0-9a-f]{64}$/);
		expect(docs.args?.[separator + 4]).toBe("valid-six-surface-bundle");
		expect(docs.args?.[separator + 5]).toBe(installedRoot);
		expect(docs.args?.[separator + 6]).toBe(await fs.realpath(installedRoot));
		expect(docs.args?.[separator + 7]).toBe("");
		expect(path.resolve(docs.cwd)).toBe(path.resolve(installedRoot));
	});

	test("empty when no plugins installed", async () => {
		const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-mcp-empty-"));
		tempDirs.push(cwd);
		const { configs } = await buildPluginMcpConfigs({ cwd });
		expect(configs).toEqual({});
	});

	test("binds bundled remote MCP configs to the public-network transport", async () => {
		const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-mcp-remote-"));
		const bundle = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-mcp-remote-bundle-"));
		tempDirs.push(cwd, bundle);
		const url = "https://8.8.8.8/mcp";
		await fs.writeFile(
			path.join(bundle, "gajae-plugin.json"),
			JSON.stringify({
				kind: "gajae-code-plugin",
				name: "remote-mcp-bundle",
				version: "1.0.0",
				mcps: [{ name: "remote_docs", transport: "http", url }],
			}),
		);

		const r = await installGjcBundle({ cwd }, "project", bundle);
		expect(r.ok).toBe(true);
		const { configs, quarantine } = await buildPluginMcpConfigs({ cwd });

		expect(quarantine).toHaveLength(0);
		expect(configs.remote_docs).toMatchObject({ type: "http", url });
		expect(isPluginMcpPublicNetworkBound(configs.remote_docs)).toBe(true);
		expect(isPluginMcpPublicNetworkBound({ ...configs.remote_docs })).toBe(true);
	});
});
