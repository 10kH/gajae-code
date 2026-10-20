import { afterEach, describe, expect, it, spyOn } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ConfigFile } from "@gajae-code/coding-agent/config/config-file";
import { YAML } from "bun";
import * as z from "zod/v4";

// Mode bits and final-component symlinks are POSIX. Windows ACLs are out of scope.
const skipPosix = process.platform === "win32";
const schema = z.object({}).passthrough();
const roots: string[] = [];

function tempDir(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-models-yml-"));
	roots.push(dir);
	return dir;
}

afterEach(() => {
	for (const dir of roots.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function writeJson(dir: string, value: unknown): string {
	const jsonPath = path.join(dir, "models.json");
	fs.writeFileSync(jsonPath, JSON.stringify(value));
	return jsonPath;
}

function migrate(ymlPath: string): void {
	new ConfigFile("models", schema, ymlPath);
}

function pathVisible(target: string): boolean {
	try {
		fs.lstatSync(target);
		return true;
	} catch (error) {
		if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") {
			return false;
		}
		throw error;
	}
}

describe("models.yml json migration", () => {
	it.skipIf(skipPosix)("writes a migrated models.yml as mode 0600 when umask is 022", () => {
		const dir = tempDir();
		writeJson(dir, { providers: { local: { baseUrl: "http://127.0.0.1:9" } } });
		const ymlPath = path.join(dir, "models.yml");
		const prev = process.umask(0o022);
		try {
			migrate(ymlPath);
		} finally {
			process.umask(prev);
		}
		expect(fs.lstatSync(ymlPath).isSymbolicLink()).toBe(false);
		expect(fs.statSync(ymlPath).mode & 0o777).toBe(0o600);
		expect(YAML.parse(fs.readFileSync(ymlPath, "utf8"))).toEqual({
			providers: { local: { baseUrl: "http://127.0.0.1:9" } },
		});
	});

	it.skipIf(skipPosix)("does not create the target of a dangling models.yml symlink", () => {
		const dir = tempDir();
		writeJson(dir, { secret: "model-key" });
		const ymlPath = path.join(dir, "models.yml");
		const victim = path.join(dir, "victim.yml");
		fs.symlinkSync(victim, ymlPath);
		migrate(ymlPath);
		expect(fs.existsSync(victim)).toBe(false);
		expect(fs.lstatSync(ymlPath).isSymbolicLink()).toBe(true);
	});

	it("still allows creating models.yml from models.json when the yml file is absent", () => {
		const dir = tempDir();
		writeJson(dir, { providers: { local: { baseUrl: "http://127.0.0.1:9" } } });
		const ymlPath = path.join(dir, "models.yml");
		migrate(ymlPath);
		expect(fs.lstatSync(ymlPath).isFile()).toBe(true);
		expect(YAML.parse(fs.readFileSync(ymlPath, "utf8"))).toEqual({
			providers: { local: { baseUrl: "http://127.0.0.1:9" } },
		});
		expect(new ConfigFile("models", schema, ymlPath).load()).toEqual({
			providers: { local: { baseUrl: "http://127.0.0.1:9" } },
		});
	});

	it("still keeps an existing models.yml when models.json is also present", () => {
		const dir = tempDir();
		writeJson(dir, { providers: { replaced: "no" } });
		const ymlPath = path.join(dir, "models.yml");
		const original = "providers:\n  kept: true\n";
		fs.writeFileSync(ymlPath, original);
		migrate(ymlPath);
		expect(fs.readFileSync(ymlPath, "utf8")).toBe(original);
	});

	it.skipIf(skipPosix)("still keeps the target of an existing models.yml symlink", () => {
		const dir = tempDir();
		writeJson(dir, { providers: { replaced: "no" } });
		const target = path.join(dir, "real.yml");
		const original = "providers:\n  kept: true\n";
		fs.writeFileSync(target, original, { mode: 0o640 });
		const ymlPath = path.join(dir, "models.yml");
		fs.symlinkSync(target, ymlPath);
		migrate(ymlPath);
		expect(fs.readFileSync(target, "utf8")).toBe(original);
		expect(fs.lstatSync(ymlPath).isSymbolicLink()).toBe(true);
		expect(fs.statSync(target).mode & 0o777).toBe(0o640);
	});

	it("loads a complete models.yml when a second migration runs during the first write", () => {
		const dir = tempDir();
		const payload = { providers: { local: { baseUrl: "http://127.0.0.1:9" } } };
		writeJson(dir, payload);
		const ymlPath = path.join(dir, "models.yml");
		let enteredDuringWrite = false;
		let destVisibleDuringWrite = false;
		let secondLoad: unknown = "second-did-not-run";
		const originalWrite = fs.writeFileSync.bind(fs);
		const spy = spyOn(fs, "writeFileSync").mockImplementation((...args: Parameters<typeof fs.writeFileSync>) => {
			const file = args[0];
			if (!enteredDuringWrite && typeof file === "number") {
				enteredDuringWrite = true;
				destVisibleDuringWrite = pathVisible(ymlPath);
				secondLoad = new ConfigFile("models", schema, ymlPath).load();
			}
			return originalWrite(...args);
		});
		try {
			const first = new ConfigFile("models", schema, ymlPath);
			expect(enteredDuringWrite).toBe(true);
			expect(destVisibleDuringWrite).toBe(false);
			expect(secondLoad).toEqual(payload);
			expect(first.load()).toEqual(payload);
			expect(YAML.parse(fs.readFileSync(ymlPath, "utf8"))).toEqual(payload);
			expect(fs.readdirSync(dir).filter(name => name.endsWith(".tmp"))).toEqual([]);
		} finally {
			spy.mockRestore();
		}
	});

	it("an interrupted publication does not hide the json source from a later migration", () => {
		const dir = tempDir();
		const payload = { providers: { local: { baseUrl: "http://127.0.0.1:9" } } };
		writeJson(dir, payload);
		const ymlPath = path.join(dir, "models.yml");
		const link = spyOn(fs, "linkSync").mockImplementation(() => {
			const error = new Error("publish interrupted") as Error & { code: string };
			error.code = "EIO";
			throw error;
		});
		try {
			expect(new ConfigFile("models", schema, ymlPath).load()).toBeNull();
			expect(pathVisible(ymlPath)).toBe(false);
			expect(fs.readdirSync(dir).filter(name => name.endsWith(".tmp"))).toEqual([]);
		} finally {
			link.mockRestore();
		}
		expect(new ConfigFile("models", schema, ymlPath).load()).toEqual(payload);
	});
});
