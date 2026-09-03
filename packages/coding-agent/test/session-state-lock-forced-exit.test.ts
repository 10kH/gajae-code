import { afterEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	SessionStateLockTestHooks,
	setSessionStateLockNativeBindings,
	withSessionStateFileLock,
} from "../src/gjc-runtime/session-state-lock";
import { exactIdentityNativeBindings } from "./helpers/exact-identity-natives";

const probe = path.join(import.meta.dir, "fixtures", "session-state-lock-forced-exit-probe.ts");
const roots: string[] = [];

async function waitForFile(file: string): Promise<void> {
	for (let attempt = 0; attempt < 200; attempt++) {
		if (await fs.exists(file)) return;
		await Bun.sleep(10);
	}
	throw new Error(`Timed out waiting for ${file}`);
}

afterEach(async () => {
	SessionStateLockTestHooks.ownerHostId = undefined;
	SessionStateLockTestHooks.legacyOwnerHostId = undefined;
	SessionStateLockTestHooks.unqualifiedOwnerIsLocal = undefined;
	setSessionStateLockNativeBindings(undefined);
	vi.restoreAllMocks();
	await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

describe("session-state lock forced-exit recovery", () => {
	it("keeps SIGTERM bounded and immediately reclaims the dead cleanup owner", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-forced-exit-lock-"));
		roots.push(root);
		const stateFile = path.join(root, "runtime-state.json");
		const child = Bun.spawn([process.execPath, probe, root], {
			cwd: path.resolve(import.meta.dir, "../../.."),
			env: { ...process.env, GJC_CLEANUP_DEADLINE_MS: "100" },
			stdout: "pipe",
			stderr: "pipe",
		});
		try {
			await waitForFile(path.join(root, "ready"));
			const signaledAt = performance.now();
			child.kill("SIGTERM");
			const exit = await Promise.race([child.exited, Bun.sleep(2_000).then(() => "timeout" as const)]);
			expect(exit).toBe(143);
			expect(performance.now() - signaledAt).toBeLessThan(1_000);
			const transitionDir = `${stateFile}.lock.transition`;
			expect(await fs.exists(transitionDir)).toBe(true);
			expect(JSON.parse(await fs.readFile(`${transitionDir}.owner`, "utf8"))).toMatchObject({
				pid: child.pid,
				owner_host_id: "forced-exit-probe-host",
			});

			setSessionStateLockNativeBindings(() => exactIdentityNativeBindings);
			SessionStateLockTestHooks.ownerHostId = () => "forced-exit-probe-host";
			SessionStateLockTestHooks.legacyOwnerHostId = () => "forced-exit-probe-legacy-host";
			SessionStateLockTestHooks.unqualifiedOwnerIsLocal = false;
			const sleep = vi.spyOn(Bun, "sleep");

			await expect(withSessionStateFileLock(stateFile, async () => "resumed")).resolves.toBe("resumed");
			expect(sleep).not.toHaveBeenCalled();
			expect(await fs.exists(transitionDir)).toBe(false);
		} finally {
			if (child.exitCode === null) {
				child.kill("SIGKILL");
				await child.exited;
			}
		}
	}, 10_000);
});
