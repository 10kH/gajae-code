import * as fs from "node:fs/promises";
import * as path from "node:path";
import { type SessionIndexEvent, sessionIndexChecksum } from "../../src/sdk/broker/session-index";
import { SDK_STATE_VERSION } from "../../src/sdk/broker/state-version";

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
	await fs.mkdir(path.dirname(endpointFile), { recursive: true });
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
	const indexDirectory = path.join(options.agentDir, "sdk", "sessions");
	await fs.mkdir(indexDirectory, { recursive: true });
	const unsigned = {
		type: "host_registered" as const,
		sessionId: authority.sessionId,
		locator: { repo: options.cwd, stateRoot },
		endpointGeneration: authority.endpointGeneration,
		pid: authority.pid,
		endpointMtimeMs: authority.endpointMtimeMs,
		version: SDK_STATE_VERSION,
		indexSeq: 1,
		ts: Date.now(),
	} satisfies Omit<SessionIndexEvent, "checksum">;
	await Bun.write(
		path.join(indexDirectory, "index.jsonl"),
		`${JSON.stringify({ ...unsigned, checksum: sessionIndexChecksum(unsigned) })}\n`,
	);
}
