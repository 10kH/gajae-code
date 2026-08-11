import type { AbortScope } from "../../sdk/host/control/operations";

const ACP_ABORT_SCOPE_ENV = "GJC_ACP_ABORT_SCOPE";

function parseAcpAbortScope(value: unknown): AbortScope {
	if (value === "turn" || value === "owned") return value;
	return "owned";
}

/**
 * Resolves the C04 terminal-abort scope for an ACP `session/cancel`. Client
 * metadata is authoritative; the process environment is only a fallback when
 * that field is absent. Both default to `"owned"` so an external client that
 * ends a turn also stops exact owned subagents and background tasks; a client
 * that wants background work to keep running opts out with
 * `_meta.gjc.abortScope: "turn"` (or `GJC_ACP_ABORT_SCOPE=turn`).
 */
export function resolveAcpAbortScope(meta: unknown, env: NodeJS.ProcessEnv = process.env): AbortScope {
	if (typeof meta === "object" && meta !== null) {
		const gjc = (meta as { gjc?: unknown }).gjc;
		if (typeof gjc === "object" && gjc !== null && "abortScope" in gjc) {
			return parseAcpAbortScope((gjc as { abortScope?: unknown }).abortScope);
		}
	}
	return parseAcpAbortScope(env[ACP_ABORT_SCOPE_ENV]);
}
