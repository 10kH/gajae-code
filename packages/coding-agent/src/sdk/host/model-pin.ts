import * as path from "node:path";
import type { AuthStorage } from "@gajae-code/ai/core";
import { ModelRegistry } from "../../config/model-registry";
import {
	formatModelSelectorValue,
	formatModelString,
	type ResolveCliModelResult,
	resolveCliModel,
} from "../../config/model-resolver";
import { Settings } from "../../config/settings";
import { discoverAuthStorage } from "../session";

const MAX_ECHOED_MODEL_LENGTH = 256;

export interface SdkHostModelResolveContext {
	cwd?: string;
}

/** Registry loader owned by the SDK host, not by machine-facing adapters. */
export type SdkHostModelRegistryLoader = (
	context?: SdkHostModelResolveContext,
) => ModelRegistry | Promise<ModelRegistry>;

/**
 * Builds an offline model resolver for a single SDK host process.
 *
 * The registry is reused, but refreshed for every validation so additions and
 * removals made while the broker is alive are observed without network I/O.
 */
export function createSdkHostModelRegistryLoader(
	discoverStorage: () => Promise<AuthStorage>,
	modelsPath?: string,
	loadSettings?: (context?: SdkHostModelResolveContext) => Promise<Pick<Settings, "get" | "getGlobal">>,
): SdkHostModelRegistryLoader {
	const cachedRegistries = new Map<string, Promise<ModelRegistry>>();
	return async (context?: SdkHostModelResolveContext) => {
		const scopeKey = context?.cwd ?? "";
		let cachedRegistry = cachedRegistries.get(scopeKey);
		if (cachedRegistry === undefined) {
			const initializing = Promise.all([discoverStorage(), loadSettings?.(context)]).then(
				([storage, registrySettings]) => new ModelRegistry(storage, modelsPath, registrySettings),
			);
			cachedRegistries.set(scopeKey, initializing);
			cachedRegistry = initializing;
			try {
				await initializing;
			} catch (error) {
				if (cachedRegistries.get(scopeKey) === initializing) cachedRegistries.delete(scopeKey);
				throw error;
			}
		}
		const registry = await cachedRegistry;
		if (loadSettings) registry.setScopedSettings(await loadSettings(context));
		await registry.refresh("offline");
		return registry;
	};
}

export type SdkHostModelResolution =
	| { ok: true; model: string | null }
	| { ok: false; reason: "unknown_model"; model: string; error: string };

export type SdkHostModelResolver = (
	raw: unknown,
	context?: SdkHostModelResolveContext,
) => Promise<SdkHostModelResolution>;

/** Resolve the explicit model pin at the SDK host boundary. */
export async function resolveSdkHostModel(
	raw: unknown,
	loadRegistry: SdkHostModelRegistryLoader,
	context?: SdkHostModelResolveContext,
): Promise<SdkHostModelResolution> {
	if (raw === undefined || raw === null) return { ok: true, model: null };
	const requested = typeof raw === "string" ? raw : "";
	const echoed = requested.trim().slice(0, MAX_ECHOED_MODEL_LENGTH);
	const registry = await loadRegistry(context);
	const resolved: ResolveCliModelResult = resolveCliModel({ cliModel: requested, modelRegistry: registry });
	if (!resolved.model)
		return {
			ok: false,
			reason: "unknown_model",
			model: echoed,
			error: resolved.error ?? "No models available. Check your installation or add models to models.json.",
		};
	return {
		ok: true,
		model: formatModelSelectorValue(formatModelString(resolved.model), resolved.thinkingLevel),
	};
}

/** Default resolver used by the SDK broker host. */
export function createDefaultSdkHostModelResolver(agentDir: string): SdkHostModelResolver {
	const loadRegistry = createSdkHostModelRegistryLoader(
		() => discoverAuthStorage(agentDir),
		path.join(agentDir, "models.yml"),
		context => Settings.loadReadonly({ agentDir, cwd: context?.cwd }),
	);
	return (raw: unknown, context?: SdkHostModelResolveContext): Promise<SdkHostModelResolution> =>
		resolveSdkHostModel(raw, loadRegistry, context);
}
