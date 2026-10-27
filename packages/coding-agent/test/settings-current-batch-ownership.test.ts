import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import { TempDir } from "@gajae-code/utils";
import { YAML } from "bun";
import { enqueueAtomicYamlOperation } from "../src/config/atomic-yaml-patch";
import { Settings, type SettingsAtomicPatch } from "../src/config/settings";

const patch: SettingsAtomicPatch[] = [{ path: "temperature", op: "set", value: 0.4 }];

describe("current-value atomic batch local ownership", () => {
	for (const durable of [false, true]) {
		it(`rejects unsafe role paths without partial mutation in ${durable ? "durable" : "memory"} batches`, async () => {
			const temp = TempDir.createSync("@gjc-safe-roles-");
			const settings = durable
				? await Settings.loadForScope({ cwd: temp.path(), agentDir: path.join(temp.path(), "agent") })
				: Settings.isolated({ temperature: 0.2 });
			const marker = "gjcAtomicPathMarker";
			const original = Object.getOwnPropertyDescriptor(Object.prototype, marker);
			try {
				await settings.commitAtomicBatch([{ path: "temperature", op: "set", value: 0.2 }]);
				const configPath = settings.getGlobalConfigPath();
				const before = configPath ? await Bun.file(configPath).text() : undefined;
				for (const segment of ["__proto__", "constructor", "prototype"]) {
					for (const op of ["set", "unset"] as const) {
						for (const rolePath of [
							`modelRoles.${segment}.${marker}`,
							`modelRoles.custom.${segment}.${marker}`,
						] as const) {
							const unsafe: SettingsAtomicPatch =
								op === "set" ? { path: rolePath, op, value: true } : { path: rolePath, op };
							const patches: SettingsAtomicPatch[] = [{ path: "temperature", op: "set", value: 0.8 }, unsafe];
							await expect(settings.commitAtomicBatch(patches)).rejects.toThrow("Unknown setting path");
							await expect(settings.commitAtomicBatchWithCurrent(() => patches)).rejects.toThrow(
								"Unknown setting path",
							);
							expect(settings.getGlobal("temperature")).toBe(0.2);
							if (configPath && before !== undefined) expect(await Bun.file(configPath).text()).toBe(before);
							expect(Object.getOwnPropertyDescriptor(Object.prototype, marker)).toEqual(original);
						}
					}
				}
			} finally {
				if (original) Object.defineProperty(Object.prototype, marker, original);
				else delete (Object.prototype as Record<string, unknown>)[marker];
				await settings.close();
				temp.removeSync();
			}
		});

		it(`restores a custom role exact path in ${durable ? "durable" : "memory"}`, async () => {
			const temp = TempDir.createSync("@gjc-role-restore-");
			const settings = durable
				? await Settings.loadForScope({ cwd: temp.path(), agentDir: path.join(temp.path(), "agent") })
				: Settings.isolated();
			try {
				await settings.commitAtomicBatch([
					{ path: "modelRoles.custom.primary", op: "set", value: "first" },
					{ path: "modelRoles.custom.other", op: "set", value: "keep" },
				]);
				const receipt = await settings.commitAtomicBatch([
					{ path: "modelRoles.custom.primary", op: "set", value: "second" },
				]);
				const role = async () => {
					let roles: unknown;
					await settings.commitAtomicBatchWithCurrent(current => {
						roles = current.modelRoles;
						return [];
					});
					return roles;
				};
				expect(await role()).toMatchObject({ custom: { primary: "second", other: "keep" } });
				expect((await receipt.restore()).status).toBe("restored");
				expect(await role()).toMatchObject({ custom: { primary: "first", other: "keep" } });
			} finally {
				await settings.close();
				temp.removeSync();
			}
		});
	}
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

	for (const action of ["override", "clear", "same-value", "ABA"] as const) {
		it(`fences async memory builders against runtime ${action} intent`, async () => {
			const settings = Settings.isolated({ temperature: 0.2 }, { overrides: { temperature: 0.3 } });
			const entered = Promise.withResolvers<void>();
			const release = Promise.withResolvers<void>();
			const pending = settings.commitAtomicBatchWithCurrent(async () => {
				entered.resolve();
				await release.promise;
				return patch;
			});
			await entered.promise;
			if (action === "clear") settings.clearOverride("temperature");
			else {
				settings.override("temperature", action === "same-value" ? 0.3 : 0.7);
				if (action === "ABA") settings.override("temperature", 0.3);
			}
			release.resolve();
			await expect(pending).rejects.toThrow("changed");
			expect(settings.getGlobal("temperature")).toBe(0.2);
			expect(settings.get("temperature")).toBe(action === "clear" ? 0.2 : action === "override" ? 0.7 : 0.3);
		});
	}

	it("runtime intent does not take ownership of a durable-layer receipt", async () => {
		const settings = Settings.isolated({ temperature: 0.2 });
		const receipt = await settings.commitAtomicBatch(patch);
		settings.override("temperature", 0.8);
		expect((await receipt.restore()).status).toBe("restored");
		expect(settings.getGlobal("temperature")).toBe(0.2);
		expect(settings.get("temperature")).toBe(0.8);
	});

	it("fences runtime changes while a durable builder is awaiting", async () => {
		const temp = TempDir.createSync("@gjc-runtime-builder-");
		const settings = await Settings.loadForScope({ cwd: temp.path(), agentDir: path.join(temp.path(), "agent") });
		const release = Promise.withResolvers<void>();
		const entered = Promise.withResolvers<void>();
		try {
			settings.set("temperature", 0.2);
			await settings.flushOrThrow();
			const pending = settings.commitAtomicBatchWithCurrent(async () => {
				entered.resolve();
				await release.promise;
				return patch;
			});
			await entered.promise;
			settings.override("temperature", 0.8);
			release.resolve();
			await expect(pending).rejects.toThrow("changed");
			expect(settings.getGlobal("temperature")).toBe(0.2);
			expect(settings.get("temperature")).toBe(0.8);
		} finally {
			release.resolve();
			await settings.close();
			temp.removeSync();
		}
	});

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
