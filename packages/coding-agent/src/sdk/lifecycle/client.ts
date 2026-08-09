import * as fs from "node:fs/promises";
import * as path from "node:path";
import { logger } from "@gajae-code/utils";
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
	validateSessionLifecycleMutationRequest,
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
		let result: unknown;
		try {
			result = await client.global(operation, input, {
				...(options.idempotencyKey === undefined ? {} : { idempotencyKey: options.idempotencyKey }),
				...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
			});
		} finally {
			try {
				await client.close();
			} catch (error) {
				logger.warn("SDK lifecycle client cleanup failed", {
					operation,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		return result;
	}
}

export type ExternalSessionCreateTarget =
	| { readonly kind: "existing_path"; readonly path: string }
	| { readonly kind: "worktree"; readonly repo: string; readonly branch: string }
	| { readonly kind: "plain_dir"; readonly path: string };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

const EXTERNAL_SESSION_PREFIX_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

function validExternalSessionCreateTarget(value: unknown): value is ExternalSessionCreateTarget {
	if (!isRecord(value) || typeof value.kind !== "string") return false;
	if (value.kind === "plain_dir" || value.kind === "existing_path")
		return typeof value.path === "string" && value.path.length > 0;
	return (
		value.kind === "worktree" &&
		typeof value.repo === "string" &&
		value.repo.length > 0 &&
		typeof value.branch === "string" &&
		value.branch.length > 0
	);
}

function invalidExternalCreate(message: string): SessionCreateOutcome {
	return {
		ok: false,
		operation: "session.create",
		certainty: "terminal",
		error: { code: "invalid_request", message },
	};
}

export interface ExternalSessionResumeTarget {
	readonly sessionIdOrPrefix: string;
	readonly path?: string;
}

function validExternalSessionResumeTarget(value: unknown): value is ExternalSessionResumeTarget {
	return (
		isRecord(value) &&
		typeof value.sessionIdOrPrefix === "string" &&
		EXTERNAL_SESSION_PREFIX_PATTERN.test(value.sessionIdOrPrefix) &&
		(value.path === undefined || (typeof value.path === "string" && value.path.length > 0))
	);
}

function invalidExternalResume(message: string): ExternalSessionResumeResult {
	return { kind: "unavailable", message };
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
		const rawRequest: Record<string, unknown> = isRecord(request) ? request : {};
		const targetInput = rawRequest.target;
		if (!validExternalSessionCreateTarget(targetInput))
			return invalidExternalCreate("target must be a valid external create target");
		const modelPreset = rawRequest.modelPreset;
		if (modelPreset !== undefined && typeof modelPreset !== "string")
			return invalidExternalCreate("modelPreset must be a string");
		const readinessTimeoutMs = rawRequest.readinessTimeoutMs;
		if (
			readinessTimeoutMs !== undefined &&
			(typeof readinessTimeoutMs !== "number" || !Number.isFinite(readinessTimeoutMs))
		)
			return invalidExternalCreate("readinessTimeoutMs must be a finite number");

		const cwd = targetInput.kind === "worktree" ? targetInput.repo : targetInput.path;
		const target = {
			cwd,
			stateRoot: path.join(path.resolve(cwd), ".gjc", "state"),
			...(targetInput.kind === "worktree" ? { worktree: { enabled: true as const, name: targetInput.branch } } : {}),
			...(modelPreset === undefined ? {} : { modelPreset }),
			...(readinessTimeoutMs === undefined ? {} : { readinessTimeoutMs }),
		};
		const validation = validateSessionLifecycleMutationRequest({
			operation: "session.create",
			actor: rawRequest.actor,
			capability: rawRequest.capability,
			requestKey: rawRequest.requestKey,
			target,
		});
		if (!validation.ok) return validation as SessionCreateOutcome;
		if (targetInput.kind === "plain_dir") await fs.mkdir(targetInput.path, { recursive: true });
		return await this.create({
			actor: validation.actor,
			capability: "session.create",
			requestKey: validation.requestKey,
			target,
			...(readinessTimeoutMs === undefined ? {} : { timeoutMs: readinessTimeoutMs + 1_000 }),
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
		const rawRequest: Record<string, unknown> = isRecord(request) ? request : {};
		const targetInput = rawRequest.target;
		if (!validExternalSessionResumeTarget(targetInput))
			return invalidExternalResume("resume target requires a safe session id or prefix");
		const validation = validateSessionLifecycleMutationRequest({
			operation: "session.resume",
			actor: rawRequest.actor,
			capability: rawRequest.capability,
			requestKey: rawRequest.requestKey,
			target: { sessionId: targetInput.sessionIdOrPrefix, ...(targetInput.path ? { cwd: targetInput.path } : {}) },
		});
		if (!validation.ok) return invalidExternalResume(validation.error.message);
		const recent = await this.listRecent({
			cwd: targetInput.path ?? this.#agentDir,
			allWorkspaces: targetInput.path === undefined,
			limit: 1_000,
			includeInternal: false,
		});
		if (recent.kind === "error") return { kind: "unavailable", message: recent.message };
		const prefixed = recent.entries.filter(
			entry =>
				entry.sessionId === targetInput.sessionIdOrPrefix ||
				entry.sessionId.startsWith(targetInput.sessionIdOrPrefix),
		);
		const exact = prefixed.filter(entry => entry.sessionId === targetInput.sessionIdOrPrefix);
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
			actor: validation.actor,
			capability: "session.resume",
			requestKey: validation.requestKey,
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
