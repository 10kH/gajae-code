import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { AssistantMessage } from "@gajae-code/ai";
import { getBlobsDir, getTerminalSessionsDir } from "@gajae-code/utils";
import { getMasterPaths } from "../src/master/paths";
import { SessionManager } from "../src/session/session-manager";
import { FileSessionStorage } from "../src/session/session-storage";

const roots: string[] = [];

async function makeRoot(): Promise<string> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-master-session-"));
	roots.push(root);
	return root;
}

async function snapshotFiles(root: string): Promise<string[]> {
	const files: string[] = [];
	const visit = async (directory: string, relative = ""): Promise<void> => {
		let entries: Array<import("node:fs").Dirent>;
		try {
			entries = await fs.readdir(directory, { withFileTypes: true });
		} catch (error) {
			if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
			throw error;
		}
		for (const entry of entries) {
			const child = path.join(directory, entry.name);
			const childRelative = path.join(relative, entry.name);
			if (entry.isDirectory()) await visit(child, childRelative);
			else files.push(childRelative);
		}
	};
	await visit(root);
	return files.sort();
}

function assertWithin(root: string, candidate: string): void {
	const relative = path.relative(path.resolve(root), path.resolve(candidate));
	expect(relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))).toBe(true);
}

function largeAssistantMessage(id: number, largeText: string): AssistantMessage {
	return {
		role: "assistant",
		content: [
			{ type: "text", text: `${id}:${largeText}` },
			{ type: "toolCall", id: `tool-${id}`, name: "master_worker_follow_up", arguments: { payload: largeText } },
		],
		api: "anthropic-messages",
		provider: "anthropic",
		model: "test-model",
		stopReason: "stop",
		usage: {
			input: 1,
			output: 1,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 2,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		},
		timestamp: Date.now(),
	};
}

afterEach(async () => {
	while (roots.length > 0) await fs.rm(roots.pop()!, { recursive: true, force: true });
});

describe("master session persistence profile", () => {
	test("confines transcript, blobs, resident cache, cold spill, and resume to master roots", async () => {
		const root = await makeRoot();
		const project = path.join(root, "project");
		await fs.mkdir(project, { recursive: true });
		const masterRoot = path.join(root, "gjc-master");
		const paths = getMasterPaths("alpha", { masterRootDir: masterRoot });
		const profile = {
			blobDir: paths.blobDir,
			residentCacheRootDir: paths.residentCacheDir,
			terminalBreadcrumbs: false,
		} as const;
		const destination = SessionManager.explicitDestination(paths.sessionDir);
		const storage = new FileSessionStorage();
		const blobBefore = await snapshotFiles(getBlobsDir());
		const terminalBefore = await snapshotFiles(getTerminalSessionsDir());
		const projectBefore = await snapshotFiles(path.join(project, ".gjc"));

		const manager = SessionManager.create(project, destination, storage, { persistenceProfile: profile });
		manager.setSessionMemoryMode("enabled");
		const largeText = "cold-master-".repeat(70_000);
		const firstId = manager.appendMessage(largeAssistantMessage(0, largeText));
		for (let index = 1; index < 5; index++) manager.appendMessage(largeAssistantMessage(index, largeText));
		manager.appendMessage({
			role: "user",
			content: [{ type: "image", data: Buffer.alloc(220_000, 7).toString("base64"), mimeType: "image/png" }],
			timestamp: Date.now(),
		});
		const firstKeptId = manager.appendMessage({ role: "user", content: "keep", timestamp: Date.now() });
		const compactionId = manager.appendCompaction("master summary", undefined, firstKeptId, 10_000);
		const evicted = manager.evictCompactedContent(firstKeptId, compactionId);
		expect(evicted.coldSpillWriteCount).toBeGreaterThan(0);
		await manager.ensureOnDisk();
		await manager.flush();
		const sessionFile = manager.getSessionFile();
		expect(sessionFile).toBeString();
		assertWithin(paths.sessionDir, sessionFile!);

		const masterBlobFiles = await snapshotFiles(paths.blobDir);
		const masterResidentFiles = await snapshotFiles(paths.residentCacheDir);
		expect(masterBlobFiles.length).toBeGreaterThan(0);
		expect(masterResidentFiles.length).toBeGreaterThan(0);
		for (const file of masterBlobFiles) assertWithin(paths.blobDir, path.join(paths.blobDir, file));
		for (const file of masterResidentFiles)
			assertWithin(paths.residentCacheDir, path.join(paths.residentCacheDir, file));
		await manager.close();
		expect(await snapshotFiles(getBlobsDir())).toEqual(blobBefore);
		expect(await snapshotFiles(getTerminalSessionsDir())).toEqual(terminalBefore);
		expect(await snapshotFiles(path.join(project, ".gjc"))).toEqual(projectBefore);

		const reopened = await SessionManager.open(sessionFile!, destination, storage, "copy-retain", "enabled", {
			persistenceProfile: profile,
		});
		expect(reopened.getEntryForFidelity(firstId)).toBeDefined();
		await reopened.close();
		const resumed = await SessionManager.continueRecent(project, destination, storage, "copy-retain", "enabled", {
			persistenceProfile: profile,
		});
		expect(resumed.getSessionFile()).toBe(sessionFile);
		expect(resumed.getEntryForFidelity(firstId)).toBeDefined();
		await resumed.close();
	}, 30_000);

	test("keeps ordinary sessions on their ordinary explicit destination", async () => {
		const root = await makeRoot();
		const destination = path.join(root, "ordinary-session");
		const manager = SessionManager.create(root, destination);
		manager.appendMessage({ role: "user", content: "ordinary", timestamp: Date.now() });
		await manager.ensureOnDisk();
		expect(manager.getSessionFile()).toStartWith(path.resolve(destination));
		await manager.close();
	});
});
