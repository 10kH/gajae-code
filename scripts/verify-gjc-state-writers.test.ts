import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const script = path.join(import.meta.dir, "verify-gjc-state-writers.ts");

async function run(root: string) {
	const child = Bun.spawn(["bun", script, "--fail", "--root", root], { stdout: "pipe", stderr: "pipe" });
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	return { stdout, stderr, exitCode };
}

test("--root scans the supplied PR-head tree rather than the verifier source tree", async () => {
	const root = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-writer-root-"));
	try {
		const file = path.join(root, "packages", "coding-agent", "src", "bad.ts");
		await fs.mkdir(path.dirname(file), { recursive: true });
		await Bun.write(file, 'const target = ".gjc/state.json";\nawait Bun.write(target, "bad");\n');
		const result = await run(root);
		expect(result.exitCode).toBe(1);
		expect(result.stdout).toContain("scanned packages/coding-agent/src");
		expect(`${result.stdout}\n${result.stderr}`).toContain("packages/coding-agent/src/bad.ts");
		expect(`${result.stdout}\n${result.stderr}`).toContain("G1 FAIL");
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
});
