import type { ClientCapabilities } from "@agentclientprotocol/sdk";
import { $credentialEnv } from "@gajae-code/utils/env";

export type AcpPermissionMode = "auto" | "prompt" | "always-allow";

const ACP_PERMISSION_MODE_ENV = "GJC_ACP_PERMISSION_MODE";

function parseAcpPermissionMode(value: unknown): AcpPermissionMode {
	if (value === "auto" || value === "prompt" || value === "always-allow") return value;
	return "prompt";
}

/**
 * The default process environment includes the cwd `.env` merge. `$credentialEnv`
 * is unset for that overlay, so a repository cannot select `auto` or `always-allow`.
 * An explicit env map is the caller's value. A trusted source keeps the raw text
 * so surrounding spaces still fail safe to `prompt`.
 */
function permissionModeFromEnv(env: NodeJS.ProcessEnv): unknown {
	const raw = env[ACP_PERMISSION_MODE_ENV];
	if (env !== process.env) return raw;
	if ($credentialEnv(ACP_PERMISSION_MODE_ENV) === undefined) return undefined;
	return raw;
}

/** Client metadata is authoritative; the process environment is only a fallback when that field is absent. */
export function resolveAcpPermissionMode(
	clientCapabilities: ClientCapabilities | undefined,
	env: NodeJS.ProcessEnv = process.env,
): AcpPermissionMode {
	const meta = clientCapabilities?._meta;
	if (typeof meta === "object" && meta !== null) {
		const gjc = (meta as { gjc?: unknown }).gjc;
		if (typeof gjc === "object" && gjc !== null && "permissionHandling" in gjc) {
			return parseAcpPermissionMode((gjc as { permissionHandling?: unknown }).permissionHandling);
		}
	}
	return parseAcpPermissionMode(permissionModeFromEnv(env));
}
