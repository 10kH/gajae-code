import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { createHash } from "node:crypto";
import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { InternalUrlRouter } from "@gajae-code/coding-agent/internal-urls";
import type { ResolveContext } from "@gajae-code/coding-agent/internal-urls/types";
import { AgentRegistry } from "@gajae-code/coding-agent/registry/agent-registry";
import { RecoveryFsRoot } from "@gajae-code/natives";

let tempDir: string;

beforeEach(async () => {
	tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-artifact-scope-"));
	AgentRegistry.resetGlobalForTests();
	InternalUrlRouter.resetForTests();
});

afterEach(async () => {
	AgentRegistry.resetGlobalForTests();
	InternalUrlRouter.resetForTests();
	await fs.rm(tempDir, { recursive: true, force: true });
});

function contextFor(artifactsDir: string, authorizedArtifactsDirs: readonly string[] = []): ResolveContext {
	return {
		cwd: tempDir,
		getArtifactsDir: () => artifactsDir,
		getAuthorizedArtifactsDirs: () => authorizedArtifactsDirs,
	};
}

async function writeAgentOutput(artifactsDir: string, id: string, content: string): Promise<void> {
	await fs.mkdir(artifactsDir, { recursive: true });
	const outputPath = path.join(artifactsDir, `${id}.md`);
	const bytes = Buffer.byteLength(content, "utf8");
	await Bun.write(outputPath, content);
	await Bun.write(
		`${outputPath}.meta.json`,
		JSON.stringify(
			{
				id,
				kind: "agent-output",
				sizeBytes: bytes,
				lineCount: content.split("\n").length,
				sha256: createHash("sha256").update(content).digest("hex"),
				createdAt: "2026-06-05T00:00:00.000Z",
			},
			null,
		),
	);
}

async function writeArtifact(artifactsDir: string, id: string, content: string): Promise<void> {
	await fs.mkdir(artifactsDir, { recursive: true });
	await Bun.write(path.join(artifactsDir, `${id}.bash.log`), content);
}

function registerLiveSession(id: string, artifactsDir: string): void {
	AgentRegistry.global().register({
		id,
		displayName: id,
		kind: "main",
		session: null,
		sessionFile: `${artifactsDir}.jsonl`,
		status: "running",
	});
}

describe("agent:// and artifact:// session scoping", () => {
	it("does not resolve agent:// or artifact:// from unrelated live sessions", async () => {
		if (process.platform !== "linux") return;

		const sessionA = path.join(tempDir, "session-a");
		const sessionB = path.join(tempDir, "session-b");
		await writeAgentOutput(sessionA, "0-A", "session A output");
		await writeAgentOutput(sessionB, "0-B", "session B secret");
		await writeArtifact(sessionA, "0", "session A artifact");
		await writeArtifact(sessionB, "1", "session B secret artifact");
		registerLiveSession("live-a", sessionA);
		registerLiveSession("live-b", sessionB);

		const router = InternalUrlRouter.instance();
		await expect(router.resolve("agent://0-A", contextFor(sessionA))).resolves.toMatchObject({
			content: "session A output",
		});
		await expect(router.resolve("artifact://0", contextFor(sessionA))).resolves.toMatchObject({
			content: "session A artifact",
		});

		await expect(router.resolve("agent://0-B", contextFor(sessionA))).rejects.toThrow("agent://0-B not found");
		await expect(router.resolve("artifact://1", contextFor(sessionA))).rejects.toThrow("artifact://1 not found");
	});

	it("allows explicitly authorized parent/child tree artifacts in both directions", async () => {
		if (process.platform !== "linux") return;

		const parentDir = path.join(tempDir, "parent");
		const childDir = path.join(tempDir, "child");
		await writeAgentOutput(parentDir, "0-Parent", "parent output");
		await writeAgentOutput(childDir, "0-Child", "child output");
		await writeArtifact(parentDir, "0", "parent artifact");
		await writeArtifact(childDir, "1", "child artifact");

		const router = InternalUrlRouter.instance();
		await expect(router.resolve("agent://0-Child", contextFor(parentDir, [childDir]))).resolves.toMatchObject({
			content: "child output",
		});
		await expect(router.resolve("artifact://1", contextFor(parentDir, [childDir]))).resolves.toMatchObject({
			content: "child artifact",
		});
		await expect(router.resolve("agent://0-Parent", contextFor(childDir, [parentDir]))).resolves.toMatchObject({
			content: "parent output",
		});
		await expect(router.resolve("artifact://0", contextFor(childDir, [parentDir]))).resolves.toMatchObject({
			content: "parent artifact",
		});
	});

	it("fails closed without context and does not enumerate scoped IDs", async () => {
		if (process.platform !== "linux") return;

		const sessionA = path.join(tempDir, "session-a");
		const sessionB = path.join(tempDir, "session-b");
		await writeAgentOutput(sessionA, "0-A", "session A output");
		await writeAgentOutput(sessionB, "0-B", "session B output");
		await writeArtifact(sessionA, "0", "session A artifact");
		await writeArtifact(sessionB, "1", "session B artifact");
		registerLiveSession("live-a", sessionA);
		registerLiveSession("live-b", sessionB);

		const router = InternalUrlRouter.instance();
		await expect(router.resolve("agent://0-A")).rejects.toThrow("No session - agent outputs unavailable");
		await expect(router.resolve("artifact://0")).rejects.toThrow("No session - artifacts unavailable");

		try {
			await router.resolve("agent://missing", contextFor(sessionA));
			expect.unreachable("agent://missing should reject");
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			expect(message).toBe("agent://missing not found");
			expect(message).not.toContain("0-A");
			expect(message).not.toContain("0-B");
			expect(message).not.toContain("Available");
		}

		try {
			await router.resolve("artifact://9", contextFor(sessionA));
			expect.unreachable("artifact://9 should reject");
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			expect(message).toBe("artifact://9 not found");
			expect(message).not.toContain("0");
			expect(message).not.toContain("1");
			expect(message).not.toContain("Available");
		}
	});

	it("fails closed on platforms without retained artifact-root authority", async () => {
		if (process.platform === "linux") return;
		const artifactsDir = path.join(tempDir, "unsupported-platform");
		await writeArtifact(artifactsDir, "0", "must not be returned");

		await expect(InternalUrlRouter.instance().resolve("artifact://0", contextFor(artifactsDir))).rejects.toThrow(
			"artifact_authority_unavailable",
		);
	});

	it("does not treat a missing agent:// metadata sidecar as authorization", async () => {
		if (process.platform !== "linux") return;

		const sessionA = path.join(tempDir, "session-a");
		await fs.mkdir(sessionA, { recursive: true });
		await Bun.write(path.join(sessionA, "0-NoMeta.md"), "sidecar-free content");

		await expect(InternalUrlRouter.instance().resolve("agent://0-NoMeta", contextFor(sessionA))).rejects.toThrow(
			"agent://0-NoMeta missing metadata",
		);
	});

	it("rejects artifact and agent leaves that escape through symlinks", async () => {
		if (process.platform !== "linux") return;

		const artifactsDir = path.join(tempDir, "symlink-artifacts");
		const outsideDir = path.join(tempDir, "outside");
		await fs.mkdir(artifactsDir, { recursive: true });
		await fs.mkdir(outsideDir, { recursive: true });
		const secret = path.join(outsideDir, "secret.txt");
		await Bun.write(secret, "outside secret");
		await fs.symlink(secret, path.join(artifactsDir, "0.escape.log"));
		await expect(InternalUrlRouter.instance().resolve("artifact://0", contextFor(artifactsDir))).rejects.toThrow(
			"unsafe_artifact_leaf",
		);

		const outputId = "0-Link";
		const selectorOutside = path.join(outsideDir, "selector.json");
		await Bun.write(selectorOutside, "{}");
		await fs.symlink(selectorOutside, path.join(artifactsDir, `${outputId}.md.selector.json`));
		await expect(
			InternalUrlRouter.instance().resolve(`agent://${outputId}`, contextFor(artifactsDir)),
		).rejects.toThrow("unsafe_artifact_leaf");
	});

	it("rejects selected agent output and metadata symlink leaves", async () => {
		if (process.platform !== "linux") return;
		for (const symlinkKind of ["output", "metadata"] as const) {
			const artifactsDir = path.join(tempDir, `selected-${symlinkKind}`);
			const outsideDir = path.join(tempDir, `outside-${symlinkKind}`);
			await fs.mkdir(artifactsDir, { recursive: true });
			await fs.mkdir(outsideDir, { recursive: true });
			const id = `0-${symlinkKind}`;
			const outputFilename = `${id}.md.0198f0c0-0000-4000-8000-000000000001.output`;
			const metadataFilename = `${outputFilename}.meta.json`;
			const output = "outside output";
			const metadata = JSON.stringify({
				id,
				kind: "agent-output",
				sizeBytes: Buffer.byteLength(output, "utf8"),
				lineCount: 1,
				sha256: createHash("sha256").update(output).digest("hex"),
				createdAt: "2026-07-30T00:00:00.000Z",
			});
			const outsideOutput = path.join(outsideDir, outputFilename);
			const outsideMetadata = path.join(outsideDir, metadataFilename);
			await Bun.write(outsideOutput, output);
			await Bun.write(outsideMetadata, metadata);
			if (symlinkKind === "output") {
				await fs.symlink(outsideOutput, path.join(artifactsDir, outputFilename));
				await Bun.write(path.join(artifactsDir, metadataFilename), metadata);
			} else {
				await Bun.write(path.join(artifactsDir, outputFilename), output);
				await fs.symlink(outsideMetadata, path.join(artifactsDir, metadataFilename));
			}
			await Bun.write(
				path.join(artifactsDir, `${id}.md.selector.json`),
				JSON.stringify({
					outputFilename,
					metadataFilename,
					outputSizeBytes: Buffer.byteLength(output, "utf8"),
					outputSha256: createHash("sha256").update(output).digest("hex"),
					metadataSizeBytes: Buffer.byteLength(metadata, "utf8"),
					metadataSha256: createHash("sha256").update(metadata).digest("hex"),
				}),
			);
			await expect(InternalUrlRouter.instance().resolve(`agent://${id}`, contextFor(artifactsDir))).rejects.toThrow(
				"unsafe_artifact_leaf",
			);
		}
	});

	it("retries a managed selector when the previously selected generation was reclaimed", async () => {
		if (process.platform !== "linux") return;
		const artifactsDir = path.join(tempDir, "managed-generation-race");
		await fs.mkdir(artifactsDir, { recursive: true });
		const id = "0-Managed";
		const output = "successor output";
		const outputFilename = `${id}.md.0198f0c0-0000-7000-8000-000000000001.output`;
		const metadataFilename = `${outputFilename}.meta.json`;
		const metadata = JSON.stringify({
			id,
			kind: "agent-output",
			sizeBytes: Buffer.byteLength(output, "utf8"),
			lineCount: 1,
			sha256: createHash("sha256").update(output).digest("hex"),
			createdAt: "2026-07-30T00:00:00.000Z",
		});
		await Bun.write(path.join(artifactsDir, outputFilename), output);
		await Bun.write(path.join(artifactsDir, metadataFilename), metadata);
		const successorSelector = {
			outputFilename,
			metadataFilename,
			outputSizeBytes: Buffer.byteLength(output, "utf8"),
			outputSha256: createHash("sha256").update(output).digest("hex"),
			metadataSizeBytes: Buffer.byteLength(metadata, "utf8"),
			metadataSha256: createHash("sha256").update(metadata).digest("hex"),
		};
		const intermediateSelector = {
			...successorSelector,
			outputFilename: `${id}.md.0198f0c0-0000-7000-8000-000000000009.output`,
			metadataFilename: `${id}.md.0198f0c0-0000-7000-8000-000000000009.output.meta.json`,
		};
		const selectorPath = path.join(artifactsDir, `${id}.md.selector.json`);
		await Bun.write(
			selectorPath,
			JSON.stringify({
				...successorSelector,
				outputFilename: `${id}.md.0198f0c0-0000-7000-8000-000000000000.output`,
				metadataFilename: `${id}.md.0198f0c0-0000-7000-8000-000000000000.output.meta.json`,
			}),
		);
		const originalRead = RecoveryFsRoot.prototype.read;
		let advances = 0;
		const readSpy = spyOn(RecoveryFsRoot.prototype, "read").mockImplementation(function (
			this: RecoveryFsRoot,
			relativePath,
			maxBytes,
		) {
			const result = originalRead.call(this, relativePath, maxBytes);
			if (relativePath === path.basename(selectorPath) && advances < 2) {
				advances += 1;
				fsSync.writeFileSync(
					selectorPath,
					JSON.stringify(advances === 1 ? intermediateSelector : successorSelector),
				);
			}
			return result;
		});
		try {
			await expect(
				InternalUrlRouter.instance().resolve(`agent://${id}`, contextFor(artifactsDir)),
			).resolves.toMatchObject({
				content: output,
			});
		} finally {
			readSpy.mockRestore();
		}
	});
});
