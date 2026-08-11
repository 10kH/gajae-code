import type { ExtensionAPI } from "../../src/extensibility/extensions";
import { createNotificationsExtension } from "../../src/sdk/bus";

type NotificationsExtensionOptions = Parameters<typeof createNotificationsExtension>[1];
const TELEGRAM_ORCHESTRATION_ENV_KEYS = [
	"GJC_COORDINATOR_SESSION_ID",
	"GJC_COORDINATOR_SESSION_STATE_FILE",
	"GJC_LIFECYCLE_REQUEST_ID",
	"GJC_SDK_LIFECYCLE_REQUEST",
] as const;

type TelegramOrchestrationEnv = Partial<Record<(typeof TELEGRAM_ORCHESTRATION_ENV_KEYS)[number], string | undefined>>;

function withTelegramOrchestrationEnv<T>(enabled: boolean, run: () => T): T {
	const previous: TelegramOrchestrationEnv = {};
	for (const key of TELEGRAM_ORCHESTRATION_ENV_KEYS) {
		previous[key] = process.env[key];
		if (enabled && key === "GJC_COORDINATOR_SESSION_ID") process.env[key] = "test-telegram-orchestration";
		else delete process.env[key];
	}
	try {
		return run();
	} finally {
		for (const key of TELEGRAM_ORCHESTRATION_ENV_KEYS) {
			const value = previous[key];
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	}
}

export function withTelegramOrchestrationProvenance<T>(run: () => T): T {
	return withTelegramOrchestrationEnv(true, run);
}

export function withoutTelegramOrchestrationProvenance<T>(run: () => T): T {
	return withTelegramOrchestrationEnv(false, run);
}

export function createOrchestrationNotificationsExtension(
	api: ExtensionAPI,
	options: NotificationsExtensionOptions = {},
): void {
	withTelegramOrchestrationProvenance(() => createNotificationsExtension(api, options));
}
