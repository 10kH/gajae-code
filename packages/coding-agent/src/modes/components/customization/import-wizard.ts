/**
 * ImportWizard — the guided Import-from-Claude-Code/Codex flow inside the
 * `/extensions` dashboard (issue #4291).
 *
 * Steps: source product → source scope → surfaces → collision policy →
 * normalized preview → apply result. The preview step is explicit-confirmation
 * only: Enter applies (journaled, rollback on failure), Esc cancels without
 * writing anything. Secret values never appear in any rendered line — the
 * preview only carries redacted descriptions from `buildImportPreview`.
 */
import * as os from "node:os";
import { Container, type SelectItem, SelectList, Text } from "@gajae-code/tui";
import { applyImport, type BuildImportPreviewOptions, buildImportPreview } from "../../../customization/import";
import type {
	CustomizationSurface,
	GjcScope,
	ImportCollisionPolicy,
	ImportPreview,
	ImportProduct,
	ImportResult,
	ImportSourceScope,
} from "../../../customization/types";
import {
	IMPORT_PRODUCTS,
	IMPORT_SOURCE_SCOPES,
	productLabel,
	scopeLabel,
	sourceScopeLabel,
	surfaceLabel,
} from "../../../customization/types";
import { replaceTabs, truncateToWidth } from "../../../tools/render-utils";
import { getSelectListTheme, theme } from "../../theme/theme";
import { matchesAppInterrupt } from "../../utils/keybinding-matchers";
import { DynamicBorder } from "../dynamic-border";

type WizardStep = "product" | "sourceScope" | "surfaces" | "collision" | "preview" | "result";

const SURFACE_CHOICES: Array<{ value: string; label: string; surfaces: CustomizationSurface[] }> = [
	{ value: "all", label: "Skills + Hooks + MCPs", surfaces: ["skills", "hooks", "mcps"] },
	{ value: "skills", label: "Skills only", surfaces: ["skills"] },
	{ value: "hooks", label: "Hooks only", surfaces: ["hooks"] },
	{ value: "mcps", label: "MCPs only", surfaces: ["mcps"] },
];

const COLLISION_CHOICES: Array<{ value: ImportCollisionPolicy; hint: string }> = [
	{ value: "skip", hint: "keep existing .gjc entries; conflicting sources are skipped" },
	{ value: "rename", hint: "conflicting sources import under an -imported suffix" },
	{ value: "overwrite", hint: "replace existing .gjc entries (explicit, never silent)" },
];

export class ImportWizard extends Container {
	/** Called when the wizard finishes or is cancelled; `applied` is true when an import ran. */
	onClose: ((applied: boolean) => void) | undefined;
	onRequestRender: (() => void) | undefined;

	#cwd: string;
	#homeDir: string;
	#destinationScope: GjcScope;
	#step: WizardStep = "product";
	#product: ImportProduct = "claude-code";
	#sourceScope: ImportSourceScope = "project";
	#surfaces: CustomizationSurface[] = ["skills", "hooks", "mcps"];
	#collisionPolicy: ImportCollisionPolicy = "skip";
	#preview: ImportPreview | null = null;
	#result: ImportResult | null = null;
	#applied = false;

	#headerText: Text;
	#selectList: SelectList | null = null;
	#bodyText: Text;
	#footerText: Text;

	constructor(cwd: string, destinationScope: GjcScope, homeDir?: string) {
		super();
		this.#cwd = cwd;
		this.#destinationScope = destinationScope;
		this.#homeDir = homeDir ?? os.homedir();

		this.addChild(new DynamicBorder());
		this.#headerText = new Text("", 0, 0);
		this.addChild(this.#headerText);
		this.addChild(new DynamicBorder());
		this.#bodyText = new Text("", 0, 0);
		this.addChild(this.#bodyText);
		this.addChild(new DynamicBorder());
		this.#footerText = new Text("", 0, 0);
		this.addChild(this.#footerText);
		this.addChild(new DynamicBorder());
		this.#renderStep();
	}

	/** Current step (test-visible). */
	get step(): WizardStep {
		return this.#step;
	}

	/** Last built preview (test-visible). */
	get preview(): ImportPreview | null {
		return this.#preview;
	}

	/** Last apply result (test-visible). */
	get result(): ImportResult | null {
		return this.#result;
	}

	#previewOptions(): BuildImportPreviewOptions {
		return {
			product: this.#product,
			sourceScope: this.#sourceScope,
			destinationScope: this.#destinationScope,
			surfaces: this.#surfaces,
			collisionPolicy: this.#collisionPolicy,
			cwd: this.#cwd,
			homeDir: this.#homeDir,
		};
	}

	#setSelectStep(title: string, items: SelectItem[], onSelect: (value: string) => void): void {
		this.#selectList = new SelectList(items, Math.min(items.length, 8), getSelectListTheme());
		this.#selectList.onSelect = item => onSelect(item.value);
		this.#selectList.onCancel = () => this.onClose?.(this.#applied);
		this.#headerText.setText(theme.bold(theme.fg("accent", title)));
		this.#bodyText.setText("");
		this.#footerText.setText(theme.fg("muted", "↑/↓ navigate · enter select · esc cancel"));
		this.#requestRender();
	}

	#renderStep(): void {
		switch (this.#step) {
			case "product":
				this.#setSelectStep(
					`Import into ${scopeLabel(this.#destinationScope)} — choose source product`,
					IMPORT_PRODUCTS.map(product => ({ value: product, label: productLabel(product) })),
					value => {
						this.#product = value as ImportProduct;
						this.#step = "sourceScope";
						this.#renderStep();
					},
				);
				break;
			case "sourceScope":
				this.#setSelectStep(
					`Import from ${productLabel(this.#product)} — choose source scope`,
					IMPORT_SOURCE_SCOPES.map(scope => ({
						value: scope,
						label: sourceScopeLabel(scope),
						description:
							scope === "user"
								? "explicit selection required; nothing is scanned or injected automatically"
								: "current trusted project convention roots only",
					})),
					value => {
						this.#sourceScope = value as ImportSourceScope;
						this.#step = "surfaces";
						this.#renderStep();
					},
				);
				break;
			case "surfaces":
				this.#setSelectStep(
					"Choose surfaces to import",
					SURFACE_CHOICES.map(choice => ({ value: choice.value, label: choice.label })),
					value => {
						this.#surfaces = SURFACE_CHOICES.find(choice => choice.value === value)?.surfaces ?? this.#surfaces;
						this.#step = "collision";
						this.#renderStep();
					},
				);
				break;
			case "collision":
				this.#setSelectStep(
					"Collision policy for existing .gjc entries",
					COLLISION_CHOICES.map(choice => ({
						value: choice.value,
						label: choice.value,
						description: choice.hint,
					})),
					value => {
						this.#collisionPolicy = value as ImportCollisionPolicy;
						void this.#buildPreview();
					},
				);
				break;
			case "preview":
			case "result":
				break;
		}
	}

	async #buildPreview(): Promise<void> {
		this.#selectList = null;
		this.#headerText.setText(theme.fg("muted", "Reading source configuration…"));
		this.#requestRender();
		this.#preview = await buildImportPreview(this.#previewOptions());
		this.#step = "preview";
		this.#renderPreview();
	}

	#renderPreview(): void {
		const preview = this.#preview;
		if (!preview) return;
		const lines: string[] = [];
		const writable = preview.entries.filter(
			e => e.status === "add" || e.status === "overwrite" || e.status === "redacted",
		);
		const skipped = preview.entries.filter(e => e.status === "conflict" || e.status === "unsupported");
		lines.push(
			`${theme.bold("Preview:")} ${productLabel(preview.product)} ${sourceScopeLabel(preview.sourceScope)} → ${scopeLabel(preview.destinationScope)} · policy: ${this.#collisionPolicy}`,
		);
		lines.push("");
		if (preview.entries.length === 0) {
			lines.push(theme.fg("muted", "(nothing found to import at the selected source)"));
		}
		for (const entry of preview.entries.slice(0, 12)) {
			const statusColor =
				entry.status === "add"
					? theme.fg("success", "+")
					: entry.status === "overwrite"
						? theme.fg("warning", "!")
						: entry.status === "redacted"
							? theme.fg("accent", "+")
							: theme.fg("muted", "-");
			const name =
				entry.destinationName === entry.sourceName
					? entry.sourceName
					: `${entry.sourceName} → ${entry.destinationName}`;
			lines.push(
				` ${statusColor} ${surfaceLabel(entry.surface)}: ${replaceTabs(name)}${entry.reason ? theme.fg("muted", ` — ${replaceTabs(entry.reason)}`) : ""}`,
			);
		}
		if (preview.entries.length > 12) {
			lines.push(theme.fg("muted", ` … ${preview.entries.length - 12} more`));
		}
		for (const warning of preview.warnings.slice(0, 4)) {
			lines.push(theme.fg("warning", ` ⚠ ${replaceTabs(warning)}`));
		}
		this.#headerText.setText(theme.bold(theme.fg("accent", "Confirm import")));
		this.#bodyText.setText(lines.join("\n"));
		this.#footerText.setText(
			theme.fg(
				"muted",
				`enter: apply ${writable.length} entr${writable.length === 1 ? "y" : "ies"} (${skipped.length} skipped) · esc: cancel (no writes)`,
			),
		);
		this.#requestRender();
	}

	async #apply(): Promise<void> {
		if (!this.#preview) return;
		this.#footerText.setText(theme.fg("muted", "Applying import…"));
		this.#requestRender();
		this.#result = await applyImport(this.#preview, { cwd: this.#cwd });
		this.#applied = true;
		this.#step = "result";
		const counts = new Map<string, number>();
		for (const entry of this.#result.entries) {
			counts.set(entry.outcome, (counts.get(entry.outcome) ?? 0) + 1);
		}
		const summary = [...counts.entries()].map(([outcome, count]) => `${count} ${outcome}`).join(", ");
		this.#headerText.setText(
			this.#result.ok
				? theme.bold(theme.fg("success", "Import complete"))
				: theme.bold(theme.fg("error", "Import failed — rolled back, no partial import")),
		);
		const failed = this.#result.entries.filter(e => e.outcome === "failed").slice(0, 5);
		this.#bodyText.setText(
			[
				summary,
				"",
				...failed.map(e =>
					theme.fg("error", ` ✗ ${e.surface}: ${replaceTabs(e.sourceName)} — ${replaceTabs(e.reason ?? "")}`),
				),
				...(this.#result.ok
					? [theme.fg("muted", "Imported entries take effect after the documented reload/new-session boundary.")]
					: []),
			].join("\n"),
		);
		this.#footerText.setText(theme.fg("muted", "enter/esc: close"));
		this.#requestRender();
	}

	#requestRender(): void {
		this.onRequestRender?.();
	}

	handleInput(keyData: string): void {
		if (matchesAppInterrupt(keyData)) {
			this.onClose?.(this.#applied);
			return;
		}
		if (this.#step === "preview") {
			if (keyData === "\r" || keyData === "\n") {
				void this.#apply();
			}
			return;
		}
		if (this.#step === "result") {
			this.onClose?.(this.#applied);
			return;
		}
		this.#selectList?.handleInput(keyData);
	}

	override render(width: number): string[] {
		if (width < 24) {
			return [truncateToWidth(theme.fg("muted", "import: terminal too narrow"), width)];
		}
		return super.render(width);
	}
}
