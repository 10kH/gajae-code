/**
 * Shared harness for steer-triggered bash fold tests.
 *
 * Wires a real `Agent` steering queue (the production arrival seam), a real
 * `AsyncJobManager`, and a real `FoldCoordinator` behind a minimal
 * `ToolSession`, so the tool under test observes exactly what a live session
 * would: `waitForUserSteering(signal, { after })` resolves only for a steer
 * that ARRIVES after `after`, and `getSteeringArrivalSeq` reports the queue's
 * monotonic arrival counter.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { Agent, type AgentToolContext } from "@gajae-code/agent-core";
import { AsyncJobManager, type FoldReason, type JobFoldEvent } from "@gajae-code/coding-agent/async";
import { Settings } from "@gajae-code/coding-agent/config/settings";
import { type FoldAdapter, FoldCoordinator } from "@gajae-code/coding-agent/session/fold-coordinator";
import type { ToolSession } from "@gajae-code/coding-agent/tools";

export interface SteerHarness {
	session: ToolSession;
	coordinator: FoldCoordinator;
	manager: AsyncJobManager;
	agent: Agent;
	/** Queue a real steer on the agent (never consumed by the harness). */
	steer: (text?: string) => void;
	fenceArmed: () => boolean;
	stopRequested: () => boolean;
	folds: JobFoldEvent[];
	/** Flip the busy-prompt setting after the harness was built. */
	setBusyPromptMode: (mode: "steer" | "queue") => void;
}

export interface SteerHarnessOptions {
	busyPromptMode?: "steer" | "queue";
	interruptMode?: "immediate" | "wait";
	/** Omit the interrupt-mode accessor (fail-closed regression). */
	omitInterruptMode?: boolean;
	/** Omit the steering-arrival accessor (fail-closed regression). */
	omitArrivalSeq?: boolean;
	/** Manager retention for evicted-record probes. */
	retentionMs?: number;
}

/** A tool context that marks the call as owned by a live Agent turn (originatingTurn=true). */
export function turnContext(): AgentToolContext {
	return {
		attemptScope: { attemptId: "attempt-1", generation: 1, lineage: "main" },
	} as unknown as AgentToolContext;
}

/**
 * A turn context that additionally advertises a UI host so `bash` selects the
 * PTY overlay. The fake overlay renders nothing and resolves the foreground
 * only through the runner's `done` callback, exactly like the real TUI host.
 */
export function ptyTurnContext(): AgentToolContext {
	const ui = {
		custom<T>(factory: unknown): Promise<T> {
			const result = Promise.withResolvers<T>();
			let component: { dispose?: () => void } | undefined;
			const done = (value: T) => {
				component?.dispose?.();
				result.resolve(value);
			};
			try {
				component = (
					factory as (
						tui: { terminal: { rows: number; columns: number }; requestRender: () => void },
						theme: Record<string, never>,
						keybindings: Record<string, never>,
						done: (result: T) => void,
					) => { dispose?: () => void }
				)({ terminal: { rows: 40, columns: 120 }, requestRender: () => {} }, {}, {}, done);
			} catch (error) {
				result.reject(error);
			}
			return result.promise;
		},
	};
	return {
		attemptScope: { attemptId: "attempt-1", generation: 1, lineage: "main" },
		hasUI: true,
		ui,
	} as unknown as AgentToolContext;
}

export function textOf(result: { content: Array<{ type: string; text?: string }> }): string {
	return result.content
		.filter(block => block.type === "text")
		.map(block => block.text ?? "")
		.join("\n");
}

export function createSteerHarness(cwd: string, options: SteerHarnessOptions = {}): SteerHarness {
	const manager = new AsyncJobManager({ onJobComplete: async () => {}, retentionMs: options.retentionMs });
	AsyncJobManager.setInstance(manager);
	const agent = new Agent({ interruptMode: options.interruptMode ?? "immediate" });
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
	const folds: JobFoldEvent[] = [];
	manager.onFold(event => folds.push(event));
	const settings = Settings.isolated({
		"bash.autoBackground.enabled": false,
		busyPromptMode: options.busyPromptMode ?? "steer",
	});
	const sessionDir = path.join(cwd, "session");
	let artifactCounter = 0;
	const session: ToolSession = {
		cwd,
		hasUI: false,
		settings,
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
		...(options.omitInterruptMode ? {} : { getInterruptMode: () => agent.getInterruptMode() }),
		waitForUserSteering: (signal, waitOptions) => agent.waitForSteeringArrival(signal, waitOptions),
		...(options.omitArrivalSeq ? {} : { getSteeringArrivalSeq: () => agent.steeringArrivalSeq }),
	};
	return {
		session,
		coordinator,
		manager,
		agent,
		steer: (text = "steer") =>
			agent.steer({ role: "user", content: [{ type: "text", text }], timestamp: Date.now() }),
		fenceArmed: () => fenceArmed,
		stopRequested: () => stopRequested,
		folds,
		setBusyPromptMode: mode => settings.set("busyPromptMode", mode),
	};
}
