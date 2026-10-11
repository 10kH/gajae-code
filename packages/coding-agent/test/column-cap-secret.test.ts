import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentTool, AgentToolContext, AgentToolResult } from "@gajae-code/agent-core";
import { Settings } from "../src/config/settings";
import { OutputSink } from "../src/session/streaming-output";
import { wrapToolWithMetaNotice } from "../src/tools/output-meta";
import { ToolAbortError } from "../src/tools/tool-errors";

const CANARY = `GJCC2-${"0123456789abcdef".repeat(2)}01234567`;
const COLUMN_CAP = 768;
const KEPT_COLUMNS = COLUMN_CAP - 3;
const FILLER = "q";

function chunksOf(text: string, size: number): string[] {
	const chunks: string[] = [];
	for (let offset = 0; offset < text.length; offset += size) chunks.push(text.slice(offset, offset + size));
	return chunks;
}

function straddlingLine(): string {
	const canaryAt = KEPT_COLUMNS - 24;
	return `${FILLER.repeat(canaryAt)}${CANARY}${FILLER.repeat(2000)}\nfooter`;
}

async function baseCut(chunks: string[], dumpAfter = 0): Promise<string> {
	const sink = new OutputSink({ maxColumns: COLUMN_CAP, spillThreshold: 8000 });
	for (let index = 0; index < chunks.length; index++) {
		sink.push(chunks[index] ?? "");
		if (dumpAfter > 0 && index + 1 === dumpAfter) await sink.dump();
	}
	return (await sink.dump()).output;
}

async function loadSettings(enabled: boolean): Promise<{ settings: Settings; root: string }> {
	const root = mkdtempSync(join(tmpdir(), "column-cap-secret-"));
	const cwd = join(root, "project");
	const agentDir = join(root, "agent");
	mkdirSync(join(cwd, ".gjc"), { recursive: true });
	mkdirSync(agentDir, { recursive: true });
	writeFileSync(join(agentDir, "config.yml"), `secrets:\n  enabled: ${enabled ? "true" : "false"}\n`);
	writeFileSync(join(cwd, ".gjc", "secrets.yml"), `- type: plain\n  content: "${CANARY}"\n`);
	const settings = await Settings.loadForScope({ cwd, agentDir });
	if (settings.get("secrets.enabled") !== enabled) {
		await settings.close();
		rmSync(root, { recursive: true, force: true });
		throw new Error(`secrets.enabled loaded as ${String(settings.get("secrets.enabled"))}, expected ${enabled}`);
	}
	return { settings, root };
}

function textOf(result: AgentToolResult): string {
	return result.content
		.filter((block): block is { type: "text"; text: string } => block.type === "text")
		.map(block => block.text)
		.join("");
}

async function executeSink(
	settings: Settings,
	chunks: string[],
	signal?: AbortSignal,
	onExecute?: () => void,
	dumpAfter = 0,
): Promise<string> {
	let ran = false;
	const tool = {
		name: "bash",
		description: "",
		parameters: {},
		execute: async () => {
			ran = true;
			onExecute?.();
			const sink = new OutputSink({ maxColumns: COLUMN_CAP, spillThreshold: 8000 });
			for (let index = 0; index < chunks.length; index++) {
				sink.push(chunks[index] ?? "");
				if (dumpAfter > 0 && index + 1 === dumpAfter) await sink.dump();
			}
			const dumped = await sink.dump();
			return { content: [{ type: "text", text: dumped.output }] };
		},
	} as unknown as AgentTool;
	const wrapped = wrapToolWithMetaNotice(tool);
	try {
		const result = await wrapped.execute("call-1", {}, signal, undefined, { settings } as AgentToolContext);
		if (!ran) throw new Error("tool execute did not run");
		return textOf(result);
	} catch (error) {
		if (!ran && !(error instanceof ToolAbortError)) throw error;
		throw error;
	}
}

describe("column cap plain-secret cut", () => {
	test("a canary that straddles the 765-byte cut is not sent in plaintext", async () => {
		const { settings, root } = await loadSettings(true);
		try {
			const line = straddlingLine();
			const base = await baseCut(chunksOf(line, 50));
			expect(base.includes(CANARY.slice(0, 8))).toBe(true);
			expect(base.includes(CANARY)).toBe(false);
			for (const chunks of [chunksOf(line, 50), chunksOf(line, 100), [line]]) {
				const output = await executeSink(settings, chunks);
				expect(output.includes(CANARY)).toBe(false);
				expect(output.includes(CANARY.slice(0, 8))).toBe(false);
				expect(output.endsWith("\nfooter")).toBe(true);
				expect(output.endsWith("…\nfooter")).toBe(true);
			}
		} finally {
			await settings.close();
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("secrets disabled stays byte-identical to the base cut", async () => {
		const { settings, root } = await loadSettings(false);
		try {
			const chunks = chunksOf(straddlingLine(), 50);
			const output = await executeSink(settings, chunks);
			expect(output).toBe(await baseCut(chunks));
		} finally {
			await settings.close();
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("a canary finished after a nonterminal dump is not sent in plaintext", async () => {
		const { settings, root } = await loadSettings(true);
		try {
			const chunks = [
				`${FILLER.repeat(KEPT_COLUMNS - 24)}${CANARY.slice(0, 20)}`,
				`${CANARY.slice(20)}${FILLER.repeat(2000)}`,
			];
			const output = await executeSink(settings, chunks, undefined, undefined, 1);
			expect(output.includes(CANARY)).toBe(false);
			expect(output.includes(CANARY.slice(0, 8))).toBe(false);
			expect(output.endsWith("…")).toBe(true);
		} finally {
			await settings.close();
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("a no-secret chunk that fills the cap stays on the base cut", async () => {
		const { settings, root } = await loadSettings(true);
		try {
			const chunks = [FILLER.repeat(COLUMN_CAP), FILLER];
			const output = await executeSink(settings, chunks);
			expect(output).toBe(await baseCut(chunks));
			expect(output).toBe(`${FILLER.repeat(COLUMN_CAP)}…`);
		} finally {
			await settings.close();
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("a no-secret line pushed after a nonterminal dump stays cumulative", async () => {
		const { settings, root } = await loadSettings(true);
		try {
			const chunks = ["hello", "!\nnext"];
			const output = await executeSink(settings, chunks, undefined, undefined, 1);
			expect(output).toBe(await baseCut(chunks, 1));
		} finally {
			await settings.close();
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("a line with no secret is cut exactly as on the base", async () => {
		const { settings, root } = await loadSettings(true);
		try {
			const chunks = chunksOf(FILLER.repeat(4000), 100);
			const output = await executeSink(settings, chunks);
			expect(output).toBe(await baseCut(chunks));
			expect(output).toBe(`${FILLER.repeat(KEPT_COLUMNS)}…`);
		} finally {
			await settings.close();
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("a secret that sits entirely inside the kept column prefix is still present", async () => {
		const { settings, root } = await loadSettings(true);
		try {
			const chunks = chunksOf(`${CANARY}${FILLER.repeat(4000)}`, 100);
			const output = await executeSink(settings, chunks);
			expect(output).toBe(await baseCut(chunks));
			expect(output.startsWith(CANARY)).toBe(true);
		} finally {
			await settings.close();
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("an aborted signal after secret loading does not run the tool", async () => {
		const { settings, root } = await loadSettings(true);
		try {
			const signal = AbortSignal.abort();
			let ran = false;
			await expect(
				executeSink(settings, ["q"], signal, () => {
					ran = true;
				}),
			).rejects.toBeInstanceOf(ToolAbortError);
			expect(ran).toBe(false);
		} finally {
			await settings.close();
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("secrets disabled still runs a tool whose signal is already aborted", async () => {
		const { settings, root } = await loadSettings(false);
		try {
			const signal = AbortSignal.abort();
			let ran = false;
			const output = await executeSink(settings, ["kept"], signal, () => {
				ran = true;
			});
			expect(ran).toBe(true);
			expect(output).toBe("kept");
		} finally {
			await settings.close();
			rmSync(root, { recursive: true, force: true });
		}
	});
});
