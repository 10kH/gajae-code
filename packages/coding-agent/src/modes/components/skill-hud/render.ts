import { truncateToWidth, visibleWidth } from "@gajae-code/tui";
import {
	collapsePlanningPipeline,
	type SkillActiveEntry,
	type WorkflowHudChip,
} from "../../../skill-state/active-state";
import { workflowReceiptStatus } from "../../../skill-state/workflow-state-contract";
import { theme } from "../../theme/theme";

const ANSI_PATTERN = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;

type WidthTier = "wide" | "medium" | "tight";

function color(role: "border" | "accent" | "dim" | "muted" | "warning" | "error", text: string): string {
	return theme?.fg(role, text) ?? text;
}

function statusSymbol(kind: "warning" | "error"): string {
	return theme?.status[kind] ?? (kind === "error" ? "[!!]" : "[!]");
}

function sanitizeHudPart(value: string | undefined): string {
	return (value ?? "")
		.replace(ANSI_PATTERN, "")
		.replace(/[\r\n\t]+/g, " ")
		.trim();
}

function compareEntries(a: SkillActiveEntry, b: SkillActiveEntry): number {
	return a.skill.localeCompare(b.skill) || (a.phase ?? "").localeCompare(b.phase ?? "");
}

function compareChips(a: WorkflowHudChip, b: WorkflowHudChip): number {
	return (a.priority ?? 50) - (b.priority ?? 50) || a.label.localeCompare(b.label);
}

function tierForWidth(width: number): WidthTier {
	return width >= 100 ? "wide" : width >= 60 ? "medium" : "tight";
}

function severityOf(chip: WorkflowHudChip): "error" | "warning" | undefined {
	return chip.severity === "error" || chip.severity === "blocked"
		? "error"
		: chip.severity === "warning"
			? "warning"
			: undefined;
}

function severityGlyph(severity: WorkflowHudChip["severity"]): string {
	if (severity === "error" || severity === "blocked") return color("error", statusSymbol("error"));
	if (severity === "warning") return color("warning", statusSymbol("warning"));
	return "";
}

function formatChip(chip: WorkflowHudChip): string | null {
	const label = sanitizeHudPart(chip.label);
	const value = sanitizeHudPart(chip.value);
	if (!label) return null;
	const body = value ? `${label}=${value}` : label;
	const role = severityOf(chip);
	return role ? color(role, body) : color("dim", body);
}

function keyMetricChip(skill: string, chips: readonly WorkflowHudChip[]): WorkflowHudChip | undefined {
	const preferredBySkill: Record<string, readonly string[]> = {
		"deep-interview": ["ambiguity"],
		ralplan: ["iter", "round", "stage"],
		ultragoal: ["goals", "current"],
		autoresearch: ["exp", "experiments"],
	};
	const preferred = preferredBySkill[skill] ?? [];
	return (
		preferred.map(label => chips.find(chip => chip.label === label && !severityOf(chip))).find(Boolean) ??
		chips.find(chip => !severityOf(chip))
	);
}

function fitWithSuffix(prefix: string, suffix: string, width: number): string {
	if (width <= 0) return "";
	if (!suffix) return truncateToWidth(prefix, width);
	const suffixWidth = visibleWidth(suffix);
	if (suffixWidth >= width) return truncateToWidth(suffix, width);
	return `${truncateToWidth(prefix, width - suffixWidth)}${suffix}`;
}

function formatEntry(entry: SkillActiveEntry, tier: WidthTier, width: number): string {
	const skill = sanitizeHudPart(entry.skill);
	const phase = sanitizeHudPart(entry.phase);
	const base = phase ? `${skill}:${phase}` : skill;
	const chips = [...(entry.hud?.chips ?? [])].sort(compareChips);
	if (entry.stale === true) chips.unshift({ label: "stale", priority: 0, severity: "warning" });
	if (workflowReceiptStatus(entry.receipt) === "stale") {
		chips.unshift({ label: "receipt", value: "stale", priority: 1, severity: "warning" });
	}

	const severity =
		chips.find(chip => chip.severity === "error" || chip.severity === "blocked")?.severity ??
		chips.find(chip => chip.severity === "warning")?.severity;
	const suffix = severity ? ` ${severityGlyph(severity)}` : "";
	if (tier === "tight") return fitWithSuffix(color("accent", skill), suffix, width);

	const metric = keyMetricChip(skill, chips);
	if (tier === "medium") {
		const prefix = [color("accent", base), metric ? formatChip(metric) : ""].filter(Boolean).join(" ");
		return fitWithSuffix(prefix, suffix, width);
	}

	const summary = sanitizeHudPart(entry.hud?.summary);
	const details = chips.map(formatChip).filter((chip): chip is string => Boolean(chip));
	const prefix = [color("accent", base), summary ? color("muted", summary) : "", ...details].filter(Boolean).join(" ");
	return fitWithSuffix(prefix, suffix, width);
}

export function renderSkillHudBar(entries: readonly SkillActiveEntry[], width: number): string | null {
	const visible = collapsePlanningPipeline(entries.filter(entry => entry.active !== false));
	const active = visible.filter(entry => sanitizeHudPart(entry.skill)).sort(compareEntries);
	if (active.length === 0 || width <= 0) return null;

	const tier = tierForWidth(width);
	const rail = color("border", "◆");
	const separator = color("dim", " + ");
	const railPrefix = visibleWidth(rail) + 1 <= width ? `${rail} ` : "";
	const rows: string[] = [];
	let row = railPrefix;
	let hasEntry = false;
	let omitted = false;

	for (const entry of active) {
		const joiner = hasEntry ? separator : "";
		const budget = Math.max(0, width - visibleWidth(row) - visibleWidth(joiner));
		const fullRendered = formatEntry(entry, tier, 4096);
		let rendered = visibleWidth(fullRendered) <= budget ? fullRendered : "";
		if (!rendered) {
			if (!hasEntry) {
				row = "";
				rendered = formatEntry(entry, tier, width);
			} else if (rows.length === 0) {
				rows.push(truncateToWidth(row, width));
				row = railPrefix;
				hasEntry = false;
				const firstRowBudget = Math.max(0, width - visibleWidth(row));
				rendered = visibleWidth(fullRendered) <= firstRowBudget ? fullRendered : formatEntry(entry, tier, width);
			} else {
				omitted = true;
				break;
			}
		}
		if (!rendered) continue;
		row = `${row}${hasEntry ? separator : ""}${rendered}`;
		hasEntry = true;
	}

	if (hasEntry) rows.push(truncateToWidth(row, width));
	if (omitted && rows.length > 0) {
		const last = rows.length - 1;
		rows[last] = truncateToWidth(`${rows[last]}…`, width);
	}
	return rows.slice(0, 2).join("\n") || null;
}
