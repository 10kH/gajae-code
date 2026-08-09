import * as fs from "node:fs/promises";
import * as path from "node:path";
import { ensureBroker } from "../broker/ensure";
import { SdkClient } from "../client/client";
import { readSdkBrokerDiscovery } from "../client/discovery";
import { type ListRecentSessionsResult, listRecentSessions, type RecentSessionEntry } from "./recent-sessions";
import {
	type SessionCreateOutcome,
	type SessionLifecycleActor,
	type SessionLifecycleClient,
	type SessionLifecycleClientRequestOptions,
	type SessionLifecycleOperation,
	SessionLifecycleService,
	type SessionResumeOutcome,
} from "./service";

/** SDK-core broker client that keeps broker credentials inside the lifecycle boundary. */
export class AgentDirSessionLifecycleClient implements SessionLifecycleClient {
	readonly #agentDir: string;

	constructor(agentDir: string) {
		this.#agentDir = agentDir;
	}

	async global(
		operation: SessionLifecycleOperation,
		input: Record<string, unknown>,
		options: SessionLifecycleClientRequestOptions,
	): Promise<unknown> {
		await ensureBroker({ agentDir: this.#agentDir });
		const discovery = await readSdkBrokerDiscovery(this.#agentDir);
		if (!discovery) throw new Error("SDK broker discovery is unavailable.");
		const client = await SdkClient.connect(discovery.url, discovery.token, {
			...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
		});
		try {
			return await client.global(operation, input, {
				...(options.idempotencyKey === undefined ? {} : { idempotencyKey: options.idempotencyKey }),
				...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
			});
		} finally {
			await client.close();
		}
	}
}

export type ExternalSessionCreateTarget =
	| { readonly kind: "existing_path"; readonly path: string }
	| { readonly kind: "worktree"; readonly repo: string; readonly branch: string }
	| { readonly kind: "plain_dir"; readonly path: string };

export interface ExternalSessionResumeTarget {
	readonly sessionIdOrPrefix: string;
	readonly path?: string;
}

export type ExternalSessionResumeResult =
	| { readonly kind: "result"; readonly outcome: SessionResumeOutcome }
	| { readonly kind: "not_found" }
	| {
			readonly kind: "ambiguous";
			readonly candidates: readonly { readonly sessionId: string; readonly path?: string }[];
	  }
	| { readonly kind: "unavailable"; readonly message: string };

export class AgentDirSessionLifecycleService extends SessionLifecycleService {
	readonly #agentDir: string;

	constructor(agentDir: string) {
		super(new AgentDirSessionLifecycleClient(agentDir));
		this.#agentDir = agentDir;
	}

	async createExternal(request: {
		readonly actor: SessionLifecycleActor;
		readonly capability: "session.create";
		readonly requestKey: string;
		readonly target: ExternalSessionCreateTarget;
		readonly modelPreset?: string;
		readonly readinessTimeoutMs?: number;
	}): Promise<SessionCreateOutcome> {
		if (request.target.kind === "plain_dir") await fs.mkdir(request.target.path, { recursive: true });
		const cwd = request.target.kind === "worktree" ? request.target.repo : request.target.path;
		return await this.create({
			actor: request.actor,
			capability: request.capability,
			requestKey: request.requestKey,
			target: {
				cwd,
				stateRoot: path.join(path.resolve(cwd), ".gjc", "state"),
				...(request.target.kind === "worktree"
					? { worktree: { enabled: true as const, name: request.target.branch } }
					: {}),
				...(request.modelPreset === undefined ? {} : { modelPreset: request.modelPreset }),
				...(request.readinessTimeoutMs === undefined ? {} : { readinessTimeoutMs: request.readinessTimeoutMs }),
			},
			...(request.readinessTimeoutMs === undefined ? {} : { timeoutMs: request.readinessTimeoutMs + 1_000 }),
		});
	}

	listRecent(input: {
		readonly cwd: string;
		readonly limit?: number;
		readonly includeInternal?: boolean;
		readonly allWorkspaces?: boolean;
	}): Promise<ListRecentSessionsResult> {
		return listRecentSessions({ ...input, agentDir: this.#agentDir });
	}

	async resumeExternal(request: {
		readonly actor: SessionLifecycleActor;
		readonly capability: "session.resume";
		readonly requestKey: string;
		readonly target: ExternalSessionResumeTarget;
		readonly modelPreset?: string;
		readonly readinessTimeoutMs?: number;
	}): Promise<ExternalSessionResumeResult> {
		const recent = await this.listRecent({
			cwd: request.target.path ?? this.#agentDir,
			allWorkspaces: request.target.path === undefined,
			limit: 1_000,
			includeInternal: false,
		});
		if (recent.kind === "error") return { kind: "unavailable", message: recent.message };
		const prefixed = recent.entries.filter(
			entry =>
				entry.sessionId === request.target.sessionIdOrPrefix ||
				entry.sessionId.startsWith(request.target.sessionIdOrPrefix),
		);
		const exact = prefixed.filter(entry => entry.sessionId === request.target.sessionIdOrPrefix);
		const resolved: RecentSessionEntry[] = exact.length > 0 ? exact : prefixed;
		if (resolved.length === 0) return { kind: "not_found" };
		if (resolved.length > 1)
			return {
				kind: "ambiguous",
				candidates: resolved.map(entry => ({
					sessionId: entry.sessionId,
					...(entry.path === undefined ? {} : { path: entry.path }),
				})),
			};
		const selected = resolved[0]!;
		if (!selected.path) return { kind: "unavailable", message: "Saved session workspace is unavailable." };
		const outcome = await this.resume({
			actor: request.actor,
			capability: request.capability,
			requestKey: request.requestKey,
			target: {
				sessionId: selected.sessionId,
				cwd: selected.path,
				stateRoot: path.join(path.resolve(selected.path), ".gjc", "state"),
				sessionPath: selected.sessionStateFile,
				...(request.modelPreset === undefined ? {} : { modelPreset: request.modelPreset }),
				...(request.readinessTimeoutMs === undefined ? {} : { readinessTimeoutMs: request.readinessTimeoutMs }),
			},
			...(request.readinessTimeoutMs === undefined ? {} : { timeoutMs: request.readinessTimeoutMs + 1_000 }),
		});
		return { kind: "result", outcome };
	}
}

export function createSessionLifecycleService(agentDir: string): AgentDirSessionLifecycleService {
	return new AgentDirSessionLifecycleService(agentDir);
}
