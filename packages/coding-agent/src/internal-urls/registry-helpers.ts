/**
 * Shared helpers for internal-url protocol handlers that resolve session-scoped
 * artifact IDs.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { openRecoveryFsRoot, type RecoveryFsRoot } from "@gajae-code/natives";
import type { ResolveContext } from "./types";

function addDir(dirs: string[], dir: string | null | undefined): void {
	if (!dir) return;
	const normalized = path.resolve(dir);
	if (!dirs.includes(normalized)) dirs.push(normalized);
}

/**
 * Snapshot of artifacts dirs explicitly authorized for the calling session.
 *
 * Normal reads are scoped to the caller's artifacts directory. Parent/child
 * agent tree sharing is allowed only when the caller supplies explicit
 * authorized directories at the ResolveContext boundary. This intentionally
 * does not enumerate AgentRegistry.global(); live but unrelated sessions are
 * not an authorization source.
 */
export function authorizedArtifactsDirsFromContext(context?: ResolveContext): string[] {
	const dirs: string[] = [];
	addDir(dirs, context?.getArtifactsDir?.());
	for (const dir of context?.getAuthorizedArtifactsDirs?.() ?? []) addDir(dirs, dir);
	return dirs;
}

export interface AuthorizedArtifactsRoot {
	readonly directory: string;
	readonly dev: bigint;
	readonly ino: bigint;
	readonly authority: RecoveryFsRoot;
}

export interface AuthorizedArtifactSnapshot {
	bytes: Buffer;
	size: number;
}

export function openAuthorizedArtifactsRoot(directory: string): AuthorizedArtifactsRoot {
	if (process.platform !== "linux") throw new Error("artifact_authority_unavailable");
	const named = fs.lstatSync(directory, { bigint: true });
	if (!named.isDirectory() || named.isSymbolicLink()) throw new Error("unsafe_artifacts_root");
	const authority = openRecoveryFsRoot(directory);
	const retained = authority.identity();
	if (
		!retained.ok ||
		!retained.identity ||
		retained.identity.dev !== named.dev.toString() ||
		retained.identity.ino !== named.ino.toString()
	) {
		authority.close();
		throw new Error("unsafe_artifacts_root");
	}
	return { directory, dev: named.dev, ino: named.ino, authority };
}

export function closeAuthorizedArtifactsRoot(root: AuthorizedArtifactsRoot): void {
	root.authority.close();
}

export function readAuthorizedArtifactFile(
	root: AuthorizedArtifactsRoot,
	filename: string,
	maxBytes: number,
): AuthorizedArtifactSnapshot | null {
	if (
		path.basename(filename) !== filename ||
		!Number.isSafeInteger(maxBytes) ||
		maxBytes < 0 ||
		maxBytes > 16 * 1024 * 1024
	) {
		throw new Error("unsafe_artifact_leaf");
	}
	if (!root.authority) throw new Error("artifact_authority_unavailable");
	const captured = root.authority.read(filename, maxBytes);
	if (!captured.ok) {
		if (captured.code === "not_found") return null;
		throw new Error(`unsafe_artifact_leaf:${captured.code ?? "capture_failed"}`);
	}
	if (!captured.data || !captured.identity) throw new Error("unsafe_artifact_leaf:missing_evidence");
	const size = Number(captured.identity.size);
	if (!Number.isSafeInteger(size) || size < 0) throw new Error("unsafe_artifact_leaf:invalid_size");
	return { bytes: Buffer.from(captured.data), size };
}
