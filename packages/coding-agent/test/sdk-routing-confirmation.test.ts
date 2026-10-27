import { afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import type { Model } from "@gajae-code/ai/core";
import { getKeybindings, setKeybindings, type KeybindingsManager as TuiKeybindingsManager } from "@gajae-code/tui";
import type { AutoroutingSetup } from "../src/config/autorouting-contract";
import { KeybindingsManager } from "../src/config/keybindings";
import { Settings } from "../src/config/settings";
import { type SmartRoutingIntent, SmartRoutingPanelComponent } from "../src/modes/components/smart-routing-panel";
import { initTheme } from "../src/modes/theme/theme";
import { createRoutingSettingsService, type RoutingSettingsPreview } from "../src/sdk/routing-settings";

const setup: AutoroutingSetup = { schema: 1, providers: ["anthropic", "openai-codex"] };
const catalog = [
	{
		provider: "anthropic",
		id: "claude-haiku-4-5",
		name: "Haiku",
		api: "anthropic-messages",
		contextWindow: 1000,
		maxTokens: 1000,
	},
	{
		provider: "openai-codex",
		id: "gpt-5.6-terra",
		name: "Terra",
		api: "openai-responses",
		contextWindow: 1000,
		maxTokens: 1000,
	},
] as Model[];

beforeAll(async () => {
	await initTheme(false);
});
let previousKeybindings: TuiKeybindingsManager;
beforeEach(() => {
	previousKeybindings = getKeybindings();
	setKeybindings(KeybindingsManager.inMemory());
});
afterEach(() => {
	setKeybindings(previousKeybindings);
});

describe("smart-routing keyboard confirmation", () => {
	function fixture() {
		const settings = Settings.isolated();
		let currentCatalog = catalog;
		let order = [...setup.providers];
		const routing = createRoutingSettingsService({
			settings,
			getCatalog: () => currentCatalog,
			getProviderOrder: () => order,
			isScoped: () => false,
		});
		const intents: SmartRoutingIntent[] = [];
		const pending: { callback?: Promise<RoutingSettingsPreview | undefined> } = {};
		const currentCallback = (): Promise<RoutingSettingsPreview | undefined> | undefined => pending.callback;
		const panel = new SmartRoutingPanelComponent({
			setup,
			enabled: false,
			readOnly: false,
			stale: false,
			preview: routing.previewSmartRouting(setup),
			generatePreview: draft => routing.previewSmartRouting(draft),
			onSelect: intent => {
				intents.push(intent);
				pending.callback = (async () => {
					if (intent.kind === "apply") return (await routing.applySmartRouting(intent.draft, intent)).preview;
					if (intent.kind === "refresh") return (await routing.refreshSmartRouting(intent)).preview;
					throw new Error("Unexpected intent");
				})();
				return pending.callback;
			},
			onCancel: () => {},
		});
		return {
			settings,
			routing,
			panel,
			intents,
			setCatalog: (value: Model[]) => {
				currentCatalog = value;
			},
			setOrder: (value: string[]) => {
				order = value;
			},
			async input(key: string) {
				delete pending.callback;
				panel.handleInput(key);
				const callback = currentCallback();
				if (!callback) throw new Error(`No callback for ${key}`);
				await callback.catch(() => undefined);
				await Promise.resolve();
			},
		};
	}

	test("a failed apply shows a fresh preview and the next a sends a new intent", async () => {
		const f = fixture();
		const firstPreview = f.panel.getPreviewPayload();
		f.setCatalog(catalog.slice(0, 1));
		await f.input("a");
		expect(f.intents).toHaveLength(1);
		expect(f.panel.mode).toBe("editing");
		expect(f.panel.render(120).join("\n")).toContain("fresh preview");
		expect(f.panel.getPreviewPayload().sourceIdentity).not.toEqual(firstPreview.sourceIdentity);
		expect(f.settings.getGlobal("task.autorouting.tiers")).toBeUndefined();
		await f.input("a");
		expect(f.intents).toHaveLength(2);
		expect(f.intents[1]?.kind).toBe("apply");
		expect(f.panel.mode).toBe("done");
		expect(f.settings.getGlobal("task.autorouting.tiers")).toEqual(f.panel.getPreviewPayload().tiers);
	});

	for (const drift of ["catalog", "order"] as const) {
		test(`refresh Enter refuses ${drift} drift and preserves the edited draft`, async () => {
			const f = fixture();
			await f.routing.applySmartRouting(setup);
			const handEdited = { fast: ["anthropic/custom"] };
			f.settings.set("task.autorouting.tiers", handEdited);
			f.panel.handleInput("\x1b[B");
			const draft = f.panel.getDraft();
			expect(draft.providers).toEqual([...setup.providers].reverse());
			await f.input("r");
			expect(f.panel.confirmation).toBe("hand-edit");
			if (drift === "catalog") f.setCatalog(catalog.slice(0, 1));
			else f.setOrder([...setup.providers].reverse());
			await f.input("\r");
			expect(f.intents).toHaveLength(2);
			expect(f.intents[1]).toMatchObject({ kind: "refresh", confirmHandEdit: true });
			expect(f.panel.mode).toBe("editing");
			expect(f.panel.render(120).join("\n")).toContain("fresh preview");
			expect(f.panel.getDraft()).toEqual(draft);
			expect(f.settings.getGlobal("task.autorouting.tiers")).toEqual(handEdited);
			expect(f.settings.getGlobal("task.autorouting.setup")).toEqual(setup);
		});
	}
});
