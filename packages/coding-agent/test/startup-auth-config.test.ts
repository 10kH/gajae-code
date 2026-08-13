import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Settings } from "../src/config/settings";
import { validateSettingPatch } from "../src/config/settings-schema";
import {
	isValidPersistedCredentialSelector,
	resolveStartupAuthConfig,
	StartupAuthConfigError,
	type StartupAuthConfigErrorKind,
} from "../src/session/startup-auth-config";

const ENV_KEYS = ["GJC_AUTH_BROKER_URL", "GJC_AUTH_BROKER_TOKEN", "GJC_CREDENTIAL_RANKING_MODE"] as const;
const savedEnv = new Map<string, string | undefined>();
const tempDirs: string[] = [];

async function makeAgentDir(config: string): Promise<string> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-startup-auth-"));
	tempDirs.push(root);
	await fs.writeFile(path.join(root, "config.yml"), config);
	return root;
}

function clearAuthEnv(): void {
	for (const key of ENV_KEYS) {
		savedEnv.set(key, process.env[key]);
		delete process.env[key];
	}
}

function restoreAuthEnv(): void {
	for (const key of ENV_KEYS) {
		const value = savedEnv.get(key);
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
	savedEnv.clear();
}

async function expectStartupAuthConfigError(
	operation: Promise<unknown>,
	kind: StartupAuthConfigErrorKind,
	secret?: string,
): Promise<void> {
	const error = await operation.then(
		() => undefined,
		(value: unknown) => value,
	);
	expect(error).toBeInstanceOf(StartupAuthConfigError);
	if (!(error instanceof StartupAuthConfigError)) return;
	expect(error.kind).toBe(kind);
	expect(error.causeClass).toBe(kind);
	expect(error.message).toContain(kind);
	expect(error.message).toContain("config.yml");
	if (secret !== undefined) expect(error.message).not.toContain(secret);
}

afterEach(async () => {
	restoreAuthEnv();
	for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true });
});

describe("startup auth config", () => {
	it("keeps absent and empty config files on the local default authority", async () => {
		clearAuthEnv();
		const absentDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-startup-auth-absent-"));
		tempDirs.push(absentDir);
		await expect(resolveStartupAuthConfig(absentDir)).resolves.toEqual({
			broker: null,
			credentialRankingMode: "balanced",
			credentialPins: {},
		});

		const emptyDir = await makeAgentDir("");
		await expect(resolveStartupAuthConfig(emptyDir)).resolves.toEqual({
			broker: null,
			credentialRankingMode: "balanced",
			credentialPins: {},
		});
	});

	it("fails closed with a typed unreadable-config error", async () => {
		clearAuthEnv();
		const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-startup-auth-unreadable-"));
		tempDirs.push(agentDir);
		await fs.mkdir(path.join(agentDir, "config.yml"));
		await expectStartupAuthConfigError(resolveStartupAuthConfig(agentDir), "unreadable");
	});

	it("fails closed with a typed invalid-YAML error without exposing file contents", async () => {
		clearAuthEnv();
		const secret = "invalid-yaml-secret-token";
		const agentDir = await makeAgentDir(`auth: "${secret}\n`);
		await expectStartupAuthConfigError(resolveStartupAuthConfig(agentDir), "invalid-yaml", secret);
	});

	it("fails closed when the YAML root is not a mapping", async () => {
		clearAuthEnv();
		const secret = "non-mapping-root-secret-token";
		const agentDir = await makeAgentDir(secret);
		await expectStartupAuthConfigError(resolveStartupAuthConfig(agentDir), "non-mapping-root", secret);
	});

	it("fails closed for malformed auth, broker, gateway, and pin sections", async () => {
		clearAuthEnv();
		const malformedAuth = await makeAgentDir('auth: "auth-section-secret"\n');
		await expectStartupAuthConfigError(
			resolveStartupAuthConfig(malformedAuth),
			"invalid-auth",
			"auth-section-secret",
		);

		const malformedBroker = await makeAgentDir("auth:\n  broker:\n    url:\n      - broker-section-secret\n");
		await expectStartupAuthConfigError(
			resolveStartupAuthConfig(malformedBroker),
			"invalid-broker",
			"broker-section-secret",
		);

		const malformedGateway = await makeAgentDir('auth:\n  gateway: "gateway-section-secret"\n');
		await expectStartupAuthConfigError(
			resolveStartupAuthConfig(malformedGateway),
			"invalid-gateway",
			"gateway-section-secret",
		);

		const malformedPins = await makeAgentDir("auth:\n  credentialPins: pin-section-secret\n");
		await expectStartupAuthConfigError(
			resolveStartupAuthConfig(malformedPins),
			"invalid-credential-pins",
			"pin-section-secret",
		);
	});

	it("reads canonical nested YAML and validates persistent pins", async () => {
		clearAuthEnv();
		const agentDir = await makeAgentDir(
			[
				"auth:",
				"  broker:",
				"    url: https://broker.example",
				"    token: nested-token",
				"  credentialRankingMode: earliest-reset",
				"  credentialPins:",
				"    anthropic: email:operator@example.com",
			].join("\n"),
		);

		await expect(resolveStartupAuthConfig(agentDir)).resolves.toEqual({
			broker: { url: "https://broker.example", token: "nested-token" },
			credentialRankingMode: "earliest-reset",
			credentialPins: { anthropic: "email:operator@example.com" },
		});
	});

	it("rejects literal legacy keys with manual nested rewrite guidance", async () => {
		clearAuthEnv();
		const agentDir = await makeAgentDir('"auth.broker.url": https://legacy.example\n');
		await expect(resolveStartupAuthConfig(agentDir)).rejects.toThrow(/auth:\n {2}broker:\n {4}url: <broker-url>/);
	});

	it("applies env over global config and default ranking precedence", async () => {
		const agentDir = await makeAgentDir(
			[
				"auth:",
				"  broker:",
				"    url: https://config.example",
				"    token: config-token",
				"  credentialRankingMode: balanced",
			].join("\n"),
		);
		clearAuthEnv();
		process.env.GJC_AUTH_BROKER_URL = "https://env.example";
		process.env.GJC_AUTH_BROKER_TOKEN = "env-token";
		process.env.GJC_CREDENTIAL_RANKING_MODE = "earliest-reset";

		await expect(resolveStartupAuthConfig(agentDir)).resolves.toMatchObject({
			broker: { url: "https://env.example", token: "env-token" },
			credentialRankingMode: "earliest-reset",
		});
	});

	it("ignores project-scoped pins", async () => {
		clearAuthEnv();
		const agentDir = await makeAgentDir("auth:\n  credentialPins:\n    anthropic: id:42\n");
		const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-startup-auth-project-"));
		tempDirs.push(projectDir);
		await fs.mkdir(path.join(projectDir, ".gjc"), { recursive: true });
		await fs.writeFile(
			path.join(projectDir, ".gjc", "config.yml"),
			"auth:\n  credentialPins:\n    openai-codex: id:99\n",
		);

		await expect(resolveStartupAuthConfig(agentDir)).resolves.toMatchObject({
			credentialPins: { anthropic: "id:42" },
		});
		const settings = await Settings.loadForScope({ cwd: projectDir, agentDir });
		expect(settings.get("auth.credentialPins")).toEqual({ anthropic: "id:42" });
	});

	it("validates selector-record values and rejects unsupported forms", () => {
		expect(isValidPersistedCredentialSelector("id:1")).toBe(true);
		expect(isValidPersistedCredentialSelector("email:operator@example.com")).toBe(true);
		expect(isValidPersistedCredentialSelector("account:acct-1")).toBe(true);
		expect(isValidPersistedCredentialSelector("id:0")).toBe(false);
		expect(isValidPersistedCredentialSelector("project:project-1")).toBe(false);
		expect(validateSettingPatch({ "auth.credentialPins": { anthropic: "id:1" } })).toEqual([]);
		expect(validateSettingPatch({ "auth.credentialPins": { anthropic: "project:project-1" } })).toEqual([
			{ path: "auth.credentialPins.anthropic", detail: "Expected credential-selector." },
		]);
	});
});
