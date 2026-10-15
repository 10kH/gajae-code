import { describe, expect, it } from "bun:test";
import {
	renderSubagentCompactPanelShowcase,
	SUBAGENT_COMPACT_PANEL_SHOWCASE_ENTRIES,
	SUBAGENT_COMPACT_PANEL_STATE_IDS,
} from "./fixtures/tui/subagent-compact-panel-showcase";

describe("subagent compact panel showcase (#6774)", () => {
	it("covers every state at the canonical viewports plus the ASCII and narrow variants", () => {
		const keys = SUBAGENT_COMPACT_PANEL_SHOWCASE_ENTRIES.map(
			entry => `${entry.stateId}/${entry.columns}x${entry.rows}/${entry.renderMode}`,
		);
		expect(new Set(keys).size).toBe(keys.length);
		expect(keys).toHaveLength(23);
		for (const stateId of SUBAGENT_COMPACT_PANEL_STATE_IDS) {
			expect(keys.some(key => key.startsWith(`${stateId}/`))).toBe(true);
		}
	});

	it("renders every collapsed compact state in at most three rows without viewport overflow", async () => {
		for (const entry of SUBAGENT_COMPACT_PANEL_SHOWCASE_ENTRIES) {
			const rendered = await renderSubagentCompactPanelShowcase(entry);
			expect(rendered.terminalText.split("\n")).toHaveLength(entry.rows + 1);
			if (entry.stateId.startsWith("compact-collapsed-")) {
				expect(rendered.panelLines).toBeLessThanOrEqual(3);
				expect(rendered.viewportOverflowRows).toBe(0);
			}
			if (entry.renderMode === "ascii-no-color") {
				expect(rendered.terminalAnsiText).toBe(rendered.terminalText);
			}
		}
	});
});
