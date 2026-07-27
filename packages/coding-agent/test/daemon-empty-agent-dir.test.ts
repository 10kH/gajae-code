import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { runChatDaemonInternal } from "@gajae-code/coding-agent/sdk/bus/chat-daemon-cli";
import { daemonPaths } from "@gajae-code/coding-agent/sdk/bus/daemon-paths";
import { runDaemonInternal, runDaemonSmoke } from "@gajae-code/coding-agent/sdk/bus/telegram-daemon-cli";

/**
 * Every daemon path is built as `path.join(agentDir, "notifications")`, which
 * silently yields a *relative* path when the first segment is empty. The spawn
 * sites pass `--agent-dir` unconditionally, so `--agent-dir ""` used to make the
 * daemon write its lock, ownership, state, heartbeat and topic files into the
 * current working directory — inside whatever repository the user was in.
 *
 * `parseSdkInternalArgv` already rejects an empty `--agent-dir`; these lock the
 * same guard onto the daemon entry points.
 */

async function withTempCwd(fn: (dir: string) => Promise<void>): Promise<void> {
	// macOS resolves os.tmpdir() through a symlink, so compare against the real path.
	const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "gjc-empty-agent-dir-")));
	const previous = process.cwd();
	process.chdir(dir);
	try {
		await fn(dir);
	} finally {
		process.chdir(previous);
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

describe("empty --agent-dir", () => {
	it("keeps daemon paths relative when the agent dir is empty (the hazard)", () => {
		// Documents *why* the guard is needed: path.join swallows the empty segment.
		expect(path.isAbsolute(daemonPaths("").dir)).toBe(false);
		expect(daemonPaths("").dir).toBe("notifications");
		// A real agent dir is unaffected.
		expect(daemonPaths("/home/u/.gjc/agent").dir).toBe("/home/u/.gjc/agent/notifications");
	});

	it("does not write daemon state into the working directory on an empty agent dir", async () => {
		await withTempCwd(async dir => {
			await runDaemonSmoke({ agentDir: "" });
			expect(fs.existsSync(path.join(dir, "notifications"))).toBe(false);
			// It falls back to its own temp dir instead of the cwd root.
			const fallback = fs.readdirSync(dir).filter(n => n.startsWith(".telegram-daemon-smoke-"));
			expect(fallback).toHaveLength(1);
		});
	});

	it("still honors an explicit agent dir", async () => {
		await withTempCwd(async dir => {
			const agentDir = path.join(dir, "agent");
			await runDaemonSmoke({ agentDir });
			expect(fs.existsSync(path.join(agentDir, "notifications"))).toBe(true);
			expect(fs.existsSync(path.join(dir, "notifications"))).toBe(false);
		});
	});

	it("resolves a blank --agent-dir the same way as an empty one", () => {
		// path.join keeps a blank segment, so the result is still cwd-relative:
		// join("   ", "notifications") === "   /notifications".
		expect(path.isAbsolute(daemonPaths("   ").dir)).toBe(false);
	});

	it.each([
		["empty", ""],
		["blank", "   "],
	])("does not hand runDaemonInternal a %s agent dir from argv", async (_label, flagValue) => {
		await withTempCwd(async dir => {
			const seen: string[] = [];
			// The real argv path: runDaemonInternal parses `--agent-dir` itself.
			await runDaemonInternal(["--agent-dir", flagValue, "--owner-id", `${process.pid}-x`], {
				pidAlive: () => true,
				SettingsImpl: {
					init: async (options?: { agentDir?: string }) => {
						seen.push(options?.agentDir ?? "<undefined>");
						// No telegram config: the entry point returns right after resolution.
						return {
							get: () => undefined,
							getAgentDir: () => options?.agentDir ?? "",
							// Shape mirrors the repo's own notification snapshot fixture, with no
							// telegram credentials so the entry point returns right after resolving.
							getNotificationSettingsSnapshot: () => ({
								enabled: true,
								telegram: { topics: {}, activation: {} },
								discord: {},
								slack: {},
							}),
						} as never;
					},
				},
			});

			expect(seen).toHaveLength(1);
			expect(seen[0]).not.toBe("");
			expect(path.isAbsolute(seen[0]!)).toBe(true);
			expect(seen[0]).toBe(path.join(dir, ".gjc", "agent"));
		});
	});

	it("does not hand runChatDaemonInternal a blank agent dir from argv", async () => {
		await withTempCwd(async dir => {
			// Config lives in the fallback location, so it is only found when the
			// blank flag is correctly treated as absent.
			const fallback = path.join(dir, ".gjc", "agent");
			fs.mkdirSync(path.join(fallback, "notifications"), { recursive: true });

			const seen: string[] = [];
			await runChatDaemonInternal("discord", ["--agent-dir", "   ", "--owner-id", `${process.pid}-x`], {
				pidAlive: () => true,
				createRuntime: input => {
					seen.push(input.agentDir);
					throw new Error("unreachable in this fixture");
				},
			}).catch(() => undefined);

			// Either it resolved to the absolute fallback, or it stopped before the
			// runtime for an unrelated reason — but it must never carry the blank value.
			for (const value of seen) expect(path.isAbsolute(value)).toBe(true);
			expect(fs.existsSync(path.join(dir, "notifications"))).toBe(false);
		});
	});
});
