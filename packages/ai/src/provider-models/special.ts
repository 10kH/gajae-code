import { once } from "@gajae-code/utils";
import type { ModelManagerOptions } from "../model-manager";
import { buildZCodeSourceHeaders } from "../providers/anthropic";
import { fetchOpenCodexModels, OPENCODEX_MODEL_CACHE_TTL_MS } from "../providers/openai-opencodex-responses";
import { fetchCodexModels } from "../utils/discovery/codex";
import { fetchOpenAICompatibleModels } from "../utils/discovery/openai-compatible";
import { GLM_ZCODE_ANTHROPIC_BASE_URL } from "../utils/oauth/glm-zcode";
import { createBundledReferenceMap } from "./bundled-references";
export function openCodexModelManagerOptions(): ModelManagerOptions<"openai-responses"> {
	return {
		providerId: "opencodex",
		cacheTtlMs: OPENCODEX_MODEL_CACHE_TTL_MS,
		fetchDynamicModels: fetchOpenCodexModels,
	};
}

// ---------------------------------------------------------------------------
// OpenAI code provider
// ---------------------------------------------------------------------------

export interface OpenAICodexModelManagerConfig {
	accessToken?: string;
	accountId?: string;
	clientVersion?: string;
}

export function openaiCodexModelManagerOptions(
	config: OpenAICodexModelManagerConfig = {},
): ModelManagerOptions<"openai-codex-responses"> {
	const { accessToken, accountId, clientVersion } = config;
	return {
		providerId: "openai-codex",
		...(accessToken
			? {
					fetchDynamicModels: async () => {
						const result = await fetchCodexModels({ accessToken, accountId, clientVersion });
						return result?.models ?? null;
					},
				}
			: undefined),
	};
}

// ---------------------------------------------------------------------------
// Cursor
// ---------------------------------------------------------------------------

export interface CursorModelManagerConfig {
	apiKey?: string;
	baseUrl?: string;
	clientVersion?: string;
}

export function cursorModelManagerOptions(config: CursorModelManagerConfig = {}): ModelManagerOptions<"cursor-agent"> {
	const { apiKey, baseUrl, clientVersion } = config;
	return {
		providerId: "cursor",
		...(apiKey
			? {
					fetchDynamicModels: async () => {
						const { fetchCursorUsableModels } = await cursorDiscovery();
						return fetchCursorUsableModels({ apiKey, baseUrl, clientVersion });
					},
				}
			: undefined),
	};
}

const cursorDiscovery = once(() => import("../utils/discovery/cursor"));

// ---------------------------------------------------------------------------
// Zai
// ---------------------------------------------------------------------------

export interface ZaiModelManagerConfig {}

export function zaiModelManagerOptions(_config: ZaiModelManagerConfig = {}): ModelManagerOptions<"anthropic-messages"> {
	return { providerId: "zai" };
}

// ---------------------------------------------------------------------------
// GLM ZCode (unofficial Z.AI OAuth)
// ---------------------------------------------------------------------------

export interface GlmZcodeModelManagerConfig {
	apiKey?: string;
	baseUrl?: string;
}

export function glmZcodeModelManagerOptions(
	config: GlmZcodeModelManagerConfig = {},
): ModelManagerOptions<"anthropic-messages"> {
	const apiKey = config.apiKey;
	const baseUrl = (config.baseUrl ?? GLM_ZCODE_ANTHROPIC_BASE_URL).replace(/\/+$/, "");
	const references = createBundledReferenceMap<"anthropic-messages">("glm-zcode");
	return {
		providerId: "glm-zcode",
		...(apiKey
			? {
					fetchDynamicModels: () =>
						fetchOpenAICompatibleModels({
							api: "anthropic-messages",
							provider: "glm-zcode",
							baseUrl: baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`,
							apiKey,
							headers: {
								...buildZCodeSourceHeaders(),
								"anthropic-version": "2023-06-01",
								"anthropic-dangerous-direct-browser-access": "true",
							},
							mapModel: (entry, defaults) => {
								const reference = references.get(defaults.id);
								if (!reference) return defaults;
								return {
									...reference,
									id: defaults.id,
									name: typeof entry.name === "string" && entry.name.length > 0 ? entry.name : reference.name,
									baseUrl,
									contextWindow: defaults.contextWindow > 0 ? defaults.contextWindow : reference.contextWindow,
									maxTokens: defaults.maxTokens > 0 ? defaults.maxTokens : reference.maxTokens,
								};
							},
						}),
				}
			: undefined),
	};
}
// ---------------------------------------------------------------------------
// JetBrains Junie (JetBrains AI Service, Ingrazzio gateway)
// ---------------------------------------------------------------------------

export interface JetBrainsJunieModelManagerConfig {}

export function jetbrainsJunieModelManagerOptions(
	_config: JetBrainsJunieModelManagerConfig = {},
): ModelManagerOptions<"anthropic-messages"> {
	return { providerId: "jetbrains-junie" };
}

// ---------------------------------------------------------------------------
// Kiro (Amazon Q Developer / CodeWhisperer)
// ---------------------------------------------------------------------------

export interface KiroModelManagerConfig {}

export function kiroModelManagerOptions(
	_config: KiroModelManagerConfig = {},
): ModelManagerOptions<"kiro-codewhisperer-stream"> {
	return { providerId: "kiro" };
}
