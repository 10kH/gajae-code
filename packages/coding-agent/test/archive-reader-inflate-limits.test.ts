import { describe, expect, test } from "bun:test";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { Zip, ZipDeflate, zipSync } from "fflate";
import { openArchive } from "../src/tools/archive-reader";

const exec = promisify(execFile);
const ENTRY_LIMIT = 16 * 1024 * 1024;
const TOTAL_LIMIT = 64 * 1024 * 1024;
const COUNT_LIMIT = 8192;
const DEPTH_LIMIT = 48;

function concat(parts: Uint8Array[]): Uint8Array {
	const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
	const out = new Uint8Array(total);
	let offset = 0;
	for (const part of parts) {
		out.set(part, offset);
		offset += part.byteLength;
	}
	return out;
}

function zipUnknownSize(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
	const parts: Uint8Array[] = [];
	const zip = new Zip((error, chunk) => {
		if (error) throw error;
		if (chunk?.byteLength) parts.push(chunk);
	});
	for (const file of files) {
		const entry = new ZipDeflate(file.name, { level: 1 });
		zip.add(entry);
		entry.push(file.data, true);
	}
	zip.end();
	return concat(parts);
}

async function withFile(name: string, bytes: Uint8Array, run: (file: string) => Promise<void>): Promise<void> {
	const dir = await mkdtemp(path.join(tmpdir(), "archive-cap-"));
	try {
		const file = path.join(dir, name);
		await writeFile(file, bytes);
		await run(file);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

function noted(name: string, run: () => Promise<void>): () => Promise<void> {
	return async () => {
		try {
			await run();
			console.log(`(pass) ${name}`);
		} catch (error) {
			console.log(`(fail) ${name}`);
			throw error;
		}
	};
}

describe("openArchive inflate caps", () => {
	test(
		"still allows a small zip member",
		noted("still allows a small zip member", async () => {
			const bytes = zipSync({ "src/hello.txt": new TextEncoder().encode("hello") });
			await withFile("ok.zip", bytes, async file => {
				const archive = await openArchive(file);
				const entry = await archive.readFile("src/hello.txt");
				expect(new TextDecoder().decode(entry.bytes)).toBe("hello");
				expect(archive.listDirectory("src").map(item => item.name)).toContain("hello.txt");
			});
		}),
	);

	test(
		"rejects one entry that inflates past the per-entry cap",
		noted("rejects one entry that inflates past the per-entry cap", async () => {
			const bytes = zipUnknownSize([{ name: "bomb.txt", data: new Uint8Array(ENTRY_LIMIT + 1) }]);
			await withFile("entry.zip", bytes, async file => {
				await expect(openArchive(file)).rejects.toThrow(/per-entry limit/);
			});
		}),
		20_000,
	);

	test(
		"rejects a total inflate past the cap when each entry is under it",
		noted("rejects a total inflate past the cap when each entry is under it", async () => {
			const part = new Uint8Array(15 * 1024 * 1024);
			const bytes = zipUnknownSize(
				Array.from({ length: 5 }, (_, index) => ({ name: `part-${index}.bin`, data: part })),
			);
			expect(part.byteLength).toBeLessThan(ENTRY_LIMIT);
			expect(part.byteLength * 5).toBeGreaterThan(TOTAL_LIMIT);
			await withFile("total.zip", bytes, async file => {
				await expect(openArchive(file)).rejects.toThrow(/total limit/);
			});
		}),
		20_000,
	);

	test(
		"rejects an archive with too many entries",
		noted("rejects an archive with too many entries", async () => {
			const files: Record<string, Uint8Array> = {};
			for (let index = 0; index < COUNT_LIMIT + 1; index++) files[`f${index}.txt`] = new Uint8Array(0);
			await withFile("count.zip", zipSync(files, { level: 0 }), async file => {
				await expect(openArchive(file)).rejects.toThrow(/too many entries/);
			});
		}),
	);

	test(
		"rejects an entry nested past the depth cap",
		noted("rejects an entry nested past the depth cap", async () => {
			const deepParts = Array.from({ length: DEPTH_LIMIT + 1 }, (_, index) => `d${index}`);
			deepParts[DEPTH_LIMIT] = `${deepParts[DEPTH_LIMIT]}.txt`;
			const name = deepParts.join("/");
			await withFile("deep.zip", zipSync({ [name]: new Uint8Array([1]) }, { level: 0 }), async file => {
				await expect(openArchive(file)).rejects.toThrow(/nested too deeply/);
			});
		}),
	);

	test(
		"still allows a shallow entry under every cap",
		noted("still allows a shallow entry under every cap", async () => {
			const name = "d0/d1.txt";
			await withFile("shallow.zip", zipSync({ [name]: new TextEncoder().encode("ok") }), async file => {
				const archive = await openArchive(file);
				expect(new TextDecoder().decode((await archive.readFile(name)).bytes)).toBe("ok");
			});
		}),
	);

	test(
		"still allows a small tar.gz member",
		noted("still allows a small tar.gz member", async () => {
			const dir = await mkdtemp(path.join(tmpdir(), "archive-tar-"));
			try {
				await writeFile(path.join(dir, "hello.txt"), "hello");
				const archivePath = path.join(dir, "ok.tar.gz");
				await exec("tar", ["-czf", archivePath, "-C", dir, "hello.txt"]);
				const archive = await openArchive(archivePath);
				expect(new TextDecoder().decode((await archive.readFile("hello.txt")).bytes)).toBe("hello");
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		}),
	);

	test(
		"rejects a tar.gz that inflates past the total cap",
		noted("rejects a tar.gz that inflates past the total cap", async () => {
			const dir = await mkdtemp(path.join(tmpdir(), "archive-tarbomb-"));
			try {
				const big = path.join(dir, "big.bin");
				await writeFile(big, new Uint8Array(TOTAL_LIMIT + 1));
				const archivePath = path.join(dir, "bomb.tar.gz");
				await exec("tar", ["-czf", archivePath, "-C", dir, "big.bin"]);
				await expect(openArchive(archivePath)).rejects.toThrow(/total limit/);
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		}),
		20_000,
	);
});
