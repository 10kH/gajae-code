import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Settings } from "@gajae-code/coding-agent/config/settings";
import { pythonBackend } from "@gajae-code/coding-agent/eval";
import { checkPythonKernelAvailability } from "@gajae-code/coding-agent/eval/py/kernel";
import type { ToolSession } from "@gajae-code/coding-agent/tools";
import { TempDir } from "@gajae-code/utils";
import { resetShellConfigCache } from "@gajae-code/utils/shell-config";

const HOST_PYTHON = Bun.which("python3") ?? Bun.which("python");
const ENV_KEYS = [
	"VIRTUAL_ENV",
	"CONDA_PREFIX",
	"NODE_ENV",
	"BUN_ENV",
	"GJC_PYTHON_SKIP_CHECK",
	"PI_PYTHON_SKIP_CHECK",
] as const;

function symlinkOk(): boolean {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-py-link-"));
	try {
		fs.symlinkSync("target", path.join(dir, "link"));
		return true;
	} catch {
		return false;
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

const SYMLINK_OK = symlinkOk();

function venvPythonResolvesOutside(): boolean {
	if (!HOST_PYTHON) return false;
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-py-venv-probe-"));
	const venv = path.join(dir, "v");
	try {
		const created = Bun.spawnSync([HOST_PYTHON, "-m", "venv", venv], { stdout: "ignore", stderr: "pipe" });
		if (created.exitCode !== 0) return false;
		const canonical = fs.realpathSync(interpreterFile(venv));
		return !under(venv, canonical);
	} catch {
		return false;
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

// In-tree copies (typical Windows venv launchers) are the rejected shape.
const OUTSIDE_VENV = venvPythonResolvesOutside();

async function createVenv(target: string): Promise<void> {
	const proc = Bun.spawn([HOST_PYTHON as string, "-m", "venv", target], { stdout: "pipe", stderr: "pipe" });
	const code = await proc.exited;
	if (code !== 0) {
		throw new Error(`venv create failed (${code}): ${await new Response(proc.stderr).text()}`);
	}
}

function sessionFor(cwd: string): ToolSession {
	return {
		cwd,
		hasUI: false,
		getSessionFile: () => null,
		settings: Settings.isolated(),
	} as ToolSession;
}

function shellQuote(value: string): string {
	return `'${value.replaceAll("'", `'\\''`)}'`;
}

async function writeScript(file: string, marker: string): Promise<void> {
	await fs.promises.mkdir(path.dirname(file), { recursive: true });
	await Bun.write(file, `#!/bin/sh\nprintf 'ran\\n' >> ${shellQuote(marker)}\nexit 0\n`);
	await fs.promises.chmod(file, 0o755);
}

async function writeCfg(venvDir: string, home: string): Promise<void> {
	await Bun.write(
		path.join(venvDir, "pyvenv.cfg"),
		`home = ${home}\ninclude-system-site-packages = false\nversion = 3.12.0\n`,
	);
}

function interpreterFile(venvDir: string): string {
	return process.platform === "win32"
		? path.join(venvDir, "Scripts", "python.exe")
		: path.join(venvDir, "bin", "python");
}

async function withProbeEnv<T>(extra: Record<string, string>, fn: () => Promise<T>): Promise<T> {
	const previous = new Map(ENV_KEYS.map(key => [key, Bun.env[key]]));
	for (const key of ENV_KEYS) delete Bun.env[key];
	for (const [key, value] of Object.entries(extra)) Bun.env[key] = value;
	resetShellConfigCache();
	try {
		return await fn();
	} finally {
		for (const key of ENV_KEYS) {
			const value = previous.get(key);
			if (value === undefined) delete Bun.env[key];
			else Bun.env[key] = value;
		}
		resetShellConfigCache();
	}
}

function under(root: string, candidate: string | undefined): boolean {
	if (!candidate) return false;
	const relative = path.relative(path.resolve(root), path.resolve(candidate));
	return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

describe("workspace venv interpreter trust", () => {
	it("does not execute a repository .venv or venv python from the python eval backend", async () => {
		using tempDir = TempDir.createSync("@gjc-py-venv-attack-");
		const marker = tempDir.join("planted-python-ran");
		const repo = tempDir.join("repo");
		await fs.promises.mkdir(path.join(repo, ".git"), { recursive: true });
		const payload = path.join(repo, "payload", "python");
		await writeScript(payload, marker);
		await writeCfg(path.join(repo, ".venv"), path.dirname(HOST_PYTHON ?? "."));
		await writeCfg(path.join(repo, "venv"), path.dirname(HOST_PYTHON ?? "."));
		const dotPython = interpreterFile(path.join(repo, ".venv"));
		const plainPython = interpreterFile(path.join(repo, "venv"));
		if (process.platform !== "win32" && SYMLINK_OK) {
			await fs.promises.mkdir(path.dirname(dotPython), { recursive: true });
			await fs.promises.symlink(payload, dotPython);
			await writeScript(plainPython, marker);
		} else {
			await writeScript(dotPython, marker);
			await writeScript(plainPython, marker);
		}

		await withProbeEnv({}, async () => {
			const session = sessionFor(repo);
			await pythonBackend.isAvailable(session);
			const availability = await checkPythonKernelAvailability(repo, undefined, undefined, session.settings);
			expect(fs.existsSync(marker)).toBe(false);
			expect(under(path.join(repo, ".venv"), availability.pythonPath)).toBe(false);
			expect(under(path.join(repo, "venv"), availability.pythonPath)).toBe(false);
		});
	}, 20_000);

	it.skipIf(!OUTSIDE_VENV)(
		"still uses a workspace .venv whose interpreter resolves outside the project (skipped when python -m venv keeps the interpreter inside the tree)",
		async () => {
			using tempDir = TempDir.createSync("@gjc-py-venv-allow-");
			const repo = tempDir.join("repo");
			await fs.promises.mkdir(path.join(repo, ".git"), { recursive: true });
			const venv = path.join(repo, ".venv");
			await createVenv(venv);

			await withProbeEnv({}, async () => {
				const session = sessionFor(repo);
				expect(await pythonBackend.isAvailable(session)).toBe(true);
				const availability = await checkPythonKernelAvailability(repo, undefined, undefined, session.settings);
				expect(availability.ok).toBe(true);
				expect(under(venv, availability.pythonPath)).toBe(true);
				expect(under(repo, fs.realpathSync(availability.pythonPath as string))).toBe(false);
			});
		},
		60_000,
	);

	it.skipIf(!HOST_PYTHON)(
		"still uses VIRTUAL_ENV over a planted workspace .venv (skipped without python)",
		async () => {
			using tempDir = TempDir.createSync("@gjc-py-venv-env-");
			const marker = tempDir.join("planted-python-ran");
			const repo = tempDir.join("repo");
			const operator = tempDir.join("operator-venv");
			await fs.promises.mkdir(path.join(repo, ".git"), { recursive: true });
			await writeScript(interpreterFile(path.join(repo, ".venv")), marker);
			await writeCfg(path.join(repo, ".venv"), path.dirname(HOST_PYTHON as string));
			await createVenv(operator);

			await withProbeEnv({ VIRTUAL_ENV: operator }, async () => {
				const session = sessionFor(repo);
				expect(await pythonBackend.isAvailable(session)).toBe(true);
				const availability = await checkPythonKernelAvailability(repo, undefined, undefined, session.settings);
				expect(fs.existsSync(marker)).toBe(false);
				expect(availability.ok).toBe(true);
				expect(under(operator, availability.pythonPath)).toBe(true);
				expect(under(path.join(repo, ".venv"), availability.pythonPath)).toBe(false);
			});
		},
		60_000,
	);
});
