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
	input: {
		name: string;
		command: string;
		args?: string[];
		cwd?: string;
		serverPath?: string;
		server?: string;
		ownedFiles?: Record<string, string>;
	},
): Promise<void> {
	const serverPath = input.serverPath ?? "mcp/server.mjs";
	if (input.server !== undefined) {
		await fs.mkdir(path.dirname(path.join(root, serverPath)), { recursive: true });
		await fs.writeFile(path.join(root, serverPath), input.server);
	}
	for (const [relativePath, content] of Object.entries(input.ownedFiles ?? {})) {
		await fs.mkdir(path.dirname(path.join(root, relativePath)), { recursive: true });
		await fs.writeFile(path.join(root, relativePath), content);
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
			system_appendix: Object.keys(input.ownedFiles ?? {}).map((relativePath, index) => ({
				name: `owned-launch-config-${index}`,
				path: relativePath,
			})),
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

function runtimeServerArgs(args: readonly string[] | undefined): string[] {
	const values = args ?? [];
	const separator = values.indexOf("--");
	if (separator < 0) throw new Error("verified launcher separator missing");
	return values.slice(separator + 4);
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
			stdio("node", ["--", "server.mjs"]),
		];
		for (const entry of rejected) {
			expect(() => assertMcpInstallPolicy(entry, { pluginRoot: root })).toThrow();
		}
	});

	test("classifies POSIX and Windows path forms consistently on every host", () => {
		const root = path.resolve("/tmp/plugin-root");
		for (const entry of [
			{ ...stdio("node", ["C:\\outside\\server.mjs"]), command: "node" },
			{ ...stdio("bun", ["..\\outside\\server.ts"]), command: "bun" },
			{ ...stdio("node", ["server.mjs"], "..\\outside"), command: "node" },
			{ ...stdio("node", ["server.mjs"]), command: "C:\\Program Files\\nodejs\\node.exe" },
			{ ...stdio("bun", ["server.ts"]), command: "/usr/bin/bun" },
		]) {
			expect(() => assertMcpInstallPolicy(entry, { pluginRoot: root })).toThrow();
		}
		expect(() =>
			assertMcpInstallPolicy({ ...stdio("bun", [], "bin"), command: ".\\server" }, { pluginRoot: root }),
		).toThrow();
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
		expect(path.basename(connected.command ?? "")).toBe(process.platform === "win32" ? "bun.exe" : "bun");
		expect(runtimeServerArgs(connected.args)).toEqual(["--config=ordinary-server-arg"]);
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
		expect(path.basename(connected.command ?? "")).toBe(process.platform === "win32" ? "node.exe" : "node");
		const separator = connected.args?.indexOf("--") ?? -1;
		expect(connected.args?.[separator + 1]).toBe(path.join(entry?.pluginRoot ?? "", "mcp/server.mjs"));
		expect(runtimeServerArgs(connected.args)).toEqual(["--cwd=ordinary-server-arg"]);
	}, 30_000);

	test("passes separators, spaces, quotes, and shell metacharacters only as literal post-entrypoint argv", async () => {
		const cwd = await tempDir("gjc-plugin-launcher-literal-project-");
		const source = await tempDir("gjc-plugin-launcher-literal-source-");
		await writeBundle(source, {
			name: "literal-argv",
			command: "node",
			args: ["mcp/server;literal.mjs", "--", "value with spaces", 'quote="literal"', "semi;colon", "amp&ersand"],
			serverPath: "mcp/server;literal.mjs",
			server: mcpServer(),
		});
		expect((await installGjcBundle({ cwd }, "project", source)).ok).toBe(true);
		const connected = await connect(cwd, "literal-argv");
		expect(connected.errors).toEqual([]);
		expect(runtimeServerArgs(connected.args)).toEqual([
			"--",
			"value with spaces",
			'quote="literal"',
			"semi;colon",
			"amp&ersand",
		]);
	}, 30_000);

	test("rejects path-qualified executable and shebang launcher aliases", async () => {
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
		await expect(installGjcBundle({ cwd }, "project", source)).rejects.toMatchObject({ code: "security_policy" });
	});

	test("copies hardlinked source bytes instead of retaining external inode authority", async () => {
		const cwd = await tempDir("gjc-plugin-launcher-hardlink-project-");
		const source = await tempDir("gjc-plugin-launcher-hardlink-source-");
		const outside = await tempDir("gjc-plugin-launcher-hardlink-outside-");
		const outsideServer = path.join(outside, "server.mjs");
		await fs.writeFile(outsideServer, mcpServer());
		await fs.mkdir(path.join(source, "mcp"), { recursive: true });
		await fs.link(outsideServer, path.join(source, "mcp/server.mjs"));
		await writeBundle(source, { name: "hardlink-copy", command: "node" });
		expect((await installGjcBundle({ cwd }, "project", source)).ok).toBe(true);
		const entry = (await readRegistry("project", cwd)).plugins[0];
		const installed = path.join(entry?.pluginRoot ?? "", "mcp/server.mjs");
		expect((await fs.stat(installed)).ino).not.toBe((await fs.stat(outsideServer)).ino);
		await fs.writeFile(outsideServer, "throw new Error('outside replacement');\n");
		const connected = await connect(cwd, "hardlink-copy");
		expect(connected.errors).toEqual([]);
	}, 30_000);

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
		const bunfig = `preload = [${JSON.stringify(path.join(outside, "preload.ts"))}]\n`;
		await writeBundle(source, {
			name: "ambient-isolation",
			command: "bun",
			server: mcpServer(serverReport),
			ownedFiles: {
				"bunfig.toml": bunfig,
				".env": "GJC_PLUGIN_AMBIENT=loaded\n",
				"package.json": '{"dependencies":{"definitely-not-installed":"latest"}}\n',
			},
		});
		expect((await installGjcBundle({ cwd }, "project", source)).ok).toBe(true);
		await fs.writeFile(
			path.join(outside, "preload.ts"),
			`await Bun.write(${JSON.stringify(preloadMarker)}, "ran\\n");\n`,
		);

		const connected = await connect(cwd, "ambient-isolation");
		expect(connected.errors).toEqual([]);
		expect(connected.args?.slice(0, 3)).toEqual([`--config=${os.devNull}`, "--no-env-file", "--no-install"]);
		expect(await fs.readFile(serverReport, "utf8")).toBe('{"ambient":null}');
		await expect(fs.readFile(preloadMarker, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
	}, 30_000);

	test("quarantines extra dotenv, config, package, and executable files added after install", async () => {
		const cwd = await tempDir("gjc-plugin-launcher-extra-project-");
		for (const [name, relativePath, content] of [
			["extra-dotenv", ".env", "TOKEN=ambient\n"],
			["extra-config", "bunfig.toml", "preload = []\n"],
			["extra-package", "package.json", '{"type":"commonjs"}\n'],
			["extra-executable", "mcp/other.mjs", "process.exit(0);\n"],
		] as const) {
			const source = await tempDir(`gjc-plugin-launcher-${name}-`);
			await writeBundle(source, { name, command: "node", server: mcpServer() });
			expect((await installGjcBundle({ cwd }, "project", source)).ok).toBe(true);
			const entry = (await readRegistry("project", cwd)).plugins.find(plugin => plugin.name === name);
			const absolutePath = path.join(entry?.pluginRoot ?? "", relativePath);
			await fs.mkdir(path.dirname(absolutePath), { recursive: true });
			await fs.writeFile(absolutePath, content);
			const runtime = await buildPluginMcpConfigs({ cwd });
			expect(runtime.configs[name]).toBeUndefined();
			expect(runtime.quarantine).toContainEqual(expect.objectContaining({ plugin: name, code: "security_policy" }));
		}
	});

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

	test("fails closed when the installed entrypoint changes after config build but before spawn", async () => {
		const cwd = await tempDir("gjc-plugin-launcher-toctou-project-");
		const source = await tempDir("gjc-plugin-launcher-toctou-source-");
		await writeBundle(source, { name: "spawn-toctou", command: "node", server: mcpServer() });
		expect((await installGjcBundle({ cwd }, "project", source)).ok).toBe(true);
		const runtime = await buildPluginMcpConfigs({ cwd });
		expect(runtime.quarantine).toEqual([]);
		const entry = (await readRegistry("project", cwd)).plugins[0];
		await fs.writeFile(path.join(entry?.pluginRoot ?? "", "mcp/server.mjs"), "process.exit(0);\n");

		const manager = new MCPManager(cwd);
		managers.push(manager);
		const connected = await manager.connectServers(runtime.configs, {
			"spawn-toctou": { provider: "gjc-plugins", providerName: "GJC plugin bundle", level: "project" },
		} as never);
		expect([...connected.errors.keys()]).toEqual(["spawn-toctou"]);
		expect(manager.getConnection("spawn-toctou")).toBeUndefined();
	});

	test("fails closed when the launch plan changes after config build", async () => {
		const cwd = await tempDir("gjc-plugin-launcher-plan-project-");
		const source = await tempDir("gjc-plugin-launcher-plan-source-");
		await writeBundle(source, { name: "plan-toctou", command: "node", server: mcpServer() });
		expect((await installGjcBundle({ cwd }, "project", source)).ok).toBe(true);
		const runtime = await buildPluginMcpConfigs({ cwd });
		expect(runtime.quarantine).toEqual([]);
		const config = runtime.configs["plan-toctou"];
		if (!config || config.type === "http" || config.type === "sse") throw new Error("missing stdio config");
		config.args = [...(config.args ?? []), "unexpected"];

		const manager = new MCPManager(cwd);
		managers.push(manager);
		const connected = await manager.connectServers(runtime.configs, {
			"plan-toctou": { provider: "gjc-plugins", providerName: "GJC plugin bundle", level: "project" },
		} as never);
		expect([...connected.errors.keys()]).toEqual(["plan-toctou"]);
		expect(manager.getConnection("plan-toctou")).toBeUndefined();
	});
});
