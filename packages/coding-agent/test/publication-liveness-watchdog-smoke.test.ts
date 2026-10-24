import { expect, test } from "bun:test";
import * as path from "node:path";
import { smokeTestPublicationLivenessWatchdog } from "../src/sdk/broker/publication-liveness-watchdog-smoke";

const packageDir = path.resolve(import.meta.dir, "..");
const repoRoot = path.resolve(packageDir, "../..");
const compiledLiteral = "./packages/coding-agent/src/sdk/broker/publication-liveness-watchdog-worker.ts";

test("publication liveness smoke boots the source worker and stops it", async () => {
	await expect(smokeTestPublicationLivenessWatchdog()).resolves.toBeUndefined();
});

test("publication liveness smoke initializes the compiled worker entrypoint", async () => {
	const childPath = path.join(import.meta.dir, "publication-liveness-watchdog-smoke-child.ts");
	const child = Bun.spawn([process.execPath, childPath], {
		cwd: repoRoot,
		stdin: "ignore",
		stdout: "pipe",
		stderr: "pipe",
	});
	const finished = await Promise.race([child.exited.then(() => true), Bun.sleep(10_000).then(() => false)]);
	if (!finished) child.kill("SIGKILL");
	const stderr = await new Response(child.stderr).text();
	expect(finished, stderr).toBe(true);
	expect(child.exitCode, stderr).toBe(0);
}, 15_000);

test("publication liveness smoke keeps the compiled literal on the CLI smoke path", async () => {
	const [smokeSource, watchdogSource, compileArgsSource, cliSource] = await Promise.all([
		Bun.file(path.join(packageDir, "src/sdk/broker/publication-liveness-watchdog-smoke.ts")).text(),
		Bun.file(path.join(packageDir, "src/sdk/broker/publication-liveness-watchdog.ts")).text(),
		Bun.file(path.join(packageDir, "scripts/compile-args.ts")).text(),
		Bun.file(path.join(packageDir, "src/cli-main.ts")).text(),
	]);
	for (const source of [smokeSource, watchdogSource, compileArgsSource]) {
		expect(source).toContain(`"${compiledLiteral}"`);
	}
	expect(smokeSource).toContain("isEmbeddedCompiledModule()");
	expect(watchdogSource).toContain("isEmbeddedCompiledModule()");
	expect(cliSource).toContain("await smokeTestPublicationLivenessWatchdog()");
});
