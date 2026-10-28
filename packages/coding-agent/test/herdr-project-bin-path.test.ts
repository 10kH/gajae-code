import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const probe = path.join(import.meta.dir, "fixtures/herdr-project-bin-path-probe.ts");

function writeExecutable(file: string, marker: string): void {
	fs.writeFileSync(file, `#!/bin/sh\n: > ${JSON.stringify(marker)}\nexit 0\n`);
	fs.chmodSync(file, 0o755);
}

function runProbe(mode: "attack" | "allow" | "dynamic"): { payload: number; allowed: number; child: string } {
	const home = fs.mkdtempSync(path.join(os.tmpdir(), "herdr-home-"));
	const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "herdr-cwd-"));
	const payload = path.join(cwd, "payload.sh");
	const allowed = path.join(cwd, "allow.sh");
	const dynamicPayload = path.join(home, "payload.sh");
	writeExecutable(mode === "dynamic" ? dynamicPayload : payload, path.join(cwd, "payload-ran"));
	writeExecutable(allowed, path.join(cwd, "allow-ran"));
	const declared = mode === "dynamic" ? "$HOME/payload.sh" : payload;
	fs.writeFileSync(path.join(cwd, ".env"), `HERDR_ENV=1\nHERDR_PANE_ID=gjc1\nHERDR_BIN_PATH=${declared}\n`);
	const env: Record<string, string> = {
		PATH: "/usr/bin:/bin",
		HOME: home,
		USERPROFILE: home,
		CI: "1",
		TERM: "dumb",
	};
	if (mode === "allow") env.HERDR_BIN_PATH = allowed;
	const result = spawnSync(process.execPath, [probe, mode === "allow" ? "allow" : "attack"], {
		cwd,
		env,
		encoding: "utf8",
		timeout: 120_000,
	});
	if (result.error) throw result.error;
	const line = (result.stdout ?? "").split("\n").find(entry => entry.startsWith("RESULT "));
	if (result.status !== 0 || line === undefined) {
		throw new Error(`probe ${mode} exited ${result.status}\n${result.stderr ?? ""}\n${result.stdout ?? ""}`);
	}
	const payloadHit = /payload=(\d)/.exec(line);
	const allowedHit = /allowed=(\d)/.exec(line);
	const childHit = /child=(".*")$/.exec(line);
	if (!payloadHit || !allowedHit || !childHit) throw new Error(`unparsed probe output: ${line}`);
	return {
		payload: Number(payloadHit[1]),
		allowed: Number(allowedHit[1]),
		child: JSON.parse(childHit[1]) as string,
	};
}

describe("project HERDR_BIN_PATH at runRootCommand", () => {
	it.skipIf(process.platform === "win32")(
		"does not execute a project dotenv HERDR_BIN_PATH and omits it from a child",
		() => {
			const result = runProbe("attack");
			expect(result.payload).toBe(0);
			expect(result.child).toBe("");
		},
		60_000,
	);

	it.skipIf(process.platform === "win32")(
		"does not execute a dynamic project HERDR_BIN_PATH and omits it from a child",
		() => {
			const result = runProbe("dynamic");
			expect(result.payload).toBe(0);
			expect(result.child).toBe("");
		},
		60_000,
	);

	it.skipIf(process.platform === "win32")(
		"keeps a different shell-exported HERDR_BIN_PATH and runs that executable",
		() => {
			const result = runProbe("allow");
			expect(result.payload).toBe(0);
			expect(result.allowed).toBe(1);
			expect(result.child.endsWith(`${path.sep}allow.sh`)).toBe(true);
		},
		60_000,
	);
});
