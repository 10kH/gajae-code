import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
	renderSubagentCompactPanelShowcase,
	SUBAGENT_COMPACT_PANEL_FIXED_NOW_MS,
	SUBAGENT_COMPACT_PANEL_SHOWCASE_ENTRIES,
	type SubagentCompactPanelShowcaseEntry,
} from "../test/fixtures/tui/subagent-compact-panel-showcase";
import { ansiToHtml } from "./capture-sticky-viewport-showcase";

const CANONICAL_COMMAND =
	"bun packages/coding-agent/scripts/capture-subagent-compact-panel-showcase.ts --out .gjc/qa/subagent-compact-panel-<run>";
const CAPTURE_TOOL_VERSION = "subagent-compact-panel-showcase-v1";

interface ArtifactFile {
	path: string;
	sha256: string;
	byteLength: number;
}

function usage(): never {
	throw new Error(`Usage: ${CANONICAL_COMMAND}`);
}

function outputPath(args: string[]): string {
	if (args.length !== 2 || args[0] !== "--out" || !args[1]) usage();
	return path.resolve(args[1]);
}

function json(value: unknown): string {
	return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value: string): string {
	return new Bun.CryptoHasher("sha256").update(value).digest("hex");
}

function entryKey(entry: SubagentCompactPanelShowcaseEntry): string {
	return `${entry.stateId}/${entry.columns}x${entry.rows}/${entry.renderMode}`;
}

async function writeArtifact(root: string, relativePath: string, content: string): Promise<ArtifactFile> {
	const target = path.join(root, relativePath);
	await fs.mkdir(path.dirname(target), { recursive: true });
	await Bun.write(target, content);
	return { path: relativePath, sha256: sha256(content), byteLength: Buffer.byteLength(content, "utf8") };
}

async function main(): Promise<void> {
	const root = outputPath(process.argv.slice(2));
	await fs.mkdir(root, { recursive: true });
	const entries = [];
	for (const entry of SUBAGENT_COMPACT_PANEL_SHOWCASE_ENTRIES) {
		const key = entryKey(entry);
		const rendered = await renderSubagentCompactPanelShowcase(entry);
		const metadata = json({
			entryKey: key,
			commandOrReplaySource: CANONICAL_COMMAND,
			fixtureSource: "packages/coding-agent/test/fixtures/tui/subagent-compact-panel-showcase.ts",
			toolVersion: CAPTURE_TOOL_VERSION,
			captureMode: "fixture",
			terminal: { columns: entry.columns, rows: entry.rows },
			renderMode: entry.renderMode,
			fontRenderingAssumptions: "red-claw truecolor theme; HTML uses a monospace terminal fallback stack.",
			wrappingPolicy:
				"Real subagentToolRenderer output at the recorded terminal-cell width; lines are truncated by the renderer, never wrapped.",
			fixedClockTimestamp: new Date(SUBAGENT_COMPACT_PANEL_FIXED_NOW_MS).toISOString(),
			panelLines: rendered.panelLines,
			viewportOverflowRows: rendered.viewportOverflowRows,
		});
		const dir = key;
		const files = [
			await writeArtifact(root, `${dir}/terminal.txt`, rendered.terminalText),
			await writeArtifact(root, `${dir}/terminal-ansi.txt`, rendered.terminalAnsiText),
			await writeArtifact(root, `${dir}/terminal.html`, ansiToHtml(rendered.terminalAnsiText)),
			await writeArtifact(root, `${dir}/metadata.json`, metadata),
		];
		entries.push({
			key,
			stateId: entry.stateId,
			viewport: { columns: entry.columns, rows: entry.rows },
			renderMode: entry.renderMode,
			panelLines: rendered.panelLines,
			viewportOverflowRows: rendered.viewportOverflowRows,
			files,
		});
	}
	await writeArtifact(
		root,
		"manifest.json",
		json({ tool: CAPTURE_TOOL_VERSION, command: CANONICAL_COMMAND, entryCount: entries.length, entries }),
	);
	process.stdout.write(`Captured ${entries.length} subagent compact panel showcase entries at ${root}\n`);
}

void main().catch(error => {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
	process.exit(1);
});
