import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { captureRepositoryBinding } from "../../src/gjc-runtime/repository-binding";
import {
	captureReviewSourceSnapshot,
	createReviewSourceCohort,
	createReviewSourceDispatch,
	normalizeReviewSourceCohorts,
	reconcileReviewSourceDelivery,
} from "../../src/gjc-runtime/ultragoal-review-source";

const roots: string[] = [];

afterEach(async () => {
	await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

async function git(root: string, args: string[]): Promise<void> {
	const proc = Bun.spawn(["git", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
	const exitCode = await proc.exited;
	if (exitCode !== 0) throw new Error(await new Response(proc.stderr).text());
}

async function repository(): Promise<string> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "review-source-"));
	roots.push(root);
	await git(root, ["init", "-b", "dev"]);
	await git(root, ["config", "user.email", "test@example.com"]);
	await git(root, ["config", "user.name", "Test"]);
	await fs.writeFile(path.join(root, "tracked.txt"), "base\n");
	await git(root, ["add", "tracked.txt"]);
	await git(root, ["commit", "-m", "base"]);
	return root;
}

describe("immutable review source snapshots", () => {
	it("changes identity when untracked bytes change at the same path and status", async () => {
		const root = await repository();
		const binding = await captureRepositoryBinding(root);
		await fs.writeFile(path.join(root, "untracked.txt"), "R1\n");
		const first = await captureReviewSourceSnapshot(root, binding);
		await fs.writeFile(path.join(root, "untracked.txt"), "R2\n");
		const second = await captureReviewSourceSnapshot(root, binding);
		expect(second.snapshotId).not.toBe(first.snapshotId);
	});

	it("labels R1 delivery stale after R2/R3 while a same-snapshot delivery stays current", async () => {
		const root = await repository();
		const binding = await captureRepositoryBinding(root);
		await fs.writeFile(path.join(root, "tracked.txt"), "R1\n");
		const r1 = await captureReviewSourceSnapshot(root, binding);
		const cohort = createReviewSourceCohort({
			workflow: "ultragoal",
			generation: 1,
			snapshotId: r1.snapshotId,
			repositoryBindingDigest: r1.repositoryBindingDigest,
			stateRevision: 1,
		});
		const dispatch = createReviewSourceDispatch({
			cohort,
			taskId: "architect-r1",
			lane: "architect",
			rerunCommand: "rerun architect",
		});
		const current = await reconcileReviewSourceDelivery({
			cwd: root,
			repositoryBinding: binding,
			reviewSource: dispatch,
		});
		expect(current.disposition).toBe("current");
		await fs.writeFile(path.join(root, "tracked.txt"), "R2\n");
		await fs.writeFile(path.join(root, "tracked.txt"), "R3\n");
		const late = await reconcileReviewSourceDelivery({
			cwd: root,
			repositoryBinding: binding,
			reviewSource: dispatch,
		});
		expect(late.disposition).toBe("stale_review_delivery");
		expect(late.currentSnapshotId).not.toBe(r1.snapshotId);
	});

	it("rejects malformed persisted cohort state and duplicate lane dispatch", async () => {
		expect(() => normalizeReviewSourceCohorts([{ schema: "wrong" }])).toThrow("malformed reviewCohorts[0]");
		const cohort = createReviewSourceCohort({
			workflow: "ultragoal",
			generation: 1,
			snapshotId: "sha256:snapshot",
			repositoryBindingDigest: "sha256:binding",
			stateRevision: 1,
		});
		cohort.dispatches.push(
			createReviewSourceDispatch({ cohort, taskId: "qa-1", lane: "qa", rerunCommand: "rerun qa" }),
		);
		expect(() =>
			createReviewSourceDispatch({ cohort, taskId: "qa-2", lane: "qa", rerunCommand: "rerun qa" }),
		).toThrow("already dispatched lane qa");
	});
});
