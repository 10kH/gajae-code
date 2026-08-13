import {
	type AuthStorage,
	type CachedCredentialHealth,
	type CachedUsageReport,
	type CredentialHealthResult,
	type CredentialInventoryRecord,
	getEnvApiKey,
	listProvidersWithEnvKey,
	type Provider,
} from "@gajae-code/ai/core";

/** A redacted usage observation attached to an account row. */
export interface AccountUsageCache extends CachedUsageReport {}

/** Safe account health state used by presentation surfaces. */
export interface AccountHealthCache extends CachedCredentialHealth {}

export type AccountInventorySource = "stored" | "env" | "config" | "runtime";

export interface AccountInventoryCapabilities {
	canCheck: boolean;
	canPin: boolean;
	canRemove: boolean;
	hasCachedUsage: boolean;
}

export interface AccountInventoryRouting {
	/** True when this row is the session's last recorded stored credential. */
	active: boolean;
	/** True when this source is the effective source for the provider/session. */
	selected: boolean;
	marker: "active" | "selected" | "available";
}

/**
 * Payload-free account row for renderers. This type deliberately has no
 * AuthCredential, API-key bytes, access token, refresh token, or raw usage.
 */
export interface AccountInventoryRow {
	/** Stable, non-secret presentation id. */
	id: string;
	/** Numeric storage id when this is a persisted row. */
	credentialId?: number;
	provider: string;
	credentialKind: "oauth" | "api_key";
	source: AccountInventorySource;
	sourceLabel: string;
	identityLabel: string | null;
	/** OAuth identity is intentionally limited to safe labels from inventory. */
	oauthIdentity?: { label: string };
	disabled: boolean;
	disabledCause: string | null;
	health: AccountHealthCache;
	usage?: AccountUsageCache;
	capabilities: AccountInventoryCapabilities;
	routing: AccountInventoryRouting;
}

export interface AccountInventorySnapshot {
	generatedAt: number;
	generation: number;
	rows: AccountInventoryRow[];
}

export interface AccountInventoryInput {
	authStorage: AuthStorage;
	modelRegistry?: {
		getAvailable?: () => Array<{ provider: string }>;
		getProviderBaseUrl?: (provider: string) => string | undefined;
	};
	sessionId?: string;
	provider?: string;
	nowMs?: number;
}

export interface AccountInventoryCheckResult {
	rowId: string;
	provider: string;
	credentialId?: number;
	ok: boolean | null;
	reason?: string;
}

function asSafeLabel(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const normalized = value
		.replace(/bearer\s+[^\s,;]+/gi, "Bearer [redacted]")
		.replace(/(api[_-]?key|token|secret|authorization)[=:]\s*[^\s,;]+/gi, "$1=[redacted]")
		.replace(/[\u0000-\u001f\u007f]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	return normalized.length > 0 ? normalized.slice(0, 160) : null;
}

function sourceId(provider: string, source: AccountInventorySource, credentialId?: number): string {
	return credentialId === undefined ? `${provider}:${source}` : `${provider}:stored:${credentialId}`;
}

function sourceLabel(source: AccountInventorySource): string {
	switch (source) {
		case "stored":
			return "stored credential";
		case "env":
			return "environment API key";
		case "config":
			return "config API key";
		case "runtime":
			return "runtime API key";
	}
}

function providerSet(input: AccountInventoryInput, inventory: CredentialInventoryRecord[]): Set<string> {
	const providers = new Set(inventory.map(row => row.provider));
	for (const provider of input.modelRegistry?.getAvailable?.() ?? []) providers.add(provider.provider);
	// This only asks whether a known env-backed provider is present. The key value
	// never enters the snapshot or any renderer.
	for (const provider of listProvidersWithEnvKey()) {
		if (getEnvApiKey(provider)) providers.add(provider);
	}
	return providers;
}

function storedHealth(authStorage: AuthStorage, row: CredentialInventoryRecord): AccountHealthCache {
	return authStorage.getCachedCredentialHealth(row.id);
}

function storedUsage(authStorage: AuthStorage, row: CredentialInventoryRecord): AccountUsageCache | undefined {
	return authStorage.getCachedUsageReport(row.provider as Provider, row.id);
}
function redactUsageReport(report: CachedUsageReport["report"]): CachedUsageReport["report"] {
	const safeMetadata = report.metadata
		? Object.fromEntries(
				["email", "accountId", "account", "user", "projectId", "orgId"].flatMap(key => {
					const value = asSafeLabel(report.metadata?.[key]);
					return value ? [[key, value]] : [];
				}),
			)
		: undefined;
	return {
		...report,
		metadata: safeMetadata,
		limits: report.limits.map(limit => ({
			...limit,
			label: asSafeLabel(limit.label) ?? "usage limit",
			notes: limit.notes?.map(note => asSafeLabel(note)).filter((note): note is string => note !== null),
			scope: {
				...limit.scope,
				accountId: asSafeLabel(limit.scope.accountId) ?? undefined,
				projectId: asSafeLabel(limit.scope.projectId) ?? undefined,
				orgId: asSafeLabel(limit.scope.orgId) ?? undefined,
				tier: asSafeLabel(limit.scope.tier) ?? undefined,
				modelId: asSafeLabel(limit.scope.modelId) ?? undefined,
				windowId: asSafeLabel(limit.scope.windowId) ?? undefined,
			},
		})),
	};
}

function canPinStoredOAuth(authStorage: AuthStorage, provider: string): boolean {
	if (authStorage.hasRuntimeApiKey(provider) || authStorage.hasConfigApiKey(provider)) return false;
	return !getEnvApiKey(provider);
}

function addStoredRows(
	rows: AccountInventoryRow[],
	authStorage: AuthStorage,
	inventory: CredentialInventoryRecord[],
	sessionId: string | undefined,
): void {
	for (const record of inventory) {
		const identityLabel = asSafeLabel(record.identityLabel);
		const usage = storedUsage(authStorage, record);
		const safeUsage = usage ? { ...usage, report: redactUsageReport(usage.report) } : undefined;
		const active = authStorage.getSessionCredentialRowId(record.provider, sessionId) === record.id;
		const canPin =
			record.credentialKind === "oauth" && !record.disabled && canPinStoredOAuth(authStorage, record.provider);
		const canRemove =
			record.credentialKind === "oauth" && typeof authStorage.listCredentialRemovalTargets === "function";
		rows.push({
			id: sourceId(record.provider, "stored", record.id),
			credentialId: record.id,
			provider: record.provider,
			credentialKind: record.credentialKind,
			source: "stored",
			sourceLabel: sourceLabel("stored"),
			identityLabel,
			...(record.credentialKind === "oauth" && identityLabel ? { oauthIdentity: { label: identityLabel } } : {}),
			disabled: record.disabled,
			disabledCause: asSafeLabel(record.disabledCause),
			health: storedHealth(authStorage, record),
			...(safeUsage ? { usage: safeUsage } : {}),
			capabilities: {
				canCheck: true,
				canPin,
				canRemove,
				hasCachedUsage: safeUsage !== undefined,
			},
			routing: {
				active,
				selected: active,
				marker: active ? "active" : "available",
			},
		});
	}
}

function addSyntheticRows(
	rows: AccountInventoryRow[],
	authStorage: AuthStorage,
	providers: Set<string>,
	sessionId: string | undefined,
): void {
	for (const provider of [...providers].sort((a, b) => a.localeCompare(b))) {
		const runtime = authStorage.hasRuntimeApiKey(provider);
		const config = authStorage.hasConfigApiKey(provider);
		const env = Boolean(getEnvApiKey(provider));
		const effectiveType = authStorage.getEffectiveCredentialType(provider, sessionId);

		const add = (source: AccountInventorySource): void => {
			const selected =
				source === "runtime"
					? runtime && effectiveType === "api_key"
					: source === "config"
						? config && effectiveType === "api_key" && !runtime
						: env && effectiveType === "api_key" && !runtime && !config;
			const id = sourceId(provider, source);
			rows.push({
				id,
				provider,
				credentialKind: "api_key",
				source,
				sourceLabel: sourceLabel(source),
				identityLabel: null,
				disabled: false,
				disabledCause: null,
				health: { status: "unknown", reason: null },
				capabilities: {
					canCheck: true,
					canPin: false,
					canRemove: false,
					hasCachedUsage: false,
				},
				routing: {
					active: false,
					selected,
					marker: selected ? "selected" : "available",
				},
			});
		};

		// Keep synthetic rows even when a stored row exists: they represent
		// explicit sources that can shadow stored credentials.
		if (runtime) add("runtime");
		if (config) add("config");
		if (env) add("env");
	}
}

/** Build a redacted, cache-only account snapshot. This function never probes. */
export function buildAccountInventorySnapshot(input: AccountInventoryInput): AccountInventorySnapshot {
	const nowMs = input.nowMs ?? Date.now();
	const inventory = input.authStorage.listCredentialInventory();
	const rows: AccountInventoryRow[] = [];
	addStoredRows(rows, input.authStorage, inventory, input.sessionId);
	addSyntheticRows(rows, input.authStorage, providerSet(input, inventory), input.sessionId);
	rows.sort((left, right) => left.id.localeCompare(right.id));
	return { generatedAt: nowMs, generation: input.authStorage.getGeneration(), rows };
}

/** Short alias used by command/report callers. */
export const buildAccountInventory = buildAccountInventorySnapshot;

function applyStoredCheck(
	rows: AccountInventoryRow[],
	results: CredentialHealthResult[],
): AccountInventoryCheckResult[] {
	const byId = new Map(rows.filter(row => row.credentialId !== undefined).map(row => [row.credentialId!, row]));
	const checked: AccountInventoryCheckResult[] = [];
	for (const result of results) {
		const row = byId.get(result.id);
		if (!row) continue;
		row.health = {
			status: result.ok === true ? "ok" : result.ok === false ? "failed" : "unverifiable",
			reason: asSafeLabel(result.reason),
		};
		if (result.report) {
			row.usage = {
				report: redactUsageReport(result.report),
				fetchedAt: result.report.fetchedAt,
				freshUntil: Date.now(),
				retainUntil: Date.now(),
				freshness: "fresh",
			};
			row.capabilities.hasCachedUsage = true;
		}
		checked.push({
			rowId: row.id,
			provider: row.provider,
			credentialId: row.credentialId,
			ok: result.ok,
			reason: asSafeLabel(result.reason) ?? undefined,
		});
	}
	return checked;
}

/**
 * Run the explicit sequential checker and return a fresh redacted snapshot.
 * AuthStorage.checkCredentials performs stored-row probes sequentially; the
 * synthetic API-key probes below are also intentionally sequential.
 */
export async function checkAccountInventory(input: AccountInventoryInput): Promise<AccountInventorySnapshot> {
	const fullSnapshot = buildAccountInventorySnapshot(input);
	const rows = input.provider ? fullSnapshot.rows.filter(row => row.provider === input.provider) : fullSnapshot.rows;
	const snapshot: AccountInventorySnapshot = { ...fullSnapshot, rows };
	const authStorage = input.authStorage;
	applyStoredCheck(
		rows,
		await authStorage.checkCredentials({
			provider: input.provider,
			baseUrlResolver: provider => input.modelRegistry?.getProviderBaseUrl?.(provider),
		}),
	);
	const syntheticRows = rows.filter(row => row.source !== "stored");
	for (const row of syntheticRows) {
		let key: string | undefined;
		if (row.source === "env") key = getEnvApiKey(row.provider);
		else if (row.source === "runtime" && authStorage.hasRuntimeApiKey(row.provider))
			key = await authStorage.peekApiKey(row.provider);
		else if (
			row.source === "config" &&
			authStorage.hasConfigApiKey(row.provider) &&
			!authStorage.hasRuntimeApiKey(row.provider)
		) {
			key = await authStorage.peekApiKey(row.provider);
		}
		const result = key
			? await authStorage.checkApiKeyCredential(row.provider as Provider, key, {
					baseUrl: input.modelRegistry?.getProviderBaseUrl?.(row.provider),
				})
			: { provider: row.provider, type: "api_key" as const, ok: null, reason: "API-key source is unavailable" };
		row.health = {
			status: result.ok === true ? "ok" : result.ok === false ? "failed" : "unverifiable",
			reason: asSafeLabel(result.reason),
		};
		if (result.report) {
			row.usage = {
				report: redactUsageReport(result.report),
				fetchedAt: result.report.fetchedAt,
				freshUntil: Date.now(),
				retainUntil: Date.now(),
				freshness: "fresh",
			};
			row.capabilities.hasCachedUsage = true;
		}
	}
	return snapshot;
}

export const checkAccountInventorySnapshot = checkAccountInventory;
