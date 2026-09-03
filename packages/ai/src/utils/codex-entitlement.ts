/**
 * Model entitlement facts shared by Codex credential selection and provider
 * error presentation.
 *
 * GPT-5.6 Sol is a Pro-tier ChatGPT Codex model. The usage endpoint is the
 * authority for the account tier; this module only names the model policy and
 * keeps the provider's deterministic rejection wording in one place.
 */

export function requiresOpenAICodexProModel(provider: string, modelId: string | undefined): boolean {
	return (
		provider === "openai-codex" &&
		typeof modelId === "string" &&
		(modelId.toLowerCase().includes("-spark") || modelId.toLowerCase() === "gpt-5.6-sol")
	);
}

export function requiresStrictOpenAICodexProModel(provider: string, modelId: string | undefined): boolean {
	return provider === "openai-codex" && modelId?.toLowerCase() === "gpt-5.6-sol";
}

export function isOpenAICodexChatGPTEntitlementError(message: string | undefined, code?: string): boolean {
	return (
		/\bnot supported when using codex with a chatgpt account\b/i.test(message ?? "") &&
		(code === undefined || code.toLowerCase() === "invalid_request_error")
	);
}

export function formatOpenAICodexChatGPTEntitlementError(modelId: string | undefined): string {
	const safeModelId = modelId
		?.replace(/[\x00-\x1f\x7f-\x9f]+/gu, " ")
		.trim()
		.slice(0, 128);
	const model = safeModelId ? ` model "${safeModelId}"` : " model";
	return `This ChatGPT Codex account cannot use${model}. Select a model available to this ChatGPT account, such as "gpt-5.5", or use an API-key credential that supports the model.`;
}
