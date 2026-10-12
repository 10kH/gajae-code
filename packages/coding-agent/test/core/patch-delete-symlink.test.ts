import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Settings } from "@gajae-code/coding-agent/config/settings";
import {
	ApplyPatchError,
	DEFAULT_FUZZY_THRESHOLD,
	executePatchSingle,
	previewPatch,
} from "@gajae-code/coding-agent/edit";
import { writethroughNoop } from "@gajae-code/coding-agent/lsp";
import type { ToolSession } from "@gajae-code/coding-agent/tools";
import { LocalProtocolHandler } from "../../src/internal-urls/local-protocol";

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories.splice(0).map(directory => fs.rm(directory, { recursive: true, force: true })),
	);
});

function track(directory: string): string {
	temporaryDirectories.push(directory);
	return directory;
}

function makeSession(
	cwd: string,
	options: { artifactsDir?: string | null; sessionId?: string | null; managed?: boolean } = {},
): ToolSession {
	return {
		cwd,
		hasUI: false,
		getSessionFile: () => null,
		getSessionSpawns: () => "*",
		enableLsp: false,
		settings: Settings.isolated({ "edit.mode": "patch" }),
		getArtifactsDir: () => options.artifactsDir ?? null,
		getSessionId: () => options.sessionId ?? null,
		isManagedSessionDestination: () => options.managed ?? false,
		getPlanModeState: () => undefined,
	} as unknown as ToolSession;
}

const noopBeginDeferred = (_p: string) => ({
	onDeferredDiagnostics: () => {},
	signal: new AbortController().signal,
	finalize: () => {},
});

function deleteThrough(session: ToolSession, targetPath: string) {
	return executePatchSingle({
		session,
		path: targetPath,
		params: { op: "delete" },
		allowFuzzy: true,
		fuzzyThreshold: DEFAULT_FUZZY_THRESHOLD,
		writethrough: writethroughNoop,
		beginDeferredDiagnosticsForPath: noopBeginDeferred,
	});
}

describe("patch delete symlink", () => {
	test("still allows deleting an ordinary file inside cwd", async () => {
		const cwd = track(await fs.mkdtemp(path.join(os.tmpdir(), "patch-delete-inside-")));
		const file = path.join(cwd, "note.txt");
		await fs.writeFile(file, "ok");

		const result = await deleteThrough(makeSession(cwd), "note.txt");

		expect(result.details?.op).toBe("delete");
		await expect(fs.stat(file)).rejects.toThrow();
	});

	test("still allows previewing a delete of an ordinary file inside cwd", async () => {
		const cwd = track(await fs.mkdtemp(path.join(os.tmpdir(), "patch-delete-preview-")));
		const file = path.join(cwd, "note.txt");
		await fs.writeFile(file, "ok");

		const result = await previewPatch({ path: "note.txt", op: "delete" }, { cwd });

		expect(result.change.type).toBe("delete");
		expect(await fs.readFile(file, "utf8")).toBe("ok");
	});

	test.skipIf(process.platform === "win32")(
		"still allows deleting a file when cwd is a symlink to the real directory",
		async () => {
			const root = track(await fs.mkdtemp(path.join(os.tmpdir(), "patch-delete-cwd-link-")));
			const real = path.join(root, "real");
			const link = path.join(root, "link");
			await fs.mkdir(real);
			await fs.symlink(real, link, "dir");
			const file = path.join(real, "note.txt");
			await fs.writeFile(file, "ok");

			await deleteThrough(makeSession(link), "note.txt");

			await expect(fs.stat(file)).rejects.toThrow();
		},
	);

	test.skipIf(process.platform === "win32")(
		"keeps the outside referent when deleting a final file symlink",
		async () => {
			const root = track(await fs.mkdtemp(path.join(os.tmpdir(), "patch-delete-file-link-")));
			const cwd = path.join(root, "workspace");
			const outside = path.join(root, "outside");
			await fs.mkdir(cwd);
			await fs.mkdir(outside);
			const secret = path.join(outside, "secret.txt");
			await fs.writeFile(secret, "secret");
			await fs.symlink(secret, path.join(cwd, "link.txt"), "file");

			await deleteThrough(makeSession(cwd), "link.txt");

			await expect(fs.lstat(path.join(cwd, "link.txt"))).rejects.toThrow();
			expect(await fs.readFile(secret, "utf8")).toBe("secret");
		},
	);

	test.skipIf(process.platform === "win32")(
		"refuses to delete through a directory symlink that leaves cwd",
		async () => {
			const root = track(await fs.mkdtemp(path.join(os.tmpdir(), "patch-delete-cwd-escape-")));
			const cwd = path.join(root, "workspace");
			const outside = path.join(root, "outside");
			await fs.mkdir(cwd);
			await fs.mkdir(outside);
			const secret = path.join(outside, "secret.txt");
			await fs.writeFile(secret, "secret");
			await fs.symlink(outside, path.join(cwd, "link"), "dir");

			await expect(deleteThrough(makeSession(cwd), "link/secret.txt")).rejects.toThrow(ApplyPatchError);
			expect(await fs.readFile(secret, "utf8")).toBe("secret");
		},
	);

	test.skipIf(process.platform === "win32")("still allows deleting a file inside the session local root", async () => {
		const cwd = track(await fs.mkdtemp(path.join(os.tmpdir(), "patch-delete-managed-cwd-")));
		const sessionId = `patch-del-${process.pid}-${Date.now()}`;
		const localRoot = track(path.join(os.tmpdir(), "gjc-local", sessionId));
		await fs.mkdir(localRoot, { recursive: true });
		const file = path.join(localRoot, "note.txt");
		await fs.writeFile(file, "ok");

		await deleteThrough(makeSession(cwd, { sessionId, managed: true }), "local://note.txt");

		await expect(fs.stat(file)).rejects.toThrow();
	});

	test.skipIf(process.platform === "win32")(
		"refuses to delete through a directory symlink that leaves the session local root",
		async () => {
			const cwd = track(await fs.mkdtemp(path.join(os.tmpdir(), "patch-delete-managed-escape-")));
			const sessionId = `patch-del-${process.pid}-${Date.now()}-esc`;
			const localRoot = track(path.join(os.tmpdir(), "gjc-local", sessionId));
			await fs.mkdir(localRoot, { recursive: true });
			const secret = path.join(cwd, "secret.txt");
			await fs.writeFile(secret, "secret");
			await fs.symlink(cwd, path.join(localRoot, "planted"), "dir");

			await expect(
				deleteThrough(makeSession(cwd, { sessionId, managed: true }), "local://planted/secret.txt"),
			).rejects.toThrow(ApplyPatchError);
			expect(await fs.readFile(secret, "utf8")).toBe("secret");
		},
	);

	test.skipIf(process.platform === "win32")(
		"still allows deleting a file inside an explicit local root outside cwd",
		async () => {
			const root = track(await fs.mkdtemp(path.join(os.tmpdir(), "patch-delete-explicit-ok-")));
			const cwd = path.join(root, "workspace");
			const artifacts = path.join(root, "artifacts");
			const localRoot = path.join(artifacts, "local");
			await fs.mkdir(cwd);
			await fs.mkdir(localRoot, { recursive: true });
			const file = path.join(localRoot, "note.txt");
			await fs.writeFile(file, "ok");
			const dispose = LocalProtocolHandler.installOverride({
				getArtifactsDir: () => artifacts,
				isManagedDestination: () => false,
				getSessionId: () => "explicit",
			});
			try {
				await deleteThrough(
					makeSession(cwd, { artifactsDir: artifacts, sessionId: "explicit", managed: false }),
					"local://note.txt",
				);
			} finally {
				dispose();
			}

			await expect(fs.stat(file)).rejects.toThrow();
		},
	);

	test.skipIf(process.platform === "win32")(
		"refuses to delete through a directory symlink that leaves an explicit local root",
		async () => {
			const root = track(await fs.mkdtemp(path.join(os.tmpdir(), "patch-delete-explicit-esc-")));
			const artifacts = path.join(root, "artifacts");
			const localRoot = path.join(artifacts, "local");
			const outside = path.join(root, "outside");
			await fs.mkdir(localRoot, { recursive: true });
			await fs.mkdir(outside);
			const secret = path.join(outside, "secret.txt");
			await fs.writeFile(secret, "secret");
			await fs.symlink(outside, path.join(localRoot, "planted"), "dir");
			const dispose = LocalProtocolHandler.installOverride({
				getArtifactsDir: () => artifacts,
				isManagedDestination: () => false,
				getSessionId: () => "explicit",
			});
			try {
				await expect(
					deleteThrough(
						makeSession(root, { artifactsDir: artifacts, sessionId: "explicit", managed: false }),
						"local://planted/secret.txt",
					),
				).rejects.toThrow(ApplyPatchError);
			} finally {
				dispose();
			}

			expect(await fs.readFile(secret, "utf8")).toBe("secret");
		},
	);
});
