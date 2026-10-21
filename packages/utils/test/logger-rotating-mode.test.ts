import { describe, expect, it, spyOn } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import fc from "fast-check";

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
		'    let body = "";',
		'    try { body = fs.readFileSync(full, "utf8"); } catch { continue; }',
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

async function runProbe(logDir: string, home: string, cwd = path.dirname(logDir)): Promise<ProbeResult> {
	const script = writeProbe(cwd);
	const proc = Bun.spawn([process.execPath, script, logDir], {
		cwd,
		env: {
			PATH: process.env.PATH ?? "/usr/bin:/bin",
			HOME: home,
			USERPROFILE: home,
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

	async function expectSymlinkTargetUnchanged(logDirFor: (link: string) => string): Promise<void> {
		const home = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-home-"));
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-"));
		const target = path.join(root, "target");
		const link = path.join(root, "link");
		try {
			fs.mkdirSync(target);
			fs.chmodSync(target, 0o755);
			fs.symlinkSync(target, link);
			await runProbe(logDirFor(link), home);
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

	it("still reads through dot-suffix symlink log directories and leaves the target mode", async () => {
		for (const suffix of ["/.", "/./", "/./."]) {
			await expectSymlinkTargetUnchanged(link => `${link}${suffix}`);
		}
		const home = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-home-"));
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-"));
		const target = path.join(root, "target");
		const link = path.join(root, "link");
		try {
			fs.mkdirSync(target);
			fs.chmodSync(target, 0o755);
			fs.symlinkSync(target, link);
			for (const relative of ["./link/.", "./link/./", "././link/./."]) {
				await runProbe(relative, home, root);
				expect(fs.lstatSync(target).mode & 0o777).toBe(0o755);
				expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
			}
		} finally {
			fs.rmSync(home, { recursive: true, force: true });
			fs.rmSync(root, { recursive: true, force: true });
		}
	}, 40_000);

	it("tightens a 0666 log under a dot-suffix symlinked directory", async () => {
		for (const suffix of ["./link/.", "./link/./", "././link/./.", "/.", "/./", "/./."]) {
			const home = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-home-"));
			const root = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-"));
			const target = path.join(root, "target");
			const link = path.join(root, "link");
			const file = path.join(target, `gjc.${localStamp(0)}.log`);
			try {
				fs.mkdirSync(target);
				fs.chmodSync(target, 0o755);
				fs.writeFileSync(file, "prior-line\n");
				fs.chmodSync(file, 0o666);
				fs.symlinkSync(target, link);
				const relative = suffix.startsWith(".");
				const result = relative ? await runProbe(suffix, home, root) : await runProbe(`${link}${suffix}`, home);
				expect(fs.lstatSync(target).mode & 0o777).toBe(0o755);
				expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
				expect(fs.lstatSync(file).mode & 0o777).toBe(0o600);
				expect(result.written.some(entry => entry.body.includes("prior-line"))).toBe(true);
				expect(result.written.some(entry => entry.body.includes("rotating-log-mode-marker"))).toBe(true);
			} finally {
				fs.rmSync(home, { recursive: true, force: true });
				fs.rmSync(root, { recursive: true, force: true });
			}
		}
	}, 40_000);

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

	it("still writes a rotating log into a directory whose name ends in a backslash", async () => {
		const home = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-home-"));
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-"));
		const sibling = path.join(root, "logs");
		const named = path.join(root, "logs\\");
		try {
			fs.mkdirSync(sibling);
			fs.chmodSync(sibling, 0o755);
			fs.writeFileSync(path.join(sibling, "keep.txt"), "sibling-keep\n");
			const result = await runProbe(named, home);
			expect(result.written.some(file => file.body.includes("rotating-log-mode-marker"))).toBe(true);
			expect(fs.readdirSync(root)).toContain("logs\\");
			expect(fs.lstatSync(sibling).mode & 0o777).toBe(0o755);
			expect(fs.readFileSync(path.join(sibling, "keep.txt"), "utf8")).toBe("sibling-keep\n");
			expect(fs.readdirSync(sibling).some(name => name.endsWith(".log"))).toBe(false);
		} finally {
			fs.rmSync(home, { recursive: true, force: true });
			fs.rmSync(root, { recursive: true, force: true });
		}
	}, 20_000);

	it("tightens a 0666 log under a symlinked directory and leaves the target mode", async () => {
		const home = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-home-"));
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-"));
		const target = path.join(root, "target");
		const link = path.join(root, "link");
		const file = path.join(target, `gjc.${localStamp(0)}.log`);
		try {
			fs.mkdirSync(target);
			fs.chmodSync(target, 0o755);
			fs.writeFileSync(file, "prior-line\n");
			fs.chmodSync(file, 0o666);
			fs.symlinkSync(target, link);
			const result = await runProbe(link, home);
			expect(fs.lstatSync(target).mode & 0o777).toBe(0o755);
			expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
			expect(fs.lstatSync(file).isFile()).toBe(true);
			expect(fs.lstatSync(file).mode & 0o777).toBe(0o600);
			expect(result.written.some(entry => entry.body.includes("prior-line"))).toBe(true);
			expect(result.written.some(entry => entry.body.includes("rotating-log-mode-marker"))).toBe(true);
		} finally {
			fs.rmSync(home, { recursive: true, force: true });
			fs.rmSync(root, { recursive: true, force: true });
		}
	}, 20_000);

	it("tightens an existing log file at mode 0266", async () => {
		const home = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-home-"));
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-"));
		const logDir = path.join(root, "logs");
		const file = path.join(logDir, `gjc.${localStamp(0)}.log`);
		try {
			fs.mkdirSync(logDir);
			fs.chmodSync(logDir, 0o755);
			fs.writeFileSync(file, "prior-line\n");
			fs.chmodSync(file, 0o266);
			const result = await runProbe(logDir, home);
			expect(result.dirMode).toBe(0o700);
			expect(fs.lstatSync(file).mode & 0o777).toBe(0o600);
			expect(result.written.some(entry => entry.body.includes("prior-line"))).toBe(true);
			expect(result.written.some(entry => entry.body.includes("rotating-log-mode-marker"))).toBe(true);
		} finally {
			fs.rmSync(home, { recursive: true, force: true });
			fs.rmSync(root, { recursive: true, force: true });
		}
	}, 20_000);

	it("still tightens an owner-readable log at mode 0466", async () => {
		const home = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-home-"));
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-"));
		const logDir = path.join(root, "logs");
		const file = path.join(logDir, `gjc.${localStamp(0)}.log`);
		const logger = await import("../src/logger");
		try {
			fs.mkdirSync(logDir);
			fs.chmodSync(logDir, 0o700);
			fs.writeFileSync(file, "prior-line\n");
			fs.chmodSync(file, 0o466);
			logger.setTransports({ file: logDir, console: false });
			logger.info("rotating-log-mode-marker");
			const deadline = Date.now() + 8000;
			let mode = fs.lstatSync(file).mode & 0o777;
			while (Date.now() < deadline && mode !== 0o600) {
				mode = fs.lstatSync(file).mode & 0o777;
				if (mode === 0o600) break;
				await new Promise(resolve => setTimeout(resolve, 40));
			}
			expect(mode).toBe(0o600);
			expect(fs.readFileSync(file, "utf8")).toContain("prior-line");
		} finally {
			logger.setTransports({ file: false, console: false });
			fs.rmSync(home, { recursive: true, force: true });
			fs.rmSync(root, { recursive: true, force: true });
		}
	}, 20_000);

	it("does not chmod filesystem-root spellings and does not follow a symlink log file", async () => {
		const home = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-home-"));
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-"));
		const logDir = path.join(root, "logs");
		const real = path.join(root, "real.log");
		const rootStat = fs.statSync("/");
		let privateStat: fs.Stats | undefined;
		try {
			privateStat = fs.statSync("/private");
		} catch {
			privateStat = undefined;
		}
		const seen: string[] = [];
		const original = fs.fchmodSync;
		const spy = spyOn(fs, "fchmodSync").mockImplementation((fd, mode) => {
			const st = fs.fstatSync(fd);
			if (st.dev === rootStat.dev && st.ino === rootStat.ino) {
				seen.push("root");
				return;
			}
			if (privateStat && st.dev === privateStat.dev && st.ino === privateStat.ino) {
				seen.push("private");
				return;
			}
			return original(fd, mode);
		});
		const logger = await import("../src/logger");
		try {
			fs.mkdirSync(logDir);
			logger.setTransports({ file: logDir, console: false });
			logger.info("rotating-log-mode-marker");
			const deadline = Date.now() + 8000;
			let marked = false;
			while (Date.now() < deadline) {
				const names = fs.readdirSync(logDir).filter(name => name.endsWith(".log"));
				marked = names.some(name =>
					fs.readFileSync(path.join(logDir, name), "utf8").includes("rotating-log-mode-marker"),
				);
				if (marked) break;
				await new Promise(resolve => setTimeout(resolve, 40));
			}
			expect(marked).toBe(true);
			expect(fs.statSync(logDir).mode & 0o777).toBe(0o700);
			const rootBefore = fs.statSync("/").mode;
			const privateBefore = privateStat?.mode;
			seen.length = 0;
			const rootAliases = [
				"/",
				"/.",
				`${path.posix.sep}tmp${path.posix.sep}..`,
				`${path.posix.sep}tmp${path.posix.sep}..${path.posix.sep}`,
			];
			for (const alias of rootAliases) {
				logger.setTransports({ file: alias, console: false });
				logger.info("root-alias-marker");
			}
			expect(seen).toEqual([]);
			expect(fs.statSync("/").mode).toBe(rootBefore);
			if (privateStat && privateBefore !== undefined) expect(fs.statSync("/private").mode).toBe(privateBefore);

			fs.writeFileSync(real, "kept\n");
			fs.chmodSync(real, 0o644);
			const linkLogs = path.join(root, "linklogs");
			fs.mkdirSync(linkLogs);
			fs.chmodSync(linkLogs, 0o700);
			const link = path.join(linkLogs, `gjc.${localStamp(0)}.log`);
			fs.symlinkSync(real, link);
			logger.setTransports({ file: linkLogs, console: false });
			logger.info("symlink-file-marker");
			const linkDeadline = Date.now() + 8000;
			let followed = false;
			while (Date.now() < linkDeadline) {
				followed = fs.readFileSync(real, "utf8").includes("symlink-file-marker");
				if (followed) break;
				await new Promise(resolve => setTimeout(resolve, 40));
			}
			expect(followed).toBe(true);
			expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
			expect(fs.lstatSync(real).mode & 0o777).toBe(0o644);
		} finally {
			spy.mockRestore();
			logger.setTransports({ file: false, console: false });
			fs.rmSync(home, { recursive: true, force: true });
			fs.rmSync(root, { recursive: true, force: true });
		}
	}, 20_000);

	it("creates a backslash-named rotating log directory at 0700", async () => {
		const home = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-home-"));
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-log-mode-"));
		const named = path.join(root, "logs\\");
		try {
			const result = await runProbe(named, home);
			expect(fs.lstatSync(named).isDirectory()).toBe(true);
			expect(result.dirMode).toBe(0o700);
			expect(result.written.length).toBeGreaterThan(0);
			for (const file of result.written) expect(file.mode).toBe(0o600);
			expect(fs.existsSync(path.join(root, "logs"))).toBe(false);
		} finally {
			fs.rmSync(home, { recursive: true, force: true });
			fs.rmSync(root, { recursive: true, force: true });
		}
	}, 20_000);
});

function isGeneratedSeparator(char: string, platform: "posix" | "win32"): boolean {
	return char === "/" || (platform === "win32" && char === "\\");
}

function logPathHolds(
	lexicalLogPath: (target: string, platform: "posix" | "win32") => string,
	isFsRoot: (target: string, platform: "posix" | "win32") => boolean,
	raw: string,
	platform: "posix" | "win32",
): boolean {
	const out = lexicalLogPath(raw, platform);
	if (!raw.startsWith(out)) return false;
	for (const char of raw.slice(out.length)) {
		if (!isGeneratedSeparator(char, platform)) return false;
	}
	if (lexicalLogPath(out, platform) !== out) return false;
	const ends = raw.length > 0 && isGeneratedSeparator(raw[raw.length - 1] ?? "", platform);
	if (!ends && out !== raw) return false;
	if (isFsRoot(raw, platform) && !isFsRoot(out, platform)) return false;
	if (out.length > 0 && !isFsRoot(out, platform) && isGeneratedSeparator(out[out.length - 1] ?? "", platform)) {
		return false;
	}
	if (platform === "posix") {
		if (raw.split("\\").length !== out.split("\\").length) return false;
		if (lexicalLogPath(`${raw}\\`, "posix") !== `${raw}\\`) return false;
	}
	return true;
}

it("normalizes log paths without changing a non-separator name", async () => {
	const mod = await import("../src/logger");
	const { lexicalLogPath, isFsRoot, resolvesAsFsRoot } = mod;
	if (
		typeof lexicalLogPath !== "function" ||
		typeof isFsRoot !== "function" ||
		typeof resolvesAsFsRoot !== "function"
	) {
		throw new Error("log path helpers missing");
	}
	expect(lexicalLogPath("logs\\", "posix")).toBe("logs\\");
	expect(lexicalLogPath("logs/", "posix")).toBe("logs");
	expect(lexicalLogPath("logs\\", "win32")).toBe("logs");
	expect(lexicalLogPath("C:\\", "win32")).toBe("C:\\");
	expect(lexicalLogPath("C:/", "win32")).toBe("C:/");
	expect(lexicalLogPath("C:", "win32")).toBe("C:");
	expect(isFsRoot("\\", "posix")).toBe(false);
	expect(isFsRoot("/", "posix")).toBe(true);
	expect(isFsRoot("C:\\", "win32")).toBe(true);
	expect(isFsRoot("C:", "win32")).toBe(false);
	expect(resolvesAsFsRoot("/.", "posix")).toBe(true);
	expect(resolvesAsFsRoot("/tmp/..", "posix")).toBe(true);
	expect(resolvesAsFsRoot("/tmp/../", "posix")).toBe(true);
	expect(resolvesAsFsRoot("/var/logs", "posix")).toBe(false);
	expect(resolvesAsFsRoot("logs\\", "posix")).toBe(false);
	expect(resolvesAsFsRoot("C:\\.", "win32")).toBe(true);
	expect(resolvesAsFsRoot("C:\\temp\\..", "win32")).toBe(true);
	expect(resolvesAsFsRoot("C:\\temp", "win32")).toBe(false);
	expect(resolvesAsFsRoot("C:", "win32")).toBe(false);
	fc.assert(
		fc.property(fc.string(), fc.constantFrom("posix" as const, "win32" as const), (raw, platform) =>
			logPathHolds(lexicalLogPath, isFsRoot, raw, platform),
		),
		{ seed: 209, numRuns: 128 },
	);
	fc.assert(
		fc.property(fc.string(), fc.constantFrom("posix" as const, "win32" as const), (raw, platform) => {
			const impl = platform === "win32" ? path.win32 : path.posix;
			const lexical = lexicalLogPath(raw, platform);
			const collapsed = lexicalLogPath(impl.normalize(lexical), platform);
			if (resolvesAsFsRoot(raw, platform) !== isFsRoot(collapsed, platform)) return false;
			if (isFsRoot(lexical, platform) && !resolvesAsFsRoot(raw, platform)) return false;
			if (platform === "posix" && raw.includes("\\") && !raw.includes("/"))
				return resolvesAsFsRoot(raw, "posix") === false;
			return resolvesAsFsRoot(collapsed, platform) === isFsRoot(collapsed, platform);
		}),
		{ seed: 7036, numRuns: 128 },
	);
});
