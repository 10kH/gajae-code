import { afterAll, afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Snowflake } from "@gajae-code/utils";

const realPlatform = Object.getOwnPropertyDescriptor(process, "platform");
const realPath = process.env.PATH;
const emptyPath = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-stt-path-"));
// The recorder script is only written on win32. Stub the platform so this
// POSIX run still enters that branch, then hide sox/ffmpeg so it is selected.
Object.defineProperty(process, "platform", { value: "win32", configurable: true });
process.env.PATH = emptyPath;

const recorder = import("../../src/stt/recorder");
const created: string[] = [];

function canSymlink(): boolean {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-stt-link-probe-"));
	try {
		const target = path.join(dir, "t");
		const link = path.join(dir, "l");
		fs.writeFileSync(target, "x");
		fs.symlinkSync(target, link);
		return fs.lstatSync(link).isSymbolicLink();
	} catch {
		return false;
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

const symlinkOk = canSymlink();

afterAll(() => {
	if (realPlatform) Object.defineProperty(process, "platform", realPlatform);
	process.env.PATH = realPath;
	fs.rmSync(emptyPath, { recursive: true, force: true });
});

afterEach(() => {
	for (const entry of created.splice(0)) fs.rmSync(entry, { recursive: true, force: true });
});

function snapshot(): Set<string> {
	return new Set(fs.readdirSync(os.tmpdir()).filter(name => name.startsWith("gjc-stt-record-")));
}

function newScripts(before: Set<string>): string[] {
	const found: string[] = [];
	for (const name of fs.readdirSync(os.tmpdir())) {
		if (!name.startsWith("gjc-stt-record-") || before.has(name)) continue;
		const full = path.join(os.tmpdir(), name);
		created.push(full);
		const stat = fs.lstatSync(full);
		if (stat.isDirectory()) {
			const script = path.join(full, "record.ps1");
			if (fs.existsSync(script) && fs.lstatSync(script).isFile()) found.push(script);
		} else if (stat.isFile()) {
			found.push(full);
		}
	}
	return found;
}

function predictScriptId(): string {
	const fixed = 1_700_000_000_000;
	Date.now = () => fixed;
	const observed = Snowflake.next();
	const nextSeq = (Snowflake.getSequence(observed) + 1) & Snowflake.MAX_SEQUENCE;
	return Snowflake.formatParts(fixed - Snowflake.EPOCH_TIMESTAMP, nextSeq);
}

describe("PowerShell recorder temp file", () => {
	it("still allows a recorder script write when no temp symlink is planted", async () => {
		const { startRecording } = await recorder;
		const before = snapshot();
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-stt-out-"));
		created.push(dir);
		await expect(startRecording(path.join(dir, "out.wav"))).rejects.toThrow(/powershell/i);
		const scripts = newScripts(before);
		expect(scripts).toHaveLength(1);
		const script = scripts[0];
		if (!script) throw new Error("missing script");
		expect(fs.lstatSync(script).isSymbolicLink()).toBe(false);
		expect(fs.readFileSync(script, "utf8")).toContain("alias gjc_rec");
	});

	if (!symlinkOk) {
		it.skip("does not follow a preexisting symlink at the predictable temp name", () => {});
	}
	if (symlinkOk)
		it("does not follow a preexisting symlink at the predictable temp name", async () => {
			const { startRecording } = await recorder;
			const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-stt-victim-"));
			created.push(dir);
			const victim = path.join(dir, "victim");
			fs.writeFileSync(victim, "SAFE");
			const now = Date.now;
			const before = snapshot();
			try {
				const id = predictScriptId();
				const linkPath = path.join(os.tmpdir(), `gjc-stt-record-${id}.ps1`);
				created.push(linkPath);
				fs.rmSync(linkPath, { force: true });
				fs.symlinkSync(victim, linkPath);
				await expect(startRecording(path.join(dir, "out.wav"))).rejects.toThrow(/powershell/i);
				expect(fs.readFileSync(victim, "utf8")).toBe("SAFE");
				expect(fs.lstatSync(linkPath).isSymbolicLink()).toBe(true);
				const scripts = newScripts(before);
				expect(scripts).toHaveLength(1);
				const script = scripts[0];
				if (!script) throw new Error("missing script");
				expect(script).not.toBe(linkPath);
				expect(fs.readFileSync(script, "utf8")).toContain("alias gjc_rec");
				if (os.platform() !== "win32") {
					expect(fs.statSync(script).mode & 0o777).toBe(0o600);
					expect(fs.statSync(path.dirname(script)).mode & 0o777).toBe(0o700);
				}
			} finally {
				Date.now = now;
			}
		});
});
