import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

interface RecoveryResult {
	found: boolean;
	stats: {
		autoDisabledReason?: string;
		currentCommitTransition?: { kind: string; reason: string };
	};
}

function runWorker(worker: string, root: string, mode: string) {
	return Bun.spawnSync({
		cmd: [process.execPath, worker],
		env: {
			...process.env,
			GJC_SESSION_MEMORY_CRASH_MODE: mode,
			GJC_SESSION_MEMORY_CRASH_ROOT: root,
		},
		stdout: "pipe",
		stderr: "pipe",
	});
}

describe("session memory physical crash recovery", () => {
	for (const { crashMode, restoreTail } of [
		{ crashMode: "crash-after-transcript-fsync", restoreTail: false },
		{ crashMode: "crash-after-tail-fsync", restoreTail: false },
		{ crashMode: "crash-before-tail-fsync", restoreTail: true },
	]) {
		it(`recovers authoritative append after ${crashMode}`, () => {
			const root = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-session-crash-"));
			const worker = path.join(import.meta.dir, "fixtures", "session-memory-crash-worker.ts");
			try {
				const setup = runWorker(worker, root, "setup");
				expect(setup.exitCode, setup.stderr.toString()).toBe(0);
				const fixture = JSON.parse(setup.stdout.toString()) as { sessionFile: string };
				const tailPath = `${fixture.sessionFile.slice(0, -6)}/.session-memory.spill.tail`;
				const durableTailBefore = fs.readFileSync(tailPath);
				const crashed = runWorker(worker, root, crashMode);
				expect(crashed.exitCode).not.toBe(0);
				if (restoreTail) fs.writeFileSync(tailPath, durableTailBefore);
				const recovered = runWorker(worker, root, "recover");
				expect(recovered.exitCode, recovered.stderr.toString()).toBe(0);
				const result = JSON.parse(recovered.stdout.toString()) as RecoveryResult;
				expect(result.found).toBe(true);
				expect(result.stats.autoDisabledReason).toBe("sidecar_reload_failures");
				expect(result.stats.currentCommitTransition).toEqual({
					kind: "exact",
					reason: "descriptor_and_proof_match",
				});
			} finally {
				fs.rmSync(root, { recursive: true, force: true });
			}
		}, 30_000);
	}
});
