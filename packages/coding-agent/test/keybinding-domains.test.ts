import { describe, expect, it } from "bun:test";
import { generateHotkeysDocsTable } from "../scripts/generate-hotkeys-docs";
import { type AppKeybinding, KEYBINDINGS } from "../src/config/keybindings";
import { APP_ACTION_METADATA } from "../src/modes/action-registry";
import { AVAILABILITY_GATED_NAV_PALETTE_ACTIONS } from "../src/modes/controllers/input-controller";

const appBindings = Object.keys(KEYBINDINGS).filter((id): id is AppKeybinding => id.startsWith("app."));
const metadataById = new Map(APP_ACTION_METADATA.map(action => [action.id, action]));

function defaultKeys(id: AppKeybinding): string[] {
	const keys = KEYBINDINGS[id].defaultKeys;
	return Array.isArray(keys) ? keys : [keys];
}

describe("application keybinding domains", () => {
	it("registers every application keybinding", () => {
		expect(appBindings.filter(id => !metadataById.has(id))).toEqual([]);
		expect(APP_ACTION_METADATA.filter(action => !(action.id in KEYBINDINGS))).toEqual([]);
	});

	it("labels the legacy fork action by its message-branch behavior", () => {
		expect(metadataById.get("app.session.fork")?.title).toBe("Branch from message");
		expect(KEYBINDINGS["app.session.fork"].description).toBe("Branch from message");
	});

	it("rejects default chord collisions within a focus domain", () => {
		const owners = new Map<string, AppKeybinding[]>();
		for (const action of APP_ACTION_METADATA) {
			for (const domain of action.domains)
				for (const key of defaultKeys(action.id)) {
					if (!key) continue;
					const identity = `${domain}:${key}`;
					owners.set(identity, [...(owners.get(identity) ?? []), action.id]);
				}
		}
		expect([...owners.entries()].filter(([, ids]) => ids.length > 1)).toEqual([]);
	});

	it("allows known cross-domain chord reuse", () => {
		for (const key of ["ctrl+p", "ctrl+s", "ctrl+r", "ctrl+d"]) {
			const actions = APP_ACTION_METADATA.filter(action => defaultKeys(action.id).includes(key));
			expect(new Set(actions.flatMap(action => action.domains)).size).toBeGreaterThan(1);
		}
	});

	it("generates a row for every registered action", () => {
		const table = generateHotkeysDocsTable();
		for (const action of APP_ACTION_METADATA) expect(table).toContain(`\`${action.id}\``);
	});

	it("keeps every availability-gated navigation palette id registered and default-free", () => {
		for (const id of AVAILABILITY_GATED_NAV_PALETTE_ACTIONS) {
			// A gated id must be a real registered action, or the palette would list
			// an entry whose label lookup has no source.
			expect(metadataById.has(id)).toBe(true);
			expect(id in KEYBINDINGS).toBe(true);
			expect(KEYBINDINGS[id].description.length).toBeGreaterThan(0);
			// Shipping a default chord for one of these is the deferred part-(b)
			// change, not this one: the remap loops exist precisely so a user
			// binding works while defaults stay empty.
			expect(defaultKeys(id)).toEqual([]);
		}
	});

	it("excludes intentionally-unbound and product-pending ids from the gate set", () => {
		// The global "every metadata id is reachable" claim was dropped because
		// these two cannot satisfy it: followUp is deliberately unbound and
		// mode.cycle duplicates app.plan.toggle pending a product decision.
		const gated = new Set<AppKeybinding>(AVAILABILITY_GATED_NAV_PALETTE_ACTIONS);
		expect(gated.has("app.message.followUp")).toBe(false);
		expect(gated.has("app.mode.cycle")).toBe(false);
	});
});
