import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { resetSettingsForTest, Settings } from "@gajae-code/coding-agent/config/settings";
import { getRuntimeResourceCounts } from "@gajae-code/coding-agent/debug/runtime-gauges";
import {
	type BashMinimizedSaveReturn,
	disposeAllShellSessions,
	executeBash,
	getShellSessionCount,
	normalizeMinimizedSaveResultForTests,
} from "@gajae-code/coding-agent/exec/bash-executor";
import { DEFAULT_MAX_BYTES } from "@gajae-code/coding-agent/session/streaming-output";
import * as shellSnapshot from "@gajae-code/coding-agent/utils/shell-snapshot";
import type { Shell } from "@gajae-code/natives";
import * as piNatives from "@gajae-code/natives";

const BACKGROUND_COMPLETION_RACE_MS = 750;
// Direct executor callers retain the shared 20 KiB head alongside the 50 KiB tail.
const ARTIFACT_HEAD_BYTES_DEFAULT = 20 * 1024;
const KILL_MARKER_DELAY_SECONDS = "0.4";
const KILL_MARKER_ASSERTION_WAIT_MS = 900;

function makeTempDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), "gjc-bash-exec-"));
}

describe("executeBash", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = makeTempDir();
		resetSettingsForTest();
		await Settings.init({ inMemory: true, cwd: tempDir });
	});

	afterEach(async () => {
		resetSettingsForTest();
		await disposeAllShellSessions();
		vi.restoreAllMocks();
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true });
		}
	});

	it("preserves an explicit capped minimizer artifact below the default cap", () => {
		const result = normalizeMinimizedSaveResultForTests(
			{ status: "saved", artifactId: "7", complete: false, omittedBytes: 7 },
			"short original",
		);

		expect(result).toEqual({
			status: "saved",
			artifactId: "7",
			complete: false,
			omittedBytes: 7,
		});
	});

	it("rejects untyped minimizer artifact ids", () => {
		for (const artifactId of ["", "abc", "bad id", "bad\nid", "1/path", "1?x", "1#x", "00", "01"]) {
			expect(normalizeMinimizedSaveResultForTests(artifactId, "original")).toEqual({
				status: "failed",
				diagnostic: "artifact save returned an invalid result",
			});
		}
	});

	it("rejects invalid minimizer omission counts", () => {
		for (const omittedBytes of [Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
			expect(
				normalizeMinimizedSaveResultForTests(
					{ status: "saved", artifactId: "8", complete: false, omittedBytes },
					"original",
				),
			).toEqual({ status: "failed", diagnostic: "artifact save reported invalid omitted bytes" });
		}
	});

	it("rejects malformed minimizer save result shapes", () => {
		for (const value of [
			null,
			false,
			{ status: "unknown" },
			{ status: "failed", diagnostic: "" },
			{ status: "saved", artifactId: 7, complete: true },
			{ status: "saved", artifactId: "7", complete: "false" },
			{ artifactId: "7", complete: false, omittedBytes: "9" },
		]) {
			expect(normalizeMinimizedSaveResultForTests(value, "original")).toEqual({
				status: "failed",
				diagnostic: "artifact save returned an invalid result",
			});
		}
	});

	it("returns non-zero exit codes without cancellation", async () => {
		const result = await executeBash("exit 7", { cwd: tempDir, timeout: 5000 });
		expect(result.exitCode).toBe(7);
		expect(result.cancelled).toBe(false);
	});

	it("scrubs inherited managed transcript paths from shell sessions", async () => {
		const previousSessionFile = process.env.GJC_SESSION_FILE;
		const previousOwnerPath = process.env.GJC_MANAGED_OWNER_TRANSCRIPT_PATH;
		process.env.GJC_SESSION_FILE = "/managed/session.jsonl";
		process.env.GJC_MANAGED_OWNER_TRANSCRIPT_PATH = "/managed/owner.jsonl";
		try {
			await disposeAllShellSessions();
			const result = await executeBash(
				'printf "%s|%s" "$(printenv GJC_SESSION_FILE || printf unset)" "$(printenv GJC_MANAGED_OWNER_TRANSCRIPT_PATH || printf unset)"',
				{
					cwd: tempDir,
					timeout: 5000,
					sessionKey: "managed-env-scrub",
				},
			);
			expect(result.output).toBe("unset|unset");
		} finally {
			if (previousSessionFile === undefined) delete process.env.GJC_SESSION_FILE;
			else process.env.GJC_SESSION_FILE = previousSessionFile;
			if (previousOwnerPath === undefined) delete process.env.GJC_MANAGED_OWNER_TRANSCRIPT_PATH;
			else process.env.GJC_MANAGED_OWNER_TRANSCRIPT_PATH = previousOwnerPath;
			await disposeAllShellSessions();
		}
	});

	it("retains then fully disposes persistent shell sessions (MEM-7)", async () => {
		await disposeAllShellSessions();
		expect(getShellSessionCount()).toBe(0);
		await executeBash("echo hi", { cwd: tempDir, timeout: 5000, sessionKey: "leak-test" });
		expect(getShellSessionCount()).toBeGreaterThanOrEqual(1);
		// Disposal must await native aborts (not fire-and-forget) so shutdown
		// cleanup does not return before resources are released.
		const pending = disposeAllShellSessions();
		expect(pending).toBeInstanceOf(Promise);
		await pending;
		expect(getShellSessionCount()).toBe(0);
	});

	it("evicts the least-recent idle persistent shell before rejecting a new session key", async () => {
		await disposeAllShellSessions();
		for (let index = 0; index < 64; index++) {
			await executeBash(`export GJC_SHELL_SLOT=${index}`, {
				cwd: tempDir,
				timeout: 5000,
				sessionKey: `idle-cap-${index}`,
			});
		}
		expect(getShellSessionCount()).toBe(64);
		const active = executeBash("sleep 0.2; printf ACTIVE", {
			cwd: tempDir,
			timeout: 5000,
			sessionKey: "idle-cap-0",
		});
		const replacement = executeBash("true", { cwd: tempDir, timeout: 5000, sessionKey: "idle-cap-new" });
		expect((await active).output).toBe("ACTIVE");
		await replacement;
		expect(getShellSessionCount()).toBe(64);
		const recycled = await executeBash(`printf "%s" "\${GJC_SHELL_SLOT:-unset}"`, {
			cwd: tempDir,
			timeout: 5000,
			sessionKey: "idle-cap-1",
		});
		expect(recycled.output).toBe("unset");
		expect(getShellSessionCount()).toBe(64);
	});

	it("honors aborts delivered while idle-shell eviction admission is pending", async () => {
		await disposeAllShellSessions();
		for (let index = 0; index < 64; index++) {
			await executeBash("true", { cwd: tempDir, timeout: 5000, sessionKey: `admission-abort-${index}` });
		}
		const abortGate = Promise.withResolvers<void>();
		const realAbort = piNatives.Shell.prototype.abort;
		const abortSpy = vi.spyOn(piNatives.Shell.prototype, "abort").mockImplementation(async function (this: Shell) {
			await abortGate.promise;
			return realAbort.call(this);
		});
		const controller = new AbortController();
		const execution = executeBash("printf SHOULD_NOT_RUN", {
			cwd: tempDir,
			timeout: 5000,
			sessionKey: "admission-abort-new",
			signal: controller.signal,
		});
		while (abortSpy.mock.calls.length === 0) await Bun.sleep(1);
		controller.abort();
		abortGate.resolve();
		const result = await execution;
		expect(result.cancelled).toBe(true);
		expect(result.output).not.toContain("SHOULD_NOT_RUN");
	});

	it("removes persistent sessions after native timeout results", async () => {
		vi.spyOn(piNatives.Shell.prototype, "run").mockResolvedValue({
			exitCode: undefined,
			cancelled: false,
			timedOut: true,
		});

		await executeBash("ignored", { cwd: tempDir, timeout: 5000, sessionKey: "native-timeout-result" });
		expect(getShellSessionCount()).toBe(0);
	});

	it("removes persistent sessions after native run rejection", async () => {
		vi.spyOn(piNatives.Shell.prototype, "run").mockRejectedValue(new Error("native run rejected"));

		await expect(
			executeBash("ignored", { cwd: tempDir, timeout: 5000, sessionKey: "native-rejection" }),
		).rejects.toThrow("native run rejected");
		expect(getShellSessionCount()).toBe(0);
	});

	it("removes persistent sessions after synchronous native run throws", async () => {
		vi.spyOn(piNatives.Shell.prototype, "run").mockImplementation(() => {
			throw new Error("native sync throw");
		});

		await expect(
			executeBash("ignored", { cwd: tempDir, timeout: 5000, sessionKey: "native-sync-throw" }),
		).rejects.toThrow("native sync throw");
		expect(getShellSessionCount()).toBe(0);
	});

	it("surfaces partial output and uncertainty when native run rejects", async () => {
		vi.spyOn(piNatives.Shell.prototype, "run").mockImplementation((_options, onChunk) => {
			onChunk?.(null, "partial-before-rejection\n");
			return Promise.reject(new Error("native rejected after output"));
		});

		await expect(
			executeBash("ignored", { cwd: tempDir, timeout: 5000, sessionKey: "native-partial-rejection" }),
		).rejects.toThrow(/partial-before-rejection[\s\S]*Source capture completeness could not be proven/);
		expect(getShellSessionCount()).toBe(0);
	});

	it("preserves whitespace-only partial output when native run rejects", async () => {
		vi.spyOn(piNatives.Shell.prototype, "run").mockImplementation((_options, onChunk) => {
			onChunk?.(null, " \t\n");
			return Promise.reject(new Error("native whitespace rejection"));
		});
		let caught: unknown;
		try {
			await executeBash("ignored", { cwd: tempDir, timeout: 5000, sessionKey: "native-whitespace-rejection" });
		} catch (error) {
			caught = error;
		}
		const message = caught instanceof Error ? caught.message : "";
		expect(message.startsWith(" \t\n\nSource capture completeness could not be proven")).toBe(true);
	});

	it("bounds terminal artifact publication while recovering native rejection", async () => {
		const publishGate = Promise.withResolvers<{
			status: "published";
			artifactId: string;
		}>();
		vi.spyOn(piNatives.Shell.prototype, "run").mockImplementation((_options, onChunk) => {
			onChunk?.(null, "HEAD-TAIL");
			return Promise.reject(new Error("native rejected with spill"));
		});
		let caught: unknown;
		try {
			await executeBash("ignored", {
				cwd: tempDir,
				timeout: 5000,
				sessionKey: "native-rejection-publisher-stall",
				spillThreshold: 4,
				headBytes: 0,
				artifactPublisher: async () => publishGate.promise,
			});
		} catch (error) {
			caught = error;
		}
		const message = caught instanceof Error ? caught.message : "";
		expect(message).toContain("did not settle within 500ms");
		expect(message).toContain("native rejected with spill");
		publishGate.resolve({ status: "published", artifactId: "13" });
		await publishGate.promise;
	});

	it("bounds multibyte native rejection diagnostics", async () => {
		vi.spyOn(piNatives.Shell.prototype, "run").mockImplementation((_options, onChunk) => {
			onChunk?.(null, "retained-tail\n");
			return Promise.reject(new Error("😀".repeat(100_000)));
		});
		let caught: unknown;
		try {
			await executeBash("ignored", { cwd: tempDir, timeout: 5000, sessionKey: "bounded-native-rejection" });
		} catch (error) {
			caught = error;
		}
		const message = caught instanceof Error ? caught.message : "";
		expect(message).toContain("retained-tail");
		expect(message).toContain("[native error truncated]");
		expect(Buffer.byteLength(message, "utf-8")).toBeLessThan(5000);
	});

	it("bounds multibyte native rejection before the first output callback", async () => {
		vi.spyOn(piNatives.Shell.prototype, "run").mockRejectedValue(new Error("😀".repeat(100_000)));
		let caught: unknown;
		try {
			await executeBash("ignored", { cwd: tempDir, timeout: 5000, sessionKey: "bounded-empty-native-rejection" });
		} catch (error) {
			caught = error;
		}
		const message = caught instanceof Error ? caught.message : "";
		expect(message).toContain("before any output was retained");
		expect(message).toContain("[native error truncated]");
		expect(Buffer.byteLength(message, "utf-8")).toBeLessThan(2000);
	});

	it("rejects injected direct executor artifact ids before execution", async () => {
		for (const artifactId of ["bad\nid", "9007199254740992", "00", "01"]) {
			await expect(executeBash("ignored", { cwd: tempDir, artifactId })).rejects.toThrow("Invalid Bash artifact id");
		}
	});

	it("reports the bash shell-session owner count via runtime resource gauges", async () => {
		await disposeAllShellSessions();
		expect(getRuntimeResourceCounts()["bash.shellSessions"]).toBe(0);
		await executeBash("echo hi", { cwd: tempDir, timeout: 5000, sessionKey: "gauge-test" });
		expect(getRuntimeResourceCounts()["bash.shellSessions"]).toBeGreaterThanOrEqual(1);
		await disposeAllShellSessions();
		expect(getRuntimeResourceCounts()["bash.shellSessions"]).toBe(0);
	});

	it("honors cwd", async () => {
		const result = await executeBash("pwd", { cwd: tempDir, timeout: 5000 });
		expect(result.output.trim()).toBe(fs.realpathSync(tempDir));
	});

	it("canonicalizes symlinked cwd before execution", async () => {
		if (process.platform === "win32") {
			return;
		}

		const realDir = path.join(tempDir, "real");
		const linkDir = path.join(tempDir, "link");
		fs.mkdirSync(realDir);
		fs.symlinkSync(realDir, linkDir, "dir");

		const result = await executeBash("pwd", { cwd: linkDir, timeout: 5000 });
		expect(result.output.trim()).toBe(fs.realpathSync(linkDir));
	});

	it("passes env vars", async () => {
		const result = await executeBash("echo $PI_TEST_ENV", {
			cwd: tempDir,
			timeout: 5000,
			env: { PI_TEST_ENV: "hello" },
		});
		expect(result.output.trim()).toBe("hello");
	});

	it("applies non-interactive environment defaults", async () => {
		const result = await executeBash('echo "$GIT_TERMINAL_PROMPT:$PI_TEST_ENV"', {
			cwd: tempDir,
			timeout: 5000,
			env: { PI_TEST_ENV: "hello" },
		});
		expect(result.output.trim()).toBe("0:hello");
	});

	it("can ignore configured shell prefixes", async () => {
		vi.spyOn(Settings.prototype, "getShellConfig").mockReturnValue({
			shell: Bun.env.SHELL?.includes("bash") ? Bun.env.SHELL : "/bin/bash",
			args: ["-l", "-c"],
			env: {
				PATH: Bun.env.PATH ?? "",
				HOME: Bun.env.HOME ?? tempDir,
			},
			prefix: "false &&",
		});

		const blocked = await executeBash("echo prefixed", { cwd: tempDir, timeout: 5000 });
		expect(blocked.exitCode).not.toBe(0);

		const ignored = await executeBash("echo unprefixed", {
			cwd: tempDir,
			timeout: 5000,
			ignoreShellPrefix: true,
		});
		expect(ignored.output.trim()).toBe("unprefixed");
	});

	it("invokes onChunk with command output", async () => {
		let seenChunk: string | null = null;
		const result = await executeBash("echo hello", {
			cwd: tempDir,
			timeout: 5000,
			onChunk: chunk => {
				if (seenChunk === null) {
					seenChunk = chunk;
				}
			},
		});
		expect(result.output.trim()).toBe("hello");
		expect(seenChunk).not.toBeNull();
		expect(seenChunk ?? "").toContain("hello");
	});

	it("marks native callback loss as source truncation", async () => {
		vi.spyOn(piNatives.Shell.prototype, "run").mockImplementation((_options, onChunk) => {
			onChunk?.(null, "retained-tail\n");
			return Promise.resolve({
				exitCode: 0,
				cancelled: false,
				timedOut: false,
				droppedOutputChunks: 2,
				droppedOutputBytes: 17,
			});
		});

		const result = await executeBash("ignored", {
			cwd: tempDir,
			timeout: 5000,
			sessionKey: "native-callback-loss",
		});

		expect(result.output).toContain("retained-tail");
		expect(result.truncated).toBe(true);
		expect(result.sourceTruncatedBytes).toBe(17);
		await disposeAllShellSessions();
	});

	it("fails closed when native reports dropped chunks without byte accounting", async () => {
		vi.spyOn(piNatives.Shell.prototype, "run").mockResolvedValue({
			exitCode: 0,
			cancelled: false,
			timedOut: false,
			droppedOutputChunks: 1,
			droppedOutputBytes: 0,
		});

		const result = await executeBash("ignored", {
			cwd: tempDir,
			timeout: 5000,
			sessionKey: "chunks-only-source-loss",
		});
		expect(result.truncated).toBe(true);
		expect(result.sourceCaptureIncomplete).toBe(true);
		expect(result.sourceTruncatedBytes).toBeUndefined();
	});

	it("fails closed when native reports dropped bytes without chunk accounting", async () => {
		vi.spyOn(piNatives.Shell.prototype, "run").mockResolvedValue({
			exitCode: 0,
			cancelled: false,
			timedOut: false,
			droppedOutputChunks: 0,
			droppedOutputBytes: 9,
		});
		const result = await executeBash("ignored", {
			cwd: tempDir,
			timeout: 5000,
			sessionKey: "bytes-only-source-loss",
		});
		expect(result.sourceTruncatedBytes).toBe(9);
		expect(result.sourceCaptureIncomplete).toBe(true);
	});

	it("fails closed on malformed native loss counters", async () => {
		vi.spyOn(piNatives.Shell.prototype, "run").mockResolvedValue({
			exitCode: 0,
			cancelled: false,
			timedOut: false,
			droppedOutputChunks: -1,
			droppedOutputBytes: Number.NaN,
		});

		const result = await executeBash("ignored", {
			cwd: tempDir,
			timeout: 5000,
			sessionKey: "malformed-source-loss",
		});
		expect(result.truncated).toBe(true);
		expect(result.sourceCaptureIncomplete).toBe(true);
	});

	it("fails closed on one-sided zero callback-loss counters", async () => {
		for (const nativeResult of [
			{ exitCode: 0, cancelled: false, timedOut: false, droppedOutputBytes: 0 },
			{ exitCode: 0, cancelled: false, timedOut: false, droppedOutputChunks: 0 },
		]) {
			vi.spyOn(piNatives.Shell.prototype, "run").mockResolvedValueOnce(nativeResult);
			const result = await executeBash("ignored", {
				cwd: tempDir,
				timeout: 5000,
				sessionKey: `one-sided-${"droppedOutputBytes" in nativeResult ? "bytes" : "chunks"}`,
			});
			expect(result.sourceCaptureIncomplete).toBe(true);
		}
	});

	it("marks saturated native loss counters as source-incomplete", async () => {
		vi.spyOn(piNatives.Shell.prototype, "run").mockResolvedValue({
			exitCode: 0,
			cancelled: false,
			timedOut: false,
			droppedOutputChunks: Number.MAX_SAFE_INTEGER,
			droppedOutputBytes: Number.MAX_SAFE_INTEGER,
			outputLossCountSaturated: true,
		});

		const result = await executeBash("ignored", {
			cwd: tempDir,
			timeout: 5000,
			sessionKey: "saturated-source-loss",
		});

		expect(result.sourceTruncatedBytes).toBe(Number.MAX_SAFE_INTEGER);
		expect(result.sourceCaptureIncomplete).toBe(true);
	});

	it("does not label minimized source-loss artifacts as complete", async () => {
		vi.spyOn(piNatives.Shell.prototype, "run").mockResolvedValue({
			exitCode: 0,
			cancelled: false,
			timedOut: false,
			droppedOutputChunks: 1,
			droppedOutputBytes: 9,
			minimized: {
				filter: "test",
				text: "minimized output",
				originalText: "partial raw output",
				inputBytes: 18,
				outputBytes: 16,
			},
		});

		const result = await executeBash("ignored", {
			cwd: tempDir,
			timeout: 5000,
			sessionKey: "minimized-source-loss",
			onMinimizedSave: async () => ({ status: "saved", artifactId: "42", complete: true }),
		});

		expect(result.output).toContain("artifact save could not be verified in the current session");
		expect(result.output).not.toContain("artifact://42");
		expect(result.sourceTruncatedBytes).toBe(9);
	});

	it("does not label chunk-only minimized artifacts as complete", async () => {
		vi.spyOn(piNatives.Shell.prototype, "run").mockResolvedValue({
			exitCode: 0,
			cancelled: false,
			timedOut: false,
			droppedOutputChunks: 1,
			droppedOutputBytes: 0,
			minimized: {
				filter: "test",
				text: "minimized output",
				originalText: "original output",
				inputBytes: 15,
				outputBytes: 16,
			},
		});
		const result = await executeBash("ignored", {
			cwd: tempDir,
			timeout: 5000,
			sessionKey: "minimized-chunks-only",
			onMinimizedSave: async () => ({ status: "saved", artifactId: "12", complete: true }),
		});
		expect(result.output).toContain("artifact save could not be verified in the current session");
		expect(result.output).not.toContain("artifact://12");
		expect(result.sourceCaptureIncomplete).toBe(true);
	});

	it("fails closed on malformed native capture-status flags", async () => {
		for (const malformed of [null, 0]) {
			vi.spyOn(piNatives.Shell.prototype, "run").mockResolvedValueOnce({
				exitCode: 0,
				cancelled: false,
				timedOut: false,
				outputCaptureIncomplete: malformed,
				outputLossCountSaturated: malformed,
			} as never);
			const result = await executeBash("ignored", {
				cwd: tempDir,
				timeout: 5000,
				sessionKey: `malformed-native-flags-${String(malformed)}`,
			});
			expect(result.sourceCaptureIncomplete).toBe(true);
		}
	});

	it("rejects inconsistent native minimizer telemetry before saving", async () => {
		const saveSpy = vi.fn(async () => ({ status: "saved" as const, artifactId: "15", complete: true as const }));
		vi.spyOn(piNatives.Shell.prototype, "run").mockImplementation((_options, onChunk) => {
			onChunk?.(null, "retained raw output");
			return Promise.resolve({
				exitCode: 0,
				cancelled: false,
				timedOut: false,
				minimized: {
					filter: "test",
					text: "minimized output",
					originalText: "partial raw output",
					inputBytes: 999,
					outputBytes: 16,
				},
			});
		});
		const result = await executeBash("ignored", {
			cwd: tempDir,
			timeout: 5000,
			sessionKey: "malformed-minimizer-telemetry",
			onMinimizedSave: saveSpy,
		});
		expect(saveSpy).not.toHaveBeenCalled();
		expect(result.output).toContain("retained raw output");
		expect(result.sourceCaptureIncomplete).toBe(true);
	});

	it("bounds stalled minimized artifact saves", async () => {
		const saveGate = Promise.withResolvers<BashMinimizedSaveReturn>();
		vi.spyOn(piNatives.Shell.prototype, "run").mockResolvedValue({
			exitCode: 0,
			cancelled: false,
			timedOut: false,
			minimized: {
				filter: "test",
				text: "minimized output",
				originalText: "original output",
				inputBytes: 15,
				outputBytes: 16,
			},
		});
		const raced = await Promise.race([
			executeBash("ignored", {
				cwd: tempDir,
				timeout: 5000,
				sessionKey: "stalled-minimizer-save",
				onMinimizedSave: async () => saveGate.promise,
			}),
			Bun.sleep(750).then(() => undefined),
		]);
		expect(raced).toBeDefined();
		expect(raced?.output).toContain("did not settle within 500ms");
		saveGate.resolve({ status: "unavailable" });
		await saveGate.promise;
	});

	it("applies callback loss when native abort settles during cleanup", async () => {
		const nativeResult = Promise.withResolvers<{
			exitCode: undefined;
			cancelled: true;
			timedOut: false;
			droppedOutputChunks: number;
			droppedOutputBytes: number;
		}>();
		vi.spyOn(piNatives.Shell.prototype, "run").mockImplementation((_options, onChunk) => {
			onChunk?.(null, "retained-tail\n");
			return nativeResult.promise;
		});
		vi.spyOn(piNatives.Shell.prototype, "abort").mockResolvedValue();
		const controller = new AbortController();
		const promise = executeBash("ignored", {
			cwd: tempDir,
			timeout: 5000,
			signal: controller.signal,
			sessionKey: "settled-abort-loss",
		});

		await Bun.sleep(10);
		controller.abort();
		nativeResult.resolve({
			exitCode: undefined,
			cancelled: true,
			timedOut: false,
			droppedOutputChunks: 2,
			droppedOutputBytes: 17,
		});
		const result = await promise;

		expect(result.cancelled).toBe(true);
		expect(result.sourceTruncatedBytes).toBe(17);
		expect(result.sourceCaptureIncomplete).toBeUndefined();
	});

	it("returns even if command spawns a background job", async () => {
		if (process.platform === "win32") {
			return;
		}
		const runPromise = executeBash("{ sleep 2; } & echo fg", {
			cwd: tempDir,
			timeout: 5000,
		});
		const timed = await Promise.race([
			runPromise.then(result => ({ type: "result" as const, result })),
			Bun.sleep(BACKGROUND_COMPLETION_RACE_MS).then(() => ({ type: "timeout" as const })),
		]);
		expect(timed.type).toBe("result");
		if (timed.type === "result") {
			expect(timed.result.output).toContain("fg");
		}
	});

	it("returns a real PID for background external commands", async () => {
		if (process.platform === "win32") {
			return;
		}

		const result = await executeBash('python3 -c "import time; time.sleep(10)" & echo $!', {
			cwd: tempDir,
			timeout: 5000,
		});
		const pid = Number.parseInt(result.output.trim(), 10);
		expect(Number.isInteger(pid)).toBe(true);
		expect(pid).toBeGreaterThan(0);
		expect(() => process.kill(pid, 0)).not.toThrow();
		expect(() => process.kill(pid, "SIGKILL")).not.toThrow();
	});

	it("times out commands", async () => {
		if (process.platform === "win32") {
			return;
		}
		const result = await executeBash("sleep 10", { cwd: tempDir, timeout: 50 });
		expect(result.cancelled).toBe(true);
		expect(result.output).toContain("timed out");
	});

	it("times out before follow-up output", async () => {
		if (process.platform === "win32") {
			return;
		}
		const result = await executeBash("sleep 10; echo done", { cwd: tempDir, timeout: 50 });
		expect(result.cancelled).toBe(true);
		expect(result.output).toContain("timed out");
		expect(result.output).not.toContain("done");
	});

	it("aborts commands", async () => {
		if (process.platform === "win32") {
			return;
		}
		const controller = new AbortController();
		const promise = executeBash("sleep 10", {
			cwd: tempDir,
			timeout: 5000,
			signal: controller.signal,
		});
		await Bun.sleep(50);
		controller.abort();
		const result = await promise;
		expect(result.cancelled).toBe(true);
		expect(result.output).toContain("Command cancelled");
	});

	it("keeps timed-out disposal shells counted until abort settles", async () => {
		await executeBash("printf ready", {
			cwd: tempDir,
			timeout: 5000,
			sessionKey: "stalled-disposal-owner",
		});
		expect(getShellSessionCount()).toBe(1);
		const abortGate = Promise.withResolvers<void>();
		vi.spyOn(piNatives.Shell.prototype, "abort").mockImplementation(async () => abortGate.promise);

		await disposeAllShellSessions();
		expect(getShellSessionCount()).toBe(1);
		abortGate.resolve();
		await abortGate.promise;
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();
		expect(getShellSessionCount()).toBe(0);
	});

	it("returns promptly and quarantines the session key when native abort cleanup stalls", async () => {
		if (process.platform === "win32") {
			return;
		}

		const stalledRun = Promise.withResolvers<piNatives.ShellRunResult>();
		const originalRun = piNatives.Shell.prototype.run;
		let runCalls = 0;
		vi.spyOn(piNatives.Shell.prototype, "run").mockImplementation(function (this: Shell, options, onChunk) {
			runCalls++;
			if (runCalls === 1) {
				onChunk?.(null, "started\n");
				return stalledRun.promise;
			}
			return originalRun.call(this, options, onChunk);
		});
		const abortSpy = vi.spyOn(piNatives.Shell.prototype, "abort").mockResolvedValue();

		const controller = new AbortController();
		const promise = executeBash("sleep 10", {
			cwd: tempDir,
			timeout: 5000,
			signal: controller.signal,
			sessionKey: "hung-native-abort",
		});
		await Bun.sleep(50);
		controller.abort();

		const raced = await Promise.race([
			promise.then(result => ({ type: "result" as const, result })),
			Bun.sleep(750).then(() => ({ type: "timeout" as const })),
		]);

		expect(raced.type).toBe("result");
		if (raced.type === "result") {
			expect(raced.result.cancelled).toBe(true);
			expect(raced.result.output).toContain("Command cancelled");
			expect(raced.result.sourceCaptureIncomplete).toBe(true);
		}
		expect(abortSpy).not.toHaveBeenCalled();
		expect(getShellSessionCount()).toBe(1);

		const next = await executeBash("echo next", {
			cwd: tempDir,
			timeout: 5000,
			sessionKey: "hung-native-abort",
		});
		expect(next.output.trim()).toBe("next");
		expect(runCalls).toBe(1);
		expect(getShellSessionCount()).toBe(1);
		stalledRun.resolve({ exitCode: undefined, cancelled: true, timedOut: false });
		await stalledRun.promise;
		await Promise.resolve();
		expect(getShellSessionCount()).toBe(0);
	});

	it("returns promptly without invoking session-wide abort", async () => {
		const runStarted = Promise.withResolvers<void>();
		const stalledRun = Promise.withResolvers<piNatives.ShellRunResult>();
		vi.spyOn(piNatives.Shell.prototype, "run").mockImplementation((_options, onChunk) => {
			onChunk?.(null, "started\n");
			runStarted.resolve();
			return stalledRun.promise;
		});
		const abortSpy = vi.spyOn(piNatives.Shell.prototype, "abort").mockImplementation(() => {
			throw new Error("sync abort failure");
		});
		const controller = new AbortController();
		const promise = executeBash("sleep 10", {
			cwd: tempDir,
			timeout: 5000,
			signal: controller.signal,
			sessionKey: "sync-native-abort",
		});
		await runStarted.promise;
		controller.abort();

		const raced = await Promise.race([
			promise.then(result => ({ type: "result" as const, result })),
			Bun.sleep(750).then(() => ({ type: "timeout" as const })),
		]);
		expect(raced.type).toBe("result");
		if (raced.type === "result") {
			expect(raced.result.cancelled).toBe(true);
			expect(raced.result.sourceCaptureIncomplete).toBe(true);
		}
		expect(abortSpy).not.toHaveBeenCalled();
		stalledRun.resolve({ exitCode: undefined, cancelled: true, timedOut: false });
		await stalledRun.promise;
		await Promise.resolve();
	});

	it("keeps a shell retired until a surviving queued run settles", async () => {
		const firstStarted = Promise.withResolvers<void>();
		const secondStarted = Promise.withResolvers<void>();
		const firstResult = Promise.withResolvers<piNatives.ShellRunResult>();
		const secondResult = Promise.withResolvers<piNatives.ShellRunResult>();
		let calls = 0;
		vi.spyOn(piNatives.Shell.prototype, "run").mockImplementation(() => {
			calls++;
			if (calls === 1) {
				firstStarted.resolve();
				return firstResult.promise;
			}
			secondStarted.resolve();
			return secondResult.promise;
		});
		vi.spyOn(piNatives.Shell.prototype, "abort").mockResolvedValue();
		const controller = new AbortController();
		const first = executeBash("first", {
			cwd: tempDir,
			timeout: 5000,
			signal: controller.signal,
			sessionKey: "queued-retirement",
		});
		await firstStarted.promise;
		const second = executeBash("second", {
			cwd: tempDir,
			timeout: 5000,
			sessionKey: "queued-retirement",
		});
		await secondStarted.promise;
		controller.abort();
		firstResult.resolve({ exitCode: undefined, cancelled: true, timedOut: false });
		await first;
		expect(getShellSessionCount()).toBe(1);
		secondResult.resolve({ exitCode: 0, cancelled: false, timedOut: false });
		await second;
		await Promise.resolve();
		expect(getShellSessionCount()).toBe(0);
	});

	it("queued cancellation does not abort the active shell run", async () => {
		const firstStarted = Promise.withResolvers<void>();
		const secondStarted = Promise.withResolvers<void>();
		const firstResult = Promise.withResolvers<piNatives.ShellRunResult>();
		let calls = 0;
		vi.spyOn(piNatives.Shell.prototype, "run").mockImplementation(options => {
			calls++;
			if (calls === 1) {
				firstStarted.resolve();
				return firstResult.promise;
			}
			secondStarted.resolve();
			return new Promise(resolve => {
				(options as { signal?: AbortSignal }).signal?.addEventListener(
					"abort",
					() => resolve({ exitCode: undefined, cancelled: true, timedOut: false }),
					{ once: true },
				);
			});
		});
		const abortSpy = vi.spyOn(piNatives.Shell.prototype, "abort").mockResolvedValue();
		const first = executeBash("first", { cwd: tempDir, timeout: 5000, sessionKey: "queued-cancel-isolation" });
		await firstStarted.promise;
		const controller = new AbortController();
		const second = executeBash("second", {
			cwd: tempDir,
			timeout: 5000,
			signal: controller.signal,
			sessionKey: "queued-cancel-isolation",
		});
		await secondStarted.promise;
		controller.abort();
		const secondOutcome = await second;
		expect(secondOutcome.cancelled).toBe(true);
		expect(abortSpy).not.toHaveBeenCalled();

		firstResult.resolve({ exitCode: 0, cancelled: false, timedOut: false });
		const firstOutcome = await first;
		expect(firstOutcome.cancelled).toBe(false);
		await Promise.resolve();
		expect(getShellSessionCount()).toBe(0);
	});

	it("restores persistent sessions after native abort cleanup settles", async () => {
		if (process.platform === "win32") {
			return;
		}

		const nativeResult = Promise.withResolvers<{ exitCode: undefined; cancelled: true; timedOut: false }>();
		vi.spyOn(piNatives.Shell.prototype, "run").mockImplementation((_options, onChunk) => {
			onChunk?.(null, "started\n");
			return nativeResult.promise;
		});
		vi.spyOn(piNatives.Shell.prototype, "abort").mockResolvedValue();

		const controller = new AbortController();
		const promise = executeBash("sleep 10", {
			cwd: tempDir,
			timeout: 5000,
			signal: controller.signal,
			sessionKey: "settled-native-abort",
		});
		await Bun.sleep(50);
		controller.abort();
		await promise;

		nativeResult.resolve({ exitCode: undefined, cancelled: true, timedOut: false });
		await Bun.sleep(0);
		vi.restoreAllMocks();

		await executeBash("export PI_AFTER_ABORT=still_persistent", {
			cwd: tempDir,
			timeout: 5000,
			sessionKey: "settled-native-abort",
		});
		const next = await executeBash("printf '%s\n' \"$PI_AFTER_ABORT\"", {
			cwd: tempDir,
			timeout: 5000,
			sessionKey: "settled-native-abort",
		});
		expect(next.output.trim()).toBe("still_persistent");
	});

	it("returns at the JavaScript timeout when native timeout cleanup stalls", async () => {
		if (process.platform === "win32") {
			return;
		}

		const stalledRun = Promise.withResolvers<piNatives.ShellRunResult>();
		vi.spyOn(piNatives.Shell.prototype, "run").mockImplementation((_options, onChunk) => {
			onChunk?.(null, "started\n");
			return stalledRun.promise;
		});
		const abortSpy = vi.spyOn(piNatives.Shell.prototype, "abort").mockResolvedValue();

		const promise = executeBash("sleep 10", {
			cwd: tempDir,
			timeout: 1000,
			sessionKey: "hung-native-timeout",
		});
		const raced = await Promise.race([
			promise.then(result => ({ type: "result" as const, result })),
			Bun.sleep(1500).then(() => ({ type: "timeout" as const })),
		]);

		expect(raced.type).toBe("result");
		if (raced.type === "result") {
			expect(raced.result.cancelled).toBe(true);
			expect(raced.result.output).toContain("Command timed out after 1 seconds");
			expect(raced.result.sourceCaptureIncomplete).toBe(true);
		}
		expect(abortSpy).not.toHaveBeenCalled();
		stalledRun.resolve({ exitCode: undefined, cancelled: true, timedOut: false });
		await stalledRun.promise;
		await Promise.resolve();
	});

	it("aborts before follow-up output", async () => {
		if (process.platform === "win32") {
			return;
		}
		const controller = new AbortController();
		const promise = executeBash("sleep 10; echo done", {
			cwd: tempDir,
			timeout: 5000,
			signal: controller.signal,
		});
		await Bun.sleep(100);
		controller.abort();
		const result = await promise;
		expect(result.cancelled).toBe(true);
		expect(result.output).toContain("Command cancelled");
		expect(result.output).not.toContain("done");
	});

	it("resets persistent session state after abort", async () => {
		if (process.platform === "win32") {
			return;
		}

		const sessionKey = "reset-on-abort";
		await executeBash("export PI_RESET_VAR=alive", { cwd: tempDir, timeout: 5000, sessionKey });
		const beforeAbort = await executeBash("echo $PI_RESET_VAR", { cwd: tempDir, timeout: 5000, sessionKey });
		expect(beforeAbort.output.trim()).toBe("alive");

		const controller = new AbortController();
		const abortPromise = executeBash("sleep 10", {
			cwd: tempDir,
			timeout: 5000,
			signal: controller.signal,
			sessionKey,
		});
		await Bun.sleep(50);
		controller.abort();
		const aborted = await abortPromise;
		expect(aborted.cancelled).toBe(true);

		// biome-ignore lint/suspicious/noTemplateCurlyInString: this is a bash variable expansion
		const afterAbort = await executeBash("echo ${PI_RESET_VAR:-unset}", {
			cwd: tempDir,
			timeout: 5000,
			sessionKey,
		});
		expect(afterAbort.output.trim()).toBe("unset");
	});
	it("streams output chunks", async () => {
		const chunks: string[] = [];
		const result = await executeBash("i=1; while [ $i -le 20 ]; do echo line$i; i=$((i+1)); done", {
			cwd: tempDir,
			timeout: 5000,
			onChunk: chunk => {
				expect(chunk.length).toBeGreaterThan(0);
				chunks.push(chunk);
			},
		});
		// At least one chunk should have been delivered to onChunk
		expect(chunks.length).toBeGreaterThan(0);
		const combined = chunks.join("");
		expect(combined).toContain("line1");
		// Final result always has the complete output regardless of chunk throttle
		expect(result.output).toContain("line1");
		expect(result.output).toContain("line20");
	});

	it("streams large output without exhausting memory", async () => {
		if (process.platform === "win32") {
			return;
		}
		let sawChunk = false;
		const result = await executeBash("awk 'BEGIN { for (i = 0; i < 100000; i++) printf \"a\" }'", {
			cwd: tempDir,
			timeout: 5000,
			onChunk: () => {
				sawChunk = true;
			},
		});
		expect(sawChunk).toBe(true);
		expect(result.totalBytes).toBe(100000);
		expect(result.outputBytes).toBeLessThanOrEqual(DEFAULT_MAX_BYTES);
		expect(result.output).toContain("a");
	});

	it("preserves the shared direct-executor head and tail windows", async () => {
		if (process.platform === "win32") return;
		const startSentinel = "DIRECT-EXECUTOR-START";
		const endSentinel = "DIRECT-EXECUTOR-END";
		const result = await executeBash(
			`printf '%s\\n' '${startSentinel}'; seq 1 20000; printf '%s\\n' '${endSentinel}'`,
			{ cwd: tempDir, timeout: 5_000 },
		);

		const sharedWindowBudget = DEFAULT_MAX_BYTES + ARTIFACT_HEAD_BYTES_DEFAULT;
		expect(result.truncated).toBe(true);
		expect(result.outputBytes).toBeLessThanOrEqual(sharedWindowBudget + 1024);
		expect(result.output.startsWith(`${startSentinel}\n`)).toBe(true);
		expect(result.output.endsWith(`${endSentinel}\n`)).toBe(true);
		expect(result.output).toContain("elided");
	});

	it("handles multi-million line output without freeze or OOM", async () => {
		if (process.platform === "win32") return;

		// 5 million lines ~= 40MB of output. Before the 64KB read buffer and
		// direct-push fixes, this would freeze or OOM the process.
		const lineCount = 5_000_000;
		let chunkCount = 0;
		const start = Date.now();
		const result = await executeBash(`seq 1 ${lineCount}`, {
			cwd: tempDir,
			timeout: 30_000,
			onChunk: () => {
				chunkCount++;
			},
		});
		const elapsed = Date.now() - start;

		// Should complete, not hang or OOM
		expect(result.exitCode).toBe(0);
		expect(result.cancelled).toBe(false);

		// Native execution bounds pathological streams but preserves a terminal tail
		// and reports the omitted source bytes explicitly.
		expect(result.totalLines).toBeGreaterThan(100_000);
		expect(result.totalBytes).toBeGreaterThan(DEFAULT_MAX_BYTES * 100);
		expect(result.truncated).toBe(true);
		expect(result.sourceTruncatedBytes ?? 0).toBeGreaterThan(0);

		// Direct executor output remains bounded by the shared head+tail window.
		expect(result.outputBytes).toBeLessThan(result.totalBytes);
		expect(result.outputBytes).toBeLessThanOrEqual(DEFAULT_MAX_BYTES + ARTIFACT_HEAD_BYTES_DEFAULT + 1024);

		// The visible numeric tail should stay near the end of the generated sequence.
		const tailValues = result.output
			.split("\n")
			.slice(-1000)
			.map(line => Number(line.trim()))
			.filter(Number.isFinite);
		expect(tailValues.some(value => value >= lineCount - 500 && value <= lineCount)).toBe(true);

		// With 64KB read buffer, ~40MB should produce ~600 chunks, not 5M.
		// Allow generous headroom but ensure it's orders of magnitude below lineCount.
		expect(chunkCount).toBeLessThan(lineCount / 100);

		// Should complete in reasonable time (not frozen). On a modern machine
		// seq 1 5000000 itself takes ~0.5s; with JS overhead allow 20s.
		expect(elapsed).toBeLessThan(20_000);
	}, 35_000);

	it("sources snapshot env vars across session commands", async () => {
		if (process.platform === "win32") {
			return;
		}
		const bashPath = Bun.env.SHELL?.includes("bash") ? Bun.env.SHELL : "/bin/bash";
		if (!fs.existsSync(bashPath)) {
			return;
		}
		const snapshotPath = path.join(tempDir, "snapshot.sh");
		fs.writeFileSync(snapshotPath, "export PI_SNAPSHOT_TEST=from_snapshot\n");
		vi.spyOn(Settings.prototype, "getShellConfig").mockReturnValue({
			shell: bashPath,
			args: ["-l", "-c"],
			env: {
				PATH: Bun.env.PATH ?? "",
				HOME: Bun.env.HOME ?? tempDir,
			},
			prefix: undefined,
		});
		vi.spyOn(shellSnapshot, "getOrCreateSnapshot").mockResolvedValue(snapshotPath);
		const sessionKey = "snapshot-test";
		await executeBash("true", { cwd: tempDir, timeout: 5000, sessionKey });
		const result = await executeBash("echo $PI_SNAPSHOT_TEST", { cwd: tempDir, timeout: 5000, sessionKey });
		expect(result.output.trim()).toBe("from_snapshot");
	});

	it("can disable shell snapshots", async () => {
		if (process.platform === "win32") {
			return;
		}
		const bashPath = Bun.env.SHELL?.includes("bash") ? Bun.env.SHELL : "/bin/bash";
		if (!fs.existsSync(bashPath)) {
			return;
		}
		const snapshotPath = path.join(tempDir, "disabled-snapshot.sh");
		fs.writeFileSync(snapshotPath, "export PI_DISABLED_SNAPSHOT_TEST=from_snapshot\n");
		vi.spyOn(Settings.prototype, "getShellConfig").mockReturnValue({
			shell: bashPath,
			args: ["-l", "-c"],
			env: {
				PATH: Bun.env.PATH ?? "",
				HOME: Bun.env.HOME ?? tempDir,
			},
			prefix: undefined,
		});
		vi.spyOn(shellSnapshot, "getOrCreateSnapshot").mockResolvedValue(snapshotPath);

		const result = await executeBash("printenv PI_DISABLED_SNAPSHOT_TEST || printf unset", {
			cwd: tempDir,
			timeout: 5000,
			disableShellSnapshot: true,
			sessionKey: "disabled-snapshot-test",
		});
		expect(result.output.trim()).toBe("unset");
	});

	it("sources large bash functions without base64 eval wrappers", async () => {
		if (process.platform === "win32") {
			return;
		}
		const realBashPath = Bun.env.SHELL?.includes("bash") ? Bun.env.SHELL : "/bin/bash";
		if (!fs.existsSync(realBashPath)) {
			return;
		}

		const bashPath = path.join(tempDir, "test-bash");
		fs.symlinkSync(realBashPath, bashPath);
		const largeBody = Array.from({ length: 200 }, (_, index) => `    echo "snapshot ${index}"`).join("\n");
		fs.writeFileSync(path.join(tempDir, ".bashrc"), `pi_snapshot_large_function ()\n{\n${largeBody}\n}\n`);

		vi.spyOn(os, "homedir").mockReturnValue(tempDir);
		vi.spyOn(Settings.prototype, "getShellConfig").mockReturnValue({
			shell: bashPath,
			args: ["-l", "-c"],
			env: {
				PATH: Bun.env.PATH ?? "",
				HOME: tempDir,
			},
			prefix: undefined,
		});

		const snapshotPath = await shellSnapshot.getOrCreateSnapshot(bashPath, {
			PATH: Bun.env.PATH ?? "",
			HOME: tempDir,
		});
		expect(snapshotPath).not.toBeNull();
		const snapshot = fs.readFileSync(snapshotPath!, "utf8");
		expect(snapshot).toContain("pi_snapshot_large_function");
		expect(snapshot).not.toContain("base64 -d");

		const result = await executeBash("printf 'snapshot_ok\\n'", {
			cwd: tempDir,
			timeout: 5000,
			sessionKey: "large-function-snapshot",
		});
		expect(result.cancelled).toBe(false);
		expect(result.output.trim()).toBe("snapshot_ok");
	});

	it("does not allow exec to replace the host", async () => {
		const result = await executeBash("exec echo hi", { cwd: tempDir, timeout: 5000 });
		expect(result.cancelled).toBe(false);
		expect(result.exitCode).not.toBeUndefined();
		if (!result.output.includes("hi")) {
			expect(result.output.toLowerCase()).toContain("exec");
		}
	});

	it("completes even when background job keeps stdout pipe open", async () => {
		if (process.platform === "win32") return;

		const runPromise = executeBash("{ sleep 2; echo late; } & echo immediate", {
			cwd: tempDir,
			timeout: 5000,
		});
		const timed = await Promise.race([
			runPromise.then(result => ({ type: "result" as const, result })),
			Bun.sleep(BACKGROUND_COMPLETION_RACE_MS).then(() => ({ type: "timeout" as const })),
		]);

		expect(timed.type).toBe("result");
		if (timed.type === "result") {
			expect(timed.result.cancelled).toBe(false);
			expect(timed.result.exitCode).toBe(0);
			expect(timed.result.output).toContain("immediate");
		}
	});
	it("kills spawned process on timeout (not just orphans it)", async () => {
		if (process.platform === "win32") return;

		const marker = path.join(tempDir, "marker.txt");
		const markerEscaped = marker.replace(/'/g, "'\\''");

		// Command creates marker after a short delay, but we timeout before then.
		const result = await executeBash(`sleep ${KILL_MARKER_DELAY_SECONDS} && echo done > '${markerEscaped}'`, {
			cwd: tempDir,
			timeout: 100,
		});

		expect(result.cancelled).toBe(true);

		// Wait longer than the command would have needed to create the marker.
		await Bun.sleep(KILL_MARKER_ASSERTION_WAIT_MS);

		// If process was killed (not orphaned), marker should NOT exist
		expect(fs.existsSync(marker)).toBe(false);
	});

	it("kills background jobs on timeout", async () => {
		if (process.platform === "win32") return;

		const marker = path.join(tempDir, "marker-bg.txt");
		const markerEscaped = marker.replace(/'/g, "'\\''");

		const outcome = await executeBash(
			`{ sleep ${KILL_MARKER_DELAY_SECONDS}; echo done > '${markerEscaped}'; } & sleep 10`,
			{
				cwd: tempDir,
				timeout: 100,
			},
		).then(
			result => ({ kind: "settled" as const, result }),
			error => ({ kind: "ownership-incomplete" as const, error }),
		);

		if (outcome.kind === "settled") expect(outcome.result.cancelled).toBe(true);
		else
			expect(outcome.error instanceof Error ? outcome.error.message : String(outcome.error)).toMatch(
				/ownership incomplete/i,
			);

		await Bun.sleep(KILL_MARKER_ASSERTION_WAIT_MS);
		expect(fs.existsSync(marker)).toBe(false);
	});

	it("kills background jobs on abort", async () => {
		if (process.platform === "win32") return;

		const marker = path.join(tempDir, "marker-bg-abort.txt");
		const markerEscaped = marker.replace(/'/g, "'\\''");
		const controller = new AbortController();

		const promise = executeBash(
			`{ sleep ${KILL_MARKER_DELAY_SECONDS}; echo done > '${markerEscaped}'; } & sleep 10`,
			{
				cwd: tempDir,
				timeout: 10000,
				signal: controller.signal,
			},
		);

		await Bun.sleep(100);
		controller.abort();
		const result = await promise;

		expect(result.cancelled).toBe(true);
		expect(result.output).toContain("Command cancelled");

		await Bun.sleep(KILL_MARKER_ASSERTION_WAIT_MS);
		expect(fs.existsSync(marker)).toBe(false);
	});

	it("kills spawned process on abort (not just orphans it)", async () => {
		if (process.platform === "win32") return;

		const marker = path.join(tempDir, "marker.txt");
		const markerEscaped = marker.replace(/'/g, "'\\''");
		const controller = new AbortController();

		// Command creates marker after a short delay.
		const promise = executeBash(`sleep ${KILL_MARKER_DELAY_SECONDS} && echo done > '${markerEscaped}'`, {
			cwd: tempDir,
			timeout: 10000,
			signal: controller.signal,
		});

		// Abort before the command can create the marker.
		await Bun.sleep(100);
		controller.abort();
		const result = await promise;

		expect(result.cancelled).toBe(true);
		expect(result.output).toContain("Command cancelled");

		// Wait longer than the command would have needed to create the marker.
		await Bun.sleep(KILL_MARKER_ASSERTION_WAIT_MS);

		// If process was killed (not orphaned), marker should NOT exist
		expect(fs.existsSync(marker)).toBe(false);
	});
});
