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
		const original = spyOn(Bun, "write").mockImplementation(async target => {
			if (String(target).includes(".tmp")) {
				const error = new Error("EPERM: Operation not permitted") as Error & { code: string };
				error.code = "EPERM";
				throw error;
			}
			throw new Error(`unexpected Bun.write to ${String(target)}`);
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
		const original = spyOn(Bun, "write").mockImplementation(async target => {
			if (String(target).includes(".tmp")) {
				const error = new Error("EPERM: Operation not permitted") as Error & { code: string };
				error.code = "EPERM";
				throw error;
			}
			throw new Error(`unexpected Bun.write to ${String(target)}`);
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
		if (typeof process.getuid === "function" && process.getuid() === 0) return;
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
});
