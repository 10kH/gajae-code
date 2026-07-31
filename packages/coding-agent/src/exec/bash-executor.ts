/**
 * Bash command execution with streaming support and cancellation.
 *
 * Uses brush-core via native bindings for shell execution.
 */
import * as fs from "node:fs/promises";
import {
	executeShell,
	type MinimizerOptions,
	type ShellRunResult as NativeShellRunResult,
	Shell,
} from "@gajae-code/natives";
import { postmortem } from "@gajae-code/utils";
import { Settings, type ShellMinimizerSettings } from "../config/settings";
import { formatCrashDiagnosticNotice, writeCrashReport } from "../debug/crash-diagnostics";
import {
	DEFAULT_MAX_BYTES,
	OutputSink,
	type OutputSummary,
	type TerminalArtifactPublisher,
	truncateHeadBytes,
} from "../session/streaming-output";
import {
	formatArtifactEvidenceNotice,
	isValidArtifactId,
	resolveOutputMaxColumns,
	resolveOutputSinkHeadBytes,
} from "../tools/output-meta";
import { getOrCreateSnapshot } from "../utils/shell-snapshot";
import { NON_INTERACTIVE_ENV } from "./non-interactive-env";

export interface BashArtifactSaveSummary {
	artifactId: string;
	complete: boolean;
	omittedBytes?: number;
}

export type BashMinimizedSaveReturn = BashArtifactSaveResult | BashArtifactSaveSummary | undefined;

interface ValidatedNativeMinimized {
	filter: string;
	text: string;
	originalText: string;
	inputBytes: number;
	outputBytes: number;
}

const MINIMIZED_SAVE_WAIT_MS = 500;
const MINIMIZED_SAVE_PENDING_LIMIT = 64;
const pendingMinimizedSaves = new Set<Promise<unknown>>();

export type BashArtifactSaveResult =
	| { status: "saved"; artifactId: string; complete: true; omittedBytes?: undefined }
	| { status: "saved"; artifactId: string; complete: false; omittedBytes: number }
	| { status: "unavailable" }
	| { status: "failed"; diagnostic: string };

function isValidOmittedBytes(omittedBytes: number): boolean {
	return Number.isSafeInteger(omittedBytes) && omittedBytes >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function invalidArtifactSaveShape(): BashArtifactSaveResult {
	return { status: "failed", diagnostic: "artifact save returned an invalid result" };
}

function normalizeExplicitSavedArtifact(
	artifactId: string,
	complete: boolean,
	omittedBytes: number | undefined,
): BashArtifactSaveResult {
	if (!isValidArtifactId(artifactId)) {
		return { status: "failed", diagnostic: "artifact save reported an invalid artifact id" };
	}
	if (omittedBytes !== undefined && !isValidOmittedBytes(omittedBytes)) {
		return { status: "failed", diagnostic: "artifact save reported invalid omitted bytes" };
	}
	if (complete) {
		return (omittedBytes ?? 0) > 0
			? { status: "failed", diagnostic: "artifact save reported complete output with omitted bytes" }
			: { status: "saved", artifactId, complete: true };
	}
	return typeof omittedBytes === "number" && omittedBytes > 0
		? { status: "saved", artifactId, complete: false, omittedBytes }
		: { status: "failed", diagnostic: "artifact save reported incomplete output without omitted bytes" };
}

function normalizeMinimizedSaveResult(value: unknown): BashArtifactSaveResult {
	if (value === undefined) return { status: "unavailable" };
	if (typeof value === "string") return invalidArtifactSaveShape();
	if (!isRecord(value)) return invalidArtifactSaveShape();

	const status = value.status;
	if (status === "unavailable") return { status: "unavailable" };
	if (status === "failed") {
		const diagnostic = value.diagnostic;
		return typeof diagnostic === "string" && diagnostic.trim().length > 0
			? { status: "failed", diagnostic: diagnostic.slice(0, 512) }
			: invalidArtifactSaveShape();
	}
	if (status !== undefined && status !== "saved") return invalidArtifactSaveShape();
	if (typeof value.artifactId !== "string" || typeof value.complete !== "boolean") {
		return invalidArtifactSaveShape();
	}
	if (value.omittedBytes !== undefined && typeof value.omittedBytes !== "number") {
		return invalidArtifactSaveShape();
	}
	return normalizeExplicitSavedArtifact(value.artifactId, value.complete, value.omittedBytes);
}

export function normalizeMinimizedSaveResultForTests(value: unknown, _originalText?: string): BashArtifactSaveResult {
	return normalizeMinimizedSaveResult(value);
}

function normalizeNativeMinimized(value: unknown): { minimized?: ValidatedNativeMinimized; malformed: boolean } {
	if (value === undefined) return { malformed: false };
	if (!isRecord(value)) return { malformed: true };
	const { filter, text, originalText, inputBytes, outputBytes } = value;
	if (
		typeof filter !== "string" ||
		typeof text !== "string" ||
		typeof originalText !== "string" ||
		!Number.isSafeInteger(inputBytes) ||
		!Number.isSafeInteger(outputBytes) ||
		(inputBytes as number) < 0 ||
		(outputBytes as number) < 0 ||
		Buffer.byteLength(originalText, "utf-8") !== inputBytes ||
		Buffer.byteLength(text, "utf-8") !== outputBytes
	) {
		return { malformed: true };
	}
	return {
		minimized: { filter, text, originalText, inputBytes: inputBytes as number, outputBytes: outputBytes as number },
		malformed: false,
	};
}

function nativeCaptureStatusIncomplete(result: NativeShellRunResult | undefined): boolean {
	if (!result) return true;
	const capture = result.outputCaptureIncomplete as unknown;
	const saturated = result.outputLossCountSaturated as unknown;
	return (
		(capture !== undefined && typeof capture !== "boolean") ||
		(saturated !== undefined && typeof saturated !== "boolean") ||
		capture === true ||
		saturated === true
	);
}

async function saveMinimizedArtifactBounded(
	operation: () => Promise<BashMinimizedSaveReturn>,
): Promise<BashArtifactSaveResult> {
	if (pendingMinimizedSaves.size >= MINIMIZED_SAVE_PENDING_LIMIT) {
		return { status: "failed", diagnostic: "pending minimized artifact save limit reached" };
	}
	const promise = Promise.resolve().then(operation);
	pendingMinimizedSaves.add(promise);
	void promise.then(
		() => pendingMinimizedSaves.delete(promise),
		() => pendingMinimizedSaves.delete(promise),
	);
	const outcome = await Promise.race([
		promise.then(
			value => ({ status: "ok" as const, value }),
			error => ({ status: "failed" as const, diagnostic: error instanceof Error ? error.message : String(error) }),
		),
		Bun.sleep(MINIMIZED_SAVE_WAIT_MS).then(() => ({
			status: "failed" as const,
			diagnostic: `did not settle within ${MINIMIZED_SAVE_WAIT_MS}ms`,
		})),
	]);
	if (outcome.status === "failed") {
		return {
			status: "failed",
			diagnostic: truncateHeadBytes(outcome.diagnostic.replace(/\s+/gu, " ").trim(), 512).text,
		};
	}
	return normalizeMinimizedSaveResult(outcome.value);
}

function completeRawArtifactAvailable(summary: {
	artifactId?: string;
	artifactTruncatedBytes?: number;
	sourceTruncatedBytes?: number;
	sourceCaptureIncomplete?: boolean;
	artifactFailureDiagnostic?: string;
}): boolean {
	return (
		summary.artifactId !== undefined &&
		(summary.artifactTruncatedBytes ?? 0) <= 0 &&
		(summary.sourceTruncatedBytes ?? 0) <= 0 &&
		!summary.sourceCaptureIncomplete &&
		summary.artifactFailureDiagnostic === undefined
	);
}

function applyShellCallbackLoss(
	summary: OutputSummary,
	droppedOutputBytes: number | undefined,
	droppedOutputChunks: number | undefined,
	sourceCaptureIncomplete = false,
): OutputSummary {
	const bytesValid =
		droppedOutputBytes === undefined || (Number.isSafeInteger(droppedOutputBytes) && droppedOutputBytes >= 0);
	const chunksValid =
		droppedOutputChunks === undefined || (Number.isSafeInteger(droppedOutputChunks) && droppedOutputChunks >= 0);
	const counterPairValid = (droppedOutputBytes === undefined) === (droppedOutputChunks === undefined);
	const knownDroppedBytes = bytesValid && droppedOutputBytes !== undefined && droppedOutputBytes > 0;
	const knownDroppedChunks = chunksValid && droppedOutputChunks !== undefined && droppedOutputChunks > 0;
	const captureIncomplete =
		sourceCaptureIncomplete ||
		!bytesValid ||
		!chunksValid ||
		!counterPairValid ||
		knownDroppedBytes !== knownDroppedChunks;
	if (!knownDroppedBytes && !captureIncomplete) return summary;
	return {
		...summary,
		truncated: true,
		...(knownDroppedBytes ? { sourceTruncatedBytes: droppedOutputBytes } : {}),
		...(captureIncomplete ? { sourceCaptureIncomplete: true } : {}),
	};
}

function appendModelNotice(output: string, notice: string): string {
	const separator = output.length > 0 && !output.endsWith("\n") ? "\n" : "";
	return `${output}${separator}${notice}\n`;
}

function minimizedSaveNotice(
	result: BashArtifactSaveResult,
	summary: {
		artifactId?: string;
		artifactTruncatedBytes?: number;
		sourceTruncatedBytes?: number;
		sourceCaptureIncomplete?: boolean;
		artifactFailureDiagnostic?: string;
	},
): string | undefined {
	if (result.status === "failed") return `Bash output artifact save failed: ${result.diagnostic}`;
	if (result.status === "unavailable" && !completeRawArtifactAvailable(summary)) {
		return "Bash output artifact unavailable: full original output could not be stored because artifact storage is unavailable.";
	}
	if (result.status === "saved") {
		// A save can only be presented as raw-output evidence when the source
		// capture itself was lossless; otherwise the artifact provably cannot
		// contain the full original stream.
		if ((summary.sourceTruncatedBytes ?? 0) > 0 || summary.sourceCaptureIncomplete) {
			return "Bash output artifact save failed: artifact save could not be verified in the current session";
		}
		return result.complete
			? `[raw output: artifact://${result.artifactId}]`
			: `[raw output retained (${result.omittedBytes} bytes omitted): artifact://${result.artifactId}]`;
	}
	return undefined;
}

export interface BashExecutorOptions {
	/**
	 * Invoked when the native minimizer rewrote the command's output, giving
	 * the caller a chance to persist the lossless original capture (typically
	 * via the session's `ArtifactManager`). Complete saves preserve the
	 * historical `[raw output: artifact://<id>]` footer; capped saves carry an
	 * honest retained/omitted reference. A legacy string id is still accepted
	 * for non-tool callers and is classified from the original UTF-8 byte count.
	 */
	onMinimizedSave?: (
		originalText: string,
		info: { filter: string; inputBytes: number; outputBytes: number },
	) => Promise<BashMinimizedSaveReturn>;
	cwd?: string;
	timeout?: number | null;
	onChunk?: (chunk: string) => void;
	/**
	 * Unthrottled per-chunk callback that fires for every sanitized stdout/stderr
	 * chunk *before* preview throttling. Background-job substrate uses this to
	 * record the complete process stream for the Monitor tool while keeping
	 * `onChunk` cheap for UI/progress rendering.
	 */
	onRawChunk?: (chunk: string) => void;
	signal?: AbortSignal;
	/** Session key suffix to isolate shell sessions per agent */
	sessionKey?: string;
	/** Additional environment variables to inject */
	env?: Record<string, string>;
	/** Artifact path/id for full output storage */
	artifactPath?: string;
	artifactId?: string;
	/** Optional terminal publisher for managed artifacts without writable paths. */
	artifactPublisher?: TerminalArtifactPublisher;
	/** Optional Bash-specific retained tail budget in bytes. */
	spillThreshold?: number;
	/** Optional Bash-specific retained head budget in bytes. */
	headBytes?: number;
	/** Execute without retaining a native Shell in the persistent session registry. */
	oneShot?: boolean;
	/** Ignore user-configured shell command prefixes. Used by constrained read-only shells. */
	ignoreShellPrefix?: boolean;
	/** Skip sourced shell snapshots. Used by constrained read-only shells. */
	disableShellSnapshot?: boolean;
}

export interface BashResult {
	output: string;
	exitCode: number | undefined;
	cancelled: boolean;
	truncated: boolean;
	totalLines: number;
	totalBytes: number;
	outputLines: number;
	outputBytes: number;
	artifactId?: string;
	artifactTruncatedBytes?: number;
	/** Bytes dropped before the Bash executor received the native output stream. */
	sourceTruncatedBytes?: number;
	/** Exact source capture completeness could not be proven. */
	sourceCaptureIncomplete?: boolean;
	artifactFailureDiagnostic?: string;
}

const shellSessions = new Map<string, Shell>();
const brokenShellSessions = new Map<string, Shell>();
const retiringShellSessions = new Set<Shell>();
const shellInFlightRuns = new Map<Shell, number>();
const shellSessionKeys = new Map<Shell, string>();
const MAX_OWNED_SHELL_SESSIONS = 64;
let shellSessionAdmissionTail = Promise.resolve();

async function withShellSessionAdmission<T>(operation: () => Promise<T>): Promise<T> {
	const previous = shellSessionAdmissionTail;
	const release = Promise.withResolvers<void>();
	shellSessionAdmissionTail = previous.then(() => release.promise);
	await previous;
	try {
		return await operation();
	} finally {
		release.resolve();
	}
}

function touchShellSession(sessionKey: string, shellSession: Shell): void {
	if (shellSessions.get(sessionKey) !== shellSession) return;
	shellSessions.delete(sessionKey);
	shellSessions.set(sessionKey, shellSession);
}

async function evictLeastRecentlyUsedIdleShell(): Promise<boolean> {
	for (const [sessionKey, shellSession] of shellSessions) {
		if ((shellInFlightRuns.get(shellSession) ?? 0) > 0) continue;
		quarantineShellSession(sessionKey, shellSession);
		const abortPromise = Promise.resolve()
			.then(() => shellSession.abort())
			.catch(() => undefined);
		void abortPromise.finally(() => releaseQuarantinedShellIfIdle(sessionKey, shellSession));
		return Promise.race([abortPromise.then(() => true), Bun.sleep(CANCEL_CLEANUP_WAIT_MS).then(() => false)]);
	}
	return false;
}

function beginShellRun(shellSession: Shell): void {
	shellInFlightRuns.set(shellSession, (shellInFlightRuns.get(shellSession) ?? 0) + 1);
}

function releaseQuarantinedShellIfIdle(sessionKey: string, shellSession: Shell): void {
	if ((shellInFlightRuns.get(shellSession) ?? 0) > 0) return;
	clearBrokenShellSession(sessionKey, shellSession);
	retiringShellSessions.delete(shellSession);
	shellSessionKeys.delete(shellSession);
}

function endShellRun(sessionKey: string, shellSession: Shell): void {
	const remaining = Math.max(0, (shellInFlightRuns.get(shellSession) ?? 1) - 1);
	if (remaining > 0) {
		shellInFlightRuns.set(shellSession, remaining);
		return;
	}
	const quarantined = brokenShellSessions.get(sessionKey) === shellSession;
	shellInFlightRuns.delete(shellSession);
	if (quarantined) releaseQuarantinedShellIfIdle(sessionKey, shellSession);
}

function quarantineShellSession(sessionKey: string, shellSession: Shell): void {
	retiringShellSessions.add(shellSession);
	brokenShellSessions.set(sessionKey, shellSession);
	shellSessionKeys.set(shellSession, sessionKey);
	if (shellSessions.get(sessionKey) === shellSession) shellSessions.delete(sessionKey);
}
// Give ordinary native cancellation time to settle without turning a stalled
// cleanup into a multi-second JavaScript tool delay.
const CANCEL_CLEANUP_WAIT_MS = 400;
function clearBrokenShellSession(sessionKey: string, shellSession: Shell): void {
	if (brokenShellSessions.get(sessionKey) === shellSession) brokenShellSessions.delete(sessionKey);
}

interface AbortCleanupOutcome {
	settled: boolean;
	result?: NativeShellRunResult;
}

/** Number of persistent and retiring shell sessions currently retained (owner gauge). */
export function getShellSessionCount(): number {
	return new Set([...shellSessions.values(), ...retiringShellSessions, ...shellSessionKeys.keys()]).size;
}

/**
 * Dispose all persistent shell sessions without waiting forever on a native
 * abort that failed to settle. Quarantine entries are owner-scoped so a late
 * finalizer cannot erase a successor shell's quarantine.
 */
export async function disposeAllShellSessions(): Promise<void> {
	const sessions = new Set([...shellSessions.values(), ...retiringShellSessions]);
	for (const session of sessions) {
		const sessionKey = shellSessionKeys.get(session);
		if (sessionKey) quarantineShellSession(sessionKey, session);
		else retiringShellSessions.add(session);
	}
	shellSessions.clear();
	await Promise.all(
		[...sessions].map(async session => {
			const sessionKey = shellSessionKeys.get(session);
			const abortPromise = Promise.resolve()
				.then(() => session.abort())
				.catch(() => undefined);
			if (sessionKey) {
				void abortPromise.finally(() => releaseQuarantinedShellIfIdle(sessionKey, session));
			}
			await Promise.race([abortPromise, Bun.sleep(CANCEL_CLEANUP_WAIT_MS)]);
		}),
	);
}

postmortem.register("bash-executor:shell-sessions", () => disposeAllShellSessions());

async function resolveShellCwd(cwd: string | undefined): Promise<string | undefined> {
	if (!cwd) return undefined;

	try {
		// Brush preserves the working directory string verbatim, so resolve symlinks
		// up front to keep `pwd` aligned with tools like `git worktree list`.
		return await fs.realpath(cwd);
	} catch {
		return cwd;
	}
}

/** Translate `ShellMinimizerSettings` into native `MinimizerOptions`, or `undefined` when disabled. */
export function buildMinimizerOptions(group: ShellMinimizerSettings): MinimizerOptions | undefined {
	if (!group.enabled) return undefined;
	return {
		enabled: true,
		settingsPath: group.settingsPath || undefined,
		only: group.only.length > 0 ? group.only : undefined,
		except: group.except.length > 0 ? group.except : undefined,
		maxCaptureBytes: group.maxCaptureBytes,
	};
}

export async function executeBash(command: string, options?: BashExecutorOptions): Promise<BashResult> {
	if (options?.artifactId !== undefined && !isValidArtifactId(options.artifactId)) {
		throw new Error("Invalid Bash artifact id");
	}
	const settings = await Settings.init();
	const { shell, env: shellEnv, prefix } = settings.getShellConfig();
	const configuredPrefix = options?.ignoreShellPrefix ? undefined : prefix;
	const snapshotPath =
		!options?.disableShellSnapshot && shell.includes("bash") ? await getOrCreateSnapshot(shell, shellEnv) : null;

	const minimizer = buildMinimizerOptions(settings.getGroup("shellMinimizer"));

	const commandCwd = await resolveShellCwd(options?.cwd);
	const commandEnv = options?.env ? { ...NON_INTERACTIVE_ENV, ...options.env } : NON_INTERACTIVE_ENV;

	// Apply command prefix if configured and allowed for this execution.
	const prefixedCommand = configuredPrefix ? `${configuredPrefix} ${command}` : command;
	const finalCommand = prefixedCommand;

	// Create output sink for truncation and artifact handling
	const sink = new OutputSink({
		onChunk: options?.onChunk,
		onRawChunk: options?.onRawChunk,
		artifactPath: options?.artifactPath,
		artifactId: options?.artifactId,
		artifactPublisher: options?.artifactPublisher,
		spillThreshold: options?.spillThreshold ?? DEFAULT_MAX_BYTES,
		headBytes: options?.headBytes ?? resolveOutputSinkHeadBytes(settings),
		maxColumns: resolveOutputMaxColumns(settings),
		// Throttle the streaming preview callback to avoid saturating the
		// event loop when commands produce massive output (e.g. seq 1 50M).
		chunkThrottleMs: options?.onChunk ? 50 : 0,
	});

	// sink.push() is synchronous — buffer management, counters, and onChunk
	// all run inline. File writes (artifact path) are handled asynchronously
	// inside the sink. No promise chain needed.
	let acceptingChunks = true;
	const enqueueChunk = (chunk: string) => {
		if (acceptingChunks) sink.push(chunk);
	};

	if (options?.signal?.aborted) {
		return {
			exitCode: undefined,
			cancelled: true,
			...(await sink.dump("Command cancelled")),
		};
	}

	const userSignal = options?.signal;
	const runAbortController = new AbortController();
	const abortCurrentExecution = () => {
		if (!runAbortController.signal.aborted) runAbortController.abort();
	};
	const abortDeferred = Promise.withResolvers<"abort">();
	const abortHandler = () => {
		abortCurrentExecution();
		abortDeferred.resolve("abort");
	};
	userSignal?.addEventListener("abort", abortHandler, { once: true });
	if (userSignal?.aborted) abortHandler();

	const usePersistentShell = options?.oneShot !== true;
	const sessionKey = buildSessionKey(shell, configuredPrefix, snapshotPath, shellEnv, options?.sessionKey, minimizer);
	let shellSession: Shell | undefined;
	try {
		shellSession = usePersistentShell
			? await withShellSessionAdmission(async () => {
					if (brokenShellSessions.has(sessionKey)) return undefined;
					const existing = shellSessions.get(sessionKey);
					if (existing) {
						touchShellSession(sessionKey, existing);
						beginShellRun(existing);
						return existing;
					}
					if (getShellSessionCount() >= MAX_OWNED_SHELL_SESSIONS) {
						const evicted = await evictLeastRecentlyUsedIdleShell();
						if (!evicted || getShellSessionCount() >= MAX_OWNED_SHELL_SESSIONS) {
							throw new Error(`Bash shell session limit reached (${MAX_OWNED_SHELL_SESSIONS})`);
						}
					}
					const created = new Shell({
						sessionEnv: shellEnv,
						snapshotPath: snapshotPath ?? undefined,
						minimizer,
					});
					shellSessions.set(sessionKey, created);
					shellSessionKeys.set(created, sessionKey);
					beginShellRun(created);
					return created;
				})
			: undefined;
	} catch (error) {
		userSignal?.removeEventListener("abort", abortHandler);
		throw error;
	}
	if (userSignal?.aborted) {
		if (shellSession) endShellRun(sessionKey, shellSession);
		userSignal.removeEventListener("abort", abortHandler);
		return {
			exitCode: undefined,
			cancelled: true,
			...(await sink.dump("Command cancelled")),
		};
	}

	const awaitAbortCleanup = (runPromise: Promise<NativeShellRunResult>): Promise<AbortCleanupOutcome> =>
		Promise.race([
			runPromise.then(
				result => ({ settled: true, result }) satisfies AbortCleanupOutcome,
				() => ({ settled: true }) satisfies AbortCleanupOutcome,
			),
			Bun.sleep(CANCEL_CLEANUP_WAIT_MS).then(() => ({ settled: false }) satisfies AbortCleanupOutcome),
		]);

	let timeoutTimer: NodeJS.Timeout | undefined;
	const timeoutDeferred = Promise.withResolvers<"timeout">();
	const executionTimeoutMs = options?.timeout === null ? undefined : (options?.timeout ?? 300_000);
	const baseTimeoutMs = executionTimeoutMs === undefined ? undefined : Math.max(1_000, executionTimeoutMs);
	if (baseTimeoutMs !== undefined) {
		timeoutTimer = setTimeout(() => {
			abortCurrentExecution();
			timeoutDeferred.resolve("timeout");
		}, baseTimeoutMs);
	}

	let resetSession = false;

	try {
		let runPromise: Promise<NativeShellRunResult>;
		if (shellSession) {
			try {
				runPromise = shellSession.run(
					{
						command: finalCommand,
						cwd: commandCwd,
						env: commandEnv,
						timeoutMs: executionTimeoutMs,
						signal: runAbortController.signal,
					},
					(err, chunk) => {
						if (!err) enqueueChunk(chunk);
					},
				);
			} catch (error) {
				endShellRun(sessionKey, shellSession);
				throw error;
			}
			void runPromise.finally(() => endShellRun(sessionKey, shellSession)).catch(() => undefined);
		} else {
			runPromise = executeShell(
				{
					command: finalCommand,
					cwd: commandCwd,
					env: commandEnv,
					sessionEnv: shellEnv,
					snapshotPath: snapshotPath ?? undefined,
					minimizer,
					timeoutMs: executionTimeoutMs,
					signal: runAbortController.signal,
				},
				(err, chunk) => {
					if (!err) enqueueChunk(chunk);
				},
			);
		}

		const winner = await Promise.race([
			runPromise.then(result => ({ kind: "result" as const, result })),
			timeoutDeferred.promise.then(kind => ({ kind })),
			abortDeferred.promise.then(kind => ({ kind })),
		]);

		if (winner.kind === "timeout" || winner.kind === "abort") {
			const abortOutcome = await awaitAbortCleanup(runPromise);
			acceptingChunks = false;
			if (shellSession) {
				resetSession = true;
				quarantineShellSession(sessionKey, shellSession);
				releaseQuarantinedShellIfIdle(sessionKey, shellSession);
			} else if (!abortOutcome.settled) {
				void runPromise.catch(() => undefined);
			}
			const summary = applyShellCallbackLoss(
				await sink.dump(
					winner.kind === "timeout" && baseTimeoutMs !== undefined
						? `Command timed out after ${Math.round(baseTimeoutMs / 1000)} seconds`
						: "Command cancelled",
				),
				abortOutcome.result?.droppedOutputBytes,
				abortOutcome.result?.droppedOutputChunks,
				nativeCaptureStatusIncomplete(abortOutcome.result),
			);
			return {
				exitCode: undefined,
				cancelled: true,
				...summary,
			};
		}
		if (timeoutTimer) {
			clearTimeout(timeoutTimer);
			timeoutTimer = undefined;
		}
		const minimizedEvidence = normalizeNativeMinimized(winner.result.minimized);
		const nativeEvidenceIncomplete = nativeCaptureStatusIncomplete(winner.result) || minimizedEvidence.malformed;

		// Handle timeout
		if (winner.result.timedOut) {
			const annotation = options?.timeout
				? `Command timed out after ${Math.round(options.timeout / 1000)} seconds`
				: "Command timed out";
			resetSession = true;
			return {
				exitCode: undefined,
				cancelled: true,
				...applyShellCallbackLoss(
					await sink.dump(annotation),
					winner.result.droppedOutputBytes,
					winner.result.droppedOutputChunks,
					nativeEvidenceIncomplete,
				),
			};
		}

		// Handle cancellation
		if (winner.result.cancelled) {
			resetSession = true;
			return {
				exitCode: undefined,
				cancelled: true,
				...applyShellCallbackLoss(
					await sink.dump("Command cancelled"),
					winner.result.droppedOutputBytes,
					winner.result.droppedOutputChunks,
					nativeEvidenceIncomplete,
				),
			};
		}

		// When the native minimizer rewrote the output, swap the sink's accumulated
		// raw stream for the minimized text, persist the original as a session
		// artifact, and splice an artifact footer into the visible text so the agent
		// can retrieve retained raw bytes without a false completeness claim.
		const minimized = minimizedEvidence.minimized;
		let minimizedSaveResult: BashArtifactSaveResult | undefined;
		if (minimized && minimized.text !== minimized.originalText) {
			sink.replace(minimized.text);
			minimizedSaveResult = options?.onMinimizedSave
				? await saveMinimizedArtifactBounded(() =>
						options.onMinimizedSave!(minimized.originalText, {
							filter: minimized.filter,
							inputBytes: minimized.inputBytes,
							outputBytes: minimized.outputBytes,
						}),
					)
				: { status: "unavailable" };
		}

		const crashReport = await writeCrashReport(
			{
				kind: "bash",
				command: [shell, "-lc", finalCommand],
				exitCode: winner.result.exitCode,
				stderr: undefined,
			},
			{ cwd: commandCwd },
		);
		const crashNotice = formatCrashDiagnosticNotice(crashReport);
		if (crashNotice) {
			const separator = "\n";
			sink.push(`${separator}${crashNotice}\n`);
		}

		// Normal completion
		const summary = applyShellCallbackLoss(
			await sink.dump(),
			winner.result.droppedOutputBytes,
			winner.result.droppedOutputChunks,
			nativeEvidenceIncomplete,
		);
		const saveNotice = minimizedSaveResult ? minimizedSaveNotice(minimizedSaveResult, summary) : undefined;
		return {
			exitCode: winner.result.exitCode,
			cancelled: false,
			...summary,
			...(saveNotice ? { output: appendModelNotice(summary.output, saveNotice) } : {}),
		};
	} catch (err) {
		resetSession = true;
		acceptingChunks = false;
		const captured = await sink.dump();
		const rawErrorMessage = err instanceof Error ? err.message : String(err);
		const boundedErrorMessage = truncateHeadBytes(rawErrorMessage, 1024);
		const errorMessage = `${boundedErrorMessage.text}${
			boundedErrorMessage.bytes < Buffer.byteLength(rawErrorMessage, "utf-8") ? "\n[native error truncated]" : ""
		}`;
		if (captured.totalBytes <= 0) {
			throw new Error(
				`Source capture completeness could not be proven before any output was retained\n\nNative shell execution failed: ${errorMessage}`,
			);
		}
		const summary = applyShellCallbackLoss(captured, undefined, undefined, true);
		const evidence = formatArtifactEvidenceNotice(summary);
		const suffix = [evidence, `Native shell execution failed: ${errorMessage}`].filter(Boolean).join("\n\n");
		const separator = summary.output.length > 0 ? (summary.output.endsWith("\n") ? "\n" : "\n\n") : "";
		throw new Error(`${summary.output}${separator}${suffix}`);
	} finally {
		if (timeoutTimer) {
			clearTimeout(timeoutTimer);
		}
		if (userSignal) {
			userSignal.removeEventListener("abort", abortHandler);
		}
		if (resetSession && shellSession) {
			if (shellSessions.get(sessionKey) === shellSession) shellSessions.delete(sessionKey);
			if ((shellInFlightRuns.get(shellSession) ?? 0) > 0) {
				quarantineShellSession(sessionKey, shellSession);
			} else {
				releaseQuarantinedShellIfIdle(sessionKey, shellSession);
			}
		}
	}
}

function buildSessionKey(
	shell: string,
	prefix: string | undefined,
	snapshotPath: string | null,
	env: Record<string, string>,
	agentSessionKey?: string,
	minimizer?: MinimizerOptions,
): string {
	const entries = Object.entries(env);
	entries.sort(([a], [b]) => a.localeCompare(b));
	const envSerialized = entries.map(([key, value]) => `${key}=${value}`).join("\n");
	const minimizerSerialized = minimizer ? JSON.stringify(minimizer) : "";
	return [agentSessionKey ?? "", shell, prefix ?? "", snapshotPath ?? "", envSerialized, minimizerSerialized].join(
		"\n",
	);
}
