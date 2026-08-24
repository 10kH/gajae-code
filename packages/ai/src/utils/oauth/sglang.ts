/**
 * SGLang login flow.
 *
 * SGLang is commonly self-hosted with an OpenAI-compatible API at a local base URL.
 * Some deployments require a bearer token, others allow unauthenticated access.
 *
 * This flow stores an API-key-style credential used by `/login` and auth storage.
 */

import type { OAuthController, OAuthProvider } from "./types";

const PROVIDER_ID: OAuthProvider = "sglang";
const AUTH_URL = "https://docs.sglang.ai/backend/server_arguments.html";
const DEFAULT_LOCAL_BASE_URL = "http://127.0.0.1:30000/v1";
const DEFAULT_LOCAL_TOKEN = "sglang-local";
/**
 * Login to SGLang.
 *
 * Opens SGLang OpenAI-compatible auth docs, prompts for an optional token,
 * and returns a stored key value.
 */
export async function loginSglang(options: OAuthController): Promise<string> {
	if (!options.onPrompt) {
		throw new Error(`${PROVIDER_ID} login requires onPrompt callback`);
	}
	options.onAuth?.({
		url: AUTH_URL,
		instructions: `Paste your SGLang API key if your server requires auth. Leave empty for local no-auth mode (default base URL: ${DEFAULT_LOCAL_BASE_URL}).`,
	});
	const apiKey = await options.onPrompt({
		message: "Paste your SGLang API key (optional for local no-auth)",
		placeholder: DEFAULT_LOCAL_TOKEN,
		allowEmpty: true,
	});
	if (options.signal?.aborted) {
		throw new Error("Login cancelled");
	}
	const trimmed = apiKey.trim();
	return trimmed || DEFAULT_LOCAL_TOKEN;
}
