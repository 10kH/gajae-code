import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import {
	reconcileSettingsSchema,
	resetSettingsForTest,
	Settings,
	settings,
	validateSettingPatch,
} from "@gajae-code/coding-agent/config/settings";
import { SettingsSelectorComponent } from "@gajae-code/coding-agent/modes/components/settings-selector";
import { initTheme } from "@gajae-code/coding-agent/modes/theme/theme";
import { resolveUiLanguage, uiString } from "@gajae-code/coding-agent/modes/ui-language";

beforeAll(async () => {
	await initTheme(false, undefined, undefined, "red-claw", "blue-crab");
});

beforeEach(async () => {
	resetSettingsForTest();
	await Settings.init({ inMemory: true });
});

function createSelector(): SettingsSelectorComponent {
	return new SettingsSelectorComponent(
		{
			availableThinkingLevels: [],
			thinkingLevel: undefined,
			availableThemes: ["red-claw", "blue-crab"],
			availableModelProfiles: [],
			cwd: process.cwd(),
		},
		{
			onChange: () => {},
			onCancel: () => {},
			getStatusLinePreview: () => "status-preview",
		},
	);
}

describe("interactive UI language selection", () => {
	it("defaults invalid and unavailable selections to English", () => {
		expect(resolveUiLanguage(undefined)).toBe("en");
		expect(resolveUiLanguage("fr")).toBe("en");
		expect(uiString("fr", "settings.title")).toBe("Settings");

		const reconciled = reconcileSettingsSchema({ ui: { language: "fr" } });
		expect(reconciled.report.valid).toBe(false);
		expect(reconciled.settings.ui).toEqual({ language: "fr" });
		expect(validateSettingPatch({ "ui.language": "ko" })).toEqual([]);
		expect(validateSettingPatch({ "ui.language": "fr" })).toEqual([
			{ path: "ui.language", detail: "Expected enum." },
		]);
	});

	it("renders persisted Korean settings chrome without changing canonical values", () => {
		settings.set("ui.language", "ko");
		const selector = createSelector();
		const rendered = selector.render(160).map(Bun.stripANSI).join("\n");

		expect(rendered).toContain("설정:");
		expect(rendered).toContain("화면");
		expect(rendered).toContain("언어");
		expect(settings.get("ui.language")).toBe("ko");

		selector.handleInput("\x1b[B"); // Light Theme
		selector.handleInput("\x1b[B"); // Language
		selector.handleInput("\n");
		const submenu = selector.render(160).map(Bun.stripANSI).join("\n");
		expect(submenu).toContain("언어");
		expect(submenu).toContain("사람이 읽는 대화형 UI 텍스트의 언어");
		expect(submenu).toContain("한국어");
	});

	it("keeps the operator language authoritative over runtime overrides", () => {
		expect(
			Settings.isolated({ "ui.language": "ko" }, { overrides: { "ui.language": "en" } }).get("ui.language"),
		).toBe("ko");
		expect(Settings.isolated({}, { overrides: { "ui.language": "ko" } }).get("ui.language")).toBe("en");
	});

	it("persists a user selection and refreshes the open settings surface", () => {
		const selector = createSelector();
		selector.handleInput("\x1b[B"); // Light Theme
		selector.handleInput("\x1b[B"); // Language
		selector.handleInput("\n");
		selector.handleInput("\x1b[B"); // Korean
		selector.handleInput("\n");

		const rendered = selector.render(160).map(Bun.stripANSI).join("\n");
		expect(settings.get("ui.language")).toBe("ko");
		expect(rendered).toContain("설정:");
		expect(rendered).toContain("언어");
	});
});
