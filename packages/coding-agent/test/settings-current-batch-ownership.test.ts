import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import { TempDir } from "@gajae-code/utils";
import { YAML } from "bun";
import { enqueueAtomicYamlOperation } from "../src/config/atomic-yaml-patch";
import { Settings, type SettingsAtomicPatch } from "../src/config/settings";

const patch: SettingsAtomicPatch[] = [{ path: "temperature", op: "set", value: 0.4 }];

describe("current-value atomic batch local ownership", () => {
	for (const durable of [false, true]) {
		it(`returns a separately owned reversible receipt in ${durable ? "durable" : "memory"}`, async () => {
			const temp = TempDir.createSync("@gjc-inverse-receipt-");
			const settings = durable
				? await Settings.loadForScope({ cwd: temp.path(), agentDir: path.join(temp.path(), "agent") })
				: Settings.isolated();
			try {
				await settings.commitAtomicBatch([{ path: "temperature", op: "set", value: 0.2 }]);
				const original = await settings.commitAtomicBatch(patch);
				await settings.commitAtomicBatch([{ path: "topP", op: "set", value: 0.7 }]);
				const restored = await original.restore();
				expect(restored.status).toBe("restored");
				if (restored.status !== "restored") throw new Error("Expected restore");
				expect(settings.getGlobal("temperature")).toBe(0.2);
				expect(settings.getGlobal("topP")).toBe(0.7);
				expect((await restored.receipt.restore()).status).toBe("restored");
				expect(settings.getGlobal("temperature")).toBe(0.4);
				expect((await original.restore()).status).toBe("conflict");
				const same = await settings.commitAtomicBatch(patch);
				const sameRestore = await same.restore();
				expect(sameRestore.status).toBe("restored");
				expect((await same.restore()).status).toBe("conflict");
				if (sameRestore.status !== "restored") throw new Error("Expected restore");
				sameRestore.receipt.discard();
				expect((await sameRestore.receipt.restore()).status).toBe("discarded");
				const aba = await settings.commitAtomicBatch(patch);
				await settings.commitAtomicBatch([{ path: "temperature", op: "set", value: 0.9 }]);
				await settings.commitAtomicBatch(patch);
				expect((await aba.restore()).status).toBe("conflict");
			} finally {
				await settings.close();
				temp.removeSync();
			}
		});

		it(`preserves disjoint role ownership and literal dotted names in ${durable ? "durable" : "memory"}`, async () => {
			const temp = TempDir.createSync("@gjc-role-ownership-");
			const settings = durable
				? await Settings.loadForScope({ cwd: temp.path(), agentDir: path.join(temp.path(), "agent") })
				: Settings.isolated();
			try {
				const original = await settings.setGlobalModelRoleAndFlush("default", "test/a");
				await settings.setGlobalModelRoleAndFlush("custom", "test/b");
				expect((await original.restore()).status).toBe("restored");
				const same = await settings.setGlobalModelRoleAndFlush("custom", "test/b");
				await settings.setGlobalModelRoleAndFlush("custom", "test/b");
				expect((await same.restore()).status).toBe("conflict");
				const aba = await settings.setGlobalModelRoleAndFlush("custom", "test/b");
				await settings.setGlobalModelRoleAndFlush("custom", "test/c");
				await settings.setGlobalModelRoleAndFlush("custom", "test/b");
				expect((await aba.restore()).status).toBe("conflict");
				await settings.setGlobalModelRoleAndFlush("literal.role", "test/d");
				const prototypeBefore = Object.getOwnPropertyDescriptor(Object.prototype, "gjcRoleMarker");
				await settings.setGlobalModelRoleAndFlush("__proto__", "test/special");
				let roles: unknown;
				await settings.commitAtomicBatchWithCurrent(current => {
					roles = current.modelRoles;
					return [];
				});
				expect(roles).toMatchObject({ custom: "test/b", "literal.role": "test/d" });
				expect(Object.getOwnPropertyDescriptor(roles as object, "__proto__")?.value).toBe("test/special");
				expect(Object.getOwnPropertyDescriptor(Object.prototype, "gjcRoleMarker")).toEqual(prototypeBefore);
			} finally {
				await settings.close();
				temp.removeSync();
			}
		});

		for (const builder of [false, true]) {
			it(`stages caller getters once and fences reentrant writes in ${durable ? "durable" : "memory"} ${builder ? "builder" : "batch"}`, async () => {
				const temp = TempDir.createSync("@gjc-patch-getter-");
				const settings = durable
					? await Settings.loadForScope({ cwd: temp.path(), agentDir: path.join(temp.path(), "agent") })
					: Settings.isolated();
				try {
					let reads = 0;
					const once = {
						get path() {
							if (++reads > 1) throw new Error("path read twice");
							return "temperature" as const;
						},
						op: "set" as const,
						value: 0.4,
					};
					await (builder
						? settings.commitAtomicBatchWithCurrent(() => [once])
						: settings.commitAtomicBatch([once]));
					expect(reads).toBe(1);
					const reentrant = {
						get path() {
							settings.set("temperature", 0.8);
							return "temperature" as const;
						},
						op: "set" as const,
						value: 0.1,
					};
					await expect(
						builder
							? settings.commitAtomicBatchWithCurrent(() => [reentrant])
							: settings.commitAtomicBatch([reentrant]),
					).rejects.toThrow("changed");
					expect(settings.getGlobal("temperature")).toBe(0.8);
				} finally {
					await settings.close();
					temp.removeSync();
				}
			});
		}
	}
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
	it("restores invalid notification validation before notifying subscribers and reverses it again", async () => {
		const settings = Settings.isolated({ "notifications.enabled": "invalid" });
		const seen: string[] = [];
		settings.onChanged(() => {
			try {
				settings.getNotificationSettingsSnapshot();
				seen.push("valid");
			} catch {
				seen.push("invalid");
			}
		}, "apply");
		settings.onChanged(() => {
			try {
				settings.getNotificationSettingsSnapshot();
				seen.push("valid-observer");
			} catch {
				seen.push("invalid-observer");
			}
		});
		const receipt = await settings.commitAtomicBatch([{ path: "notifications.enabled", op: "set", value: true }]);
		const restored = await receipt.restore();
		expect(restored.status).toBe("restored");
		if (restored.status !== "restored") throw new Error("Expected restore");
		expect((await restored.receipt.restore()).status).toBe("restored");
		expect(seen).toEqual(["valid", "valid-observer", "invalid", "invalid-observer", "valid", "valid-observer"]);
	});

	it("does not mutate memory or take receipt ownership when a later value cannot be cloned", async () => {
		const settings = Settings.isolated({ temperature: 0.2, topP: 0.3 });
		const receipt = await settings.commitAtomicBatch(patch);
		const changes: string[] = [];
		settings.onChanged(path => changes.push(path));
		await expect(
			settings.commitAtomicBatch([
				{ path: "temperature", op: "set", value: 0.6 },
				{ path: "temperature", op: "set", value: () => {} },
			]),
		).rejects.toThrow();
		expect(settings.getGlobal("temperature")).toBe(0.4);
		expect(settings.get("temperature")).toBe(0.4);
		expect(settings.getGlobal("topP")).toBe(0.3);
		expect(settings.get("topP")).toBe(0.3);
		expect(changes).toEqual([]);
		expect((await receipt.restore()).status).toBe("restored");
		expect(settings.getGlobal("temperature")).toBe(0.2);
		expect(settings.get("temperature")).toBe(0.2);
	});

	it("rejects a cloneable value that cannot be hashed without publishing candidate state", async () => {
		const settings = Settings.isolated({ temperature: 0.2 });
		const receipt = await settings.commitAtomicBatch(patch);
		const changes: string[] = [];
		settings.onChanged(path => changes.push(path));
		await expect(
			settings.commitAtomicBatch([
				{ path: "temperature", op: "set", value: 0.8 },
				{ path: "topP", op: "set", value: 1n },
			]),
		).rejects.toThrow();
		expect(settings.getGlobal("temperature")).toBe(0.4);
		expect(settings.get("temperature")).toBe(0.4);
		expect(settings.getGlobal("topP")).toBeUndefined();
		expect(changes).toEqual([]);
		expect((await receipt.restore()).status).toBe("restored");
		expect(settings.get("temperature")).toBe(0.2);
	});

	it("keeps notification state and receipt ownership on candidate hash failure", async () => {
		const settings = Settings.isolated({ "notifications.redact": false });
		const receipt = await settings.commitAtomicBatch([{ path: "notifications.redact", op: "set", value: true }]);
		const changes: string[] = [];
		settings.onChanged(path => changes.push(path));
		await expect(
			settings.commitAtomicBatch([
				{ path: "notifications.redact", op: "set", value: false },
				{ path: "topP", op: "set", value: 1n },
			]),
		).rejects.toThrow();
		expect(settings.getGlobal("notifications.redact")).toBe(true);
		expect(settings.get("notifications.redact")).toBe(true);
		expect(changes).toEqual([]);
		expect((await receipt.restore()).status).toBe("restored");
		expect(settings.get("notifications.redact")).toBe(false);
	});

	it("preserves repeated-path ordering and restoration", async () => {
		const settings = Settings.isolated({ temperature: 0.2 });
		const changes: string[] = [];
		settings.onChanged(path => changes.push(path));
		const receipt = await settings.commitAtomicBatch([
			{ path: "temperature", op: "set", value: 0.6 },
			{ path: "temperature", op: "unset" },
			{ path: "temperature", op: "set", value: 0.8 },
		]);
		expect(settings.getGlobal("temperature")).toBe(0.8);
		expect(changes).toEqual(["temperature"]);
		expect((await receipt.restore()).status).toBe("restored");
		expect(settings.get("temperature")).toBe(0.2);
	});

	for (const durable of [false, true]) {
		for (const builder of [false, true]) {
			for (const hasValue of [false, true]) {
				it(`rejects a late malformed operation in ${durable ? "durable" : "memory"} ${builder ? "async builder" : "batch"} (value ${hasValue})`, async () => {
					const temp = TempDir.createSync("@gjc-invalid-operation-");
					const settings = durable
						? await Settings.loadForScope({ cwd: temp.path(), agentDir: path.join(temp.path(), "agent") })
						: Settings.isolated({ temperature: 0.2 });
					try {
						await settings.commitAtomicBatch([{ path: "temperature", op: "set", value: 0.2 }]);
						const receipt = await settings.commitAtomicBatch(patch);
						const configPath = settings.getGlobalConfigPath();
						const before = configPath ? await Bun.file(configPath).text() : undefined;
						const changes: string[] = [];
						settings.onChanged(path => changes.push(path));
						const malformed = { path: "topP", op: "bad", ...(hasValue ? { value: "secret-patch-value" } : {}) };
						const patches = [{ path: "temperature", op: "set", value: 0.8 }, malformed] as SettingsAtomicPatch[];
						const operation = builder
							? settings.commitAtomicBatchWithCurrent(async () => patches)
							: settings.commitAtomicBatch(patches);
						const error = await operation.then(
							() => undefined,
							reason => reason,
						);
						expect(error).toBeInstanceOf(TypeError);
						expect(error.message).toContain("Unknown settings atomic patch operation");
						expect(error.message).not.toContain("secret-patch-value");
						expect(settings.getGlobal("temperature")).toBe(0.4);
						expect(settings.get("temperature")).toBe(0.4);
						expect(changes).toEqual([]);
						if (configPath && before !== undefined) expect(await Bun.file(configPath).text()).toBe(before);
						expect((await receipt.restore()).status).toBe("restored");
						expect(settings.getGlobal("temperature")).toBe(0.2);
					} finally {
						await settings.close();
						temp.removeSync();
					}
				});
			}
		}
	}

	it("clears only own overrides without touching an inherited parent", async () => {
		const settings = Settings.isolated({ "compaction.enabled": true }, { overrides: { temperature: 0.8 } });
		const changes: string[] = [];
		settings.onChanged(path => changes.push(path));
		const original = Object.getOwnPropertyDescriptor(Object.prototype, "compaction");
		const inherited = { enabled: false };
		const entered = Promise.withResolvers<void>();
		const release = Promise.withResolvers<void>();
		try {
			Object.defineProperty(Object.prototype, "compaction", {
				value: inherited,
				writable: true,
				configurable: true,
			});
			const pending = settings.commitAtomicBatchWithCurrent(async () => {
				entered.resolve();
				await release.promise;
				return patch;
			});
			await entered.promise;
			settings.clearOverride("compaction.enabled");
			expect(inherited).toEqual({ enabled: false });
			expect(settings.get("compaction.enabled")).toBe(true);
			expect(changes).toEqual([]);
			release.resolve();
			await expect(pending).rejects.toThrow("changed");
			settings.clearOverride("temperature");
			expect(settings.getOverride("temperature")).toBeUndefined();
			expect(changes).toEqual(["temperature"]);
		} finally {
			release.resolve();
			if (original) Object.defineProperty(Object.prototype, "compaction", original);
			else delete (Object.prototype as Record<string, unknown>).compaction;
		}
	});

	it("does not delete a property through an inherited Object.prototype alias", () => {
		const settings = Settings.isolated();
		const changes: string[] = [];
		settings.onChanged(path => changes.push(path));
		const display = Object.getOwnPropertyDescriptor(Object.prototype, "display");
		const tabWidth = Object.getOwnPropertyDescriptor(Object.prototype, "tabWidth");
		try {
			Object.defineProperty(Object.prototype, "display", { value: Object.prototype, configurable: true });
			Object.defineProperty(Object.prototype, "tabWidth", { value: 7, configurable: true });
			settings.clearOverride("display.tabWidth");
			expect(Object.getOwnPropertyDescriptor(Object.prototype, "tabWidth")?.value).toBe(7);
			expect(changes).toEqual([]);
		} finally {
			if (display) Object.defineProperty(Object.prototype, "display", display);
			else delete (Object.prototype as Record<string, unknown>).display;
			if (tabWidth) Object.defineProperty(Object.prototype, "tabWidth", tabWidth);
			else delete (Object.prototype as Record<string, unknown>).tabWidth;
		}
	});

	for (const parent of [null, 42]) {
		it(`ignores a scalar or null override parent (${parent})`, () => {
			const settings = Settings.isolated({}, { overrides: { compaction: parent } as never });
			const changes: string[] = [];
			settings.onChanged(path => changes.push(path));
			settings.clearOverride("compaction.enabled");
			expect(changes).toEqual([]);
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
