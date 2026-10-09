import { describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { type ProjectEnvSnapshot, projectEnvSnapshot } from "@gajae-code/utils/env-file";
import {
	getBaseUrl,
	isGrokBuildBaseUrlOverrideIgnored,
} from "../src/defaults/gjc/extensions/grok-cli-vendor/src/shared/base-url";

const DEFAULT_BASE_URL = "https://cli-chat-proxy.grok.com/v1";
const ALLOWLISTED = "https://cli-chat-proxy.grok.com/v1/collect";
const OPERATOR_ALLOWLISTED = "https://cli-chat-proxy.grok.com/v1/operator";
const ATTACKER = "https://attacker.example/v1";
const EVIL_BASE_URL = "https://evil.example/v1";
const GJC_BASE = "GJC_GROK_CLI_BASE_URL";
const GROK_BASE = "GROK_CLI_BASE_URL";
const UNSAFE = "GJC_GROK_CLI_ALLOW_UNSAFE_BASE_URL";
const PROBE_DROP = "GJC_BASEURL_PROBE_DROP";
const PROBE = path.join(import.meta.dir, "fixtures", "grok-build-base-url-probe.ts");
const PLANTED_DOTENV = `${GJC_BASE}=${EVIL_BASE_URL}\n${UNSAFE}=1\n`;

const emptySnapshot: ProjectEnvSnapshot = { values: {}, dynamic: new Set() };

async function snapshotFromEnv(contents: string): Promise<{ cwd: string; snapshot: ProjectEnvSnapshot }> {
	const cwd = await mkdtemp(path.join(tmpdir(), "grok-base-url-trust-"));
	await writeFile(path.join(cwd, ".env"), contents);
	return { cwd, snapshot: projectEnvSnapshot(cwd) };
}

describe("Grok Build credential base URL provenance", () => {
	it("ignores an allowlisted base URL declared by the project dotenv", async () => {
		const { cwd, snapshot } = await snapshotFromEnv(`${GJC_BASE}=${ALLOWLISTED}\n`);
		try {
			const env = { [GJC_BASE]: ALLOWLISTED };
			expect(getBaseUrl(env, snapshot)).toBe(DEFAULT_BASE_URL);
			expect(isGrokBuildBaseUrlOverrideIgnored(env, snapshot)).toBe(false);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("ignores a project dotenv URL that self-approves the unsafe opt-in", async () => {
		const { cwd, snapshot } = await snapshotFromEnv(`${GJC_BASE}=${ATTACKER}\n${UNSAFE}=1\n`);
		try {
			const env = { [GJC_BASE]: ATTACKER, [UNSAFE]: "1" };
			expect(getBaseUrl(env, snapshot)).toBe(DEFAULT_BASE_URL);
			expect(isGrokBuildBaseUrlOverrideIgnored(env, snapshot)).toBe(false);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("ignores a dynamic project declaration even when the live value is allowlisted", async () => {
		const planted = ["$", "{PLANTED}/v1"].join("");
		const { cwd, snapshot } = await snapshotFromEnv(`${GJC_BASE}=${planted}\n`);
		try {
			expect(snapshot.dynamic.has(GJC_BASE)).toBe(true);
			const env = { [GJC_BASE]: ALLOWLISTED };
			expect(getBaseUrl(env, snapshot)).toBe(DEFAULT_BASE_URL);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("ignores GROK_CLI_BASE_URL when that is the name the project declares", async () => {
		const { cwd, snapshot } = await snapshotFromEnv(`${GROK_BASE}=${ALLOWLISTED}\n`);
		try {
			expect(getBaseUrl({ [GROK_BASE]: ALLOWLISTED }, snapshot)).toBe(DEFAULT_BASE_URL);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("keeps an operator URL the project does not declare", () => {
		const env = { [GJC_BASE]: OPERATOR_ALLOWLISTED };
		expect(getBaseUrl(env, emptySnapshot)).toBe(OPERATOR_ALLOWLISTED);
		expect(isGrokBuildBaseUrlOverrideIgnored(env, emptySnapshot)).toBe(false);
	});

	it("keeps an operator URL when the project declares a different value", async () => {
		const { cwd, snapshot } = await snapshotFromEnv(`${GJC_BASE}=${ALLOWLISTED}\n`);
		try {
			expect(getBaseUrl({ [GJC_BASE]: OPERATOR_ALLOWLISTED }, snapshot)).toBe(OPERATOR_ALLOWLISTED);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("falls through to an operator GROK_CLI_BASE_URL when the project GJC name is planted", async () => {
		const { cwd, snapshot } = await snapshotFromEnv(`${GJC_BASE}=${ALLOWLISTED}\n`);
		try {
			const env = { [GJC_BASE]: ALLOWLISTED, [GROK_BASE]: OPERATOR_ALLOWLISTED };
			expect(getBaseUrl(env, snapshot)).toBe(OPERATOR_ALLOWLISTED);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("still honors an operator unsafe opt-in the project does not declare", () => {
		const env = { [GJC_BASE]: ATTACKER, [UNSAFE]: "1" };
		expect(getBaseUrl(env, emptySnapshot)).toBe(ATTACKER);
		expect(isGrokBuildBaseUrlOverrideIgnored(env, emptySnapshot)).toBe(false);
	});

	it("still rejects an operator URL outside the host allowlist", () => {
		const env = { [GJC_BASE]: ATTACKER };
		expect(getBaseUrl(env, emptySnapshot)).toBe(DEFAULT_BASE_URL);
		expect(isGrokBuildBaseUrlOverrideIgnored(env, emptySnapshot)).toBe(true);
	});

	it("does not let a project unsafe opt-in approve an operator URL", async () => {
		const { cwd, snapshot } = await snapshotFromEnv(`${UNSAFE}=1\n`);
		try {
			const env = { [GJC_BASE]: ATTACKER, [UNSAFE]: "1" };
			expect(getBaseUrl(env, snapshot)).toBe(DEFAULT_BASE_URL);
			expect(isGrokBuildBaseUrlOverrideIgnored(env, snapshot)).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});

/**
 * Bun copies `cwd/.env` into the environment before user code runs. The module
 * snapshot has to be the one taken at load: deleting `.env` or changing cwd
 * afterwards must not make those copied values look like an operator override.
 */
async function baseUrlFromProbe(cwd: string, overrides: Record<string, string> = {}): Promise<string> {
	const env: Record<string, string> = {};
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined) env[key] = value;
	}
	for (const key of [GJC_BASE, GROK_BASE, UNSAFE, PROBE_DROP]) delete env[key];
	Object.assign(env, overrides);

	const proc = Bun.spawn([process.execPath, PROBE], { cwd, env, stdout: "pipe", stderr: "pipe" });
	const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
	const exitCode = await proc.exited;
	if (exitCode !== 0) throw new Error(`probe failed (${exitCode}): ${stderr || stdout}`);
	const parsed: unknown = JSON.parse(stdout);
	if (typeof parsed !== "string") throw new Error(`probe returned ${stdout}`);
	return parsed;
}

describe("Grok Build credential base URL snapshot pinned at module load", () => {
	it("still ignores a project unsafe base URL after .env is removed", async () => {
		const cwd = await mkdtemp(path.join(tmpdir(), "grok-base-url-trust-"));
		await writeFile(path.join(cwd, ".env"), PLANTED_DOTENV);
		try {
			expect(await baseUrlFromProbe(cwd, { [PROBE_DROP]: "unlink" })).toBe(DEFAULT_BASE_URL);
			expect(await Bun.file(path.join(cwd, ".env")).exists()).toBe(false);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("still ignores a project unsafe base URL after the process cwd changes", async () => {
		const cwd = await mkdtemp(path.join(tmpdir(), "grok-base-url-trust-"));
		const dotenvPath = path.join(cwd, ".env");
		await writeFile(dotenvPath, PLANTED_DOTENV);
		try {
			expect(await baseUrlFromProbe(cwd, { [PROBE_DROP]: "chdir" })).toBe(DEFAULT_BASE_URL);
			expect(await Bun.file(dotenvPath).exists()).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("still returns an operator unsafe base URL when the project declares nothing", async () => {
		const cwd = await mkdtemp(path.join(tmpdir(), "grok-base-url-trust-"));
		try {
			expect(await Bun.file(path.join(cwd, ".env")).exists()).toBe(false);
			expect(await baseUrlFromProbe(cwd, { [GJC_BASE]: EVIL_BASE_URL, [UNSAFE]: "1" })).toBe(EVIL_BASE_URL);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
