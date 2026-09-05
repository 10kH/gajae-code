import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as crypto from "node:crypto";
import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	loadAcceptedModelPresetRegistry,
	loadAcceptedModelPresetRegistryAsync,
} from "../src/config/model-preset-registry";

const limit = 32 * 1024 * 1024;
let root: string;
let control: string;
beforeEach(async () => {
	root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-registry-fingerprint-"));
	control = path.join(root, "model-presets", "control.json");
});
afterEach(async () => {
	await fs.rm(root, { recursive: true, force: true });
});

async function makeOversized(): Promise<void> {
	await Bun.write(control, "{}");
	const handle = await fs.open(control, "r+");
	try {
		await handle.truncate(limit + 1024 * 1024);
	} finally {
		await handle.close();
	}
}

describe("registry fingerprint admission", () => {
	test.each([
		"sync",
		"async",
	] as const)("rejects oversized %s input before content reads rather than reusing absence", async mode => {
		const load = () =>
			mode === "sync" ? loadAcceptedModelPresetRegistry(root) : loadAcceptedModelPresetRegistryAsync(root);
		expect((await load()).error).toBeUndefined();
		await makeOversized();
		const readSpy = spyOn(fsSync, "readSync");
		const fileSpy = spyOn(Bun, "file");
		const wholeReadSpy = spyOn(fsSync, "readFileSync");
		try {
			expect((await load()).error).toMatch(/oversized/i);
			expect(readSpy).not.toHaveBeenCalled();
			expect(wholeReadSpy.mock.calls.filter(([file]) => file === control)).toHaveLength(0);
			expect(fileSpy.mock.calls.filter(([file]) => String(file) === control)).toHaveLength(0);
		} finally {
			readSpy.mockRestore();
			fileSpy.mockRestore();
			wholeReadSpy.mockRestore();
		}
	});

	test.each(["sync", "async"] as const)("valid %s input retains the SHA-256 byte fingerprint", async mode => {
		const bytes = Buffer.from(`${JSON.stringify({ version: 1, disabled: false })}${" ".repeat(70_000)}\n`);
		await Bun.write(control, bytes);
		const expected = crypto.createHash("sha256").update(bytes).digest("hex");
		const digestSpy = spyOn(crypto.Hash.prototype, "digest");
		const readSpy = spyOn(fsSync, "readSync");
		try {
			const result =
				mode === "sync" ? loadAcceptedModelPresetRegistry(root) : await loadAcceptedModelPresetRegistryAsync(root);
			expect(result.error).toBeUndefined();
			expect(digestSpy.mock.results.map(result => result.value)).toContain(expected);
			if (mode === "sync") {
				expect(readSpy.mock.calls.length).toBeGreaterThan(2);
				for (const call of readSpy.mock.calls)
					expect((call as readonly unknown[])[3]).toBeLessThanOrEqual(64 * 1024);
			}
		} finally {
			digestSpy.mockRestore();
			readSpy.mockRestore();
		}
	});

	test("sync fingerprint reads at most the limit plus one byte when a file grows after stat", async () => {
		control = path.join(root, "model-presets", "state.json");
		await Bun.write(control, "{}");
		const staleStat = fsSync.lstatSync(control);
		await makeOversized();
		const statSpy = spyOn(fsSync, "lstatSync").mockReturnValueOnce(staleStat);
		const readSpy = spyOn(fsSync, "readSync");
		try {
			expect(loadAcceptedModelPresetRegistry(root).error).toBe("Registry primary cache state is unreadable.");
			expect(readSpy.mock.results.reduce((total, result) => total + Number(result.value), 0)).toBe(limit + 1);
			for (const call of readSpy.mock.calls) expect((call as readonly unknown[])[3]).toBeLessThanOrEqual(64 * 1024);
		} finally {
			statSpy.mockRestore();
			readSpy.mockRestore();
		}
	});

	test("async fingerprint bounds its slice when a file grows after stat", async () => {
		control = path.join(root, "model-presets", "state.json");
		await Bun.write(control, "{}");
		const staleStat = await fs.lstat(control, { bigint: true });
		await makeOversized();
		const file = Bun.file(control);
		const statSpy = spyOn(fs, "lstat").mockResolvedValueOnce(staleStat);
		const fileSpy = spyOn(Bun, "file").mockReturnValue(file);
		const sliceSpy = spyOn(file, "slice");
		try {
			expect((await loadAcceptedModelPresetRegistryAsync(root)).error).toBe(
				"Registry primary cache state is unreadable.",
			);
			expect(sliceSpy).toHaveBeenCalledTimes(1);
			expect(sliceSpy).toHaveBeenCalledWith(0, limit + 1);
		} finally {
			statSpy.mockRestore();
			fileSpy.mockRestore();
			sliceSpy.mockRestore();
		}
	});

	test.each(["sync", "async"] as const)("rejects %s symlinks without hashing their target", async mode => {
		await Bun.write(path.join(root, "target.json"), "{}");
		await fs.mkdir(path.dirname(control), { recursive: true });
		await fs.symlink(path.join(root, "target.json"), control);
		const result =
			mode === "sync" ? loadAcceptedModelPresetRegistry(root) : await loadAcceptedModelPresetRegistryAsync(root);
		expect(result.error).toMatch(/regular file/i);
	});
});
