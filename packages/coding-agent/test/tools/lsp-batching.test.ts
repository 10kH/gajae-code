import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import * as path from "node:path";
import { createLspWritethrough } from "@gajae-code/coding-agent/lsp";
import * as lspConfig from "@gajae-code/coding-agent/lsp/config";
import { TempDir } from "@gajae-code/utils";
import type { ServerConfig } from "../../src/lsp/types";
import * as atomicFileWrite from "../../src/tools/atomic-file-write";
import { FileWriteNotPublishedError } from "../../src/tools/atomic-file-write";

describe("createLspWritethrough batching", () => {
	let tempDir: TempDir;

	beforeEach(() => {
		tempDir = TempDir.createSync("@gjc-lsp-batch-");
	});

	afterEach(() => {
		vi.restoreAllMocks();
		tempDir.removeSync();
	});

	it("defers LSP work until the batch flush", async () => {
		const loadConfigSpy = vi
			.spyOn(lspConfig, "loadConfig")
			.mockReturnValue({ servers: {}, idleTimeoutMs: undefined });
		const getServersSpy = vi.spyOn(lspConfig, "getServersForFile").mockReturnValue([]);
		const writethrough = createLspWritethrough(tempDir.path(), { enableFormat: true, enableDiagnostics: true });

		const fileA = path.join(tempDir.path(), "a.ts");
		const fileB = path.join(tempDir.path(), "b.ts");
		const batchId = `batch-${Date.now()}`;

		const firstResult = await writethrough(fileA, "const a = 1;\n", undefined, undefined, {
			id: batchId,
			flush: false,
		});

		expect(firstResult).toBeUndefined();
		expect(getServersSpy).toHaveBeenCalledTimes(0);
		expect(loadConfigSpy).toHaveBeenCalledTimes(0);
		expect(await Bun.file(fileA).text()).toBe("const a = 1;\n");

		const secondResult = await writethrough(fileB, "const b = 2;\n", undefined, undefined, {
			id: batchId,
			flush: true,
		});

		expect(secondResult).toBeUndefined();
		expect(getServersSpy).toHaveBeenCalledTimes(2);
		expect(loadConfigSpy).toHaveBeenCalledTimes(1);
		expect(await Bun.file(fileA).text()).toBe("const a = 1;\n");
		expect(await Bun.file(fileB).text()).toBe("const b = 2;\n");
	});

	it("runs LSP immediately when no batch is provided", async () => {
		const loadConfigSpy = vi
			.spyOn(lspConfig, "loadConfig")
			.mockReturnValue({ servers: {}, idleTimeoutMs: undefined });
		const getServersSpy = vi.spyOn(lspConfig, "getServersForFile").mockReturnValue([]);
		const writethrough = createLspWritethrough(tempDir.path(), { enableFormat: true, enableDiagnostics: true });

		const filePath = path.join(tempDir.path(), "single.ts");
		const result = await writethrough(filePath, "const single = true;\n");

		expect(result).toBeUndefined();
		expect(getServersSpy).toHaveBeenCalledTimes(1);
		expect(loadConfigSpy).toHaveBeenCalledTimes(1);
		expect(await Bun.file(filePath).text()).toBe("const single = true;\n");
	});

	it("reports a later publication failure as potentially replacing an earlier write", async () => {
		vi.spyOn(lspConfig, "loadConfig").mockReturnValue({ servers: {}, idleTimeoutMs: undefined });
		const client = {
			format: async () => "const formatted = true;\n",
			lint: async () => [],
		};
		const server: ServerConfig = {
			command: "custom-formatter",
			fileTypes: ["ts"],
			rootMarkers: [],
			createClient: () => client,
		};
		vi.spyOn(lspConfig, "getServersForFile").mockReturnValue([["custom", server]]);
		const filePath = path.join(tempDir.path(), "later-failure.ts");
		let writes = 0;
		const atomicFailure = new FileWriteNotPublishedError(
			filePath,
			Object.assign(new Error("EIO: publication failed"), { code: "EIO" }),
		);
		vi.spyOn(atomicFileWrite, "writeFileAtomically").mockImplementation(async () => {
			writes += 1;
			if (writes > 1) throw atomicFailure;
		});

		const writethrough = createLspWritethrough(tempDir.path(), { enableFormat: true });
		await expect(writethrough(filePath, "const original = true;\n")).rejects.toMatchObject({
			destUnchanged: false,
		});
		expect(writes).toBeGreaterThan(1);
	});
});
