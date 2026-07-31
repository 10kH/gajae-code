import { afterEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Settings } from "@gajae-code/coding-agent/config/settings";
import * as evalIndex from "@gajae-code/coding-agent/eval";
import * as pyKernel from "@gajae-code/coding-agent/eval/py/kernel";
import type { ToolSession } from "@gajae-code/coding-agent/tools";
import { EvalTool } from "@gajae-code/coding-agent/tools/eval";
import { ArtifactManager } from "../../src/session/artifacts";
import {
	ManagedSessionDescendantStore,
	managedDirectoryRoot,
} from "../../src/session/internal/managed-session-storage";

function makeSession(): ToolSession {
	return {
		cwd: "/tmp/eval-test",
		hasUI: false,
		getSessionFile: () => null,
		getSessionSpawns: () => null,
		settings: Settings.isolated(),
	};
}

function baseResult(overrides: Record<string, unknown> = {}) {
	return {
		output: "",
		exitCode: 0,
		cancelled: false,
		truncated: false,
		artifactId: undefined,
		totalLines: 0,
		totalBytes: 0,
		outputLines: 0,
		outputBytes: 0,
		displayOutputs: [] as unknown[],
		...overrides,
	};
}

describe("EvalTool display() text surfacing", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("includes display() JSON values in the text content the model sees", async () => {
		vi.spyOn(pyKernel, "checkPythonKernelAvailability").mockResolvedValue({ ok: true });
		vi.spyOn(evalIndex.jsBackend, "execute").mockResolvedValue(
			baseResult({
				displayOutputs: [{ type: "json", data: { stdout: "hi", exit_code: 0 } }],
			}) as never,
		);

		const tool = new EvalTool(makeSession());
		const result = await tool.execute("call-display-json", {
			cells: [{ language: "js", code: "```js\ndisplay({ stdout: 'hi', exit_code: 0 });\n```\n" }],
		});

		const text = result.content.map(c => (c.type === "text" ? c.text : "")).join("\n");
		expect(text).toContain("display[1]");
		expect(text).toContain('"stdout": "hi"');
		expect(text).toContain('"exit_code": 0');
		expect(text).not.toBe("(no text output)");
	});

	it("interleaves stdout text and display() JSON values", async () => {
		vi.spyOn(pyKernel, "checkPythonKernelAvailability").mockResolvedValue({ ok: true });
		vi.spyOn(evalIndex.jsBackend, "execute").mockResolvedValue(
			baseResult({
				output: "before\n",
				displayOutputs: [{ type: "json", data: [1, 2, 3] }],
			}) as never,
		);

		const tool = new EvalTool(makeSession());
		const result = await tool.execute("call-mixed", {
			cells: [{ language: "js", code: "```js\nprint('before'); display([1,2,3]);\n```\n" }],
		});

		const text = result.content.map(c => (c.type === "text" ? c.text : "")).join("\n");
		expect(text).toContain("before");
		expect(text.indexOf("before")).toBeLessThan(text.indexOf("display[1]"));
		expect(text).toContain("[\n  1,\n  2,\n  3\n]");
	});

	it("surfaces displayed images to the model as ImageContent blocks, not inlined base64", async () => {
		vi.spyOn(pyKernel, "checkPythonKernelAvailability").mockResolvedValue({ ok: true });
		const base64 = Buffer.from([0, 1, 2, 3]).toString("base64");
		vi.spyOn(evalIndex.jsBackend, "execute").mockResolvedValue(
			baseResult({
				displayOutputs: [{ type: "image", data: base64, mimeType: "image/png" }],
			}) as never,
		);

		const tool = new EvalTool(makeSession());
		const result = await tool.execute("call-image", {
			cells: [
				{ language: "js", code: "```js\ndisplay({ type: 'image', data: '...', mimeType: 'image/png' });\n```\n" },
			],
		});

		const imageBlocks = result.content.filter(c => c.type === "image");
		expect(imageBlocks).toHaveLength(1);
		expect(imageBlocks[0]).toMatchObject({ type: "image", data: base64, mimeType: "image/png" });

		const textBlocks = result.content.filter(c => c.type === "text");
		const text = textBlocks.map(c => (c.type === "text" ? c.text : "")).join("\n");
		expect(text).not.toContain(base64); // base64 must not leak into text channel
		expect(text).toMatch(/displayed 1 image/);

		// Image is in content, so details.images must be empty to avoid double-rendering.
		expect(result.details?.images).toBeUndefined();
	});

	it("uses only the aggregate sink as the Eval artifact writer", async () => {
		vi.spyOn(pyKernel, "checkPythonKernelAvailability").mockResolvedValue({ ok: true });
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "eval-artifact-owner-"));
		const artifactPath = path.join(dir, "7.eval.log");
		const output = `before\n${"x".repeat(60_000)}\n`;
		const executeSpy = vi.spyOn(evalIndex.jsBackend, "execute").mockImplementation(async (_code, options) => {
			expect(options.artifactPath).toBeUndefined();
			expect(options.artifactId).toBeUndefined();
			options.onChunk?.(output);
			return baseResult({
				output,
				truncated: true,
				totalLines: 2,
				totalBytes: Buffer.byteLength(output),
				outputLines: 2,
				outputBytes: Buffer.byteLength(output),
			}) as never;
		});
		const session: ToolSession = {
			...makeSession(),
			allocateOutputArtifact: async () => ({ id: "7", path: artifactPath }),
		};
		try {
			const result = await new EvalTool(session).execute("call-artifact-owner", {
				cells: [{ language: "js", code: "print('before')" }],
			});
			expect(executeSpy).toHaveBeenCalledTimes(1);
			expect(result.details?.meta?.truncation?.artifactId).toBe("7");
			expect(result.details?.meta?.truncation?.sourceCaptureIncomplete).toBe(true);
			expect(await Bun.file(artifactPath).text()).toBe(output);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	it("publishes managed aggregate Eval output through terminal artifact authority", async () => {
		if (process.platform !== "linux") return;
		vi.spyOn(pyKernel, "checkPythonKernelAvailability").mockResolvedValue({ ok: true });
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "eval-managed-artifact-owner-"));
		const artifactsDir = path.join(root, "artifacts");
		const manager = new ArtifactManager(new ManagedSessionDescendantStore(managedDirectoryRoot(root), artifactsDir));
		const output = `managed-before\n${"m".repeat(60_000)}\n`;
		vi.spyOn(evalIndex.jsBackend, "execute").mockImplementation(async (_code, options) => {
			options.onChunk?.(output);
			return baseResult({
				output,
				totalLines: 2,
				totalBytes: Buffer.byteLength(output),
				outputLines: 2,
				outputBytes: Buffer.byteLength(output),
			}) as never;
		});
		const session: ToolSession = {
			...makeSession(),
			getArtifactManager: () => manager,
		};
		try {
			const result = await new EvalTool(session).execute("call-managed-artifact-owner", {
				cells: [{ language: "js", code: "print('managed-before')" }],
			});
			const artifactId = result.details?.meta?.truncation?.artifactId;
			expect(artifactId).toBeDefined();
			expect(result.details?.meta?.truncation?.artifactVerified).toBe(true);
			const filename = (await manager.listFiles()).find(file => file.startsWith(`${artifactId}.`));
			expect(filename).toBeDefined();
			const snapshot = manager.getManagedStore()!.readExpected(filename!);
			expect(snapshot?.bytes.toString("utf8")).toBe(output);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	it("bounds a stalled aggregate artifact allocation", async () => {
		vi.spyOn(pyKernel, "checkPythonKernelAvailability").mockResolvedValue({ ok: true });
		vi.spyOn(evalIndex.jsBackend, "execute").mockResolvedValue(
			baseResult({ output: "done", totalLines: 1, totalBytes: 4, outputLines: 1, outputBytes: 4 }) as never,
		);
		const allocationGate = Promise.withResolvers<{ id: string; path: string }>();
		const session: ToolSession = { ...makeSession(), allocateOutputArtifact: async () => allocationGate.promise };
		const raced = await Promise.race([
			new EvalTool(session).execute("call-stalled-eval-artifact", {
				cells: [{ language: "js", code: "print('done')" }],
			}),
			Bun.sleep(750).then(() => undefined),
		]);
		expect(raced).toBeDefined();
		expect(raced?.details?.meta?.truncation?.artifactFailureDiagnostic).toContain("did not settle within 500ms");
		allocationGate.resolve({ id: "92", path: path.join(os.tmpdir(), "late-eval-artifact.log") });
		await allocationGate.promise;
	});

	it("aborts while aggregate artifact allocation is stalled", async () => {
		vi.spyOn(pyKernel, "checkPythonKernelAvailability").mockResolvedValue({ ok: true });
		const allocationGate = Promise.withResolvers<{ id: string; path: string }>();
		const session: ToolSession = { ...makeSession(), allocateOutputArtifact: async () => allocationGate.promise };
		const controller = new AbortController();
		const execution = new EvalTool(session).execute(
			"call-aborted-eval-artifact",
			{ cells: [{ language: "js", code: "print('never')" }] },
			controller.signal,
		);
		await Promise.resolve();
		controller.abort();
		await expect(execution).rejects.toThrow();
		allocationGate.resolve({ id: "93", path: path.join(os.tmpdir(), "aborted-eval-artifact.log") });
		await allocationGate.promise;
	});

	it("still reports (no text output) when nothing was printed or displayed", async () => {
		vi.spyOn(pyKernel, "checkPythonKernelAvailability").mockResolvedValue({ ok: true });
		vi.spyOn(evalIndex.jsBackend, "execute").mockResolvedValue(baseResult() as never);

		const tool = new EvalTool(makeSession());
		const result = await tool.execute("call-empty", {
			cells: [{ language: "js", code: "```js\nconst x = 1;\n```\n" }],
		});

		const text = result.content.map(c => (c.type === "text" ? c.text : "")).join("\n");
		expect(text).toContain("(no output)");
	});

	it("truncates oversized display values rather than blasting the context", async () => {
		vi.spyOn(pyKernel, "checkPythonKernelAvailability").mockResolvedValue({ ok: true });
		const huge = "x".repeat(20000);
		vi.spyOn(evalIndex.jsBackend, "execute").mockResolvedValue(
			baseResult({
				displayOutputs: [{ type: "json", data: { payload: huge } }],
			}) as never,
		);

		const tool = new EvalTool(makeSession());
		const result = await tool.execute("call-huge", {
			cells: [{ language: "js", code: "```js\ndisplay({ payload: 'x'.repeat(20000) });\n```\n" }],
		});

		const text = result.content.map(c => (c.type === "text" ? c.text : "")).join("\n");
		expect(text).toContain("chars truncated");
		expect(text.length).toBeLessThan(20000);
	});
});
