import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { getAgentDir, setAgentDir } from "@gajae-code/utils";
import {
	assertMcpInstallPolicy,
	buildPluginMcpConfigs,
	type GjcPluginMcpManifestEntry,
	installGjcBundle,
	readRegistry,
	registryPathForScope,
} from "../src/extensibility/gjc-plugins";
import { MCPManager } from "../src/runtime-mcp";

const originalAgentDir = getAgentDir();
const tempDirs: string[] = [];
const managers: MCPManager[] = [];

beforeEach(async () => {
	setAgentDir(await tempDir("gjc-plugin-launcher-agent-"));
});

afterEach(async () => {
	for (const manager of managers.splice(0)) await manager.disconnectAll().catch(() => {});
	setAgentDir(originalAgentDir);
	for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true });
});

async function tempDir(prefix: string): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
	tempDirs.push(dir);
	return dir;
}

function stdio(command: "node" | "bun", args: string[], cwd = "."): GjcPluginMcpManifestEntry {
	return { name: "launcher-contract", transport: "stdio", command, args, cwd };
}

async function writeBundle(
	root: string,
	input: { name: string; command: string; args?: string[]; cwd?: string; serverPath?: string; server?: string },
): Promise<void> {
	const serverPath = input.serverPath ?? "mcp/server.mjs";
	if (input.server !== undefined) {
		await fs.mkdir(path.dirname(path.join(root, serverPath)), { recursive: true });
		await fs.writeFile(path.join(root, serverPath), input.server);
	}
	await fs.writeFile(
		path.join(root, "gajae-plugin.json"),
		JSON.stringify({
			kind: "gajae-code-plugin",
			name: input.name,
			version: "1.0.0",
			mcps: [
				{
					name: input.name,
					transport: "stdio",
					command: input.command,
					args: input.args ?? [serverPath],
					cwd: input.cwd ?? ".",
				},
			],
		}),
	);
}

function mcpServer(reportPath?: string): string {
	const report = reportPath
		? `writeFileSync(${JSON.stringify(reportPath)}, JSON.stringify({ ambient: process.env.GJC_PLUGIN_AMBIENT ?? null }));`
		: "";
	return `
import { writeFileSync } from "node:fs";
import * as readline from "node:readline";
${report}
const rl = readline.createInterface({ input: process.stdin });
const send = value => process.stdout.write(JSON.stringify(value) + "\\n");
rl.on("line", line => {
  const request = JSON.parse(line);
  if (request.method === "initialize") send({ jsonrpc: "2.0", id: request.id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "launcher-contract", version: "1" } } });
  else if (request.method === "tools/list") send({ jsonrpc: "2.0", id: request.id, result: { tools: [{ name: "ping", description: "ping", inputSchema: { type: "object", properties: {} } }] } });
  else if (request.id !== undefined) send({ jsonrpc: "2.0", id: request.id, result: {} });
});
`;
}

async function connect(
	cwd: string,
	name: string,
): Promise<{ command: string | undefined; args: string[] | undefined; errors: unknown[] }> {
	const runtime = await buildPluginMcpConfigs({ cwd });
	expect(runtime.quarantine).toEqual([]);
	const manager = new MCPManager(cwd);
	managers.push(manager);
	const connected = await manager.connectServers(runtime.configs, {
		[name]: { provider: "gjc-plugins", providerName: "GJC plugin bundle", level: "project" },
	} as never);
	return {
		command: runtime.configs[name]?.command,
		args: runtime.configs[name]?.args,
		errors: [...connected.errors.entries()],
	};
}

describe("bundled plugin MCP launcher contract", () => {
	test("rejects every manifest-controlled pre-entrypoint option and malformed launcher form", () => {
		const root = path.resolve("/tmp/plugin-root");
		const rejected = [
			stdio("bun", ["-r../outside.ts", "server.ts"]),
			stdio("bun", ["--preload=../outside.ts", "server.ts"]),
			stdio("bun", ["--cwd=../outside", "server.ts"]),
			stdio("bun", ["--cwd", "../outside", "server.ts"]),
			stdio("bun", ["--config=../outside.toml", "server.ts"]),
			stdio("bun", ["--env-file=../outside.env", "server.ts"]),
			stdio("bun", ["--tsconfig-override=../outside.json", "server.ts"]),
			stdio("bun", ["--install=force", "server.ts"]),
			stdio("node", ["-r../outside.cjs", "server.mjs"]),
			stdio("node", ["--import=../outside.mjs", "server.mjs"]),
			stdio("node", ["--experimental-config-file=../outside.json", "server.mjs"]),
			stdio("node", ["--env-file=../outside.env", "server.mjs"]),
			stdio("node", ["--run", "server.mjs"]),
			stdio("node", []),
			stdio("bun", ["--"]),
		];
		for (const entry of rejected) {
			expect(() => assertMcpInstallPolicy(entry, { pluginRoot: root })).toThrow();
		}
	});

	test("keeps launcher flags after the owned entrypoint as opaque server arguments", () => {
		const root = path.resolve("/tmp/plugin-root");
		for (const command of ["node", "bun"] as const) {
			expect(() =>
				assertMcpInstallPolicy(stdio(command, ["server.mjs", "--config=server-value", "--cwd=server-value"]), {
					pluginRoot: root,
				}),
			).not.toThrow();
		}
	});

	test("requires the direct launcher entrypoint to exist inside the effective manifest cwd", async () => {
		const cwd = await tempDir("gjc-plugin-launcher-project-");
		const missingCwd = await tempDir("gjc-plugin-launcher-missing-cwd-");
		await writeBundle(missingCwd, {
			name: "missing-cwd",
			command: "bun",
			args: ["../server.mjs"],
			cwd: "missing",
			serverPath: "server.mjs",
			server: mcpServer(),
		});
		await expect(installGjcBundle({ cwd }, "project", missingCwd)).rejects.toMatchObject({ code: "missing_file" });

		const missing = await tempDir("gjc-plugin-launcher-missing-");
		await writeBundle(missing, { name: "missing-entry", command: "bun", args: ["server.ts"] });
		await expect(installGjcBundle({ cwd }, "project", missing)).rejects.toMatchObject({ code: "missing_file" });

		const outside = await tempDir("gjc-plugin-launcher-outside-");
		await fs.writeFile(path.join(outside, "server.ts"), mcpServer());
		const symlinked = await tempDir("gjc-plugin-launcher-symlink-");
		await fs.symlink(path.join(outside, "server.ts"), path.join(symlinked, "server.ts"));
		await writeBundle(symlinked, { name: "symlink-entry", command: "bun", args: ["server.ts"] });
		await expect(installGjcBundle({ cwd }, "project", symlinked)).rejects.toMatchObject({ code: "security_policy" });

		const symlinkedCwd = await tempDir("gjc-plugin-launcher-symlink-cwd-");
		await fs.symlink(outside, path.join(symlinkedCwd, "mcp"));
		await writeBundle(symlinkedCwd, {
			name: "symlink-cwd",
			command: "bun",
			args: ["server.ts"],
			cwd: "mcp",
		});
		await expect(installGjcBundle({ cwd }, "project", symlinkedCwd)).rejects.toMatchObject({
			code: "security_policy",
		});
	});

	test("copies a cwd-relative bare entrypoint and connects it after the source is removed", async () => {
		const cwd = await tempDir("gjc-plugin-launcher-project-");
		const source = await tempDir("gjc-plugin-launcher-source-");
		await writeBundle(source, {
			name: "direct-entry",
			command: "bun",
			args: ["server.mjs", "--config=ordinary-server-arg"],
			cwd: "mcp",
			serverPath: "mcp/server.mjs",
			server: mcpServer(),
		});
		expect((await installGjcBundle({ cwd }, "project", source)).ok).toBe(true);
		const registry = await readRegistry("project", cwd);
		expect(registry.plugins[0]?.copiedFiles.map(file => file.relativePath)).toContain(path.join("mcp", "server.mjs"));
		await fs.rm(source, { recursive: true, force: true });

		const connected = await connect(cwd, "direct-entry");
		expect(connected.errors).toEqual([]);
		expect(connected.command).toBe("bun");
		expect(connected.args?.slice(-1)).toEqual(["--config=ordinary-server-arg"]);
	}, 30_000);

	test("preserves an otherwise-empty effective cwd for a sibling entrypoint", async () => {
		const cwd = await tempDir("gjc-plugin-launcher-project-");
		const source = await tempDir("gjc-plugin-launcher-empty-cwd-");
		await fs.mkdir(path.join(source, "empty-cwd"));
		await writeBundle(source, {
			name: "empty-cwd",
			command: "bun",
			args: ["../server.mjs"],
			cwd: "empty-cwd",
			serverPath: "server.mjs",
			server: mcpServer(),
		});
		expect((await installGjcBundle({ cwd }, "project", source)).ok).toBe(true);
		const entry = (await readRegistry("project", cwd)).plugins[0];
		await fs.rm(source, { recursive: true, force: true });

		await expect(fs.stat(path.join(entry?.pluginRoot ?? "", "empty-cwd"))).resolves.toMatchObject({});
		const connected = await connect(cwd, "empty-cwd");
		expect(connected.errors).toEqual([]);
	}, 30_000);

	test("preserves direct Node entrypoints while rewriting them to the installed owned file", async () => {
		const cwd = await tempDir("gjc-plugin-launcher-node-project-");
		const source = await tempDir("gjc-plugin-launcher-node-source-");
		await writeBundle(source, {
			name: "node-entry",
			command: "node",
			args: ["server.mjs", "--cwd=ordinary-server-arg"],
			cwd: "mcp",
			server: mcpServer(),
		});
		expect((await installGjcBundle({ cwd }, "project", source)).ok).toBe(true);
		const entry = (await readRegistry("project", cwd)).plugins[0];
		const connected = await connect(cwd, "node-entry");
		expect(connected.errors).toEqual([]);
		expect(connected.command).toBe("node");
		expect(connected.args).toEqual([
			path.join(entry?.pluginRoot ?? "", "mcp/server.mjs"),
			"--cwd=ordinary-server-arg",
		]);
	}, 30_000);

	test("copies and marks a root-confined executable command as installer-owned", async () => {
		const cwd = await tempDir("gjc-plugin-launcher-project-");
		const source = await tempDir("gjc-plugin-launcher-executable-");
		await fs.mkdir(path.join(source, "bin"), { recursive: true });
		await fs.writeFile(path.join(source, "bin/server"), `#!/usr/bin/env bun\n${mcpServer()}`, { mode: 0o600 });
		await writeBundle(source, {
			name: "owned-executable",
			command: "./server",
			args: [],
			cwd: "bin",
		});
		expect((await installGjcBundle({ cwd }, "project", source)).ok).toBe(true);
		const registry = await readRegistry("project", cwd);
		const entry = registry.plugins[0];
		expect(entry?.copiedFiles.map(file => file.relativePath)).toContain(path.join("bin", "server"));
		const installed = path.join(entry?.pluginRoot ?? "", "bin/server");
		expect(await fs.readFile(installed, "utf8")).toContain("#!/usr/bin/env bun");
		if (process.platform !== "win32") {
			expect((await fs.stat(installed)).mode & 0o111).not.toBe(0);
			const connected = await connect(cwd, "owned-executable");
			expect(connected.errors).toEqual([]);
			expect(connected.command).toBe(installed);
		}
	});

	test("blocks outside config/cwd selectors during installation", async () => {
		const cwd = await tempDir("gjc-plugin-launcher-project-");
		const outside = await tempDir("gjc-plugin-launcher-outside-");
		for (const [name, firstArg] of [
			["outside-config", `--config=${path.join(outside, "bunfig.toml")}`],
			["outside-cwd", `--cwd=${outside}`],
		] as const) {
			const source = await tempDir(`gjc-plugin-launcher-${name}-`);
			await writeBundle(source, {
				name,
				command: "bun",
				args: [firstArg, "mcp/server.mjs"],
				server: mcpServer(),
			});
			await expect(installGjcBundle({ cwd }, "project", source)).rejects.toMatchObject({ code: "security_policy" });
		}
	});

	test("neutralizes ambient Bun config, dotenv, and auto-install at the live spawn boundary", async () => {
		const cwd = await tempDir("gjc-plugin-launcher-project-");
		const source = await tempDir("gjc-plugin-launcher-source-");
		const outside = await tempDir("gjc-plugin-launcher-ambient-");
		const preloadMarker = path.join(outside, "preload-ran.txt");
		const serverReport = path.join(outside, "server-report.json");
		await writeBundle(source, {
			name: "ambient-isolation",
			command: "bun",
			server: mcpServer(serverReport),
		});
		expect((await installGjcBundle({ cwd }, "project", source)).ok).toBe(true);
		const entry = (await readRegistry("project", cwd)).plugins[0];
		await fs.writeFile(
			path.join(outside, "preload.ts"),
			`await Bun.write(${JSON.stringify(preloadMarker)}, "ran\\n");\n`,
		);
		await fs.writeFile(
			path.join(entry?.pluginRoot ?? "", "bunfig.toml"),
			`preload = [${JSON.stringify(path.join(outside, "preload.ts"))}]\n`,
		);
		await fs.writeFile(path.join(entry?.pluginRoot ?? "", ".env"), "GJC_PLUGIN_AMBIENT=loaded\n");

		const connected = await connect(cwd, "ambient-isolation");
		expect(connected.errors).toEqual([]);
		expect(connected.args?.slice(0, 3)).toEqual([`--config=${os.devNull}`, "--no-env-file", "--no-install"]);
		expect(await fs.readFile(serverReport, "utf8")).toBe('{"ambient":null}');
		await expect(fs.readFile(preloadMarker, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
	}, 30_000);

	test("quarantines an MCP config that no longer matches its compiled registry hash", async () => {
		const cwd = await tempDir("gjc-plugin-launcher-project-");
		const source = await tempDir("gjc-plugin-launcher-source-");
		await writeBundle(source, { name: "config-rebind", command: "bun", server: mcpServer() });
		expect((await installGjcBundle({ cwd }, "project", source)).ok).toBe(true);
		await buildPluginMcpConfigs({ cwd }); // Persist the canonical v2 migration first.

		const registryPath = registryPathForScope("project", cwd);
		const registry = JSON.parse(await fs.readFile(registryPath, "utf8"));
		registry.plugins[0].surfaces.mcps[0].config.args = ["gajae-plugin.json"];
		await fs.writeFile(registryPath, JSON.stringify(registry));

		const runtime = await buildPluginMcpConfigs({ cwd });
		expect(Object.keys(runtime.configs)).toEqual([]);
		expect(runtime.quarantine).toContainEqual(
			expect.objectContaining({ plugin: "config-rebind", code: "security_policy" }),
		);
	});

	test("quarantines a registry-selected plugin root outside its owning scope", async () => {
		const cwd = await tempDir("gjc-plugin-launcher-project-");
		const source = await tempDir("gjc-plugin-launcher-source-");
		await writeBundle(source, { name: "root-rebind", command: "bun", server: mcpServer() });
		expect((await installGjcBundle({ cwd }, "project", source)).ok).toBe(true);
		await buildPluginMcpConfigs({ cwd }); // Persist the canonical v2 migration first.

		const registryPath = registryPathForScope("project", cwd);
		const registry = JSON.parse(await fs.readFile(registryPath, "utf8"));
		const outside = await tempDir("gjc-plugin-launcher-outside-root-");
		await fs.cp(registry.plugins[0].pluginRoot, outside, { recursive: true });
		registry.plugins[0].pluginRoot = outside;
		registry.plugins[0].manifestPath = path.join(outside, "gajae-plugin.json");
		await fs.writeFile(registryPath, JSON.stringify(registry));

		const runtime = await buildPluginMcpConfigs({ cwd });
		expect(Object.keys(runtime.configs)).toEqual([]);
		expect(runtime.quarantine).toContainEqual(
			expect.objectContaining({ plugin: "root-rebind", code: "security_policy" }),
		);
	});

	test("quarantines an owned entrypoint omitted from the authenticated copied-file set", async () => {
		const cwd = await tempDir("gjc-plugin-launcher-project-");
		const source = await tempDir("gjc-plugin-launcher-source-");
		await writeBundle(source, { name: "file-rebind", command: "bun", server: mcpServer() });
		expect((await installGjcBundle({ cwd }, "project", source)).ok).toBe(true);
		await buildPluginMcpConfigs({ cwd }); // Persist the canonical v2 migration first.

		const registryPath = registryPathForScope("project", cwd);
		const registry = JSON.parse(await fs.readFile(registryPath, "utf8"));
		registry.plugins[0].copiedFiles = registry.plugins[0].copiedFiles.filter(
			(file: { relativePath: string }) => file.relativePath !== "mcp/server.mjs",
		);
		await fs.writeFile(registryPath, JSON.stringify(registry));

		const runtime = await buildPluginMcpConfigs({ cwd });
		expect(Object.keys(runtime.configs)).toEqual([]);
		expect(runtime.quarantine).toContainEqual(
			expect.objectContaining({ plugin: "file-rebind", code: "security_policy" }),
		);
	});
});
