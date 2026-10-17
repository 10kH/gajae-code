import { describe, expect, test } from "bun:test";
import { execFile, spawn } from "node:child_process";
import { mkdtemp, open, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { gzipSync } from "node:zlib";
import { Zip, ZipDeflate, zipSync } from "fflate";
import { openArchive } from "../src/tools/archive-reader";

const exec = promisify(execFile);
const ENTRY_LIMIT = 16 * 1024 * 1024;
const TOTAL_LIMIT = 64 * 1024 * 1024;
const COUNT_LIMIT = 8192;
const DEPTH_LIMIT = 48;

function ustarHeader(name: string, size: number, typeFlag = "0"): Uint8Array {
	const header = new Uint8Array(512);
	const enc = new TextEncoder();
	const put = (text: string, at: number) => header.set(enc.encode(text), at);
	const nameBytes = enc.encode(name);
	if (nameBytes.byteLength > 100) throw new Error(`ustar name exceeds 100 bytes: ${name}`);
	header.set(nameBytes, 0);
	put("0000644\0", 100);
	put("0000000\0", 108);
	put("0000000\0", 116);
	put(`${size.toString(8).padStart(11, "0")}\0`, 124);
	put("00000000000\0", 136);
	header.fill(0x20, 148, 156);
	header[156] = typeFlag.charCodeAt(0);
	put("ustar\0", 257);
	put("00", 263);
	let sum = 0;
	for (const byte of header) sum += byte;
	put(`${sum.toString(8).padStart(6, "0")}\0 `, 148);
	return header;
}

async function writeUstarBytes(file: string, chunks: Uint8Array[]): Promise<void> {
	await writeFile(file, concat([...chunks, new Uint8Array(1024)]));
}

async function writeUstar(
	file: string,
	writeBody: (push: (chunk: Uint8Array) => Promise<void>) => Promise<void>,
): Promise<void> {
	const handle = await open(file, "w");
	try {
		await writeBody(async chunk => {
			await handle.write(chunk);
		});
		await handle.write(new Uint8Array(1024));
	} finally {
		await handle.close();
	}
}

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

function pad512(data: Uint8Array): Uint8Array {
	const pad = (512 - (data.byteLength % 512)) % 512;
	if (pad === 0) return data;
	const out = new Uint8Array(data.byteLength + pad);
	out.set(data, 0);
	return out;
}

function paxRecords(records: Array<[string, string]>): Uint8Array {
	let body = "";
	for (const [key, value] of records) {
		const suffix = ` ${key}=${value}\n`;
		let size = suffix.length;
		while (String(size).length + suffix.length !== size) size = String(size).length + suffix.length;
		body += `${size}${suffix}`;
	}
	return new TextEncoder().encode(body);
}

function openInChild(archivePath: string): Promise<{ timedOut: boolean; output: string }> {
	const reader = path.join(import.meta.dir, "../src/tools/archive-reader.ts");
	const script = `
		import { openArchive } from ${JSON.stringify(reader)};
		try {
			await openArchive(${JSON.stringify(archivePath)});
			console.log("OPENED");
		} catch {
			console.log("REJECTED");
		}
	`;
	return new Promise(resolve => {
		const child = spawn(process.execPath, ["-e", script], { stdio: ["ignore", "pipe", "pipe"] });
		let output = "";
		let settled = false;
		const finish = (timedOut: boolean) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve({ timedOut, output });
		};
		const timer = setTimeout(() => {
			child.kill("SIGKILL");
			finish(true);
		}, 3000);
		child.stdout.on("data", chunk => {
			output += String(chunk);
		});
		child.on("exit", () => finish(false));
	});
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

	test(
		"still allows a crafted ustar member",
		noted("still allows a crafted ustar member", async () => {
			const dir = await mkdtemp(path.join(tmpdir(), "archive-ustar-"));
			try {
				const archivePath = path.join(dir, "ok.tar");
				const body = new TextEncoder().encode("hello");
				await writeUstar(archivePath, async push => {
					await push(ustarHeader("hello.txt", body.byteLength));
					await push(body);
					await push(new Uint8Array((512 - (body.byteLength % 512)) % 512));
				});
				const archive = await openArchive(archivePath);
				expect(new TextDecoder().decode((await archive.readFile("hello.txt")).bytes)).toBe("hello");
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		}),
	);

	test(
		"still allows a small gzip payload with a tar name",
		noted("still allows a small gzip payload with a tar name", async () => {
			const dir = await mkdtemp(path.join(tmpdir(), "archive-gzname-"));
			try {
				await writeFile(path.join(dir, "hello.txt"), "hello");
				const gzipPath = path.join(dir, "ok.tar.gz");
				await exec("tar", ["-czf", gzipPath, "-C", dir, "hello.txt"]);
				const namedTar = path.join(dir, "ok.tar");
				await writeFile(namedTar, await Bun.file(gzipPath).bytes());
				const archive = await openArchive(namedTar);
				expect(new TextDecoder().decode((await archive.readFile("hello.txt")).bytes)).toBe("hello");
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		}),
	);

	test(
		"rejects gzip bytes in a tar name past the total cap",
		noted("rejects gzip bytes in a tar name past the total cap", async () => {
			const dir = await mkdtemp(path.join(tmpdir(), "archive-gztar-"));
			try {
				await writeFile(path.join(dir, "big.bin"), new Uint8Array(TOTAL_LIMIT + 1));
				const gzipPath = path.join(dir, "bomb.tar.gz");
				await exec("tar", ["-czf", gzipPath, "-C", dir, "big.bin"]);
				const namedTar = path.join(dir, "bomb.tar");
				await writeFile(namedTar, await Bun.file(gzipPath).bytes());
				await expect(openArchive(namedTar)).rejects.toThrow(/total limit/);
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		}),
		60_000,
	);

	test(
		"still allows a small tar under two gzip wrappers",
		noted("still allows a small tar under two gzip wrappers", async () => {
			const dir = await mkdtemp(path.join(tmpdir(), "archive-gz2-"));
			try {
				await writeFile(path.join(dir, "hello.txt"), "hello");
				const once = path.join(dir, "once.tar.gz");
				await exec("tar", ["-czf", once, "-C", dir, "hello.txt"]);
				const twice = path.join(dir, "twice.tar.gz");
				await writeFile(twice, gzipSync(await Bun.file(once).bytes()));
				const archive = await openArchive(twice);
				expect(new TextDecoder().decode((await archive.readFile("hello.txt")).bytes)).toBe("hello");
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		}),
	);

	test(
		"still allows a small tar under 24 gzip wrappers",
		noted("still allows a small tar under 24 gzip wrappers", async () => {
			const dir = await mkdtemp(path.join(tmpdir(), "archive-gz24-"));
			try {
				await writeFile(path.join(dir, "hello.txt"), "hello");
				const raw = path.join(dir, "ok.tar");
				await exec("tar", ["-cf", raw, "-C", dir, "hello.txt"]);
				let wrapped = await Bun.file(raw).bytes();
				for (let layer = 0; layer < 24; layer++) wrapped = gzipSync(wrapped);
				const archivePath = path.join(dir, "wrapped.tar.gz");
				await writeFile(archivePath, wrapped);
				const archive = await openArchive(archivePath);
				expect(new TextDecoder().decode((await archive.readFile("hello.txt")).bytes)).toBe("hello");
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		}),
	);

	test(
		"rejects a 25th gzip wrapper",
		noted("rejects a 25th gzip wrapper", async () => {
			const dir = await mkdtemp(path.join(tmpdir(), "archive-gz25-"));
			try {
				await writeFile(path.join(dir, "hello.txt"), "hello");
				const raw = path.join(dir, "ok.tar");
				await exec("tar", ["-cf", raw, "-C", dir, "hello.txt"]);
				let wrapped = await Bun.file(raw).bytes();
				for (let layer = 0; layer < 25; layer++) wrapped = gzipSync(wrapped);
				const archivePath = path.join(dir, "wrapped.tar.gz");
				await writeFile(archivePath, wrapped);
				await expect(openArchive(archivePath)).rejects.toThrow(/total limit/);
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		}),
	);

	test(
		"rejects a second gzip wrapper past the total cap",
		noted("rejects a second gzip wrapper past the total cap", async () => {
			const dir = await mkdtemp(path.join(tmpdir(), "archive-gz2bomb-"));
			try {
				await writeFile(path.join(dir, "big.bin"), new Uint8Array(TOTAL_LIMIT + 1));
				const once = path.join(dir, "once.tar.gz");
				await exec("tar", ["-czf", once, "-C", dir, "big.bin"]);
				const twice = path.join(dir, "twice.tar.gz");
				await writeFile(twice, gzipSync(await Bun.file(once).bytes()));
				await expect(openArchive(twice)).rejects.toThrow(/total limit/);
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		}),
		60_000,
	);

	test(
		"rejects directory-only tar entries past the count cap",
		noted("rejects directory-only tar entries past the count cap", async () => {
			const dir = await mkdtemp(path.join(tmpdir(), "archive-dircount-"));
			try {
				const archivePath = path.join(dir, "dirs.tar");
				const headers: Uint8Array[] = [];
				for (let index = 0; index < COUNT_LIMIT + 1; index++) headers.push(ustarHeader(`d${index}/`, 0, "5"));
				await writeUstarBytes(archivePath, headers);
				await expect(openArchive(archivePath)).rejects.toThrow(/too many entries/);
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		}),
		20_000,
	);

	test(
		"still allows a directory-only tar at the count cap",
		noted("still allows a directory-only tar at the count cap", async () => {
			const dir = await mkdtemp(path.join(tmpdir(), "archive-dirkeep-"));
			try {
				const archivePath = path.join(dir, "dirs.tar");
				const headers: Uint8Array[] = [];
				for (let index = 0; index < COUNT_LIMIT; index++) headers.push(ustarHeader(`d${index}/`, 0, "5"));
				await writeUstarBytes(archivePath, headers);
				await openArchive(archivePath);
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		}),
		20_000,
	);

	test(
		"rejects a directory-only tar nested past the depth cap",
		noted("rejects a directory-only tar nested past the depth cap", async () => {
			const dir = await mkdtemp(path.join(tmpdir(), "archive-dirdeep-"));
			try {
				const archivePath = path.join(dir, "deep.tar");
				const name = "a/".repeat(DEPTH_LIMIT + 1);
				await writeUstar(archivePath, async push => {
					await push(ustarHeader(name, 0, "5"));
				});
				await expect(openArchive(archivePath)).rejects.toThrow(/nested too deeply/);
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		}),
	);

	test(
		"still allows a tar member at the depth cap",
		noted("still allows a tar member at the depth cap", async () => {
			const dir = await mkdtemp(path.join(tmpdir(), "archive-tardepth-"));
			try {
				const archivePath = path.join(dir, "deep.tar");
				const name = `${"a/".repeat(DEPTH_LIMIT - 1)}f.txt`;
				await writeUstar(archivePath, async push => {
					await push(ustarHeader(name, 1));
					await push(new Uint8Array([65]));
					await push(new Uint8Array(511));
				});
				const archive = await openArchive(archivePath);
				expect((await archive.readFile(name)).bytes[0]).toBe(65);
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		}),
	);

	test(
		"rejects duplicate tar paths past the count cap",
		noted("rejects duplicate tar paths past the count cap", async () => {
			const dir = await mkdtemp(path.join(tmpdir(), "archive-dup-"));
			try {
				const archivePath = path.join(dir, "dup.tar");
				const headers: Uint8Array[] = [];
				for (let index = 0; index < COUNT_LIMIT + 1; index++) headers.push(ustarHeader("a.txt", 0));
				await writeUstarBytes(archivePath, headers);
				await expect(openArchive(archivePath)).rejects.toThrow(/too many entries/);
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		}),
		20_000,
	);

	test(
		"rejects a tar entry from its declared size before the body",
		noted("rejects a tar entry from its declared size before the body", async () => {
			const dir = await mkdtemp(path.join(tmpdir(), "archive-decl-"));
			try {
				const archivePath = path.join(dir, "declared.tar");
				await writeUstar(archivePath, async push => {
					await push(ustarHeader("big.bin", ENTRY_LIMIT + 1));
				});
				await expect(openArchive(archivePath)).rejects.toThrow(/per-entry limit/);
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		}),
	);

	test(
		"still allows four max-size tar members",
		noted("still allows four max-size tar members", async () => {
			const dir = await mkdtemp(path.join(tmpdir(), "archive-four-"));
			try {
				const archivePath = path.join(dir, "four.tar");
				const chunk = new Uint8Array(1024 * 1024);
				await writeUstar(archivePath, async push => {
					for (let index = 0; index < 4; index++) {
						await push(ustarHeader(`p${index}.bin`, ENTRY_LIMIT));
						let left = ENTRY_LIMIT;
						while (left > 0) {
							const n = Math.min(chunk.byteLength, left);
							await push(chunk.subarray(0, n));
							left -= n;
						}
					}
				});
				const archive = await openArchive(archivePath);
				expect((await archive.readFile("p0.bin")).bytes.byteLength).toBe(ENTRY_LIMIT);
				expect((await archive.readFile("p3.bin")).bytes.byteLength).toBe(ENTRY_LIMIT);
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		}),
		60_000,
	);

	test(
		"still allows four max-size tar.gz members",
		noted("still allows four max-size tar.gz members", async () => {
			const dir = await mkdtemp(path.join(tmpdir(), "archive-fourgz-"));
			try {
				const rawPath = path.join(dir, "four.tar");
				const chunk = new Uint8Array(1024 * 1024);
				await writeUstar(rawPath, async push => {
					for (let index = 0; index < 4; index++) {
						await push(ustarHeader(`p${index}.bin`, ENTRY_LIMIT));
						let left = ENTRY_LIMIT;
						while (left > 0) {
							const n = Math.min(chunk.byteLength, left);
							await push(chunk.subarray(0, n));
							left -= n;
						}
					}
				});
				const gzipPath = path.join(dir, "four.tar.gz");
				await exec("gzip", ["-c", "-n", rawPath], { encoding: "buffer", maxBuffer: 8 * 1024 * 1024 }).then(
					async result => {
						await writeFile(gzipPath, result.stdout);
					},
				);
				const archive = await openArchive(gzipPath);
				expect((await archive.readFile("p0.bin")).bytes.byteLength).toBe(ENTRY_LIMIT);
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		}),
		60_000,
	);

	test(
		"rejects a malformed pax record",
		noted("rejects a malformed pax record", async () => {
			const bodies = ["0 path=x\n", "-1 path=\n", "1a path=\n", "4 a\n=x\n", "8 path=x"];
			for (const body of bodies) {
				const dir = await mkdtemp(path.join(tmpdir(), "archive-badpax-"));
				try {
					const archivePath = path.join(dir, "bad.tar");
					const bytes = new TextEncoder().encode(body);
					await writeUstar(archivePath, async push => {
						await push(ustarHeader("paxheader", bytes.byteLength, "x"));
						await push(pad512(bytes));
					});
					const result = await openInChild(archivePath);
					expect(result.timedOut).toBe(false);
					expect(result.output).toContain("REJECTED");
				} finally {
					await rm(dir, { recursive: true, force: true });
				}
			}
		}),
		20_000,
	);

	test(
		"still allows a pax long path",
		noted("still allows a pax long path", async () => {
			const dir = await mkdtemp(path.join(tmpdir(), "archive-pax-"));
			try {
				const archivePath = path.join(dir, "long.tar");
				const name = `${"a".repeat(120)}.txt`;
				const records = paxRecords([["path", name]]);
				const hello = new TextEncoder().encode("hello");
				await writeUstar(archivePath, async push => {
					await push(ustarHeader("paxheader", records.byteLength, "x"));
					await push(pad512(records));
					await push(ustarHeader(name.slice(0, 100), hello.byteLength));
					await push(pad512(hello));
				});
				const archive = await openArchive(archivePath);
				expect(archive.listDirectory().map(item => item.name)).toContain(name);
				expect(new TextDecoder().decode((await archive.readFile(name)).bytes)).toBe("hello");
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		}),
	);

	test(
		"rejects a pax path nested past the depth cap",
		noted("rejects a pax path nested past the depth cap", async () => {
			const dir = await mkdtemp(path.join(tmpdir(), "archive-paxdeep-"));
			try {
				const archivePath = path.join(dir, "deep.tar");
				const name = `${"d/".repeat(DEPTH_LIMIT)}f.txt`;
				const records = paxRecords([["path", name]]);
				await writeUstar(archivePath, async push => {
					await push(ustarHeader("paxheader", records.byteLength, "x"));
					await push(pad512(records));
					await push(ustarHeader("f.txt", 1));
					await push(pad512(new Uint8Array([65])));
				});
				await expect(openArchive(archivePath)).rejects.toThrow(/nested too deeply/);
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		}),
	);

	test(
		"still allows the last zip member when names repeat",
		noted("still allows the last zip member when names repeat", async () => {
			const bytes = zipUnknownSize([
				{ name: "a.txt", data: new TextEncoder().encode("old") },
				{ name: "a.txt", data: new TextEncoder().encode("newer") },
			]);
			await withFile("dup.zip", bytes, async file => {
				const archive = await openArchive(file);
				const entry = await archive.readFile("a.txt");
				expect(new TextDecoder().decode(entry.bytes)).toBe("newer");
				expect(entry.bytes.byteLength).toBe(5);
			});
		}),
	);

	test(
		"rejects duplicate zip names past the total cap",
		noted("rejects duplicate zip names past the total cap", async () => {
			const part = new Uint8Array(15 * 1024 * 1024);
			const bytes = zipUnknownSize(Array.from({ length: 5 }, () => ({ name: "a.bin", data: part })));
			expect(part.byteLength).toBeLessThan(ENTRY_LIMIT);
			expect(part.byteLength * 5).toBeGreaterThan(TOTAL_LIMIT);
			await withFile("dup-total.zip", bytes, async file => {
				await expect(openArchive(file)).rejects.toThrow(/total limit/);
			});
		}),
		20_000,
	);

	test(
		"rejects duplicate zip names past the count cap",
		noted("rejects duplicate zip names past the count cap", async () => {
			const files = Array.from({ length: COUNT_LIMIT + 1 }, () => ({ name: "a.txt", data: new Uint8Array(0) }));
			await withFile("dup-count.zip", zipUnknownSize(files), async file => {
				await expect(openArchive(file)).rejects.toThrow(/too many entries/);
			});
		}),
		20_000,
	);

	test(
		"still allows an empty deflate member at the total cap",
		noted("still allows an empty deflate member at the total cap", async () => {
			const part = new Uint8Array(ENTRY_LIMIT);
			const bytes = zipUnknownSize([
				...Array.from({ length: 4 }, (_, index) => ({ name: `p${index}.bin`, data: part })),
				{ name: "empty.txt", data: new Uint8Array(0) },
			]);
			await withFile("exact.zip", bytes, async file => {
				const archive = await openArchive(file);
				expect((await archive.readFile("empty.txt")).bytes.byteLength).toBe(0);
				expect((await archive.readFile("p3.bin")).bytes.byteLength).toBe(ENTRY_LIMIT);
			});
		}),
		60_000,
	);

	test(
		"rejects one byte after the total cap",
		noted("rejects one byte after the total cap", async () => {
			const part = new Uint8Array(ENTRY_LIMIT);
			const bytes = zipUnknownSize([
				...Array.from({ length: 4 }, (_, index) => ({ name: `p${index}.bin`, data: part })),
				{ name: "extra.txt", data: new Uint8Array([1]) },
			]);
			await withFile("over.zip", bytes, async file => {
				await expect(openArchive(file)).rejects.toThrow(/total limit/);
			});
		}),
		60_000,
	);
});
