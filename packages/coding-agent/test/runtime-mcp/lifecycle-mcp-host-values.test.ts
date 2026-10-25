/**
 * Lifecycle mcpServers are written under a tools-only temp directory and then
 * loaded as an exact config. That load must drop `!` shell values and keep
 * sensitive host names as text, while an explicit tools-only file outside
 * that directory still resolves them.
 */

import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import fc from "fast-check";
import { safeRmSync } from "../../../../scripts/safe-cleanup";
import type { SourceMeta } from "../../src/capability/types";
import { clearConfigValueCache } from "../../src/config/resolve-config-value";
import { MCPManager } from "../../src/runtime-mcp/manager";
import * as projectHostValues from "../../src/runtime-mcp/project-host-values";

const LIFECYCLE_DIR_PREFIX = "gjc-acp-mcp-";

const HOST_KEY = "OPENAI_API_KEY";
const HOST_VALUE = "host-openai-key";
const PUBLIC_NAME = "PUBLIC_CANARY";
const PUBLIC_VALUE = "from-host";
const SHELL_TEXT = "shell-ran";

const tempDirs: string[] = [];

afterEach(() => {
	clearConfigValueCache();
	for (const dir of tempDirs.splice(0)) safeRmSync(dir, { recursive: true, force: true });
	MCPManager.resetForTests();
});

async function tempDir(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-lifecycle-mcp-"));
	tempDirs.push(dir);
	return dir;
}

async function exists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function waitUntil(check: () => Promise<boolean>, timeoutMs: number): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (await check()) return true;
		await Bun.sleep(20);
	}
	return check();
}

function restoreEnv(name: string, previous: string | undefined): void {
	if (previous === undefined) delete process.env[name];
	else process.env[name] = previous;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
	await fs.writeFile(filePath, JSON.stringify(value));
}

describe("lifecycle tools-only MCP host values", () => {
	it("drops a lifecycle shell value and host secret from the tools-only child", async () => {
		const root = await tempDir();
		const configDir = await fs.mkdtemp(path.join(root, LIFECYCLE_DIR_PREFIX));
		const marker = path.join(root, "bang-marker");
		const bangScript = path.join(root, "bang.mjs");
		const reportPath = path.join(root, "child-env.json");
		const scriptPath = path.join(root, "report.mjs");
		await fs.writeFile(
			bangScript,
			`import fs from "node:fs"; fs.writeFileSync(${JSON.stringify(marker)}, "1"); process.stdout.write(${JSON.stringify(SHELL_TEXT)});\n`,
		);
		await fs.writeFile(
			scriptPath,
			[
				"import fs from 'node:fs';",
				"fs.writeFileSync(process.env.REPORT, JSON.stringify({",
				"  BANG: process.env.BANG ?? null,",
				"  LEAK: process.env.LEAK ?? null,",
				"  HOST: process.env.OPENAI_API_KEY ?? null,",
				"  MODE: process.env.MODE ?? null,",
				"}));",
				"process.exit(0);",
				"",
			].join("\n"),
		);
		await writeJson(path.join(configDir, "mcp.json"), {
			mcpServers: {
				report: {
					type: "stdio",
					command: process.execPath,
					args: [scriptPath],
					timeout: 3000,
					noInheritEnv: true,
					env: {
						REPORT: reportPath,
						BANG: `!"${process.execPath}" "${bangScript}"`,
						LEAK: HOST_KEY,
						MODE: "debug",
					},
				},
			},
		});
		const previous = process.env[HOST_KEY];
		process.env[HOST_KEY] = HOST_VALUE;
		const manager = new MCPManager(root, null, { toolsOnly: true });
		try {
			await manager.discoverAndConnect({ configPath: path.join(configDir, "mcp.json"), filterExa: false });
			expect(await waitUntil(async () => exists(reportPath), 4000)).toBe(true);
			const report = JSON.parse(await fs.readFile(reportPath, "utf8")) as Record<string, string | null>;
			expect(await exists(marker)).toBe(false);
			expect(report.BANG).toBeNull();
			expect(report.LEAK).toBe(HOST_KEY);
			expect(report.LEAK).not.toBe(HOST_VALUE);
			expect(report.HOST).toBeNull();
			expect(report.MODE).toBe("debug");
			expect(JSON.stringify(report)).not.toContain(HOST_VALUE);
			expect(JSON.stringify(report)).not.toContain(SHELL_TEXT);
		} finally {
			restoreEnv(HOST_KEY, previous);
			await manager.disconnectAll().catch(() => {});
		}
	}, 20_000);

	it("drops a shell header from a lifecycle tools-only http server", async () => {
		const root = await tempDir();
		const configDir = await fs.mkdtemp(path.join(root, LIFECYCLE_DIR_PREFIX));
		const marker = path.join(root, "header-marker");
		const bangScript = path.join(root, "header-bang.mjs");
		await fs.writeFile(bangScript, `import fs from "node:fs"; fs.writeFileSync(${JSON.stringify(marker)}, "1");\n`);
		await writeJson(path.join(configDir, "mcp.json"), {
			mcpServers: {
				remote: {
					type: "http",
					url: "http://127.0.0.1:1/mcp",
					timeout: 500,
					headers: { "X-Bang": `!"${process.execPath}" "${bangScript}"` },
				},
			},
		});
		const manager = new MCPManager(root, null, { toolsOnly: true });
		try {
			await manager
				.discoverAndConnect({ configPath: path.join(configDir, "mcp.json"), filterExa: false })
				.catch(() => {});
			expect(await waitUntil(async () => exists(marker), 1500)).toBe(false);
		} finally {
			await manager.disconnectAll().catch(() => {});
		}
	}, 20_000);

	it("still allows plain, spaced, cased, and non-sensitive lifecycle env values in the tools-only child", async () => {
		const root = await tempDir();
		const configDir = await fs.mkdtemp(path.join(root, LIFECYCLE_DIR_PREFIX));
		const reportPath = path.join(root, "kept-env.json");
		const scriptPath = path.join(root, "kept.mjs");
		await fs.writeFile(
			scriptPath,
			[
				"import fs from 'node:fs';",
				"fs.writeFileSync(process.env.REPORT, JSON.stringify({",
				"  MODE: process.env.MODE ?? null,",
				"  CASE: process.env.CASE ?? null,",
				"  PAD: process.env.PAD ?? null,",
				"  SAY: process.env.SAY ?? null,",
				"  PUBLIC: process.env.PUBLIC ?? null,",
				"}));",
				"process.exit(0);",
				"",
			].join("\n"),
		);
		await writeJson(path.join(configDir, "mcp.json"), {
			mcpServers: {
				report: {
					type: "stdio",
					command: process.execPath,
					args: [scriptPath],
					timeout: 3000,
					noInheritEnv: true,
					env: {
						REPORT: reportPath,
						MODE: "debug",
						CASE: "Debug",
						PAD: " debug ",
						SAY: "echo ok",
						PUBLIC: PUBLIC_NAME,
					},
				},
			},
		});
		const previous = process.env[PUBLIC_NAME];
		process.env[PUBLIC_NAME] = PUBLIC_VALUE;
		const manager = new MCPManager(root, null, { toolsOnly: true });
		try {
			await manager.discoverAndConnect({ configPath: path.join(configDir, "mcp.json"), filterExa: false });
			expect(await waitUntil(async () => exists(reportPath), 4000)).toBe(true);
			const report = JSON.parse(await fs.readFile(reportPath, "utf8")) as Record<string, string | null>;
			expect(report.MODE).toBe("debug");
			expect(report.CASE).toBe("Debug");
			expect(report.PAD).toBe(" debug ");
			expect(report.SAY).toBe("echo ok");
			expect(report.PUBLIC).toBe(PUBLIC_VALUE);
		} finally {
			restoreEnv(PUBLIC_NAME, previous);
			await manager.disconnectAll().catch(() => {});
		}
	}, 20_000);

	it("still allows a shell value from an explicit tools-only config", async () => {
		const root = await tempDir();
		const marker = path.join(root, "explicit-marker");
		const bangScript = path.join(root, "explicit-bang.mjs");
		await fs.writeFile(bangScript, `import fs from "node:fs"; fs.writeFileSync(${JSON.stringify(marker)}, "1");\n`);
		const configPath = path.join(root, "explicit.json");
		await writeJson(configPath, {
			mcpServers: {
				exact: {
					type: "stdio",
					command: process.execPath,
					args: ["-e", "process.exit(0)"],
					timeout: 3000,
					env: { BANG: `!"${process.execPath}" "${bangScript}"` },
				},
			},
		});
		const manager = new MCPManager(root, null, { toolsOnly: true });
		try {
			await manager.discoverAndConnect({ configPath, filterExa: false });
			expect(await waitUntil(async () => exists(marker), 4000)).toBe(true);
		} finally {
			await manager.disconnectAll().catch(() => {});
		}
	}, 20_000);

	it("property: lifecycle tools-only directory trust, fc.property seed 20261025, numRuns 64", () => {
		fc.assert(
			fc.property(
				fc.string({ maxLength: 24 }),
				fc.boolean(),
				fc.constantFrom("user" as const, "project" as const),
				fc.boolean(),
				fc.boolean(),
				(segment, toolsOnly, level, inLifecycleDir, missing) => {
					const classify = projectHostValues.isUntrustedLifecycleToolsOnlySource;
					expect(typeof classify).toBe("function");
					const source: SourceMeta | undefined = missing
						? undefined
						: {
								provider: "native",
								providerName: "GJC",
								level,
								path: path.join(inLifecycleDir ? `${LIFECYCLE_DIR_PREFIX}${segment}` : segment, "mcp.json"),
							};
					const untrusted = classify(source, toolsOnly);
					const prefixed =
						source?.path.split(/[\\/]/).some(part => part.startsWith(LIFECYCLE_DIR_PREFIX)) === true;
					expect(untrusted).toBe(toolsOnly && source?.level === "project" && prefixed);
				},
			),
			{ seed: 20261025, numRuns: 64 },
		);
	});
});
