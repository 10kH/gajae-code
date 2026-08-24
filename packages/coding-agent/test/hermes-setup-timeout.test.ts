import { afterEach, describe, expect, it, vi } from "bun:test";
import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { YAML } from "bun";
import { parseSetupArgs, printSetupHelp, runSetupCommand } from "../src/cli/setup-cli";
import Setup from "../src/commands/setup";
import { runHermesSetup } from "../src/setup/hermes-setup";

const ROOT = process.cwd();

let tempRoot: string | undefined;

interface RenderedServer {
	timeout?: unknown;
	connect_timeout?: unknown;
	enabled?: unknown;
	command?: unknown;
	env?: Record<string, unknown>;
}

function renderedServerBlock(result: Awaited<ReturnType<typeof runHermesSetup>>): RenderedServer {
	const preview = result.previews?.find(entry => entry.path.endsWith(".yaml"));
	const parsed = YAML.parse(preview?.content ?? "") as { mcp_servers?: Record<string, RenderedServer> };
	return parsed.mcp_servers?.gjc_coordinator ?? {};
}

async function installedServerBlock(configPath: string): Promise<RenderedServer> {
	const parsed = YAML.parse(await Bun.file(configPath).text()) as { mcp_servers?: Record<string, RenderedServer> };
	return parsed.mcp_servers?.gjc_coordinator ?? {};
}

async function render(flags: Parameters<typeof runHermesSetup>[0] = {}) {
	return await runHermesSetup({ root: [ROOT], profile: "test", repo: "repo", json: true, ...flags });
}

async function tempDir(): Promise<string> {
	tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-hermes-timeout-"));
	return tempRoot;
}

/**
 * Digest over a managed block the way it was computed before #4878, with the
 * timeout fields included, so tests can build blocks written by older GJC
 * versions.
 */
function legacySignature(block: RenderedServer): string {
	const env = { ...(block.env ?? {}) };
	delete env.GJC_COORDINATOR_MCP_SETUP_SIGNATURE;
	const value = { ...block, env };
	return crypto
		.createHash("sha256")
		.update(JSON.stringify(canonicalize(value)))
		.digest("hex");
}

function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalize);
	if (typeof value !== "object" || value === null) return value;
	const output: Record<string, unknown> = {};
	for (const key of Object.keys(value as Record<string, unknown>).sort()) {
		const item = (value as Record<string, unknown>)[key];
		if (item !== undefined) output[key] = canonicalize(item);
	}
	return output;
}

async function writeConfig(configPath: string, server: RenderedServer): Promise<void> {
	await Bun.write(configPath, YAML.stringify({ mcp_servers: { gjc_coordinator: server } }, null, 2));
}

describe("gjc setup hermes --timeout / --connect-timeout", () => {
	afterEach(async () => {
		vi.restoreAllMocks();
		if (tempRoot) {
			await fs.rm(tempRoot, { recursive: true, force: true });
			tempRoot = undefined;
		}
	});

	it("renders the 180/60 defaults when the flags are omitted", async () => {
		const block = renderedServerBlock(await render());

		expect(block.timeout).toBe(180);
		expect(block.connect_timeout).toBe(60);
	});

	it("renders explicit bounded values into the coordinator block", async () => {
		const block = renderedServerBlock(await render({ timeout: "900", connectTimeout: "30" }));

		expect(block.timeout).toBe(900);
		expect(block.connect_timeout).toBe(30);
	});

	it("accepts the range boundaries and rejects everything else", async () => {
		for (const value of ["1", "3600"]) {
			const block = renderedServerBlock(await render({ timeout: value }));
			expect(block.timeout).toBe(Number(value));
		}

		for (const value of ["0", "-5", "1.5", "abc", "", "9e2", "0x10", "3601", "  "]) {
			await expect(render({ timeout: value }), `--timeout ${value}`).rejects.toThrow(
				/--timeout must be whole seconds between 1 and 3600/,
			);
			await expect(render({ connectTimeout: value }), `--connect-timeout ${value}`).rejects.toThrow(
				/--connect-timeout must be whole seconds between 1 and 3600/,
			);
		}
	});

	it("parses the new flags and keeps them scoped to the hermes component", async () => {
		expect(parseSetupArgs(["setup", "hermes", "--timeout", "900", "--connect-timeout", "45"])).toEqual({
			component: "hermes",
			flags: { timeout: "900", connectTimeout: "45" },
		});

		const exit = vi.spyOn(process, "exit").mockImplementation((() => {
			throw new Error("exit");
		}) as never);
		const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
		await expect(runSetupCommand({ component: "defaults", flags: { timeout: "900" } })).rejects.toThrow("exit");
		expect(stderr.mock.calls.map(call => String(call[0])).join("")).toContain(
			"--timeout require the explicit `hermes` component",
		);
		expect(exit).toHaveBeenCalledWith(1);
	});

	it("keeps flag help aligned with the oclif definitions", () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => {});
		printSetupHelp();
		const output = log.mock.calls.map(call => String(call[0])).join("\n");

		expect(output).toContain(Setup.flags.timeout.description);
		expect(output).toContain(Setup.flags["connect-timeout"].description);
		expect(output).not.toContain("--timeout 180");
	});

	it("installs explicit values, keeps re-installs idempotent, and passes check", async () => {
		const dir = await tempDir();
		const configPath = path.join(dir, "config.yaml");

		await runHermesSetup({ install: true, root: [dir], target: configPath, timeout: "900" });
		expect((await installedServerBlock(configPath)).timeout).toBe(900);
		const afterFirst = await Bun.file(configPath).text();

		const second = await runHermesSetup({ install: true, root: [dir], target: configPath });
		expect(await Bun.file(configPath).text()).toBe(afterFirst);
		expect(second.warnings.join("\n")).not.toContain("Ignoring existing");
		expect((await runHermesSetup({ check: true, root: [dir], target: configPath })).check?.ok).toBe(true);
	});

	it("preserves installed values per field when the flags are omitted, including hand-tuned ones", async () => {
		const dir = await tempDir();
		const configPath = path.join(dir, "config.yaml");

		await runHermesSetup({ install: true, root: [dir], target: configPath, timeout: "900", connectTimeout: "30" });

		// Hand-tune one knob the way an operator would; it must survive.
		const block = await installedServerBlock(configPath);
		await writeConfig(configPath, { ...block, timeout: 1200 });
		await runHermesSetup({ install: true, root: [dir], target: configPath });
		expect(await installedServerBlock(configPath)).toMatchObject({ timeout: 1200, connect_timeout: 30 });

		// Explicit flags override per field without disturbing the other knob.
		await runHermesSetup({ install: true, root: [dir], target: configPath, timeout: "240" });
		expect(await installedServerBlock(configPath)).toMatchObject({ timeout: 240, connect_timeout: 30 });
		await runHermesSetup({ install: true, root: [dir], target: configPath, connectTimeout: "15" });
		expect(await installedServerBlock(configPath)).toMatchObject({ timeout: 240, connect_timeout: 15 });

		// Hand-tuning the unsigned knobs keeps the block managed and check-clean.
		const tuned = await installedServerBlock(configPath);
		await writeConfig(configPath, { ...tuned, timeout: 1800 });
		expect((await runHermesSetup({ check: true, root: [dir], target: configPath })).check?.ok).toBe(true);
	});

	it("upgrades a legacy signed block in place, preserving its numeric timeouts", async () => {
		const dir = await tempDir();
		const configPath = path.join(dir, "config.yaml");

		const rendered = renderedServerBlock(await render({ root: [dir], timeout: "900", connectTimeout: "45" }));
		const legacy = { ...rendered };
		if (legacy.env) legacy.env.GJC_COORDINATOR_MCP_SETUP_SIGNATURE = legacySignature(legacy);
		await writeConfig(configPath, legacy);

		// A block written before #4878 must not be refused as unmanaged.
		await runHermesSetup({ install: true, root: [dir], target: configPath });
		expect(await installedServerBlock(configPath)).toMatchObject({ timeout: 900, connect_timeout: 45 });

		// ... and it is re-signed with the timeout-agnostic signature.
		const upgraded = await installedServerBlock(configPath);
		expect(upgraded.env?.GJC_COORDINATOR_MCP_SETUP_SIGNATURE).not.toBe(
			legacy.env?.GJC_COORDINATOR_MCP_SETUP_SIGNATURE,
		);
		expect((await runHermesSetup({ check: true, root: [dir], target: configPath })).check?.ok).toBe(true);
	});

	it("still refuses unmarked blocks and does not preserve foreign timeouts with --force", async () => {
		const dir = await tempDir();
		const configPath = path.join(dir, "config.yaml");
		await writeConfig(configPath, { command: "other", timeout: 900, connect_timeout: 900 });

		await expect(runHermesSetup({ install: true, root: [dir], target: configPath })).rejects.toThrow(
			"already exists and is not managed by GJC",
		);

		await runHermesSetup({ install: true, force: true, root: [dir], target: configPath });
		expect(await installedServerBlock(configPath)).toMatchObject({ timeout: 180, connect_timeout: 60 });
	});

	it("falls back to the default with a warning for unpreservable marked values", async () => {
		const dir = await tempDir();
		const configPath = path.join(dir, "config.yaml");

		for (const [raw, field] of [
			[5000, "timeout"],
			["900", "connect_timeout"],
		] as const) {
			const rendered = renderedServerBlock(await render({ root: [dir] }));
			await writeConfig(configPath, { ...rendered, [field]: raw });

			const result = await runHermesSetup({ install: true, root: [dir], target: configPath });
			expect(result.warnings.join("\n"), field).toContain(`Ignoring existing ${field}`);
		}

		const block = await installedServerBlock(configPath);
		expect(block.timeout).toBe(180);
		expect(block.connect_timeout).toBe(60);
	});
});
