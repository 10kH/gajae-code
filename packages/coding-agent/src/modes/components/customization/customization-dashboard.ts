/**
 * CustomizationDashboard — the umbrella local-customization home opened by the
 * `/extensions` slash command (issue #4291).
 *
 * This is a standalone state model and component tree around local
 * Skills/Hooks/MCPs/Import. It is intentionally NOT built on the
 * provider/extension-module ExtensionDashboard; the two surfaces share only
 * generic TUI primitives (Container, Text, SelectList, DynamicBorder).
 *
 * Layout (narrow-terminal safe):
 *   title: /extensions — Configure skills, hooks, and MCPs.
 *   destination scope badge (Project .gjc / Global .gjc) — `s` switches
 *   section tabs: Skills | Hooks | MCPs — left/right switch
 *   inventory rows for the active section with status + provenance
 *   footer key hints
 */
import { Container, matchesKey, type SelectItem, SelectList, Text } from "@gajae-code/tui";
import { type CustomizationInventory, loadCustomizationInventory } from "../../../customization/inventory";
import {
	removeHookFile,
	removeMcpServerEntry,
	removeSkill,
	setMcpServerEnabled,
	setSkillEnabled,
} from "../../../customization/mutations";
import {
	CUSTOMIZATION_SURFACES,
	type CustomizationSurface,
	type GjcScope,
	type InventoryRow,
	resolveScopePaths,
	scopeLabel,
	surfaceLabel,
} from "../../../customization/types";
import { replaceTabs, truncateToWidth } from "../../../tools/render-utils";
import { getSelectListTheme, theme } from "../../theme/theme";
import { matchesAppInterrupt } from "../../utils/keybinding-matchers";
import { DynamicBorder } from "../dynamic-border";
import { ImportWizard } from "./import-wizard";

/** Minimal settings slice the dashboard reads. */
export interface CustomizationSettingsSlice {
	get(key: string): unknown;
}

const STATUS_COLORS: Record<InventoryRow["status"], (text: string) => string> = {
	enabled: text => theme.fg("success", text),
	disabled: text => theme.fg("muted", text),
	invalid: text => theme.fg("error", text),
	shadowed: text => theme.fg("warning", text),
	quarantined: text => theme.fg("warning", text),
	imported: text => theme.fg("accent", text),
	"restart-required": text => theme.fg("warning", text),
};

function rowToSelectItem(row: InventoryRow): SelectItem {
	const color = STATUS_COLORS[row.status];
	const status = color(row.status);
	return {
		value: `${row.surface}:${row.scope}:${row.name}`,
		label: replaceTabs(row.displayName),
		description: `${status} ${theme.fg("muted", `· ${replaceTabs(row.provenance)}`)}${
			row.description ? theme.fg("muted", ` — ${replaceTabs(row.description)}`) : ""
		}`,
	};
}

export class CustomizationDashboard extends Container {
	/** Called when the dashboard wants to close (Esc / q / interrupt). */
	onClose: (() => void) | undefined;
	/** Called whenever the dashboard needs a re-render. */
	onRequestRender: (() => void) | undefined;

	#cwd: string;
	#settings: CustomizationSettingsSlice | undefined;
	#scope: GjcScope = "project";
	#section: CustomizationSurface = "skills";
	#inventory: CustomizationInventory = { rows: [], warnings: [] };
	#lists = new Map<CustomizationSurface, SelectList>();
	#bodyContainer!: Container;
	#headerTexts: Text[] = [];
	#footerText!: Text;
	#wizard: ImportWizard | null = null;
	#confirmRemove: InventoryRow | null = null;
	#statusMessage: string | null = null;

	private constructor(cwd: string, settings: CustomizationSettingsSlice | undefined) {
		super();
		this.#cwd = cwd;
		this.#settings = settings;
	}

	static async create(cwd: string, settings?: CustomizationSettingsSlice): Promise<CustomizationDashboard> {
		const dashboard = new CustomizationDashboard(cwd, settings);
		await dashboard.#reload();
		dashboard.#buildChrome();
		return dashboard;
	}

	get scope(): GjcScope {
		return this.#scope;
	}

	get section(): CustomizationSurface {
		return this.#section;
	}

	/** Current inventory snapshot (test-visible). */
	get inventory(): CustomizationInventory {
		return this.#inventory;
	}

	async #reload(): Promise<void> {
		const disabled = this.#settings?.get("disabledExtensions");
		this.#inventory = await loadCustomizationInventory({
			cwd: this.#cwd,
			disabledExtensions: Array.isArray(disabled) ? (disabled as string[]) : [],
		});
	}

	#buildChrome(): void {
		this.clear();
		this.#headerTexts = [];
		this.#lists.clear();

		this.addChild(new DynamicBorder());
		const title = new Text("", 0, 0);
		const scopeLine = new Text("", 0, 0);
		const tabs = new Text("", 0, 0);
		this.#headerTexts = [title, scopeLine, tabs];
		this.addChild(title);
		this.addChild(scopeLine);
		this.addChild(tabs);
		this.addChild(new DynamicBorder());

		this.#bodyContainer = new Container();
		for (const surface of CUSTOMIZATION_SURFACES) {
			const rows = this.#inventory.rows.filter(row => row.surface === surface);
			const items: SelectItem[] =
				rows.length > 0
					? rows.map(rowToSelectItem)
					: [
							{
								value: `${surface}:empty`,
								label: theme.fg("muted", `(no ${surfaceLabel(surface).toLowerCase()} configured)`),
								description: theme.fg("muted", "nothing configured at Project .gjc or Global .gjc yet"),
								disabled: true,
							},
						];
			const list = new SelectList(items, Math.min(Math.max(items.length, 1), 8), getSelectListTheme());
			list.onCancel = () => this.onClose?.();
			this.#lists.set(surface, list);
			if (surface === this.#section) this.#bodyContainer.addChild(list);
		}
		this.addChild(this.#bodyContainer);

		this.addChild(new DynamicBorder());
		this.#footerText = new Text("", 0, 0);
		this.addChild(this.#footerText);
		this.addChild(new DynamicBorder());
		this.#refreshChrome();
	}

	#refreshChrome(): void {
		const [title, scopeLine, tabs] = this.#headerTexts;
		title.setText(
			theme.bold(theme.fg("accent", "/extensions")) + theme.fg("muted", " — Configure skills, hooks, and MCPs."),
		);
		const other: GjcScope = this.#scope === "project" ? "global" : "project";
		scopeLine.setText(
			`${theme.fg("muted", "destination:")} ${theme.bold(scopeLabel(this.#scope))}  ${theme.fg("muted", `(s: switch to ${scopeLabel(other)})`)}`,
		);
		const tabLine = CUSTOMIZATION_SURFACES.map(surface =>
			surface === this.#section
				? theme.bold(theme.fg("accent", `[${surfaceLabel(surface)}]`))
				: ` ${surfaceLabel(surface)} `,
		).join(theme.fg("muted", "│"));
		tabs.setText(tabLine);
		const warnings = this.#inventory.warnings.length;
		const status = this.#statusMessage ? ` · ${theme.fg("accent", replaceTabs(this.#statusMessage))}` : "";
		const confirm = this.#confirmRemove
			? ` · ${theme.fg("warning", `remove ${this.#confirmRemove.displayName}? y/n`)}`
			: "";
		this.#footerText.setText(
			theme.fg(
				"muted",
				`↑/↓ navigate · ←/→ section · s scope · e enable/disable · x remove · i import · esc close${
					warnings > 0 ? ` · ${theme.fg("warning", `${warnings} diagnostic${warnings === 1 ? "" : "s"}`)}` : ""
				}${confirm}${status}`,
			),
		);
	}

	#selectedRow(): InventoryRow | null {
		const selected = this.#lists.get(this.#section)?.getSelectedItem();
		if (!selected || selected.disabled) return null;
		return this.#inventory.rows.find(row => `${row.surface}:${row.scope}:${row.name}` === selected.value) ?? null;
	}

	/** Rows discovered outside the canonical .gjc scopes are import sources, not managed entries. */
	#isForeignRow(row: InventoryRow): boolean {
		return row.provenance.includes("import to manage");
	}

	async #applyMutation(action: () => Promise<{ ok: true } | { ok: false; reason: string }>): Promise<void> {
		const result = await action();
		this.#statusMessage = result.ok ? "done — reloaded inventory" : result.reason;
		await this.#reload();
		this.#buildChrome();
		this.onRequestRender?.();
	}

	async #toggleSelected(): Promise<void> {
		const row = this.#selectedRow();
		if (!row) return;
		if (this.#isForeignRow(row)) {
			this.#statusMessage = "foreign entries are import sources — use i to import, not managed in place";
			this.#refreshChrome();
			this.onRequestRender?.();
			return;
		}
		if (row.status === "invalid" || row.status === "shadowed" || row.status === "quarantined") {
			this.#statusMessage = `cannot toggle a ${row.status} entry; resolve its diagnostics first`;
			this.#refreshChrome();
			this.onRequestRender?.();
			return;
		}
		const enable = row.status === "disabled";
		const paths = resolveScopePaths(row.scope, this.#cwd);
		if (row.surface === "skills") {
			await this.#applyMutation(() => setSkillEnabled(paths, row.name, enable));
		} else if (row.surface === "mcps") {
			await this.#applyMutation(() => setMcpServerEnabled(paths.mcpConfigPath, row.name, enable));
		} else {
			this.#statusMessage = "hook enable/disable is not part of the canonical hook contract; remove instead";
			this.#refreshChrome();
			this.onRequestRender?.();
		}
	}

	#beginRemove(): void {
		const row = this.#selectedRow();
		if (!row) return;
		if (this.#isForeignRow(row)) {
			this.#statusMessage = "foreign entries are import sources — use i to import, not managed in place";
			this.#refreshChrome();
			this.onRequestRender?.();
			return;
		}
		this.#confirmRemove = row;
		this.#refreshChrome();
		this.onRequestRender?.();
	}

	async #confirmRemoveSelected(): Promise<void> {
		const row = this.#confirmRemove;
		this.#confirmRemove = null;
		if (!row) return;
		const paths = resolveScopePaths(row.scope, this.#cwd);
		if (row.surface === "skills") {
			await this.#applyMutation(() => removeSkill(paths, row.name));
		} else if (row.surface === "mcps") {
			await this.#applyMutation(() => removeMcpServerEntry(paths.mcpConfigPath, row.name));
		} else {
			const fileName = row.path.split("/").pop() ?? row.name;
			await this.#applyMutation(() => removeHookFile(paths, fileName));
		}
	}

	#openImportWizard(): void {
		const wizard = new ImportWizard(this.#cwd, this.#scope);
		this.#wizard = wizard;
		wizard.onRequestRender = () => this.onRequestRender?.();
		wizard.onClose = applied => {
			this.#wizard = null;
			this.#bodyContainer.clear();
			const list = this.#lists.get(this.#section);
			if (list) this.#bodyContainer.addChild(list);
			if (applied) {
				this.#statusMessage = "import applied — reloaded inventory";
				void this.#reload().then(() => {
					this.#buildChrome();
					this.onRequestRender?.();
				});
			} else {
				this.#refreshChrome();
				this.onRequestRender?.();
			}
		};
		this.#bodyContainer.clear();
		this.#bodyContainer.addChild(wizard);
		this.#statusMessage = null;
		this.onRequestRender?.();
	}

	#switchSection(next: CustomizationSurface): void {
		if (next === this.#section) return;
		this.#section = next;
		this.#bodyContainer.clear();
		const list = this.#lists.get(next);
		if (list) this.#bodyContainer.addChild(list);
		this.#refreshChrome();
		this.onRequestRender?.();
	}

	#switchScope(): void {
		this.#scope = this.#scope === "project" ? "global" : "project";
		this.#refreshChrome();
		this.onRequestRender?.();
	}

	#cycleSection(direction: 1 | -1): void {
		const index = CUSTOMIZATION_SURFACES.indexOf(this.#section);
		const next =
			CUSTOMIZATION_SURFACES[(index + direction + CUSTOMIZATION_SURFACES.length) % CUSTOMIZATION_SURFACES.length];
		this.#switchSection(next);
	}

	handleInput(keyData: string): void {
		if (this.#wizard) {
			this.#wizard.handleInput(keyData);
			return;
		}
		if (this.#confirmRemove) {
			if (keyData === "y") {
				void this.#confirmRemoveSelected();
			} else {
				this.#confirmRemove = null;
				this.#statusMessage = "remove cancelled";
				this.#refreshChrome();
				this.onRequestRender?.();
			}
			return;
		}
		if (matchesAppInterrupt(keyData)) {
			this.onClose?.();
			return;
		}
		if (matchesKey(keyData, "left")) {
			this.#cycleSection(-1);
			return;
		}
		if (matchesKey(keyData, "right")) {
			this.#cycleSection(1);
			return;
		}
		if (keyData === "s") {
			this.#switchScope();
			return;
		}
		if (keyData === "e") {
			void this.#toggleSelected();
			return;
		}
		if (keyData === "x") {
			this.#beginRemove();
			return;
		}
		if (keyData === "i") {
			this.#openImportWizard();
			return;
		}
		if (keyData === "q") {
			this.onClose?.();
			return;
		}
		this.#lists.get(this.#section)?.handleInput(keyData);
	}

	override render(width: number): string[] {
		// Narrow-terminal guard: keep every chrome line inside the viewport.
		if (width < 24) {
			return [truncateToWidth(theme.fg("muted", "/extensions: terminal too narrow"), width)];
		}
		return super.render(width);
	}
}
