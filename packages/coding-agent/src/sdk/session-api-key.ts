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

export function resolveLiveSessionApiKeyModel(
	live: SessionApiKeyModel | undefined,
	captured: SessionApiKeyModel | undefined,
): SessionApiKeyModel | undefined {
	return live ?? captured;
}

async function lookupOnce(
	registry: SessionApiKeyRegistry,
	provider: string,
	sessionId: string | undefined,
	model: SessionApiKeyModel | undefined,
): Promise<string | undefined> {
	let key: string | undefined;
	if (model && model.provider === provider) key = await registry.getApiKey(model, sessionId);
	if (!key) key = await registry.getApiKeyForProvider(provider, sessionId, model?.baseUrl);
	return key;
}

export async function lookupSessionApiKey(
	registry: SessionApiKeyRegistry,
	provider: string,
	sessionId: string | undefined,
	model: SessionApiKeyModel | undefined,
): Promise<string> {
	let key = await lookupOnce(registry, provider, sessionId, model);
	// Architect children inherit the parent SID. Direct `-p --no-session` does
	// not. Scoped miss then global/broker hit is the remaining 0-token death
	// after #5105 (jsonl: Agent run failed / output 0).
	if (!key && sessionId) key = await lookupOnce(registry, provider, undefined, model);
	if (!key) {
		throw Object.assign(new Error(`No API key found for provider "${provider}"`), {
			code: "provider_unavailable",
		});
	}
	return key;
}
