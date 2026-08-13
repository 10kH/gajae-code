import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	isUnsupportedWindowsDirectorySyncError,
	syncCoordinatorDirectory,
	syncCoordinatorFile,
	writeCoordinatorAtomic,
} from "../src/coordinator-mcp/durability";

function errno(code: string): NodeJS.ErrnoException {
	return Object.assign(new Error(code), { code });
}

describe("Coordinator durability", () => {
	it("accepts only unsupported Windows directory barriers after file durability", async () => {
		const calls: string[] = [];
		const handle = {
			async sync(): Promise<void> {
				calls.push("directory-sync");
				throw errno("EPERM");
			},
			async close(): Promise<void> {
				calls.push("directory-close");
			},
		} as fs.FileHandle;
		await syncCoordinatorDirectory("state", { platform: "win32", openDirectory: async () => handle });
		expect(calls).toEqual(["directory-sync", "directory-close"]);
	});

	it("keeps unexpected and non-Windows directory failures fail-closed", async () => {
		for (const [platform, code] of [
			["win32", "EIO"],
			["linux", "EPERM"],
		] as const) {
			const handle = {
				async sync(): Promise<void> {
					throw errno(code);
				},
				async close(): Promise<void> {},
			} as fs.FileHandle;
			await expect(
				syncCoordinatorDirectory("state", { platform, openDirectory: async () => handle }),
			).rejects.toMatchObject({ code });
		}
	});

	it("never classifies file fsync failures as unsupported directory failures", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-coordinator-durability-"));
		try {
			const handle = await fs.open(path.join(root, "state.json"), "w");
			try {
				await expect(
					syncCoordinatorFile(handle, { syncFile: async () => Promise.reject(errno("EPERM")) }),
				).rejects.toMatchObject({
					code: "EPERM",
				});
			} finally {
				await handle.close();
			}
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	it("publishes coordinator state only after file durability and accepts Windows directory EPERM", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-coordinator-durability-"));
		try {
			const file = path.join(root, "state.json");
			const calls: string[] = [];
			await writeCoordinatorAtomic(file, "state", {
				platform: "win32",
				syncFile: async () => {
					calls.push("file-sync");
				},
				rename: async (source, destination) => {
					calls.push("rename");
					await fs.rename(source, destination);
				},
				openDirectory: async directory => {
					calls.push("directory-open");
					const handle = await fs.open(directory, "r");
					return Object.assign(handle, {
						async sync(): Promise<void> {
							calls.push("directory-sync");
							throw errno("EPERM");
						},
					});
				},
			});
			expect(await fs.readFile(file, "utf8")).toBe("state");
			expect(calls).toEqual(["file-sync", "rename", "directory-open", "directory-sync"]);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	it("does not publish a coordinator state file when file sync fails", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-coordinator-durability-"));
		try {
			const file = path.join(root, "state.json");
			await expect(
				writeCoordinatorAtomic(file, "state", { syncFile: async () => Promise.reject(errno("EIO")) }),
			).rejects.toMatchObject({ code: "EIO" });
			expect(await Bun.file(file).exists()).toBe(false);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	it("classifies only documented Windows directory error codes", () => {
		for (const code of ["EPERM", "EACCES", "ENOTSUP", "EOPNOTSUPP", "EINVAL"])
			expect(isUnsupportedWindowsDirectorySyncError(errno(code), "win32")).toBe(true);
		expect(isUnsupportedWindowsDirectorySyncError(errno("EIO"), "win32")).toBe(false);
		expect(isUnsupportedWindowsDirectorySyncError(errno("EPERM"), "linux")).toBe(false);
	});
});
