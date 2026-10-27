import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import { TempDir } from "@gajae-code/utils";
import { YAML } from "bun";
import { enqueueAtomicYamlOperation } from "../src/config/atomic-yaml-patch";
import { Settings, type SettingsAtomicPatch } from "../src/config/settings";

const patch: SettingsAtomicPatch[] = [{ path: "temperature", op: "set", value: 0.4 }];

describe("current-value atomic batch local ownership", () => {
	it("publishes synchronous memory builders before a later setter can be overtaken", async () => {
		const settings = Settings.isolated({ temperature: 0.2 });
		const pending = settings.commitAtomicBatchWithCurrent(() => patch);
		settings.set("temperature", 0.9);
		const receipt = await pending;
		expect(settings.get("temperature")).toBe(0.9);
		expect((await receipt.restore()).status).toBe("conflict");
		expect(settings.get("temperature")).toBe(0.9);
	});

	for (const newer of [0.9, 0.2]) {
		it(`refuses an asynchronous memory builder after a newer local mutation to ${newer}`, async () => {
			const settings = Settings.isolated({ temperature: 0.2 });
			const entered = Promise.withResolvers<void>();
			const release = Promise.withResolvers<void>();
			const pending = settings.commitAtomicBatchWithCurrent(async () => {
				entered.resolve();
				await release.promise;
				return patch;
			});
			await entered.promise;
			settings.set("temperature", newer);
			release.resolve();
			await expect(pending).rejects.toThrow("changed");
			expect(settings.get("temperature")).toBe(newer);
		});
	}

	it("serializes earlier queued atomic batches without treating them as later setters", async () => {
		const temp = TempDir.createSync("@gjc-current-batch-queue-");
		const settings = await Settings.loadForScope({ cwd: temp.path(), agentDir: path.join(temp.path(), "agent") });
		try {
			const first = settings.commitAtomicBatchWithCurrent(() => patch);
			const second = settings.commitAtomicBatchWithCurrent(current => {
				expect(current.temperature).toBe(0.4);
				return [{ path: "topP", op: "set", value: 0.7 }];
			});
			await Promise.all([first, second]);
			expect(settings.get("temperature")).toBe(0.4);
			expect(settings.get("topP")).toBe(0.7);
		} finally {
			await settings.close();
			temp.removeSync();
		}
	});

	for (const earlierSave of [false, true]) {
		it(`does not overtake a newer setter with ${earlierSave ? "an earlier reserved save" : "a queued batch"}`, async () => {
			const temp = TempDir.createSync("@gjc-current-batch-");
			const settings = await Settings.loadForScope({ cwd: temp.path(), agentDir: path.join(temp.path(), "agent") });
			const release = Promise.withResolvers<void>();
			try {
				settings.set("temperature", 0.2);
				await settings.flushOrThrow();
				const configPath = settings.getGlobalConfigPath();
				if (!configPath) throw new Error("Expected disk-backed settings");
				const blocker = enqueueAtomicYamlOperation(configPath, () => release.promise);
				if (earlierSave) settings.set("topP", 0.7);
				const pending = settings.commitAtomicBatchWithCurrent(() => patch);
				settings.set("temperature", 0.9);
				release.resolve();
				await blocker;
				await expect(pending).rejects.toThrow("changed");
				await settings.flushOrThrow();
				expect(settings.get("temperature")).toBe(0.9);
				expect(YAML.parse(await Bun.file(configPath).text())).toMatchObject({ temperature: 0.9 });
			} finally {
				release.resolve();
				await settings.close();
				temp.removeSync();
			}
		});
	}
});
