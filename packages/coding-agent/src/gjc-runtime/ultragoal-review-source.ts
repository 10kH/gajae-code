import { createHash, randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { RepositoryBinding } from "./repository-binding";
import { publicRepositoryBinding } from "./repository-binding";

async function spawnText(
	command: string[],
	options: { cwd: string; timeoutMs?: number },
): Promise<{ ok: boolean; stdout: string; stderr: string }> {
	try {
		const proc = Bun.spawn(command, { cwd: options.cwd, stdout: "pipe", stderr: "pipe" });
		const timeout = setTimeout(() => proc.kill(), options.timeoutMs ?? 5000);
		const [stdout, stderr, exitCode] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
			proc.exited,
		]);
		clearTimeout(timeout);
		return { ok: exitCode === 0, stdout, stderr };
	} catch (error) {
		return { ok: false, stdout: "", stderr: error instanceof Error ? error.message : String(error) };
	}
}

async function resolveGitBase(cwd: string): Promise<string> {
	for (const candidate of ["origin/dev", "dev", "origin/main", "main", "master"]) {
		const exists = await spawnText(["git", "rev-parse", "--verify", candidate], { cwd, timeoutMs: 3000 });
		if (exists.ok) return candidate;
	}
	throw new Error("unable to resolve an authoritative integration base");
}
export const REVIEW_SOURCE_COHORT_SCHEMA = "gjc.review_source_cohort.v1" as const;

export type ReviewSourceWorkflow = "ultragoal" | "ralplan";
export type ReviewSourceLane = "cleaner" | "architect" | "qa" | "critic";
export type ReviewDeliveryDisposition = "current" | "stale_review_delivery" | "invalid_provenance";

export interface ReviewSourceDispatch {
	schema: "gjc.review_source_dispatch.v1";
	cohortId: string;
	generation: number;

	dispatchId: string;
	taskId: string;
	lane: ReviewSourceLane;
	snapshotId: string;
	repositoryBindingDigest: string;
	stateRevision: number;
	rerunCommand: string;
	createdAt: string;
}

export interface ReviewSourceDelivery {
	deliveryId: string;
	taskId: string;
	lane: ReviewSourceLane;
	snapshotId: string;
	disposition: ReviewDeliveryDisposition;
	receivedAt: string;
	rerunCommand?: string;
}

export interface ReviewSourceCohort {
	schema: typeof REVIEW_SOURCE_COHORT_SCHEMA;
	cohortId: string;
	workflow: ReviewSourceWorkflow;
	generation: number;
	snapshotId: string;
	repositoryBindingDigest: string;
	stateRevision: number;
	createdAt: string;
	status: "active" | "superseded";
	supersededBy?: string;
	dispatches: ReviewSourceDispatch[];

	deliveries: ReviewSourceDelivery[];
}

interface CapturedReviewSource {
	snapshotId: string;
	repositoryBindingDigest: string;
}

function hashBytes(value: string | Uint8Array): string {
	return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
	if (value && typeof value === "object") {
		return `{${Object.entries(value as Record<string, unknown>)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

async function untrackedCommitments(
	cwd: string,
): Promise<Array<{ path: string; mode: number; kind: string; digest: string }>> {
	const listed = await spawnText(["git", "ls-files", "--others", "--exclude-standard", "-z"], {
		cwd,
		timeoutMs: 5000,
	});
	if (!listed.ok) throw new Error(`review source capture failed to list untracked files: ${listed.stderr}`);
	const rows: Array<{ path: string; mode: number; kind: string; digest: string }> = [];
	for (const relativePath of listed.stdout.split("\0").filter(Boolean).sort()) {
		const absolutePath = path.resolve(cwd, relativePath);
		const stat = await fs.lstat(absolutePath);
		if (stat.isSymbolicLink()) {
			rows.push({
				path: relativePath,
				mode: stat.mode,
				kind: "symlink",
				digest: hashBytes(await fs.readlink(absolutePath)),
			});
			continue;
		}
		if (!stat.isFile())
			throw new Error(`review source capture does not support untracked non-file path: ${relativePath}`);
		rows.push({
			path: relativePath,
			mode: stat.mode,
			kind: "file",
			digest: hashBytes(await fs.readFile(absolutePath)),
		});
	}
	return rows;
}

async function captureOnce(cwd: string, repositoryBinding: RepositoryBinding): Promise<CapturedReviewSource> {
	const baseRef = await resolveGitBase(cwd);
	const mergeBase = await spawnText(["git", "merge-base", "HEAD", baseRef], { cwd, timeoutMs: 5000 });
	const head = await spawnText(["git", "rev-parse", "HEAD"], { cwd, timeoutMs: 5000 });
	const indexTree = await spawnText(["git", "write-tree"], { cwd, timeoutMs: 5000 });
	if (!mergeBase.ok || !head.ok || !indexTree.ok)
		throw new Error("review source capture could not resolve git authority");
	const diff = await spawnText(["git", "diff", "--binary", "--no-ext-diff", mergeBase.stdout.trim()], {
		cwd,
		timeoutMs: 15000,
	});
	if (!diff.ok) throw new Error(`review source capture failed to read canonical diff: ${diff.stderr}`);
	const binding = publicRepositoryBinding(repositoryBinding);
	const repositoryBindingDigest = `sha256:${hashBytes(stableJson(binding))}`;
	const payload = {
		schema: "gjc.review_source_snapshot.v1",
		repositoryBindingDigest,
		mergeBase: mergeBase.stdout.trim(),
		head: head.stdout.trim(),
		indexTree: indexTree.stdout.trim(),
		binaryDiffSha256: hashBytes(diff.stdout),
		untracked: await untrackedCommitments(cwd),
	};
	return { snapshotId: `sha256:${hashBytes(stableJson(payload))}`, repositoryBindingDigest };
}

export async function captureReviewSourceSnapshot(
	cwd: string,
	repositoryBinding: RepositoryBinding,
): Promise<CapturedReviewSource> {
	const first = await captureOnce(cwd, repositoryBinding);
	const second = await captureOnce(cwd, repositoryBinding);
	if (first.snapshotId !== second.snapshotId) {
		throw new Error("review_source_capture_raced: repository source changed during canonical capture; rerun freeze");
	}
	return first;
}

export function createReviewSourceCohort(input: {
	workflow: ReviewSourceWorkflow;
	generation: number;
	snapshotId: string;
	repositoryBindingDigest: string;
	stateRevision: number;
	now?: string;
}): ReviewSourceCohort {
	return {
		schema: REVIEW_SOURCE_COHORT_SCHEMA,
		cohortId: randomUUID(),
		workflow: input.workflow,
		generation: input.generation,
		snapshotId: input.snapshotId,
		repositoryBindingDigest: input.repositoryBindingDigest,
		stateRevision: input.stateRevision,
		createdAt: input.now ?? new Date().toISOString(),
		status: "active",
		dispatches: [],

		deliveries: [],
	};
}

export function createReviewSourceDispatch(input: {
	cohort: ReviewSourceCohort;
	taskId: string;
	lane: ReviewSourceLane;
	rerunCommand: string;
	now?: string;
}): ReviewSourceDispatch {
	if (input.cohort.status !== "active") throw new Error("cannot dispatch a superseded review source cohort");
	if (input.cohort.dispatches.some(dispatch => dispatch.lane === input.lane)) {
		throw new Error(`review source cohort already dispatched lane ${input.lane}`);
	}
	return {
		schema: "gjc.review_source_dispatch.v1",
		cohortId: input.cohort.cohortId,
		generation: input.cohort.generation,
		dispatchId: randomUUID(),
		taskId: input.taskId,
		lane: input.lane,
		snapshotId: input.cohort.snapshotId,
		repositoryBindingDigest: input.cohort.repositoryBindingDigest,
		stateRevision: input.cohort.stateRevision,
		rerunCommand: input.rerunCommand,
		createdAt: input.now ?? new Date().toISOString(),
	};
}

export function normalizeReviewSourceCohorts(value: unknown): ReviewSourceCohort[] {
	if (value === undefined) return [];
	if (!Array.isArray(value)) throw new Error("Invalid ultragoal plan: reviewCohorts must be an array");
	return value.map((item, index) => {
		if (!item || typeof item !== "object" || Array.isArray(item)) {
			throw new Error(`Invalid ultragoal plan: reviewCohorts[${index}] must be an object`);
		}
		const record = item as Record<string, unknown>;
		if (
			record.schema !== REVIEW_SOURCE_COHORT_SCHEMA ||
			typeof record.cohortId !== "string" ||
			(record.workflow !== "ultragoal" && record.workflow !== "ralplan") ||
			typeof record.generation !== "number" ||
			!Number.isInteger(record.generation) ||
			record.generation < 1 ||
			typeof record.snapshotId !== "string" ||
			!record.snapshotId.startsWith("sha256:") ||
			typeof record.repositoryBindingDigest !== "string" ||
			!record.repositoryBindingDigest.startsWith("sha256:") ||
			typeof record.stateRevision !== "number" ||
			!Number.isInteger(record.stateRevision) ||
			typeof record.createdAt !== "string" ||
			(record.status !== "active" && record.status !== "superseded") ||
			!Array.isArray(record.dispatches) ||
			!Array.isArray(record.deliveries)
		) {
			throw new Error(`Invalid ultragoal plan: malformed reviewCohorts[${index}]`);
		}
		return record as unknown as ReviewSourceCohort;
	});
}

export async function reconcileReviewSourceDelivery(input: {
	cwd: string;
	repositoryBinding: RepositoryBinding;
	reviewSource: {
		schema: "gjc.review_source_dispatch.v1";
		cohortId: string;
		generation: number;
		lane: ReviewSourceLane;
		snapshotId: string;
		repositoryBindingDigest: string;
		stateRevision: number;
		dispatchId: string;
		rerunCommand: string;
	};
}): Promise<{
	disposition: ReviewDeliveryDisposition;
	currentSnapshotId?: string;
}> {
	const current = await captureReviewSourceSnapshot(input.cwd, input.repositoryBinding);
	if (current.repositoryBindingDigest !== input.reviewSource.repositoryBindingDigest) {
		return { disposition: "invalid_provenance", currentSnapshotId: current.snapshotId };
	}
	if (current.snapshotId !== input.reviewSource.snapshotId) {
		return { disposition: "stale_review_delivery", currentSnapshotId: current.snapshotId };
	}
	return { disposition: "current", currentSnapshotId: current.snapshotId };
}
