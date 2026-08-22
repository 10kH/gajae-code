import * as path from "node:path";
import type { AuthStorage } from "@gajae-code/ai/core";
import { ModelRegistry } from "../../config/model-registry";
import { formatModelString, type ResolveCliModelResult, resolveCliModel } from "../../config/model-resolver";
import { Settings } from "../../config/settings";
import { discoverAuthStorage } from "../session";

const MAX_ECHOED_MODEL_LENGTH = 256;

/** Registry loader owned by the SDK host, not by machine-facing adapters. */
export type SdkHostModelRegistryLoader = () => ModelRegistry | Promise<ModelRegistry>;

/**
 * Builds an offline model resolver for a single SDK host process.
 *
 * The registry is reused, but refreshed for every validation so additions and
 * removals made while the broker is alive are observed without network I/O.
 */
export function createSdkHostModelRegistryLoader(
	discoverStorage: () => Promise<AuthStorage>,
	modelsPath?: string,
	loadSettings?: () => Promise<Pick<Settings, "getGlobal">>,
): SdkHostModelRegistryLoader {
	let cachedRegistry: Promise<ModelRegistry> | undefined;
	return async () => {
		if (cachedRegistry === undefined) {
			const initializing = Promise.all([discoverStorage(), loadSettings?.()]).then(
				([storage, registrySettings]) => new ModelRegistry(storage, modelsPath, registrySettings),
			);
			cachedRegistry = initializing;
			try {
				await initializing;
			} catch (error) {
				if (cachedRegistry === initializing) cachedRegistry = undefined;
				throw error;
			}
		}
		const registry = await cachedRegistry;
		await registry.refresh("offline");
		return registry;
	};
}

export type SdkHostModelResolution =
	| { ok: true; model: string | null }
	| { ok: false; reason: "unknown_model"; model: string; error: string };

export type SdkHostModelResolver = (raw: unknown) => Promise<SdkHostModelResolution>;

/** Resolve the explicit model pin at the SDK host boundary. */
export async function resolveSdkHostModel(
	raw: unknown,
	loadRegistry: SdkHostModelRegistryLoader,
): Promise<SdkHostModelResolution> {
	if (raw === undefined || raw === null) return { ok: true, model: null };
	const requested = typeof raw === "string" ? raw : "";
	const echoed = requested.trim().slice(0, MAX_ECHOED_MODEL_LENGTH);
	const registry = await loadRegistry();
	const resolved: ResolveCliModelResult = resolveCliModel({ cliModel: requested, modelRegistry: registry });
	if (!resolved.model)
		return {
			ok: false,
			reason: "unknown_model",
			model: echoed,
			error: resolved.error ?? "No models available. Check your installation or add models to models.json.",
		};
	return { ok: true, model: formatModelString(resolved.model) };
}

/** Default resolver used by the SDK broker host. */
export function createDefaultSdkHostModelResolver(agentDir: string): SdkHostModelResolver {
	const loadRegistry = createSdkHostModelRegistryLoader(
		() => discoverAuthStorage(agentDir),
		path.join(agentDir, "models.yml"),
		() => Settings.loadReadonly({ agentDir }),
	);
	return (raw: unknown): Promise<SdkHostModelResolution> => resolveSdkHostModel(raw, loadRegistry);
}
