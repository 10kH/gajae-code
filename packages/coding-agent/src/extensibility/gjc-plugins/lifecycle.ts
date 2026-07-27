import * as path from "node:path";
import {
	candidateRegistryEntry,
	type GjcBundleTransactionDecision,
	resolveGjcBundleCandidate,
	runGjcBundleTransaction,
} from "./installer";
import {
	activationFingerprint,
	baselineFingerprint,
	bundleIdentity,
	candidateFingerprint,
	decisionContextFingerprint,
	diffSurfaceIds,
	identityEquals,
	reconcileEnablement,
	surfaceIdsOf,
	targetFingerprint,
} from "./lifecycle-reconciliation";
import { readRegistry, sortRegistryEntries, withRegistryLock, writeRegistryUnlocked } from "./registry";
import type {
	GjcBundleIdentity,
	GjcBundleSafeSource,
	GjcBundleSummary,
	GjcBundleSurfaceSummary,
	GjcInstallResult,
	GjcLifecycleError,
	GjcLifecycleResult,
	GjcPluginRegistryEntry,
	GjcPluginRegistrySource,
	GjcPluginScope,
	GjcReviewedUpdateToken,
	GjcToggleResult,
	GjcUpdateApplyResult,
	GjcUpdatePreview,
} from "./types";

/**
 * GJC bundle lifecycle service.
 *
 * This module is the ONLY policy and persistence writer for GJC bundles: fresh
 * install, update preview/apply, bundle enable/disable, and surface
 * enable/disable. Callers (CLI, Settings) never touch the registry writers or
 * the installer transaction directly.
 */

export interface GjcLifecycleContext {
	cwd: string;
}

function fail(code: GjcLifecycleError["code"], message: string, recovery?: string): GjcLifecycleError {
	return recovery ? { code, message, recovery } : { code, message };
}

const UNSUPPORTED_UPDATE_REASON: Partial<Record<GjcPluginRegistrySource["kind"], string>> = {};

/**
 * Redact a stored locator to a display form: scheme + host + path only. No
 * userinfo, query, fragment, or credentials ever reach CLI/Settings output.
 */
export function redactSourceLocator(source: GjcPluginRegistrySource): string {
	if (source.kind === "path" || source.kind === "tarball") {
		return path.basename(source.uri);
	}
	try {
		const url = new URL(source.uri);
		return `${url.protocol}//${url.hostname}${url.pathname.replace(/\.git$/, "")}`;
	} catch {
		// scp-style (git@host:owner/repo) or otherwise unparseable: keep host+path.
		const scp = /^[^@/]+@([^:]+):(.+)$/.exec(source.uri);
		if (scp) return `${scp[1]}/${scp[2]?.replace(/\.git$/, "") ?? ""}`;
		return source.kind;
	}
}

function toSafeSource(source: GjcPluginRegistrySource): GjcBundleSafeSource {
	const unsupportedReason = UNSUPPORTED_UPDATE_REASON[source.kind];
	const safe: GjcBundleSafeSource = {
		kind: source.kind,
		display: redactSourceLocator(source),
		resolvedAt: source.resolvedAt,
		updatable: unsupportedReason === undefined,
	};
	if (source.ref !== undefined) safe.ref = source.ref;
	if (source.sha !== undefined) safe.sha = source.sha;
	if (unsupportedReason !== undefined) safe.unsupportedReason = unsupportedReason;
	return safe;
}

function surfaceSummaries(entry: GjcPluginRegistryEntry): GjcBundleSurfaceSummary[] {
	const disabled = new Set(entry.disabledSurfaceIds);
	const quarantined = new Map((entry.quarantine ?? []).map(q => [q.surfaceId, q.code]));
	const rows: GjcBundleSurfaceSummary[] = [
		...entry.surfaces.subskills.map(s => ({ extensionId: s.extensionId, kind: "subskill" as const, name: s.name })),
		...entry.surfaces.tools.map(t => ({ extensionId: t.extensionId, kind: "tool" as const, name: t.name })),
		...entry.surfaces.hooks.map(h => ({ extensionId: h.extensionId, kind: "hook" as const, name: h.name })),
		...entry.surfaces.mcps.map(m => ({ extensionId: m.extensionId, kind: "mcp" as const, name: m.name })),
		...entry.surfaces.systemAppendices.map(a => ({
			extensionId: a.extensionId,
			kind: "system-appendix" as const,
			name: a.name,
		})),
		...entry.surfaces.agentAppendices.map(a => ({
			extensionId: a.extensionId,
			kind: "agent-appendix" as const,
			name: a.name,
		})),
	].map(row => {
		const code = quarantined.get(row.extensionId);
		const summary: GjcBundleSurfaceSummary = {
			...row,
			enabled: !disabled.has(row.extensionId),
			quarantined: code !== undefined,
		};
		if (code !== undefined) summary.quarantineCode = code;
		return summary;
	});
	return rows.sort((a, b) => a.extensionId.localeCompare(b.extensionId));
}

/** Safe, redacted DTO for one installed bundle. */
export function toBundleSummary(entry: GjcPluginRegistryEntry): GjcBundleSummary {
	const surfaces = surfaceSummaries(entry);
	return {
		identity: bundleIdentity(entry.scope, entry.name),
		version: entry.version,
		enabled: entry.enabled,
		source: toSafeSource(entry.source),
		installedAt: entry.installedAt,
		updatedAt: entry.updatedAt,
		manifestHash: entry.manifestHash,
		targetFingerprint: targetFingerprint(entry),
		surfaces,
		quarantined: surfaces.some(s => s.quarantined),
	};
}

async function readEffective(cwd: string): Promise<GjcPluginRegistryEntry[]> {
	const [user, project] = await Promise.all([readRegistry("user", cwd), readRegistry("project", cwd)]);
	return sortRegistryEntries([...user.plugins, ...project.plugins]);
}

/** All installed bundles across both scopes, deterministically ordered. */
export async function listGjcBundles(ctx: GjcLifecycleContext): Promise<GjcBundleSummary[]> {
	return (await readEffective(ctx.cwd)).map(toBundleSummary);
}

/** One bundle by exact (scope, name) identity. Opposite scope never matches. */
export async function getGjcBundle(
	ctx: GjcLifecycleContext,
	identity: GjcBundleIdentity,
): Promise<GjcLifecycleResult<GjcBundleSummary>> {
	const registry = await readRegistry(identity.scope, ctx.cwd);
	const entry = registry.plugins.find(p => p.name === identity.name);
	if (!entry) return { ok: false, error: notInstalled(identity) };
	return { ok: true, value: toBundleSummary(entry) };
}

function notInstalled(identity: GjcBundleIdentity): GjcLifecycleError {
	return fail(
		"not_installed",
		`GJC bundle "${identity.name}" is not installed in the ${identity.scope} scope`,
		`gjc plugin install <source> --${identity.scope}`,
	);
}

/**
 * Fresh install only. An existing target in the same scope is create-only and
 * is refused identically with or without force; upgrading is a separate,
 * scope-qualified operation.
 */
export async function installGjcBundle(
	ctx: GjcLifecycleContext,
	scope: GjcPluginScope,
	source: string,
): Promise<GjcLifecycleResult<GjcInstallResult>> {
	const result = await runGjcBundleTransaction(source, {
		scope,
		cwd: ctx.cwd,
		decide: async ({ existing, candidate }): Promise<GjcBundleTransactionDecision> => {
			if (existing) {
				return {
					kind: "abort",
					error: fail(
						"already_installed_use_upgrade",
						`GJC bundle "${existing.name}" is already installed in the ${scope} scope`,
						`gjc plugin upgrade ${existing.name} --${scope}`,
					),
				};
			}
			return { kind: "commit", entry: candidate };
		},
	});
	if (result.status === "aborted") return { ok: false, error: result.error };
	return { ok: true, value: { status: "installed", summary: toBundleSummary(result.entry) } };
}

/**
 * Re-resolve the stored source descriptor and describe what an update would do.
 * The returned token binds the candidate, the exact installed baseline, and the
 * deterministic decision context; apply is a compare-and-swap on all three.
 */
export async function previewGjcBundleUpdate(
	ctx: GjcLifecycleContext,
	identity: GjcBundleIdentity,
): Promise<GjcLifecycleResult<GjcUpdatePreview>> {
	const registry = await readRegistry(identity.scope, ctx.cwd);
	const entry = registry.plugins.find(p => p.name === identity.name);
	if (!entry) return { ok: false, error: notInstalled(identity) };
	const safeSource = toSafeSource(entry.source);
	if (!safeSource.updatable) {
		return {
			ok: false,
			error: fail(
				"source_unsupported",
				`GJC bundle "${identity.name}" was installed from a ${entry.source.kind} source that cannot be re-resolved`,
			),
		};
	}

	const effective = await readEffective(ctx.cwd);
	return await resolveGjcBundleCandidate(entry.source.uri, async ({ bundle }) => {
		if (bundle.name !== entry.name) {
			return {
				ok: false as const,
				error: fail(
					"identity_mismatch",
					`Source now declares "${bundle.name}" but "${entry.name}" is installed; install the new bundle and uninstall the old one`,
					`gjc plugin install <source> --${identity.scope}`,
				),
			};
		}
		const candidateIds = surfaceIdsOf(bundle.surfaces);
		const delta = diffSurfaceIds(surfaceIdsOf(entry.surfaces), candidateIds);
		const candidateHash = candidateFingerprint(identity.scope, bundle);
		const baselineHash = baselineFingerprint(entry);
		const contextHash = decisionContextFingerprint(identity, effective);
		const token: GjcReviewedUpdateToken = {
			identity,
			candidateFingerprint: candidateHash,
			baselineFingerprint: baselineHash,
			decisionContextFingerprint: contextHash,
			reviewedAt: new Date().toISOString(),
		};
		return {
			ok: true as const,
			value: {
				identity,
				current: toBundleSummary(entry),
				candidateVersion: bundle.version,
				candidateManifestHash: bundle.manifestHash,
				addedSurfaceIds: delta.addedSurfaceIds,
				removedSurfaceIds: delta.removedSurfaceIds,
				retainedSurfaceIds: delta.retainedSurfaceIds,
				changed: candidateHash !== targetFingerprint(entry),
				token,
			},
		};
	});
}

/**
 * Apply a previously reviewed update. Any drift in the candidate bytes, the
 * installed baseline, or the decision context returns a typed stale error with
 * zero mutation.
 */
export async function applyGjcBundleUpdate(
	ctx: GjcLifecycleContext,
	token: GjcReviewedUpdateToken,
): Promise<GjcLifecycleResult<GjcUpdateApplyResult>> {
	const identity = token.identity;
	const registry = await readRegistry(identity.scope, ctx.cwd);
	const entry = registry.plugins.find(p => p.name === identity.name);
	if (!entry) return { ok: false, error: notInstalled(identity) };
	if (!toSafeSource(entry.source).updatable) {
		return {
			ok: false,
			error: fail(
				"source_unsupported",
				`GJC bundle "${identity.name}" was installed from a ${entry.source.kind} source that cannot be re-resolved`,
			),
		};
	}

	const result = await runGjcBundleTransaction(entry.source.uri, {
		scope: identity.scope,
		cwd: ctx.cwd,
		decide: async ({ existing, effective, bundle, candidate }): Promise<GjcBundleTransactionDecision> => {
			if (!existing) return { kind: "abort", error: notInstalled(identity) };
			if (bundle.name !== existing.name || !identityEquals(bundleIdentity(identity.scope, bundle.name), identity)) {
				return {
					kind: "abort",
					error: fail(
						"identity_mismatch",
						`Source now declares "${bundle.name}" but "${existing.name}" is installed; install the new bundle and uninstall the old one`,
						`gjc plugin install <source> --${identity.scope}`,
					),
				};
			}
			const candidateHash = candidateFingerprint(identity.scope, bundle);
			if (candidateHash !== token.candidateFingerprint) {
				return {
					kind: "abort",
					error: fail("stale_candidate", "The source changed since it was reviewed; preview the update again"),
				};
			}
			const baselineHash = baselineFingerprint(existing);
			if (baselineHash !== token.baselineFingerprint) {
				return {
					kind: "abort",
					error: fail(
						"stale_baseline",
						"The installed bundle changed since it was reviewed; preview the update again",
					),
				};
			}
			const contextHash = decisionContextFingerprint(identity, effective);
			if (contextHash !== token.decisionContextFingerprint) {
				return {
					kind: "abort",
					error: fail(
						"stale_decision_context",
						"Installed bundles changed since the update was reviewed; preview the update again",
					),
				};
			}
			if (candidateHash === targetFingerprint(existing)) return { kind: "noop", entry: existing };

			const reconciled = reconcileEnablement(
				existing.disabledSurfaceIds,
				existing.quarantine ?? [],
				surfaceIdsOf(bundle.surfaces),
			);
			const next: GjcPluginRegistryEntry = {
				...candidate,
				enabled: existing.enabled,
				installedAt: existing.installedAt,
				disabledSurfaceIds: reconciled.disabledSurfaceIds,
			};
			if (reconciled.quarantine.length > 0) next.quarantine = reconciled.quarantine;
			else delete next.quarantine;
			return { kind: "commit", entry: next };
		},
	});

	if (result.status === "aborted") return { ok: false, error: result.error };
	if (result.status === "noop") {
		return { ok: true, value: { status: "unchanged", summary: toBundleSummary(result.entry), remnants: [] } };
	}
	return {
		ok: true,
		value: { status: "updated", summary: toBundleSummary(result.entry), remnants: result.remnants },
	};
}

async function mutateEntry(
	ctx: GjcLifecycleContext,
	identity: GjcBundleIdentity,
	mutate: (entry: GjcPluginRegistryEntry) => GjcLifecycleResult<GjcPluginRegistryEntry | null>,
): Promise<GjcLifecycleResult<GjcToggleResult>> {
	return await withRegistryLock(identity.scope, ctx.cwd, async () => {
		const registry = await readRegistry(identity.scope, ctx.cwd);
		const entry = registry.plugins.find(p => p.name === identity.name);
		if (!entry) return { ok: false, error: notInstalled(identity) };
		const outcome = mutate(entry);
		if (!outcome.ok) return { ok: false, error: outcome.error };
		if (outcome.value === null) return { ok: true, value: { summary: toBundleSummary(entry), mutated: false } };
		const next = sortRegistryEntries([...registry.plugins.filter(p => p.name !== identity.name), outcome.value]);
		await writeRegistryUnlocked({ version: 1, scope: identity.scope, plugins: next }, ctx.cwd);
		return { ok: true, value: { summary: toBundleSummary(outcome.value), mutated: true } };
	});
}

/**
 * Enable or disable a whole bundle. Deterministic quarantine blocks enabling;
 * disabling is always allowed so operators can always de-escalate.
 */
export async function setGjcBundleEnabled(
	ctx: GjcLifecycleContext,
	identity: GjcBundleIdentity,
	enabled: boolean,
): Promise<GjcLifecycleResult<GjcToggleResult>> {
	return await mutateEntry(ctx, identity, entry => {
		if (enabled && (entry.quarantine?.length ?? 0) > 0) {
			return {
				ok: false,
				error: fail("quarantined", `GJC bundle "${identity.name}" is quarantined and cannot be enabled`),
			};
		}
		if (entry.enabled === enabled) return { ok: true, value: null };
		return { ok: true, value: { ...entry, enabled, updatedAt: new Date().toISOString() } };
	});
}

/** Enable or disable one surface of a bundle by its stable extension ID. */
export async function setGjcBundleSurfaceEnabled(
	ctx: GjcLifecycleContext,
	identity: GjcBundleIdentity,
	surfaceId: string,
	enabled: boolean,
): Promise<GjcLifecycleResult<GjcToggleResult>> {
	return await mutateEntry(ctx, identity, entry => {
		if (!surfaceIdsOf(entry.surfaces).includes(surfaceId)) {
			return {
				ok: false,
				error: fail("surface_unknown", `GJC bundle "${identity.name}" has no surface "${surfaceId}"`),
			};
		}
		if (enabled && (entry.quarantine ?? []).some(q => q.surfaceId === surfaceId)) {
			return {
				ok: false,
				error: fail("quarantined", `Surface "${surfaceId}" is quarantined and cannot be enabled`),
			};
		}
		const disabled = new Set(entry.disabledSurfaceIds);
		if (enabled ? !disabled.has(surfaceId) : disabled.has(surfaceId)) return { ok: true, value: null };
		if (enabled) disabled.delete(surfaceId);
		else disabled.add(surfaceId);
		return {
			ok: true,
			value: { ...entry, disabledSurfaceIds: [...disabled].sort(), updatedAt: new Date().toISOString() },
		};
	});
}

/** Deterministic activation generation for the current persisted state. */
export async function currentActivationFingerprint(ctx: GjcLifecycleContext): Promise<string> {
	return activationFingerprint(await readEffective(ctx.cwd));
}

export { candidateRegistryEntry };
