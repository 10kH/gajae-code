import {
	collapsePlanningPipeline,
	type SkillActiveEntry,
	type WorkflowHudChip,
} from "../../../skill-state/active-state";
import { workflowReceiptStatus } from "../../../skill-state/workflow-state-contract";
import { theme } from "../../theme/theme";

const ANSI_PATTERN = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;

function color(role: "border" | "accent" | "dim" | "muted" | "warning" | "error", text: string): string {
	return theme?.fg(role, text) ?? text;
}

function statusSymbol(kind: "warning" | "error"): string {
	return theme?.status[kind] ?? (kind === "error" ? "[!!]" : "[!]");
}

type WidthTier = "wide" | "medium" | "tight";

function visibleWidth(text: string): number {
	return text.replace(ANSI_PATTERN, "").length;
}

function truncateToWidth(text: string, maxWidth: number): string {
	if (maxWidth <= 0) return "";
	if (visibleWidth(text) <= maxWidth) return text;
	const plain = text.replace(ANSI_PATTERN, "");
	return maxWidth === 1 ? "…" : `${plain.slice(0, maxWidth - 1)}…`;
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

function formatEntry(entry: SkillActiveEntry, tier: WidthTier): string {
	const skill = sanitizeHudPart(entry.skill);
	const phase = sanitizeHudPart(entry.phase);
	const base = phase ? `${skill}:${phase}` : skill;
	const chips = [...(entry.hud?.chips ?? [])].sort(compareChips);
	if (entry.stale === true) chips.unshift({ label: "stale", priority: 0, severity: "warning" });
	if (workflowReceiptStatus(entry.receipt) === "stale")
		chips.unshift({ label: "receipt", value: "stale", priority: 1, severity: "warning" });

	const severity =
		chips.find(chip => chip.severity === "error" || chip.severity === "blocked")?.severity ??
		chips.find(chip => chip.severity === "warning")?.severity;
	if (tier === "tight") return `${color("accent", skill)}${severityGlyph(severity)}`;
	const metric = chips.find(chip => !severityOf(chip));
	if (tier === "medium") {
		const metricText = metric ? formatChip(metric) : "";
		return [color("accent", base), metricText, severityGlyph(severity)].filter(Boolean).join(" ");
	}
	const summary = sanitizeHudPart(entry.hud?.summary);
	const details = chips.map(formatChip).filter((chip): chip is string => Boolean(chip));
	return [color("accent", base), summary ? color("muted", summary) : "", ...details, severityGlyph(severity)]
		.filter(Boolean)
		.join(" ");
}

export function renderSkillHudBar(entries: readonly SkillActiveEntry[], width: number): string | null {
	const visible = collapsePlanningPipeline(entries.filter(entry => entry.active !== false));
	const active = visible.filter(entry => sanitizeHudPart(entry.skill)).sort(compareEntries);
	if (active.length === 0 || width <= 0) return null;
	const tier = tierForWidth(width);
	const rail = color("border", "◆");
	const separator = color("dim", " + ");
	const lines: string[] = [];
	let current = rail;
	for (const entry of active) {
		const rendered = formatEntry(entry, tier);
		const candidate = current === rail ? `${current} ${rendered}` : `${current}${separator}${rendered}`;
		if (visibleWidth(candidate) <= width) {
			current = candidate;
		} else if (lines.length === 0) {
			lines.push(truncateToWidth(current, width));
			current = `${rail} ${rendered}`;
		} else {
			lines.push(truncateToWidth(`${current}…`, width));
			current = "";
			break;
		}
	}
	if (current.trim()) lines.push(truncateToWidth(current, width));
	if (lines.length > 2) {
		lines.length = 2;
		lines[1] = truncateToWidth(lines[1] ?? "", width);
	}
	return lines.join("\n");
}
