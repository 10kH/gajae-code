import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const LOGGER_SOURCE = path.resolve(import.meta.dir, "../src/logger.ts");

function localStamp(offsetDays: number): string {
	const date = new Date();
	date.setDate(date.getDate() + offsetDays);
	const pad = (value: number) => String(value).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

interface WrittenLog {
	name: string;
	mode: number;
	body: string;
}

interface ProbeResult {
	dirMode: number;
	written: WrittenLog[];
}

function writeProbe(root: string): string {
	const script = path.join(root, "probe.ts");
	const source = [
		'import * as fs from "node:fs";',
		'import * as path from "node:path";',
		`import * as logger from ${JSON.stringify(LOGGER_SOURCE)};`,
		"process.umask(0o022);",
		"const logDir = process.argv[2];",
		"logger.setTransports({ file: logDir, console: false });",
		'logger.info("rotating-log-mode-marker");',
		"const deadline = Date.now() + 8000;",
		"let written: { name: string; mode: number; body: string }[] = [];",
		"while (Date.now() < deadline) {",
		"  written = [];",
		"  let names: string[] = [];",
		"  try { names = fs.readdirSync(logDir); } catch { names = []; }",
		"  for (const name of names) {",
		'    if (!name.endsWith(".log")) continue;',
		"    const full = path.join(logDir, name);",
		"    const stat = fs.lstatSync(full);",
		"    if (!stat.isFile()) continue;",
		'    const body = fs.readFileSync(full, "utf8");',
		'    if (!body.includes("rotating-log-mode-marker")) continue;',
		"    written.push({ name, mode: stat.mode & 0o777, body });",
		"  }",
		"  if (written.length > 0) break;",
		"  await new Promise((resolve) => setTimeout(resolve, 40));",
		"}",
		"if (written.length === 0) { console.error('marker not written'); process.exit(1); }",
		"console.log(JSON.stringify({ dirMode: fs.lstatSync(logDir).mode & 0o777, written }));",
	].join("\n");
	fs.writeFileSync(script, source);
	return script;
}

async function runProbe(logDir: string, home: string): Promise<ProbeResult> {
	const root = path.dirname(logDir);
	const script = writeProbe(root);
	const proc = Bun.spawn([process.execPath, script, logDir], {
		cwd: root,
		env: {
			PATH: process.env.PATH ?? "/usr/bin:/bin",
			HOME: home,
			TMPDIR: os.tmpdir(),
			CI: "1",
			TERM: "dumb",
		},
		stdout: "pipe",
		stderr: "pipe",
	});
	const [exitCode, stdout, stderr] = await Promise.all([
		proc.exited,
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	if (exitCode !== 0) throw new Error(`probe exit ${exitCode}: ${stderr}`);
	const line = stdout.trim().split("\n").pop() ?? "";
	return JSON.parse(line) as ProbeResult;
}

describe.skipIf(process.platform === "win32")("rotating log owner-only mode", () => {
	it("still reads a rotating log line the owner wrote", async () => {
		const home = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-home-"));
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-"));
		try {
			const result = await runProbe(path.join(root, "logs"), home);
			expect(result.written.length).toBeGreaterThan(0);
			expect(result.written.some(file => file.body.includes("rotating-log-mode-marker"))).toBe(true);
		} finally {
			fs.rmSync(home, { recursive: true, force: true });
			fs.rmSync(root, { recursive: true, force: true });
		}
	}, 20_000);

	it("creates the directory at 0700 and the log file at 0600", async () => {
		const home = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-home-"));
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-"));
		try {
			const result = await runProbe(path.join(root, "logs"), home);
			expect(result.dirMode).toBe(0o700);
			expect(result.written.length).toBeGreaterThan(0);
			for (const file of result.written) expect(file.mode).toBe(0o600);
		} finally {
			fs.rmSync(home, { recursive: true, force: true });
			fs.rmSync(root, { recursive: true, force: true });
		}
	}, 20_000);

	async function expectSymlinkTargetUnchanged(logDir: string): Promise<void> {
		const home = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-home-"));
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-"));
		const target = path.join(root, "target");
		const link = path.join(root, "link");
		try {
			fs.mkdirSync(target);
			fs.chmodSync(target, 0o755);
			fs.symlinkSync(target, link);
			await runProbe(logDir(link), home);
			expect(fs.lstatSync(target).mode & 0o777).toBe(0o755);
			expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
			const text = fs
				.readdirSync(target)
				.filter(name => name.endsWith(".log"))
				.map(name => fs.readFileSync(path.join(target, name), "utf8"))
				.join("");
			expect(text).toContain("rotating-log-mode-marker");
		} finally {
			fs.rmSync(home, { recursive: true, force: true });
			fs.rmSync(root, { recursive: true, force: true });
		}
	}

	it("still reads through a symlink log directory and leaves the target mode", async () => {
		await expectSymlinkTargetUnchanged(link => link);
	}, 20_000);

	it("still reads through a trailing-slash symlink log directory and leaves the target mode", async () => {
		await expectSymlinkTargetUnchanged(link => `${link}/`);
	}, 20_000);

	it("tightens an existing 0755 directory and 0666 log file", async () => {
		const home = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-home-"));
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-"));
		const logDir = path.join(root, "logs");
		try {
			fs.mkdirSync(logDir);
			fs.chmodSync(logDir, 0o755);
			for (const offset of [-1, 0, 1]) {
				const file = path.join(logDir, `gjc.${localStamp(offset)}.log`);
				fs.writeFileSync(file, "prior-line\n");
				fs.chmodSync(file, 0o666);
			}
			const result = await runProbe(logDir, home);
			expect(result.dirMode).toBe(0o700);
			expect(result.written.length).toBeGreaterThan(0);
			for (const file of result.written) {
				expect(file.mode).toBe(0o600);
				expect(file.body).toContain("prior-line");
				expect(file.body).toContain("rotating-log-mode-marker");
			}
		} finally {
			fs.rmSync(home, { recursive: true, force: true });
			fs.rmSync(root, { recursive: true, force: true });
		}
	}, 20_000);
});
