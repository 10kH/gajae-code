/**
 * AgentLoop calls `getApiKey(provider)` before `streamFn`.
 * Resolve/stream already use `getApiKey(model)`. If those two lookups diverge,
 * the child dies locally (~8ms, 0 tokens, sanitized "Agent run failed.")
 * and never reaches the working model-scoped path (#5081).
 */
export type SessionApiKeyModel = {
	provider: string;
	baseUrl?: string;
};

export type SessionApiKeyRegistry = {
	getApiKey(model: SessionApiKeyModel, sessionId?: string): Promise<string | undefined>;
	getApiKeyForProvider(provider: string, sessionId?: string, baseUrl?: string): Promise<string | undefined>;
};

export type SessionApiKeyResolution = {
	apiKey: string;
	credentialSessionId: string | undefined;
};

export type SessionApiKeyCredentialType = "api_key" | "oauth" | undefined;

export function assertStableSessionApiKeyCredentialType(
	previous: SessionApiKeyCredentialType,
	replacement: SessionApiKeyCredentialType,
): void {
	if (previous === replacement) return;
	throw Object.assign(new Error("Credential type changed during authentication retry"), {
		code: "provider_unavailable",
	});
}

export function resolveLiveSessionApiKeyModel(
	live: SessionApiKeyModel | undefined,
	captured: SessionApiKeyModel | undefined,
	provider: string,
): SessionApiKeyModel | undefined {
	if (live?.provider === provider) return live;
	if (captured?.provider === provider) return captured;
	return undefined;
}

async function lookupOnce(
	registry: SessionApiKeyRegistry,
	provider: string,
	sessionId: string | undefined,
	model: SessionApiKeyModel | undefined,
): Promise<string | undefined> {
	const matchingModel = model?.provider === provider ? model : undefined;
	let key: string | undefined;
	if (matchingModel) key = await registry.getApiKey(matchingModel, sessionId);
	if (!key) key = await registry.getApiKeyForProvider(provider, sessionId, matchingModel?.baseUrl);
	return key;
}

export async function lookupSessionApiKey(
	registry: SessionApiKeyRegistry,
	provider: string,
	sessionId: string | undefined,
	model: SessionApiKeyModel | undefined,
	allowUnscopedRetry = true,
): Promise<SessionApiKeyResolution> {
	let key = await lookupOnce(registry, provider, sessionId, model);
	// Architect children inherit the parent SID. Direct `-p --no-session` does
	// not. Scoped miss then global/broker hit is the remaining 0-token death
	// after #5105 (jsonl: Agent run failed / output 0).
	if (!key && sessionId && allowUnscopedRetry) {
		key = await lookupOnce(registry, provider, undefined, model);
		if (key) return { apiKey: key, credentialSessionId: undefined };
	}
	if (!key) {
		throw Object.assign(new Error(`No API key found for provider "${provider}"`), {
			code: "provider_unavailable",
		});
	}
	return { apiKey: key, credentialSessionId: sessionId };
}
