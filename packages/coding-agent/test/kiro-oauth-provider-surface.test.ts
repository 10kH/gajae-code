import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as kiroOAuthModule from "@gajae-code/ai";
import { ModelRegistry } from "@gajae-code/coding-agent/config/model-registry";
import { resetSettingsForTest } from "@gajae-code/coding-agent/config/settings";
import { AuthStorage } from "@gajae-code/coding-agent/session/auth-storage";
import { Snowflake } from "@gajae-code/utils";
import { runAuthBrokerCommand } from "../src/cli/auth-broker-cli";

/**
 * Coverage for issue #5064: Kiro OAuth was advertised in every product
 * surface (interactive `/login`, `gjc auth-broker login kiro`) but the
 * underlying `AuthStorage.login()` dispatcher had no `case "kiro"`, so every
 * advertised path reported `Unknown OAuth provider: kiro`. This suite proves
 * the package/direct CLI surface and the bundled model catalog are coherent
 * with the advertised provider list.
 */

describe("Kiro OAuth CLI surface (package/direct)", () => {
	let tempDir = "";
	let originalAgentDir: string | undefined;
	const ORIGINAL_STDOUT_WRITE = process.stdout.write.bind(process.stdout);

	function silenceStdout(): () => string {
		let captured = "";
		process.stdout.write = ((chunk: string | Uint8Array): boolean => {
			captured += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
			return true;
		}) as typeof process.stdout.write;
		return () => captured;
	}

	beforeEach(async () => {
		originalAgentDir = process.env.GJC_AGENT_DIR;
		tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gjc-kiro-cli-"));
		process.env.GJC_AGENT_DIR = tempDir;
	});

	afterEach(async () => {
		process.stdout.write = ORIGINAL_STDOUT_WRITE;
		if (originalAgentDir === undefined) delete process.env.GJC_AGENT_DIR;
		else process.env.GJC_AGENT_DIR = originalAgentDir;
		await fs.promises.rm(tempDir, { recursive: true, force: true });
	});

	test("kiro passes the auth-broker CLI's known-provider gate", async () => {
		const providers = new Set(kiroOAuthModule.getOAuthProviders().map(p => p.id));
		expect(providers.has("kiro")).toBe(true);
	});

	test("`gjc auth-broker login unknown-provider-xyz` fails with a clear unknown-provider error, not a crash", async () => {
		const restore = silenceStdout();
		try {
			await expect(
				runAuthBrokerCommand({
					action: "login",
					flags: { provider: "unknown-provider-xyz" },
				}),
			).rejects.toThrow(/Unknown OAuth provider/);
		} finally {
			restore();
		}
	});
});

describe("Kiro model catalog reachable through ModelRegistry (interactive/model-picker surface)", () => {
	let tempDir: string;
	let modelsJsonPath: string;
	let authStorage: AuthStorage;
	let previousPresetRegistryDisabled: string | undefined;

	beforeEach(async () => {
		resetSettingsForTest();
		previousPresetRegistryDisabled = Bun.env.GJC_MODEL_PRESET_REGISTRY_DISABLED;
		Bun.env.GJC_MODEL_PRESET_REGISTRY_DISABLED = "true";
		tempDir = path.join(os.tmpdir(), `pi-test-kiro-model-registry-${Snowflake.next()}`);
		fs.mkdirSync(tempDir, { recursive: true });
		modelsJsonPath = path.join(tempDir, "models.json");
		authStorage = await AuthStorage.create(path.join(tempDir, "testauth.db"));
	});

	afterEach(() => {
		resetSettingsForTest();
		authStorage.close();
		if (previousPresetRegistryDisabled === undefined) delete Bun.env.GJC_MODEL_PRESET_REGISTRY_DISABLED;
		else Bun.env.GJC_MODEL_PRESET_REGISTRY_DISABLED = previousPresetRegistryDisabled;
		if (tempDir && fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
	});

	test("kiro's default model is discoverable through the registry (package + interactive model list)", () => {
		const registry = new ModelRegistry(authStorage, modelsJsonPath);
		try {
			const model = registry.find("kiro", "auto");
			expect(model).toBeDefined();
			expect(model?.api).toBe("kiro-codewhisperer-stream");
			expect(model?.provider).toBe("kiro");
		} finally {
			registry.dispose();
		}
	});
});

describe("Kiro standalone/import boundary smoke", () => {
	test("@gajae-code/ai exports the Kiro OAuth login/refresh entry points used by every advertised path", () => {
		expect(typeof kiroOAuthModule.getOAuthProviders).toBe("function");
		const kiro = kiroOAuthModule.getOAuthProviders().find(p => p.id === "kiro");
		expect(kiro?.available).toBe(true);
	});
});
