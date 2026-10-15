import { KeybindingsManager } from "@gajae-code/coding-agent/config/keybindings";
import { resetSettingsForTest, Settings, settings } from "@gajae-code/coding-agent/config/settings";
import { initTheme, theme } from "@gajae-code/coding-agent/modes/theme/theme";
import type { SubagentSnapshot, SubagentToolDetails } from "@gajae-code/coding-agent/tools/subagent";
import { subagentToolRenderer } from "@gajae-code/coding-agent/tools/subagent-render";
import { setKeybindings } from "@gajae-code/tui";

/**
 * Deterministic visual-QA fixture for the compact subagent await panel (#6774).
 * The real `subagentToolRenderer` renders every state; only the clock and the
 * snapshot inputs are fixed.
 */
export type SubagentCompactPanelStateId =
	| "compact-collapsed-15-live"
	| "compact-expanded-15-live"
	| "compact-collapsed-mixed"
	| "compact-collapsed-retrying"
	| "compact-collapsed-terminal"
	| "default-collapsed-3-live"
	| "narrow-cjk";

export type SubagentCompactPanelRenderMode = "unicode-color" | "ascii-no-color";

export interface SubagentCompactPanelShowcaseEntry {
	stateId: SubagentCompactPanelStateId;
	columns: number;
	rows: number;
	renderMode: SubagentCompactPanelRenderMode;
}

export interface SubagentCompactPanelShowcaseRender {
	terminalText: string;
	terminalAnsiText: string;
	panelLines: number;
	viewportOverflowRows: number;
}

export const SUBAGENT_COMPACT_PANEL_FIXED_NOW_MS = Date.UTC(2026, 9, 15, 6, 0, 0);

export const SUBAGENT_COMPACT_PANEL_STATE_IDS: readonly SubagentCompactPanelStateId[] = [
	"compact-collapsed-15-live",
	"compact-expanded-15-live",
	"compact-collapsed-mixed",
	"compact-collapsed-retrying",
	"compact-collapsed-terminal",
	"default-collapsed-3-live",
	"narrow-cjk",
];

const VIEWPORTS = [
	{ columns: 80, rows: 24 },
	{ columns: 120, rows: 36 },
	{ columns: 160, rows: 48 },
] as const;

export const SUBAGENT_COMPACT_PANEL_SHOWCASE_ENTRIES: readonly SubagentCompactPanelShowcaseEntry[] = [
	...SUBAGENT_COMPACT_PANEL_STATE_IDS.filter(stateId => stateId !== "narrow-cjk").flatMap(stateId =>
		VIEWPORTS.map(viewport => ({ stateId, ...viewport, renderMode: "unicode-color" as const })),
	),
	{ stateId: "compact-collapsed-15-live", columns: 80, rows: 24, renderMode: "ascii-no-color" },
	{ stateId: "compact-collapsed-mixed", columns: 80, rows: 24, renderMode: "ascii-no-color" },
	{ stateId: "compact-collapsed-mixed", columns: 48, rows: 36, renderMode: "unicode-color" },
	{ stateId: "narrow-cjk", columns: 48, rows: 36, renderMode: "unicode-color" },
	{ stateId: "narrow-cjk", columns: 48, rows: 36, renderMode: "ascii-no-color" },
];

function liveSnapshot(index: number, nowMs: number, overrides: Partial<SubagentSnapshot> = {}): SubagentSnapshot {
	const id = `${index}-Worker${String(index).padStart(2, "0")}`;
	return {
		id,
		jobId: id,
		status: "running",
		label: "subagent",
		agent: "executor",
		agentSource: "bundled",
		description: `worker ${index}`,
		durationMs: 60_000 + index * 1_000,
		liveProgressAvailable: true,
		progress: {
			id,
			status: "running",
			currentTool: index % 2 === 0 ? "bash" : "read",
			toolCount: index + 1,
			contextTokens: 12_000 + index * 500,
			contextWindow: 200_000,
			lastActivityMs: nowMs - 2_000,
		},
		...overrides,
	};
}

function idle(snapshot: SubagentSnapshot, nowMs: number): SubagentSnapshot {
	return { ...snapshot, progress: { ...snapshot.progress!, lastActivityMs: nowMs - 45_000 } };
}

function fixtureDetails(stateId: SubagentCompactPanelStateId, nowMs: number): SubagentToolDetails {
	switch (stateId) {
		case "compact-collapsed-15-live":
		case "compact-expanded-15-live":
			return {
				subagents: Array.from({ length: 15 }, (_, index) =>
					index < 3 ? idle(liveSnapshot(index, nowMs), nowMs) : liveSnapshot(index, nowMs),
				),
			};
		case "compact-collapsed-mixed":
			return {
				subagents: [
					...Array.from({ length: 8 }, (_, index) => liveSnapshot(index, nowMs)),
					idle(liveSnapshot(8, nowMs), nowMs),
					{ ...liveSnapshot(9, nowMs), status: "queued", progress: undefined },
					{ ...liveSnapshot(10, nowMs), status: "paused", progress: undefined },
					{ ...liveSnapshot(11, nowMs), status: "completed", progress: undefined },
					{ ...liveSnapshot(12, nowMs), status: "failed", progress: undefined, errorText: "exit 1" },
				],
			};
		case "compact-collapsed-retrying":
			return {
				subagents: Array.from({ length: 12 }, (_, index) => {
					const snapshot = liveSnapshot(index, nowMs);
					if (index >= 4) return snapshot;
					return {
						...snapshot,
						progress: {
							...snapshot.progress!,
							retryState: {
								attempt: 2,
								maxAttempts: 5,
								kind: "provider_error",
								provider: "anthropic",
								delayMs: 10_000,
								startedAtMs: nowMs - 1_000,
							},
						},
					};
				}),
			};
		case "compact-collapsed-terminal":
			return {
				subagents: Array.from({ length: 10 }, (_, index) => ({
					...liveSnapshot(index, nowMs),
					status: index === 9 ? ("cancelled" as const) : ("completed" as const),
					progress: undefined,
					liveProgressAvailable: false,
				})),
			};
		case "default-collapsed-3-live":
			return { subagents: Array.from({ length: 3 }, (_, index) => liveSnapshot(index, nowMs)) };
		case "narrow-cjk":
			return {
				subagents: Array.from({ length: 4 }, (_, index) =>
					liveSnapshot(index, nowMs, {
						description: [
							"한국어 번역 검수",
							"日本語の台詞を確認する",
							"中文术语统一检查",
							"혼합 mixed 文字列 check",
						][index],
					}),
				),
			};
	}
}

function settingsFor(stateId: SubagentCompactPanelStateId): { compact: boolean; expanded: boolean } {
	return {
		compact: stateId !== "default-collapsed-3-live",
		expanded: stateId === "compact-expanded-15-live" || stateId === "narrow-cjk",
	};
}

/** Clip to the viewport and pad to exactly `rows` lines (whole terminal surface). */
function fitViewport(lines: readonly string[], rows: number): string[] {
	const visible = lines.slice(0, rows);
	while (visible.length < rows) visible.push("");
	return visible;
}

export async function renderSubagentCompactPanelShowcase(
	entry: SubagentCompactPanelShowcaseEntry,
): Promise<SubagentCompactPanelShowcaseRender> {
	resetSettingsForTest();
	await Settings.init({ inMemory: true });
	await initTheme(false, entry.renderMode === "ascii-no-color" ? "ascii" : "unicode", false, "red-claw", "red-claw");
	// Shipped default bindings, so the hint shows the real expand key.
	setKeybindings(KeybindingsManager.inMemory());
	const { compact, expanded } = settingsFor(entry.stateId);
	settings.set("task.compactSubagentPanel", compact);
	const realNow = Date.now;
	Date.now = () => SUBAGENT_COMPACT_PANEL_FIXED_NOW_MS;
	try {
		const component = subagentToolRenderer.renderResult(
			{
				content: [{ type: "text", text: "" }],
				details: fixtureDetails(entry.stateId, SUBAGENT_COMPACT_PANEL_FIXED_NOW_MS),
			},
			{ expanded, isPartial: true, spinnerFrame: 0 },
			theme,
		);
		const panel = component.render(entry.columns);
		const viewport = fitViewport(panel, entry.rows);
		const ansi = `${viewport.join("\n")}\n`;
		const plain = Bun.stripANSI(ansi);
		return {
			terminalText: plain,
			terminalAnsiText: entry.renderMode === "ascii-no-color" ? plain : ansi,
			panelLines: panel.length,
			viewportOverflowRows: Math.max(0, panel.length - entry.rows),
		};
	} finally {
		Date.now = realNow;
		resetSettingsForTest();
	}
}
