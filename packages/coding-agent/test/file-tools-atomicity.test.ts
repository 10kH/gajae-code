import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Settings } from "@gajae-code/coding-agent/config/settings";
import type { ClientBridge } from "@gajae-code/coding-agent/session/client-bridge";
import type { ToolSession } from "@gajae-code/coding-agent/tools";
import { ReadTool } from "@gajae-code/coding-agent/tools/read";
import { WriteTool } from "@gajae-code/coding-agent/tools/write";
import { FileReadCache } from "../src/edit/file-read-cache";
import { writeFileAtomically } from "../src/tools/atomic-file-write";

function createSession(cwd: string, extras: Partial<ToolSession> = {}): ToolSession {
	return {
		cwd,
		hasUI: false,
		getSessionFile: () => path.join(cwd, "session.jsonl"),
		getSessionSpawns: () => "*",
		getArtifactsDir: () => path.join(cwd, "artifacts"),
		allocateOutputArtifact: async () => ({ id: "artifact-1", path: path.join(cwd, "artifact-1.log") }),
		settings: Settings.isolated(),
		...extras,
	};
}

function textOf(result: { content: Array<{ type: string; text?: string }> }): string {
	return result.content
		.filter(block => block.type === "text")
		.map(block => block.text ?? "")
		.join("\n");
}

describe("file tool atomicity and read-after-write (#4734)", () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-tools-4734-"));
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	it("reads a freshly written nested file without a not-found error", async () => {
		const session = createSession(tmpDir);
		const dest = path.join(tmpDir, "frontend", "e2e", "zzop-repro.spec.ts");
		const content = "import { test } from '@playwright/test';\n";
		const writeResult = await new WriteTool(session).execute("write-fresh", { path: dest, content });
		expect(textOf(writeResult)).toContain("Successfully wrote");
		const readResult = await new ReadTool(session).execute("read-fresh", { path: dest });
		expect(textOf(readResult)).toContain("import { test }");
		const stat = await fs.stat(dest);
		expect(stat.size).toBeGreaterThan(0);
	});

	it("leaves an existing file unchanged when the staged write fails", async () => {
		const dest = path.join(tmpDir, "backend", "app", "routers", "automation_snapshots.py");
		await fs.mkdir(path.dirname(dest), { recursive: true });
		await fs.writeFile(dest, "original = True\n");
		const realOpen = fs.open.bind(fs);
		const original = spyOn(fs, "open").mockImplementation(async (target, flags) => {
			if (String(target).includes(".tmp") && flags === "wx") {
				const error = new Error("EPERM: Operation not permitted") as Error & { code: string };
				error.code = "EPERM";
				throw error;
			}
			return realOpen(target, flags);
		});
		try {
			await expect(writeFileAtomically(dest, "mutated = True\n")).rejects.toMatchObject({ code: "EPERM" });
			expect(await fs.readFile(dest, "utf8")).toBe("original = True\n");
			const leftovers = await fs.readdir(path.dirname(dest));
			expect(leftovers.some(name => name.includes(".tmp"))).toBe(false);
		} finally {
			original.mockRestore();
		}
	});

	it("does not create a 0-byte destination when a new-file staged write fails", async () => {
		const dest = path.join(tmpDir, "new-file.py");
		const realOpen = fs.open.bind(fs);
		const original = spyOn(fs, "open").mockImplementation(async (target, flags) => {
			if (String(target).includes(".tmp") && flags === "wx") {
				const error = new Error("EPERM: Operation not permitted") as Error & { code: string };
				error.code = "EPERM";
				throw error;
			}
			return realOpen(target, flags);
		});
		try {
			await expect(writeFileAtomically(dest, "print('hi')\n")).rejects.toMatchObject({ code: "EPERM" });
			expect(
				await fs.stat(dest).then(
					() => true,
					() => false,
				),
			).toBe(false);
		} finally {
			original.mockRestore();
		}
	});

	it("surfaces a permission error without leaving a 0-byte file in a read-only directory", async () => {
		if (process.platform === "win32" || (typeof process.getuid === "function" && process.getuid() === 0)) return;
		const locked = path.join(tmpDir, "locked");
		await fs.mkdir(locked);
		await fs.chmod(locked, 0o555);
		const dest = path.join(locked, "automation_snapshots.py");
		try {
			await expect(
				new WriteTool(createSession(tmpDir)).execute("write-eperm", {
					path: dest,
					content: "print('nope')\n",
				}),
			).rejects.toThrow(/Permission denied writing/);
			expect(
				await fs.stat(dest).then(
					() => true,
					() => false,
				),
			).toBe(false);
		} finally {
			await fs.chmod(locked, 0o755);
		}
	});

	it("reads an ACP buffer that has not been flushed to disk", async () => {
		const dest = path.join(tmpDir, "frontend", "e2e", "zzop-repro.spec.ts");
		const bridge: ClientBridge = {
			capabilities: { readTextFile: true, writeTextFile: true },
			writeTextFile: async () => undefined,
			readTextFile: async () => "export const fromBridge = true;\n",
		};
		const session = createSession(tmpDir, { getClientBridge: () => bridge });
		await new WriteTool(session).execute("acp-write", { path: dest, content: "export const fromBridge = true;\n" });
		expect(
			await fs.stat(dest).then(
				() => true,
				() => false,
			),
		).toBe(false);
		const readResult = await new ReadTool(session).execute("acp-read", { path: dest });
		expect(textOf(readResult)).toContain("fromBridge");
	});

	it("falls back to disk when ACP read fails with an OS EPERM errno", async () => {
		const dest = path.join(tmpDir, "on-disk.ts");
		await fs.writeFile(dest, "export const fromDisk = true;\n");
		const bridge: ClientBridge = {
			capabilities: { readTextFile: true },
			readTextFile: async () => {
				const error = new Error("EPERM: Operation not permitted") as Error & { code: string };
				error.code = "EPERM";
				throw error;
			},
		};
		const result = await new ReadTool(createSession(tmpDir, { getClientBridge: () => bridge })).execute(
			"eperm-fallback",
			{ path: dest },
		);
		expect(textOf(result)).toContain("fromDisk");
	});

	it("does not fall back to disk for a structured ACP permission denial", async () => {
		const dest = path.join(tmpDir, "secret.ts");
		await fs.writeFile(dest, "export const leaked = true;\n");
		const bridge: ClientBridge = {
			capabilities: { readTextFile: true },
			readTextFile: async () => {
				const error = new Error("permission denied by client") as Error & { code: string };
				error.code = "permission_denied";
				throw error;
			},
		};
		await expect(
			new ReadTool(createSession(tmpDir, { getClientBridge: () => bridge })).execute("denied", { path: dest }),
		).rejects.toThrow(/permission denied by client/);
	});

	it("invalidates the file-read cache after a successful write", async () => {
		const dest = path.join(tmpDir, "cached.ts");
		const cache = new FileReadCache();
		cache.recordContiguous(dest, 1, ["old line"]);
		const session = createSession(tmpDir, { fileReadCache: cache });
		await new WriteTool(session).execute("cache-write", { path: dest, content: "new line\n" });
		expect(cache.get(dest)).toBeNull();
	});

	it("writes through a destination symlink without replacing the link", async () => {
		const target = path.join(tmpDir, "real.ts");
		const link = path.join(tmpDir, "alias.ts");
		await fs.writeFile(target, "old\n");
		await fs.symlink(target, link);
		await writeFileAtomically(link, "new\n");
		expect(await fs.readFile(target, "utf8")).toBe("new\n");
		expect((await fs.lstat(link)).isSymbolicLink()).toBe(true);
		expect(await fs.readlink(link)).toBe(target);
	});

	it("retries exclusive temp creation when a sibling name already exists", async () => {
		const dest = path.join(tmpDir, "retry.ts");
		const realOpen = fs.open.bind(fs);
		let collisions = 0;
		const original = spyOn(fs, "open").mockImplementation(async (target, flags, mode) => {
			if (String(target).includes(".tmp") && flags === "wx" && collisions < 1) {
				collisions += 1;
				const error = new Error("EEXIST: file already exists") as Error & { code: string };
				error.code = "EEXIST";
				throw error;
			}
			return realOpen(target, flags, mode);
		});
		try {
			await writeFileAtomically(dest, "after retry\n");
			expect(collisions).toBe(1);
			expect(await fs.readFile(dest, "utf8")).toBe("after retry\n");
		} finally {
			original.mockRestore();
		}
	});

	it("preserves exact mode bits when replacing an existing file", async () => {
		if (process.platform === "win32") return;
		const dest = path.join(tmpDir, "mode-preserved.ts");
		await fs.writeFile(dest, "old\n", { mode: 0o640 });
		await fs.chmod(dest, 0o640);
		await writeFileAtomically(dest, "new\n");
		expect((await fs.stat(dest)).mode & 0o777).toBe(0o640);
	});

	it("preserves ownership and syncs staged bytes before publication", async () => {
		if (process.platform === "win32") return;
		const dest = path.join(tmpDir, "metadata-preserved.ts");
		await fs.writeFile(dest, "old\n", { mode: 0o640 });
		const before = await fs.stat(dest);
		const realOpen = fs.open.bind(fs);
		let syncs = 0;
		const original = spyOn(fs, "open").mockImplementation(async (target, flags, mode) => {
			const handle = await realOpen(target, flags, mode);
			if (String(target).includes(".tmp") && flags === "wx") {
				const realSync = handle.sync.bind(handle);
				spyOn(handle, "sync").mockImplementation(async () => {
					syncs += 1;
					return realSync();
				});
			}
			return handle;
		});
		try {
			await writeFileAtomically(dest, "new\n");
			const after = await fs.stat(dest);
			expect(syncs).toBe(1);
			expect(after.uid).toBe(before.uid);
			expect(after.gid).toBe(before.gid);
		} finally {
			original.mockRestore();
		}
	});

	it("rejects hard-linked destinations instead of splitting the link group", async () => {
		if (process.platform === "win32") return;
		const dest = path.join(tmpDir, "hard-linked.ts");
		const peer = path.join(tmpDir, "hard-linked-peer.ts");
		await fs.writeFile(dest, "original\n");
		await fs.link(dest, peer);
		await expect(writeFileAtomically(dest, "replacement\n")).rejects.toThrow(/hard-linked/);
		expect(await fs.readFile(dest, "utf8")).toBe("original\n");
		expect(await fs.readFile(peer, "utf8")).toBe("original\n");
	});

	it("rejects a destination identity swap during publication", async () => {
		if (process.platform === "win32") return;
		const dest = path.join(tmpDir, "identity-swap.ts");
		const replacement = path.join(tmpDir, "identity-replacement.ts");
		const originalPath = path.join(tmpDir, "identity-original.ts");
		await fs.writeFile(dest, "original\n");
		await fs.writeFile(replacement, "replacement\n");
		const realRename = (from: string, to: string) => fs.rename(from, to);
		let swapped = false;
		const realChmod = fs.chmod.bind(fs) as (target: string, mode: number) => Promise<void>;
		const original = spyOn(fs, "chmod").mockImplementation(async (target, mode) => {
			if (String(target).includes(".tmp") && !swapped) {
				swapped = true;
				await realRename(dest, originalPath);
				await realRename(replacement, dest);
			}
			return realChmod(String(target), mode as number);
		});
		try {
			await expect(writeFileAtomically(dest, "must-not-overwrite\n")).rejects.toThrow(/replaced while staging/);
			expect(await fs.readFile(dest, "utf8")).toBe("replacement\n");
		} finally {
			original.mockRestore();
			await fs.rm(originalPath, { force: true });
		}
	});

	it("does not flatten non-ENOENT trust-boundary resolution errors", async () => {
		const dest = path.join(tmpDir, "realpath-error.ts");
		const error = new Error("EIO: realpath failed") as Error & { code: string };
		error.code = "EIO";
		const original = spyOn(fs, "realpath").mockRejectedValueOnce(error);
		try {
			await expect(writeFileAtomically(dest, "must-fail\n", { trustBoundary: tmpDir })).rejects.toMatchObject({
				code: "EIO",
			});
			expect(
				await fs.stat(dest).then(
					() => true,
					() => false,
				),
			).toBe(false);
		} finally {
			original.mockRestore();
		}
	});

	it("cleans a staged file when its close fails", async () => {
		const dest = path.join(tmpDir, "close-fails.ts");
		const realOpen = fs.open.bind(fs);
		const original = spyOn(fs, "open").mockImplementation(async (target, flags, mode) => {
			const handle = await realOpen(target, flags, mode);
			if (String(target).includes(".tmp") && flags === "wx") {
				const realClose = handle.close.bind(handle);
				spyOn(handle, "close").mockImplementation(async () => {
					await realClose();
					const error = new Error("EIO: close failed") as Error & { code: string };
					error.code = "EIO";
					throw error;
				});
			}
			return handle;
		});
		try {
			await expect(writeFileAtomically(dest, "must-fail\n")).rejects.toMatchObject({ code: "EIO" });
			expect((await fs.readdir(path.dirname(dest))).some(name => name.endsWith(".tmp"))).toBe(false);
		} finally {
			original.mockRestore();
		}
	});

	it("does not replace an unwritable target through a writable parent", async () => {
		if (process.platform === "win32" || (typeof process.getuid === "function" && process.getuid() === 0)) return;
		const parent = path.join(tmpDir, "writable-parent");
		const dest = path.join(parent, "unwritable.ts");
		await fs.mkdir(parent);
		await fs.writeFile(dest, "original\n");
		await fs.chmod(dest, 0o444);
		try {
			await expect(writeFileAtomically(dest, "replacement\n")).rejects.toThrow(/Permission denied|EACCES|EPERM/);
			expect(await fs.readFile(dest, "utf8")).toBe("original\n");
		} finally {
			await fs.chmod(dest, 0o644);
		}
	});

	it("cleans an owned staging file when publication fails", async () => {
		const dest = path.join(tmpDir, "rename-fails.ts");
		await fs.writeFile(dest, "original\n");
		const realRename = fs.rename.bind(fs);
		const original = spyOn(fs, "rename").mockImplementation(async (from, to) => {
			if (String(from).includes(".tmp")) {
				const error = new Error("EIO: publication failed") as Error & { code: string };
				error.code = "EIO";
				throw error;
			}
			return realRename(from, to);
		});
		try {
			await expect(writeFileAtomically(dest, "replacement\n")).rejects.toMatchObject({ code: "EIO" });
			expect(await fs.readFile(dest, "utf8")).toBe("original\n");
			expect((await fs.readdir(path.dirname(dest))).some(name => name.endsWith(".tmp"))).toBe(false);
		} finally {
			original.mockRestore();
		}
	});

	it("rejects a symlink escape from the session-scoped gjc-local root", async () => {
		if (process.platform === "win32") return;
		const sessionRoot = path.join(os.tmpdir(), "gjc-local", "atomic-trust-test");
		const outside = path.join(tmpDir, "outside-secret.ts");
		const link = path.join(sessionRoot, "alias.ts");
		await fs.mkdir(sessionRoot, { recursive: true });
		await fs.writeFile(outside, "outside\n");
		await fs.symlink(outside, link);
		try {
			await expect(writeFileAtomically(link, "must-not-write\n")).rejects.toThrow(/outside trust boundary/);
			expect(await fs.readFile(outside, "utf8")).toBe("outside\n");
		} finally {
			await fs.rm(sessionRoot, { recursive: true, force: true });
		}
	});

	it("publishes rebuilt archive bytes atomically", async () => {
		const archivePath = path.join(tmpDir, "archive.tar");
		await fs.writeFile(archivePath, await new Bun.Archive({ "pkg/old.txt": "old\n" }).bytes());
		const realOpen = fs.open.bind(fs);
		const original = spyOn(fs, "open").mockImplementation(async (target, flags, mode) => {
			if (String(target).includes(".tmp") && flags === "wx") {
				const error = new Error("EPERM: archive publication denied") as Error & { code: string };
				error.code = "EPERM";
				throw error;
			}
			return realOpen(target, flags, mode);
		});
		try {
			await expect(
				new WriteTool(createSession(tmpDir)).execute("archive-atomic", {
					path: `${archivePath}:pkg/new.txt`,
					content: "new\n",
				}),
			).rejects.toThrow(/Permission denied writing/);
			const files = await new Bun.Archive(await fs.readFile(archivePath)).files();
			expect(await files.get("pkg/old.txt")?.text()).toBe("old\n");
			expect(files.has("pkg/new.txt")).toBe(false);
		} finally {
			original.mockRestore();
		}
	});

	it("does not summarize a denied ACP file from disk", async () => {
		const dest = path.join(tmpDir, "denied.ts");
		await fs.writeFile(dest, "export function secret() { return 1; }\nexport function other() { return 2; }\n");
		const bridge: ClientBridge = {
			capabilities: { readTextFile: true },
			readTextFile: async () => {
				const error = new Error("permission denied by client") as Error & { code: string };
				error.code = "permission_denied";
				throw error;
			},
		};
		await expect(
			new ReadTool(createSession(tmpDir, { getClientBridge: () => bridge })).execute("summary-denied", {
				path: dest,
			}),
		).rejects.toThrow(/permission denied by client/);
	});
});
