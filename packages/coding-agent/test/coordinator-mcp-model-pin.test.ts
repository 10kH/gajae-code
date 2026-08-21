import { describe, expect, it, vi } from "bun:test";
import { AuthStorage, type Model } from "@gajae-code/ai";
import {
	createSdkHostModelRegistryLoader,
	resolveSdkHostModel,
	type SdkHostModelRegistryLoader,
} from "../src/sdk/host/model-pin";

const model = (provider: string, id: string): Model =>
	({ provider, id, name: id, api: "openai-responses", contextWindow: 1000, maxTokens: 1000 }) as Model;

const registryWith = (models: Model[]): SdkHostModelRegistryLoader =>
	(() => ({ getAll: () => models })) as unknown as SdkHostModelRegistryLoader;

const CURSOR_MODELS = [
	model("cursor", "claude-fable-5-xhigh"),
	model("cursor", "composer-2.5"),
	model("cursor", "default"),
];

describe("resolveSdkHostModel", () => {
	it("treats an absent value as no pin", async () => {
		for (const absent of [undefined, null]) {
			expect(await resolveSdkHostModel(absent, registryWith(CURSOR_MODELS))).toEqual({
				ok: true,
				model: null,
			});
		}
	});

	it("resolves every Cursor id from the issue with CLI parity", async () => {
		for (const selector of ["cursor/claude-fable-5-xhigh", "cursor/composer-2.5", "cursor/default"]) {
			expect(await resolveSdkHostModel(selector, registryWith(CURSOR_MODELS))).toEqual({
				ok: true,
				model: selector,
			});
		}
	});

	it("fails closed on unknown ids with the CLI not-found error", async () => {
		const rejected = await resolveSdkHostModel("cursor:fable5-xhigh", registryWith(CURSOR_MODELS));
		expect(rejected).toEqual({
			ok: false,
			reason: "unknown_model",
			model: "cursor:fable5-xhigh",
			error: 'Model "cursor:fable5-xhigh" not found. Use --list-models to see available models.',
		});
	});

	it("fails closed when no models are available at all", async () => {
		const rejected = await resolveSdkHostModel("cursor/default", registryWith([]));
		expect(rejected.ok).toBe(false);
		if (!rejected.ok) {
			expect(rejected.reason).toBe("unknown_model");
			expect(rejected.error).toContain("No models available");
		}
	});

	it("resolves against the full registry, not the authenticated-only subset", async () => {
		const loader = registryWith(CURSOR_MODELS);
		expect(await resolveSdkHostModel("cursor/default", loader)).toEqual({
			ok: true,
			model: "cursor/default",
		});
	});

	it("pins the concrete provider/id the selector resolved to, not a bare alias", async () => {
		const loader = registryWith([model("cursor", "composer-2.5"), model("openai", "composer-2.5")]);
		const resolved = await resolveSdkHostModel("cursor/composer-2.5", loader);
		expect(resolved).toEqual({ ok: true, model: "cursor/composer-2.5" });
	});

	it("refreshes the registry on every validation instead of caching one snapshot", async () => {
		const storage = await AuthStorage.create(":memory:");
		let discoveries = 0;
		const loader = createSdkHostModelRegistryLoader(async () => {
			discoveries += 1;
			return storage;
		});
		try {
			const first = await loader();
			const refresh = vi.spyOn(first, "refresh");
			const second = await loader();
			const third = await loader();

			expect(second).toBe(first);
			expect(third).toBe(first);
			expect(discoveries).toBe(1);
			expect(refresh.mock.calls).toEqual([["offline"], ["offline"]]);
			expect(first.getAll().length).toBeGreaterThan(0);
		} finally {
			storage.close();
		}
	});

	it("judges each validation against the registry contents at that moment", async () => {
		let models: Model[] = [model("cursor", "default")];
		const loader = (() => ({ getAll: () => models })) as unknown as SdkHostModelRegistryLoader;

		expect(await resolveSdkHostModel("cursor/default", loader)).toEqual({ ok: true, model: "cursor/default" });
		expect((await resolveSdkHostModel("cursor/composer-2.5", loader)).ok).toBe(false);

		models = [model("cursor", "composer-2.5")];
		expect(await resolveSdkHostModel("cursor/composer-2.5", loader)).toEqual({
			ok: true,
			model: "cursor/composer-2.5",
		});
		expect((await resolveSdkHostModel("cursor/default", loader)).ok).toBe(false);
	});
});
