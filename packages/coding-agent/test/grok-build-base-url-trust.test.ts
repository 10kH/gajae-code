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
const GJC_BASE = "GJC_GROK_CLI_BASE_URL";
const GROK_BASE = "GROK_CLI_BASE_URL";
const UNSAFE = "GJC_GROK_CLI_ALLOW_UNSAFE_BASE_URL";

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
