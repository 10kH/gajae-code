import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/**
 * Three Smithery reads decide where credentials go and where registry data comes
 * from:
 *
 * - `SMITHERY_URL` serves the CLI auth session and the verification URL the user
 *   is sent to (`smithery-auth.ts:39`).
 * - `SMITHERY_API_URL` is the base every request carries
 *   `Authorization: Bearer <apiKey>` to, and whose `/connect` routes return the
 *   connection records the agent consumes (`smithery-connect.ts:42`, `:109`).
 * - `SMITHERY_API_KEY` is that credential.
 *
 * `Bun.env === process.env`, and the env module merges the caller's `cwd/.env`
 * into it. `projectEnv` is parsed at module load from `process.cwd()`, so these
 * drive a child process with a controlled cwd.
 */

const PROBE = path.join(import.meta.dir, "fixtures", "smithery-env-probe.ts");
const KEYS = ["SMITHERY_URL", "SMITHERY_API_URL", "SMITHERY_API_KEY"] as const;

interface Resolved {
	url: string;
	apiKey: string | null;
	apiBaseUrl: string;
}

const tempDirs: string[] = [];

function tempDir(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-smithery-trust-"));
	tempDirs.push(dir);
	return dir;
}

function projectDir(dotenv?: string): string {
	const dir = tempDir();
	if (dotenv !== undefined) fs.writeFileSync(path.join(dir, ".env"), dotenv);
	return dir;
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

// Per-spawn budget for the probe child. After a suite warmup, healthy spawns
// finish in ~300ms; under extreme shard contention they may take a few seconds.
// Kill rather than wait for the outer it() timeout so a stalled child cannot
// pin the suite for the full 60s and leak pipes.
const PROBE_SPAWN_BUDGET_MS = 45_000;

async function resolveIn(cwd: string, overrides: Record<string, string> = {}): Promise<Resolved> {
	const env: Record<string, string> = {};
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined) env[key] = value;
	}
	for (const key of KEYS) delete env[key];
	// `$credentialEnv` also consults the agent `.env`, the GJC config `.env`,
	// `~/.env` and the login shell rc files; keep all of them neutral.
	env.HOME = tempDir();
	env.GJC_CODING_AGENT_DIR = tempDir();
	Object.assign(env, overrides);

	const proc = Bun.spawn([process.execPath, PROBE], { cwd, env, stdout: "pipe", stderr: "pipe" });
	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		try {
			proc.kill();
		} catch {
			// already exited
		}
	}, PROBE_SPAWN_BUDGET_MS);
	try {
		const [stdout, stderr, exitCode] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
			proc.exited,
		]);
		if (timedOut) {
			throw new Error(
				`probe timed out after ${PROBE_SPAWN_BUDGET_MS}ms and was killed` +
					(stderr.trim() ? `: ${stderr.trim()}` : ""),
			);
		}
		if (exitCode !== 0) throw new Error(`probe failed (${exitCode}): ${stderr}`);
		return JSON.parse(stdout.trim()) as Resolved;
	} finally {
		clearTimeout(timer);
	}
}

const PLANTED = [
	"SMITHERY_URL=https://attacker.example",
	"SMITHERY_API_URL=https://attacker.example/api",
	"SMITHERY_API_KEY=attacker-key",
].join("\n");

describe("Smithery env trust boundary", () => {
	// Cold-start the probe module graph outside per-test budgets. Under CI shard
	// contention the first Bun child can spend tens of seconds compiling the
	// probe + env stack; later spawns then complete in ~300ms. Without a warmup,
	// the first it() absorbs cold-start into its 60s budget and flakes (observed
	// 60001ms on #3969 exact-head after the 60s bump). beforeAll is the isolation
	// fix; 120s matches other child-process suite budgets and is not a third
	// blind per-test timeout bump.
	beforeAll(async () => {
		await resolveIn(projectDir());
	}, 120_000);

	it("uses the built-in endpoints and no key by default", async () => {
		const resolved = await resolveIn(projectDir());
		expect(resolved.url).toBe("https://smithery.ai");
		expect(resolved.apiBaseUrl).toBe("https://api.smithery.ai");
		expect(resolved.apiKey).toBeNull();
	}, 60_000);

	it("ignores Smithery endpoints planted by the project .env", async () => {
		const resolved = await resolveIn(projectDir(PLANTED));
		expect(resolved.url).toBe("https://smithery.ai");
		expect(resolved.apiBaseUrl).toBe("https://api.smithery.ai");
	}, 60_000);

	it("ignores a Smithery API key planted by the project .env", async () => {
		expect((await resolveIn(projectDir(PLANTED))).apiKey).toBeNull();
	}, 60_000);

	it("still honors inherited Smithery configuration", async () => {
		const resolved = await resolveIn(projectDir(), {
			SMITHERY_URL: "https://smithery.internal",
			SMITHERY_API_URL: "https://api.smithery.internal",
			SMITHERY_API_KEY: "operator-key",
		});
		expect(resolved.url).toBe("https://smithery.internal");
		expect(resolved.apiBaseUrl).toBe("https://api.smithery.internal");
		expect(resolved.apiKey).toBe("operator-key");
	}, 60_000);

	it("does not let the project .env override inherited configuration", async () => {
		const resolved = await resolveIn(projectDir(PLANTED), {
			SMITHERY_URL: "https://smithery.internal",
			SMITHERY_API_KEY: "operator-key",
		});
		expect(resolved.url).toBe("https://smithery.internal");
		expect(resolved.apiKey).toBe("operator-key");
	}, 60_000);
});
