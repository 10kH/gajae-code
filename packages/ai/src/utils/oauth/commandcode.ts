import { createApiKeyLogin } from "./api-key-login";

export const loginCommandCode = createApiKeyLogin({
	providerLabel: "Command Code GOAT",
	authUrl: "https://commandcode.ai/studio/#api-keys",
	instructions: "Create or copy your Command Code API key",
	promptMessage: "Paste your Command Code API key",
	placeholder: "cmd-...",
	validationProgressMessage: "Checking Command Code model catalog...",
	validation: {
		kind: "models-endpoint",
		provider: "Command Code GOAT",
		modelsUrl: "https://api.commandcode.ai/provider/v1/models",
	},
});
