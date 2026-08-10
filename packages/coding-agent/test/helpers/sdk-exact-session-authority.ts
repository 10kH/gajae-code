import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface ExactSessionAuthorityFixture {
	readonly sessionId: string;
	readonly endpointGeneration: number;
	readonly pid: number;
	readonly endpointMtimeMs: number;
	readonly endpoint: {
		readonly sessionId: string;
		readonly pid: number;
		readonly url: string;
		readonly token: string;
	};
}

export interface ExactSessionAuthorityOptions {
	agentDir: string;
	cwd: string;
	sessionId: string;
	url: string;
	token: string;
	endpointGeneration?: number;
}

export async function prepareExactSessionAuthority(
	options: ExactSessionAuthorityOptions,
): Promise<ExactSessionAuthorityFixture> {
	const endpointGeneration = options.endpointGeneration ?? 1;
	const endpointFile = path.join(options.cwd, ".gjc", "state", "sdk", `${options.sessionId}.json`);
	const endpoint = {
		sessionId: options.sessionId,
		pid: process.pid,
		url: options.url,
		token: options.token,
	};
	await Bun.write(endpointFile, `${JSON.stringify({ version: 1, ...endpoint })}\n`);
	return {
		sessionId: options.sessionId,
		endpointGeneration,
		pid: process.pid,
		endpointMtimeMs: (await fs.stat(endpointFile)).mtimeMs,
		endpoint,
	};
}

export async function publishExactSessionAuthority(
	options: ExactSessionAuthorityOptions,
	authority: ExactSessionAuthorityFixture,
): Promise<void> {
	const stateRoot = path.join(options.cwd, ".gjc", "state");
	const child = Bun.spawn([process.execPath, path.join(import.meta.dir, "sdk-exact-session-authority-publish.ts")], {
		env: {
			...process.env,
			GJC_EXACT_SESSION_AUTHORITY: JSON.stringify({
				agentDir: options.agentDir,
				sessionId: authority.sessionId,
				cwd: options.cwd,
				stateRoot,
				endpointGeneration: authority.endpointGeneration,
				pid: authority.pid,
				endpointMtimeMs: authority.endpointMtimeMs,
			}),
		},
		stdout: "ignore",
		stderr: "pipe",
	});
	const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
	if (exitCode !== 0) throw new Error(`Exact session authority publication failed: ${stderr.trim()}`);
}

export async function registerExactSessionAuthority(
	options: ExactSessionAuthorityOptions,
): Promise<ExactSessionAuthorityFixture> {
	const authority = await prepareExactSessionAuthority(options);
	await publishExactSessionAuthority(options, authority);
	return authority;
}
