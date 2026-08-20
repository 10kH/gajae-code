import type { AuthStorage } from "@gajae-code/ai/core";
import { ModelRegistry } from "../config/model-registry";
import { formatModelString, type ResolveCliModelResult, resolveCliModel } from "../config/model-resolver";
import { discoverAuthStorage } from "../sdk/session";

const MAX_ECHOED_MODEL_LENGTH = 256;

/**
 * Loads the model registry used to validate a coordinator `model` pin before
 * any broker mutation. The child still owns final model application; this only
 * mirrors the CLI `--model` grammar against the same registry surface
 * (`getAll()`, not the authenticated-only `getAvailable()`) so a valid id is
 * never rejected up front because its credential is not configured on this
 * host — matching CLI behavior where `--model cursor/...` resolves regardless
 * of the local usage probe state.
 */
export type CoordinatorModelRegistryLoader = () => ModelRegistry | Promise<ModelRegistry>;

/**
 * Builds a loader that keeps one registry instance per coordinator process and
 * re-refreshes it on every validation. `refresh("offline")` reuses the on-disk
 * discovery cache and never performs network I/O, so validating a pin cannot
 * hang a coordinator tool call; the spawned session host still owns live
 * discovery and final application.
 *
 * The refresh is per validation rather than once per process: a permanently
 * cached snapshot would keep rejecting models added after the first pin and —
 * worse — keep accepting models removed since, handing a prevalidated selector
 * to a child that can no longer resolve it.
 */
export function createCoordinatorModelRegistryLoader(
	discoverStorage: () => Promise<AuthStorage>,
): CoordinatorModelRegistryLoader {
	let cachedRegistry: Promise<ModelRegistry> | undefined;
	return async () => {
		cachedRegistry ??= discoverStorage().then(storage => new ModelRegistry(storage));
		const registry = await cachedRegistry;
		await registry.refresh("offline");
		return registry;
	};
}

/** Default coordinator registry loader, bound to this host's auth storage. */
export const loadCoordinatorModelRegistry: CoordinatorModelRegistryLoader = createCoordinatorModelRegistryLoader(() =>
	discoverAuthStorage(),
);

export type CoordinatorModelResolution =
	| { ok: true; model: string | null }
	| { ok: false; reason: "unknown_model"; model: string; error: string };

/**
 * Resolve a coordinator `model` argument with the same grammar and errors as
 * `gjc --model <provider/model>`.
 *
 * Only an absent (`undefined`/`null`) value is a no-op (`model: null`); any
 * other value that fails to resolve is a caller error and is rejected rather
 * than silently launching on the default resolution. The resolved value is the
 * concrete `provider/id` of the model `resolveCliModel` selects, so
 * `cursor/claude-fable-5-xhigh` pins exactly the variant the CLI would select
 * and the child re-resolves an unambiguous exact reference rather than a
 * canonical alias whose local ranking could pick a different variant. That
 * concrete form is also what the child asserts against its own registry, so
 * registry drift between coordinator and child is a hard failure rather than a
 * silent substitution.
 *
 * Unknown ids fail closed with the CLI's `Model "..." not found. Use
 * --list-models ...` error before any broker mutation or idempotency record,
 * so no session is ever created on a different model.
 */
export async function resolveCoordinatorModel(
	raw: unknown,
	loadRegistry: CoordinatorModelRegistryLoader,
): Promise<CoordinatorModelResolution> {
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
