import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { ModelRegistry } from "@gajae-code/coding-agent/config/model-registry";
import type { ModelProfileConfig } from "@gajae-code/coding-agent/config/models-config-schema";
import { AuthStorage } from "@gajae-code/coding-agent/session/auth-storage";
import { YAML } from "bun";

let tempDir: string;
let authStorage: AuthStorage;

const preset = (name: string, provider: string): ModelProfileConfig => ({
	display_name: name,
	required_providers: [provider],
	model_mapping: { default: `${provider}/gpt-custom:low` },
});

beforeEach(async () => {
	tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-models-yml-nofollow-"));
	authStorage = await AuthStorage.create(path.join(tempDir, "auth.db"));
});

afterEach(async () => {
	authStorage.close();
	await fs.rm(tempDir, { recursive: true, force: true });
});

describe("models.yml owner-only write", () => {
	it("creates models.yml as mode 0600 under umask 022 and keeps a later save", async () => {
		const modelsPath = path.join(tempDir, "models.yml");
		const registry = new ModelRegistry(authStorage, modelsPath);
		const previousUmask = process.umask(0o022);
		try {
			const profile = await registry.saveCustomModelProfile("my-fast", preset("my-fast", "my-oai"));

			expect(profile.displayName).toBe("my-fast");
			expect(registry.getModelProfile("my-fast")?.modelMapping.default).toBe("my-oai/gpt-custom:low");
			expect((await fs.stat(modelsPath)).mode & 0o777).toBe(0o600);
			const created = YAML.parse(await Bun.file(modelsPath).text()) as {
				profiles: Record<string, { display_name?: string; model_mapping: Record<string, string> }>;
			};
			expect(created.profiles["my-fast"]?.display_name).toBe("my-fast");
			expect(created.profiles["my-fast"]?.model_mapping.default).toBe("my-oai/gpt-custom:low");

			await registry.saveCustomModelProfile("second", preset("second", "anthropic"));
			expect((await fs.stat(modelsPath)).mode & 0o777).toBe(0o600);
			const later = YAML.parse(await Bun.file(modelsPath).text()) as {
				profiles: Record<string, { display_name?: string; model_mapping: Record<string, string> }>;
			};
			expect(later.profiles["my-fast"]?.model_mapping.default).toBe("my-oai/gpt-custom:low");
			expect(later.profiles.second?.display_name).toBe("second");
			expect(later.profiles.second?.model_mapping.default).toBe("anthropic/gpt-custom:low");
			expect(registry.getModelProfile("second")?.displayName).toBe("second");
		} finally {
			process.umask(previousUmask);
		}
	});

	it.skipIf(process.platform === "win32")("does not follow a symlink at the models.yml path", async () => {
		const targetPath = path.join(tempDir, "secret-target.yml");
		const modelsPath = path.join(tempDir, "models.yml");
		const seed = new ModelRegistry(authStorage, targetPath);
		await seed.saveCustomModelProfile("existing", preset("existing", "my-oai"));
		const original = await fs.readFile(targetPath, "utf8");
		const before = await fs.stat(targetPath, { bigint: true });
		await fs.symlink(targetPath, modelsPath);
		const registry = new ModelRegistry(authStorage, modelsPath);

		await expect(registry.saveCustomModelProfile("my-fast", preset("my-fast", "anthropic"))).rejects.toMatchObject({
			code: "ELOOP",
		});

		const after = await fs.stat(targetPath, { bigint: true });
		expect(after.dev).toBe(before.dev);
		expect(after.ino).toBe(before.ino);
		expect(await fs.readFile(targetPath, "utf8")).toBe(original);
		expect(original).not.toContain("my-fast");
		expect((await fs.lstat(modelsPath)).isSymbolicLink()).toBe(true);
		expect(await fs.readlink(modelsPath)).toBe(targetPath);
		expect(registry.getModelProfile("my-fast")).toBeUndefined();
	});
});
