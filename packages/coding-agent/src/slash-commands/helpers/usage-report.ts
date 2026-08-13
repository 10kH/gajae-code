import type { UsageLimit } from "@gajae-code/ai/core";
import { sanitizeText } from "@gajae-code/utils";
import {
	type AccountInventoryRow,
	buildAccountInventorySnapshot,
	checkAccountInventory,
} from "../../session/account-inventory";
import { truncateHead } from "../../session/streaming-output";
import type { SlashCommandRuntime } from "../types";
import { formatDuration } from "./format";

function sanitizeAndTruncateOutput(text: string): string {
	const sanitized = sanitizeText(text);
	return truncateHead(sanitized, { maxBytes: 32_768, maxLines: 1_000 }).content;
}

function formatUsageAmount(limit: UsageLimit): string {
	const amount = limit.amount;
	const used = amount.used ?? (amount.usedFraction !== undefined ? amount.usedFraction * 100 : undefined);
	const remainingFraction =
		amount.remainingFraction ??
		(amount.usedFraction !== undefined ? Math.max(0, 1 - amount.usedFraction) : undefined);
	const unit = amount.unit === "percent" ? "%" : ` ${amount.unit}`;
	const usedText = used === undefined ? "unknown used" : `${used.toFixed(2)}${unit} used`;
	const remainingText = remainingFraction === undefined ? "" : ` (${(remainingFraction * 100).toFixed(1)}% left)`;
	return `${usedText}${remainingText}`;
}

function healthLabel(row: AccountInventoryRow): string {
	if (row.disabled) return `disabled${row.disabledCause ? `: ${row.disabledCause}` : ""}`;
	if (row.health.status === "ok") return "ok";
	if (row.health.status === "failed") return `failed${row.health.reason ? `: ${row.health.reason}` : ""}`;
	if (row.health.status === "unverifiable") return `unverifiable${row.health.reason ? `: ${row.health.reason}` : ""}`;
	return "unknown";
}

function renderAccountRows(rows: AccountInventoryRow[], nowMs: number, checked: boolean): string {
	const lines = [`Accounts${checked ? " (checked)" : " (cache only)"}`];
	if (rows.length === 0) {
		lines.push("No configured accounts or API-key sources discovered.");
		return lines.join("\n");
	}
	for (const row of rows) {
		const identity = row.identityLabel ? ` — ${row.identityLabel}` : "";
		const marker =
			row.routing.marker === "active" ? " [active]" : row.routing.marker === "selected" ? " [selected]" : "";
		const cache = row.usage
			? `, usage ${row.usage.freshness}${formatDuration(Math.max(0, nowMs - row.usage.fetchedAt)) ? ` ${formatDuration(Math.max(0, nowMs - row.usage.fetchedAt))} ago` : ""}`
			: "";
		lines.push(
			`- ${row.id}: ${row.provider}/${row.credentialKind} (${row.sourceLabel})${identity}${marker} — ${healthLabel(row)}${cache}`,
		);
		if (row.usage?.report.limits.length) {
			for (const limit of row.usage.report.limits.slice(0, 8)) {
				lines.push(`  ${sanitizeText(limit.label)}: ${formatUsageAmount(limit)}`);
			}
		}
	}
	return lines.join("\n");
}

function buildLegacyUsage(runtime: SlashCommandRuntime): string {
	const stats = runtime.session.sessionManager.getUsageStatistics();
	return [
		"Usage",
		`Input tokens: ${stats.input}`,
		`Output tokens: ${stats.output}`,
		`Cache read tokens: ${stats.cacheRead}`,
		`Cache write tokens: ${stats.cacheWrite}`,
		`Premium requests: ${stats.premiumRequests}`,
		`Cost: $${stats.cost.toFixed(6)}`,
	].join("\n");
}

export interface UsageReportOptions {
	check?: boolean;
}

/** Build `/usage`; plain mode is cache-only and never fetches or probes. */
export async function buildUsageReportText(
	runtime: SlashCommandRuntime,
	options: UsageReportOptions = {},
): Promise<string> {
	const session = runtime.session;
	const modelRegistry = session.modelRegistry;
	const input = {
		authStorage: modelRegistry.authStorage,
		modelRegistry,
		sessionId: session.credentialSessionId ?? session.sessionId,
	};
	const snapshot = options.check ? await checkAccountInventory(input) : buildAccountInventorySnapshot(input);
	const report = renderAccountRows(snapshot.rows, Date.now(), options.check === true);
	const legacy = buildLegacyUsage(runtime);

	return sanitizeAndTruncateOutput(`${report}\n\n${legacy}`);
}
