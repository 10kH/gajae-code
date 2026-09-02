/**
 * Steer-triggered bash fold.
 *
 * A queued user steer folds a running foreground bash call into a background
 * job once the command has run for STEER_FOLD_GRACE_MS, mirroring the way a
 * queued steer ends a subagent await. The five parity points:
 *  1. steer after the grace window -> fold with a `steer` reason line, the job
 *     keeps running and its completion is delivered later;
 *  2. steer inside the grace window -> no fold, the command finishes normally;
 *  3. (loop-owned) remaining tools in the batch are skipped — covered by the
 *     agent loop's existing steer tests; here we assert the fold does not arm
 *     the turn-ending fence/stop, so the SAME run consumes the steer;
 *  4. abort still aborts (a steer never kills the command);
 *  5. busyPromptMode=queue / interruptMode=wait -> no fold.
 * Plus the manager-level contract every fold path relies on: `foldReason` on
 * the job/snapshot and exactly one `onFold` notification per fold.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { AgentToolContext } from "@gajae-code/agent-core";
import { AsyncJobManager, type FoldReason, type JobFoldEvent } from "@gajae-code/coding-agent/async";
import { Settings } from "@gajae-code/coding-agent/config/settings";
import { type FoldAdapter, FoldCoordinator } from "@gajae-code/coding-agent/session/fold-coordinator";
import type { ToolSession } from "@gajae-code/coding-agent/tools";
import { BashTool, STEER_FOLD_GRACE_MS, steerFoldReasonLine } from "@gajae-code/coding-agent/tools/bash";
import { Snowflake } from "@gajae-code/utils";

/** A tool context that marks the call as owned by a live Agent turn (originatingTurn=true). */
function turnContext(): AgentToolContext {
	return {
		attemptScope: { attemptId: "attempt-1", generation: 1, lineage: "main" },
	} as unknown as AgentToolContext;
}

function textOf(result: { content: Array<{ type: string; text?: string }> }): string {
	return result.content
		.filter(block => block.type === "text")
		.map(block => block.text ?? "")
		.join("\n");
}

interface SteerHarness {
	session: ToolSession;
	coordinator: FoldCoordinator;
	manager: AsyncJobManager;
	/** Queue a steer: resolves every pending waitForUserSteering. */
	steer: () => void;
	fenceArmed: () => boolean;
	stopRequested: () => boolean;
	folds: JobFoldEvent[];
}

function createHarness(
	cwd: string,
	options: { busyPromptMode?: "steer" | "queue"; interruptMode?: "immediate" | "wait" } = {},
): SteerHarness {
	const manager = new AsyncJobManager({ onJobComplete: async () => {} });
	AsyncJobManager.setInstance(manager);
	let fenceArmed = false;
	let stopRequested = false;
	const coordinator = new FoldCoordinator({
		hasActiveTurn: () => true,
		armSteeringFence: () => {
			fenceArmed = true;
			return () => {
				fenceArmed = false;
			};
		},
		requestStop: () => {
			stopRequested = true;
		},
		captureRemainingIntent: () => undefined,
		deliverParked: () => {},
	});
	const steerWaiters = new Set<() => void>();
	let steerQueued = false;
	const folds: JobFoldEvent[] = [];
	manager.onFold(event => folds.push(event));
	const sessionDir = path.join(cwd, "session");
	let artifactCounter = 0;
	const session: ToolSession = {
		cwd,
		hasUI: false,
		settings: Settings.isolated({
			"bash.autoBackground.enabled": false,
			busyPromptMode: options.busyPromptMode ?? "steer",
		}),
		getSessionFile: () => path.join(cwd, "session.jsonl"),
		getSessionSpawns: () => "*",
		getSessionId: () => "steer-fold-session",
		getArtifactsDir: () => sessionDir,
		allocateOutputArtifact: async (toolType: string) => {
			fs.mkdirSync(sessionDir, { recursive: true });
			const id = `artifact-${++artifactCounter}`;
			return { id, path: path.join(sessionDir, `${id}.${toolType}.log`) };
		},
		getAsyncJobManager: () => manager,
		registerForegroundFoldParticipant: adapter => coordinator.registerParticipant(adapter),
		hasForegroundBashBackgroundRequestHandler: () => coordinator.hasFoldableParticipant(),
		requestForegroundBashBackground: async (reason?: FoldReason, adapter?: FoldAdapter) =>
			(await coordinator.requestFold(adapter, reason)).status === "folded",
		getInterruptMode: () => options.interruptMode ?? "immediate",
		waitForUserSteering: signal => {
			if (steerQueued || signal.aborted) return Promise.resolve();
			const { promise, resolve } = Promise.withResolvers<void>();
			const settle = () => {
				steerWaiters.delete(settle);
				resolve();
			};
			steerWaiters.add(settle);
			signal.addEventListener("abort", settle, { once: true });
			return promise;
		},
	};
	return {
		session,
		coordinator,
		manager,
		steer: () => {
			steerQueued = true;
			for (const settle of [...steerWaiters]) settle();
		},
		fenceArmed: () => fenceArmed,
		stopRequested: () => stopRequested,
		folds,
	};
}

describe("steer-triggered bash fold", () => {
	let cwd = "";
	let harness: SteerHarness | undefined;

	beforeEach(() => {
		cwd = path.join(os.tmpdir(), `bash-steer-fold-${Snowflake.next()}`);
		fs.mkdirSync(cwd, { recursive: true });
	});

	afterEach(async () => {
		await harness?.manager.dispose();
		harness = undefined;
		AsyncJobManager.resetForTests();
		fs.rmSync(cwd, { recursive: true, force: true });
	});

	it("exports the fixed grace window", () => {
		expect(STEER_FOLD_GRACE_MS).toBe(2_000);
	});

	it("parity 1: a steer after the grace window folds the managed wait with a steer reason line and keeps the job running", async () => {
		harness = createHarness(cwd);
		const tool = new BashTool(harness.session);
		const startedAt = Date.now();
		const resultPromise = tool.execute(
			"steer-fold-1",
			{ command: "printf 'start\\n'; sleep 3; printf 'done\\n'", timeout: 30 },
			undefined,
			undefined,
			turnContext(),
		);
		// Wait past the grace window so the fold fires immediately on steer.
		await Bun.sleep(STEER_FOLD_GRACE_MS + 100);
		harness.steer();
		const result = await resultPromise;
		const elapsed = Date.now() - startedAt;
		expect(elapsed).toBeLessThan(2_900);

		const jobId = result.details?.async?.jobId;
		if (!jobId) throw new Error("expected a background job id");
		expect(result.details?.async?.state).toBe("running");
		expect(result.details?.foldReason).toBe("steer");
		const text = textOf(result);
		expect(text).toContain(`Background job ${jobId} started`);
		expect(text).toContain(steerFoldReasonLine(jobId));
		expect(text).toContain("start");

		const job = harness.manager.getJob(jobId);
		expect(job?.status).toBe("running");
		expect(job?.metadata?.backgrounded).toBe(true);
		expect(job?.metadata?.foldReason).toBe("steer");
		const snapshot = harness.manager.getJobsSnapshot().jobs.find(entry => entry.id === jobId);
		expect(snapshot?.backgrounded).toBe(true);
		expect(snapshot?.foldReason).toBe("steer");
		expect(harness.folds).toEqual([{ jobId, generation: job!.generation, reason: "steer" }]);

		// Parity 3 precondition: the same run consumes the steer. A steer fold
		// must neither fence steering admission nor arm the cooperative stop.
		expect(harness.fenceArmed()).toBe(false);
		expect(harness.stopRequested()).toBe(false);

		await job?.promise;
		expect(harness.manager.getJob(jobId)?.status).toBe("completed");
	});

	it("parity 1: a steer queued inside the grace window folds once the window elapses", async () => {
		harness = createHarness(cwd);
		const tool = new BashTool(harness.session);
		const startedAt = Date.now();
		const resultPromise = tool.execute("steer-fold-early", {
			command: "sleep 4; printf 'done\\n'",
			timeout: 30,
		});
		await Bun.sleep(200);
		harness.steer();
		const result = await resultPromise;
		const elapsed = Date.now() - startedAt;
		expect(elapsed).toBeGreaterThanOrEqual(STEER_FOLD_GRACE_MS);
		expect(elapsed).toBeLessThan(3_500);
		expect(result.details?.foldReason).toBe("steer");
		await harness.manager.getJob(result.details!.async!.jobId)?.promise;
	});

	it("parity 2: a command that finishes inside the grace window is never folded", async () => {
		harness = createHarness(cwd);
		const tool = new BashTool(harness.session);
		const resultPromise = tool.execute("steer-no-fold-short", { command: "printf 'quick\\n'", timeout: 30 });
		harness.steer();
		const result = await resultPromise;
		expect(result.details?.async).toBeUndefined();
		expect(result.details?.foldReason).toBeUndefined();
		expect(textOf(result)).toContain("quick");
		expect(harness.folds).toHaveLength(0);
	});

	it("parity 4: an abort still kills the command and never becomes a fold", async () => {
		harness = createHarness(cwd);
		const tool = new BashTool(harness.session);
		const abort = new AbortController();
		const resultPromise = tool.execute("steer-abort", { command: "sleep 30", timeout: 60 }, abort.signal);
		await Bun.sleep(100);
		harness.steer();
		abort.abort();
		await expect(resultPromise).rejects.toThrow();
		expect(harness.folds).toHaveLength(0);
		expect(harness.manager.getRunningJobs()).toHaveLength(0);
	});

	it("parity 5: busyPromptMode=queue never folds on steer", async () => {
		harness = createHarness(cwd, { busyPromptMode: "queue" });
		const tool = new BashTool(harness.session);
		const resultPromise = tool.execute("steer-gate-queue", { command: "sleep 2.4; printf 'done\\n'", timeout: 30 });
		await Bun.sleep(STEER_FOLD_GRACE_MS + 100);
		harness.steer();
		const result = await resultPromise;
		expect(result.details?.async).toBeUndefined();
		expect(textOf(result)).toContain("done");
		expect(harness.folds).toHaveLength(0);
	});

	it("parity 5: interruptMode=wait never folds on steer", async () => {
		harness = createHarness(cwd, { interruptMode: "wait" });
		const tool = new BashTool(harness.session);
		const resultPromise = tool.execute("steer-gate-wait", { command: "sleep 2.4; printf 'done\\n'", timeout: 30 });
		await Bun.sleep(STEER_FOLD_GRACE_MS + 100);
		harness.steer();
		const result = await resultPromise;
		expect(result.details?.async).toBeUndefined();
		expect(textOf(result)).toContain("done");
		expect(harness.folds).toHaveLength(0);
	});

	it("a chord fold still ends the turn and records a chord reason without the steer line", async () => {
		harness = createHarness(cwd);
		const tool = new BashTool(harness.session);
		const resultPromise = tool.execute(
			"chord-fold",
			{ command: "sleep 2; printf 'done\\n'", timeout: 30 },
			undefined,
			undefined,
			turnContext(),
		);
		await Bun.sleep(100);
		expect(await harness.session.requestForegroundBashBackground?.()).toBe(true);
		const result = await resultPromise;
		const jobId = result.details!.async!.jobId;
		expect(result.details?.foldReason).toBe("chord");
		expect(textOf(result)).not.toContain(steerFoldReasonLine(jobId));
		expect(harness.manager.getJob(jobId)?.metadata?.foldReason).toBe("chord");
		expect(harness.folds.map(fold => fold.reason)).toEqual(["chord"]);
		expect(harness.fenceArmed()).toBe(true);
		expect(harness.stopRequested()).toBe(true);
		await harness.manager.getJob(jobId)?.promise;
	});

	it("an explicit SDK control fold records sdk_control and `bash.background` after it is already backgrounded", async () => {
		harness = createHarness(cwd);
		const tool = new BashTool(harness.session);
		const resultPromise = tool.execute("sdk-fold", { command: "sleep 2; printf 'done\\n'", timeout: 30 });
		await Bun.sleep(100);
		expect(await harness.session.requestForegroundBashBackground?.("sdk_control")).toBe(true);
		const result = await resultPromise;
		const jobId = result.details!.async!.jobId;
		expect(harness.manager.getJob(jobId)?.metadata?.foldReason).toBe("sdk_control");
		// The wait is gone: a second explicit fold finds nothing foldable.
		expect(harness.session.hasForegroundBashBackgroundRequestHandler?.()).toBe(false);
		expect(await harness.session.requestForegroundBashBackground?.("sdk_control")).toBe(false);
		await harness.manager.getJob(jobId)?.promise;
	});
});

describe("AsyncJobManager fold bookkeeping", () => {
	afterEach(() => {
		AsyncJobManager.resetForTests();
	});

	it("records the first reason, notifies once, and ignores repeats", async () => {
		const manager = new AsyncJobManager({ onJobComplete: async () => {} });
		const release = Promise.withResolvers<void>();
		const jobId = manager.register("bash", "probe", async () => {
			await release.promise;
			return "done";
		});
		const job = manager.getJob(jobId)!;
		const folds: JobFoldEvent[] = [];
		manager.onFold(event => folds.push(event));

		expect(manager.markBackgrounded(jobId, job.generation, "steer")).toBe(true);
		expect(manager.markBackgrounded(jobId, job.generation, "chord")).toBe(true);
		expect(job.metadata?.foldReason).toBe("steer");
		expect(folds).toEqual([{ jobId, generation: job.generation, reason: "steer" }]);
		expect(manager.markBackgrounded(jobId, "wrong-generation", "timer")).toBe(false);

		release.resolve();
		await job.promise;
		await manager.dispose();
	});

	it("an async-started job is backgrounded without a fold reason or fold event", async () => {
		const manager = new AsyncJobManager({ onJobComplete: async () => {} });
		const folds: JobFoldEvent[] = [];
		manager.onFold(event => folds.push(event));
		const jobId = manager.register("bash", "async", async () => "done");
		const job = manager.getJob(jobId)!;
		expect(manager.markStartedInBackground(jobId, job.generation)).toBe(true);
		expect(job.metadata?.backgrounded).toBe(true);
		expect(job.metadata?.foldReason).toBeUndefined();
		expect(folds).toHaveLength(0);
		await job.promise;
		await manager.dispose();
	});
});
