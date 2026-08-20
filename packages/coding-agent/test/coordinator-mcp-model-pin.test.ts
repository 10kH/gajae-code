import { describe, expect, it } from "bun:test";
import type { Model } from "@gajae-code/ai";
import { type CoordinatorModelRegistryLoader, resolveCoordinatorModel } from "../src/coordinator-mcp/model-pin";

const model = (provider: string, id: string): Model =>
	({ provider, id, name: id, api: "openai-responses", contextWindow: 1000, maxTokens: 1000 }) as Model;

const registryWith = (models: Model[]): CoordinatorModelRegistryLoader =>
	(() => ({ getAll: () => models })) as unknown as CoordinatorModelRegistryLoader;

const CURSOR_MODELS = [
	model("cursor", "claude-fable-5-xhigh"),
	model("cursor", "composer-2.5"),
	model("cursor", "default"),
];

describe("resolveCoordinatorModel", () => {
	it("treats an absent value as no pin", async () => {
		for (const absent of [undefined, null]) {
			expect(await resolveCoordinatorModel(absent, registryWith(CURSOR_MODELS))).toEqual({
				ok: true,
				model: null,
			});
		}
	});

	it("resolves every Cursor id from the issue with CLI parity", async () => {
		for (const selector of ["cursor/claude-fable-5-xhigh", "cursor/composer-2.5", "cursor/default"]) {
			expect(await resolveCoordinatorModel(selector, registryWith(CURSOR_MODELS))).toEqual({
				ok: true,
				model: selector,
			});
		}
	});

	it("fails closed on unknown ids with the CLI not-found error", async () => {
		const rejected = await resolveCoordinatorModel("cursor:fable5-xhigh", registryWith(CURSOR_MODELS));
		expect(rejected).toEqual({
			ok: false,
			reason: "unknown_model",
			model: "cursor:fable5-xhigh",
			error: 'Model "cursor:fable5-xhigh" not found. Use --list-models to see available models.',
		});
	});

	it("fails closed when no models are available at all", async () => {
		const rejected = await resolveCoordinatorModel("cursor/default", registryWith([]));
		expect(rejected.ok).toBe(false);
		if (!rejected.ok) {
			expect(rejected.reason).toBe("unknown_model");
			expect(rejected.error).toContain("No models available");
		}
	});

	it("resolves against the full registry, not the authenticated-only subset", async () => {
		// getAll() is the CLI --model surface: an unauthenticated Cursor model
		// still resolves so the child owns credential handling, exactly like
		// `gjc --model cursor/...` on a host without a usage probe.
		const loader = registryWith(CURSOR_MODELS);
		expect(await resolveCoordinatorModel("cursor/default", loader)).toEqual({
			ok: true,
			model: "cursor/default",
		});
	});
});
