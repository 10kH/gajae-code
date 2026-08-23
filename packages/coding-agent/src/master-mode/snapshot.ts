import {
	resolveScopeRequest,
	sdkSearchResultV1,
	type ResolvedScopeV1,
	type ScopeNameV1,
	type ScopeRequestV1,
	type SdkSearchResultV1,
	type SdkSearchRowV1,
} from "../sdk/broker/session-scope";
import type { SessionLifecycleActor, SessionListOutcome, SessionListRequest } from "../sdk/lifecycle/service";

export type MasterPeerSnapshot = {
	readonly status: SdkSearchResultV1["status"];
	readonly scope: ResolvedScopeV1;
	readonly observedAt: string;
	readonly indexSeq?: number;
	readonly rows: readonly SdkSearchRowV1[];
};

/** The scoped Broker surface needed for the one-time master peer snapshot. */
export interface MasterPeerSnapshotLifecycle {
	list(request: Omit<SessionListRequest, "operation">): Promise<SessionListOutcome>;
}

export interface CollectMasterPeerSnapshotInput {
	readonly lifecycle: MasterPeerSnapshotLifecycle;
	readonly actor: SessionLifecycleActor;
	readonly ownerSessionId: string;
	readonly scope: ScopeNameV1;
	readonly requestAnchor: ScopeRequestV1["requestAnchor"];
	readonly timeoutMs?: number;
}

function compareText(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Orders by session ID, then the complete canonical locator as a deterministic
 * tie-breaker. The Broker's `live` value is index evidence, not a fresh probe.
 */
function compareRows(left: SdkSearchRowV1, right: SdkSearchRowV1): number {
	const id = compareText(left.id, right.id);
	if (id !== 0) return id;
	const cwd = compareText(left.locator.cwd, right.locator.cwd);
	if (cwd !== 0) return cwd;
	const worktreeRoot = compareText(left.locator.worktreeRoot ?? "", right.locator.worktreeRoot ?? "");
	if (worktreeRoot !== 0) return worktreeRoot;
	return compareText(left.locator.stateRoot, right.locator.stateRoot);
}

function unavailableSnapshot(scope: ResolvedScopeV1): MasterPeerSnapshot {
	return {
		status: "unavailable",
		scope,
		observedAt: new Date().toISOString(),
		rows: [],
	};
}

function matchesResolvedScope(left: ResolvedScopeV1, right: ResolvedScopeV1): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Collects the first-request peer snapshot through scoped Broker session.list.
 * It deliberately has no Router or endpoint-probe dependency.
 */
export async function collectMasterPeerSnapshot(input: CollectMasterPeerSnapshotInput): Promise<MasterPeerSnapshot> {
	const request: ScopeRequestV1 = {
		version: 1,
		requested: input.scope,
		requestAnchor: input.requestAnchor,
	};
	const resolvedScope = await resolveScopeRequest(request);
	const outcome = await input.lifecycle.list({
		actor: input.actor,
		capability: "session.list",
		target: { scope: request },
		...(input.timeoutMs === undefined ? {} : { timeoutMs: input.timeoutMs }),
	});
	const result = sdkSearchResultV1(outcome.result);
	if (!result || !matchesResolvedScope(result.scope, resolvedScope)) return unavailableSnapshot(resolvedScope);
	return {
		status: result.status,
		scope: result.scope,
		observedAt: result.observedAt,
		...(result.indexSeq === undefined ? {} : { indexSeq: result.indexSeq }),
		rows: result.rows.filter(row => row.id !== input.ownerSessionId).sort(compareRows),
	};
}

/** Escapes untrusted metadata before it is placed in fixed prompt framing. */
export function escapeMasterPeerSnapshotText(input: string): string {
	let firstEscapable = -1;
	for (let index = 0; index < input.length; index++) {
		const code = input.charCodeAt(index);
		if (code === 38 || code === 60 || code === 62 || code === 96) {
			firstEscapable = index;
			break;
		}
	}
	if (firstEscapable === -1) return input;

	let output = input.slice(0, firstEscapable);
	for (let index = firstEscapable; index < input.length; index++) {
		const character = input[index];
		if (character === "&") output += "&amp;";
		else if (character === "<") output += "&lt;";
		else if (character === ">") output += "&gt;";
		else if (character === "`") output += "&#96;";
		else output += character;
	}
	return output;
}

function escapeOptionalText(input: string | null): string | null {
	return input === null ? null : escapeMasterPeerSnapshotText(input);
}

function renderedScope(scope: ResolvedScopeV1): ResolvedScopeV1 {
	const resolved =
		scope.resolved === null
			? null
			: scope.resolved.kind === "repo"
				? { kind: "repo" as const, worktreeRoot: escapeMasterPeerSnapshotText(scope.resolved.worktreeRoot) }
				: scope.resolved.kind === "pwd"
					? { kind: "pwd" as const, cwd: escapeMasterPeerSnapshotText(scope.resolved.cwd) }
					: { kind: "global" as const, visibility: escapeMasterPeerSnapshotText(scope.resolved.visibility) };
	return {
		version: scope.version,
		requested: escapeMasterPeerSnapshotText(scope.requested) as ScopeNameV1,
		requestAnchor: {
			cwd: escapeMasterPeerSnapshotText(scope.requestAnchor.cwd),
			worktreeRoot: escapeOptionalText(scope.requestAnchor.worktreeRoot),
		},
		resolved,
		resolution: escapeMasterPeerSnapshotText(scope.resolution) as ResolvedScopeV1["resolution"],
	};
}

function renderedRows(rows: readonly SdkSearchRowV1[]): readonly SdkSearchRowV1[] {
	return rows.map(row => ({
		id: escapeMasterPeerSnapshotText(row.id),
		locator: {
			cwd: escapeMasterPeerSnapshotText(row.locator.cwd),
			worktreeRoot: escapeOptionalText(row.locator.worktreeRoot),
			stateRoot: escapeMasterPeerSnapshotText(row.locator.stateRoot),
		},
		live: row.live,
	}));
}

/** Renders the fixed, escaped prompt block for one master peer observation. */
export function renderMasterPeerSnapshot(snapshot: MasterPeerSnapshot): string {
	const content = {
		scope: renderedScope(snapshot.scope),
		observedAt: escapeMasterPeerSnapshotText(snapshot.observedAt),
		...(snapshot.indexSeq === undefined ? {} : { indexSeq: snapshot.indexSeq }),
		rows: renderedRows(snapshot.rows),
	};
	return `<gjc-master-peer-snapshot>\nstatus: ${escapeMasterPeerSnapshotText(snapshot.status)}\n${JSON.stringify(content)}\n</gjc-master-peer-snapshot>`;
}
