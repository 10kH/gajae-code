import { identityEquals, identityKey } from "./lifecycle-reconciliation";
import type { GjcBundleIdentity, GjcRuntimeFinding, GjcRuntimeSnapshot, GjcRuntimeSnapshotState } from "./types";

/**
 * Deterministic numeric activation generation for an activation fingerprint.
 *
 * Equal activation inputs yield an equal generation, so a consumer holding a
 * snapshot can tell whether it still describes the state it is rendering.
 * Derived from the fingerprint's leading hex so it stays inside the safe
 * integer range.
 */
export function gjcActivationGenerationFor(activationFingerprint: string): number {
	const parsed = Number.parseInt(activationFingerprint.slice(0, 13), 16);
	return Number.isSafeInteger(parsed) ? parsed : 0;
}

/**
 * Caller-owned accumulator for scope-qualified runtime evidence.
 *
 * Producers (loaders, adapters, validators) hand findings to an accumulator
 * they were given; they never publish. Exactly one coordinator publishes a
 * complete generation snapshot, and consumers merge it only when the identity
 * and generation match.
 */
export class GjcRuntimeFindingAccumulator {
	private readonly findings: GjcRuntimeFinding[] = [];

	constructor(readonly generation: number) {}

	add(finding: GjcRuntimeFinding): void {
		this.findings.push(finding);
	}

	addAll(findings: readonly GjcRuntimeFinding[]): void {
		for (const finding of findings) this.add(finding);
	}

	/** Sorted, de-duplicated snapshot for the generation this accumulator owns. */
	snapshot(): GjcRuntimeSnapshot {
		const seen = new Set<string>();
		const unique: GjcRuntimeFinding[] = [];
		for (const finding of this.findings) {
			const key = [identityKey(finding.identity), finding.surfaceId, finding.code, finding.message].join("\u0000");
			if (seen.has(key)) continue;
			seen.add(key);
			unique.push(finding);
		}
		unique.sort((a, b) => {
			const ka = `${identityKey(a.identity)}\u0000${a.surfaceId}\u0000${a.code}`;
			const kb = `${identityKey(b.identity)}\u0000${b.surfaceId}\u0000${b.code}`;
			return ka.localeCompare(kb);
		});
		return { generation: this.generation, findings: unique };
	}
}

/** Read-only view of the most recently published complete generation. */
export interface GjcRuntimeSnapshotProvider {
	current(): GjcRuntimeSnapshotState;
}

/**
 * Single-writer publisher. Only the session coordinator constructs this, and it
 * publishes one complete snapshot per activation generation. Replacing or
 * disposing invalidates the previous snapshot immediately.
 */
export class GjcRuntimeSnapshotStore implements GjcRuntimeSnapshotProvider {
	private state: GjcRuntimeSnapshotState = { status: "unavailable" };

	publish(snapshot: GjcRuntimeSnapshot): void {
		this.state = { status: "current", snapshot };
	}

	invalidate(): void {
		this.state = { status: "unavailable" };
	}

	current(): GjcRuntimeSnapshotState {
		return this.state;
	}
}

/**
 * Findings for one bundle, but only when the snapshot is current AND describes
 * the exact generation the consumer is rendering. Missing provider, mismatched
 * generation, or unavailable state resolve to `unavailable` — never to a
 * silently empty "clear" result.
 */
export function findingsForBundle(
	provider: GjcRuntimeSnapshotProvider | undefined,
	identity: GjcBundleIdentity,
	expectedGeneration: number,
): { status: "unavailable" } | { status: "current"; findings: GjcRuntimeFinding[] } {
	if (!provider) return { status: "unavailable" };
	const state = provider.current();
	if (state.status !== "current") return { status: "unavailable" };
	if (state.snapshot.generation !== expectedGeneration) return { status: "unavailable" };
	return {
		status: "current",
		findings: state.snapshot.findings.filter(f => identityEquals(f.identity, identity)),
	};
}
