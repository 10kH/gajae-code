import type { ExtensionAPI } from "../../../../../packages/coding-agent/src/extensibility/extensions/types";

/**
 * Repository-local opt-in: copy this file to .gjc/hooks/pre/bash.ts in this checkout.
 * Do not install it under ~/.gjc/agent because the enforced PR contract belongs to this repository.
 */
export default function registerPrPreflight(api: ExtensionAPI): void {
	api.on("tool_call", async event => {
		if (event.toolName !== "bash") return;
		const command = event.input.command;
		if (!/(?:^|\s)gh\s+pr\s+create(?:\s|$)/u.test(command)) return;

		const check = Bun.spawn(["bun", "scripts/verify-pr-verdict.ts", "--preflight-command", command], {
			cwd: event.input.cwd ?? process.cwd(),
			stdout: "pipe",
			stderr: "pipe",
		});
		const [stdout, stderr, exitCode] = await Promise.all([
			new Response(check.stdout).text(),
			new Response(check.stderr).text(),
			check.exited,
		]);
		if (exitCode === 0) return;
		return { block: true, reason: `${stderr}${stdout}`.trim() || "PR preflight failed closed without diagnostics." };
	});
}
