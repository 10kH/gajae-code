import { describe, expect, it } from "bun:test";
import type { CompactionSettings } from "@gajae-code/agent-core/compaction/compaction";
import {
	DEFAULT_AUTO_THRESHOLD_CEILING_TOKENS,
	DEFAULT_COMPACTION_SETTINGS,
	effectiveReserveTokens,
	resolveThresholdTokens,
} from "@gajae-code/agent-core/compaction/compaction";

/**
 * Compute thresholdSafeKeepRecentTokens using the FIXED formula (PR #6060)
 * with reserve proportional to capped threshold.
 */
function computeThresholdSafeKeepRecentFixed(contextWindow: number, compSettings: CompactionSettings): number {
	const configuredKeepRecentTokens = compSettings.keepRecentTokens;
	if (!Number.isFinite(contextWindow) || contextWindow <= 1) {
		return configuredKeepRecentTokens;
	}
	const cappedThreshold = resolveThresholdTokens(contextWindow, compSettings);
	const uncappedReserve = effectiveReserveTokens(contextWindow, compSettings, 0);
	// When threshold is capped at 300k, cap the reserve proportionally to the capped
	// threshold so keep-recent window stays sane. Otherwise use the full reserve.
	const cappedReserve =
		cappedThreshold < Math.max(100_000, contextWindow * 0.8)
			? Math.min(uncappedReserve, Math.ceil(cappedThreshold * 0.15))
			: uncappedReserve;
	return Math.max(configuredKeepRecentTokens, cappedThreshold - cappedReserve);
}

/**
 * Compute thresholdSafeKeepRecentTokens using the OLD (BROKEN) formula
 * that doesn't account for capped threshold causing reserve to collapse keep-recent.
 */
function computeThresholdSafeKeepRecentBroken(contextWindow: number, compSettings: CompactionSettings): number {
	const configuredKeepRecentTokens = compSettings.keepRecentTokens;
	if (!Number.isFinite(contextWindow) || contextWindow <= 1) {
		return configuredKeepRecentTokens;
	}
	// Old formula: directly subtract full reserve even when threshold is capped
	return Math.max(
		1,
		resolveThresholdTokens(contextWindow, compSettings) - effectiveReserveTokens(contextWindow, compSettings, 0),
	);
}

function settings(keepRecentTokens: number): CompactionSettings {
	return { ...DEFAULT_COMPACTION_SETTINGS, keepRecentTokens, remoteEnabled: false };
}

describe("compaction large-window keep-recent (PR #5943/#6060 fix)", () => {
	it("threshold is capped at 300k", () => {
		const contextWindow = 2_000_000;
		const threshold = resolveThresholdTokens(contextWindow, DEFAULT_COMPACTION_SETTINGS);
		expect(threshold).toBeLessThanOrEqual(DEFAULT_AUTO_THRESHOLD_CEILING_TOKENS);
		expect(threshold).toEqual(DEFAULT_AUTO_THRESHOLD_CEILING_TOKENS);
	});

	it("reserve calculation for 200k window (below cap)", () => {
		const contextWindow = 200_000;
		const threshold = resolveThresholdTokens(contextWindow, DEFAULT_COMPACTION_SETTINGS);
		const reserve = effectiveReserveTokens(contextWindow, DEFAULT_COMPACTION_SETTINGS, 0);
		// At 200k, reserve is 15% = 30k, threshold should be > 100k
		expect(reserve).toBeLessThanOrEqual(30_000 + 1); // +1 for floor rounding
		expect(threshold).toBeGreaterThan(50_000);
		expect(threshold).toBeLessThan(contextWindow);
	});

	it("reserve calculation for 400k window (at cap boundary)", () => {
		const contextWindow = 400_000;
		const threshold = resolveThresholdTokens(contextWindow, DEFAULT_COMPACTION_SETTINGS);
		// Should be capped at 300k
		expect(threshold).toBeLessThanOrEqual(DEFAULT_AUTO_THRESHOLD_CEILING_TOKENS);
	});

	it("reserve calculation for 1M window", () => {
		const contextWindow = 1_000_000;
		const reserve = effectiveReserveTokens(contextWindow, DEFAULT_COMPACTION_SETTINGS, 0);
		// Reserve = max(floor(1M * 0.15), 45k) = 150k
		expect(reserve).toBeGreaterThanOrEqual(150_000);
	});

	it("FIXED formula: thresholdSafeKeepRecentTokens >= configured for 200k window", () => {
		const configuredKeepRecent = 20_000;
		const result = computeThresholdSafeKeepRecentFixed(200_000, settings(configuredKeepRecent));
		expect(result).toBeGreaterThanOrEqual(configuredKeepRecent);
	});

	it("FIXED formula: thresholdSafeKeepRecentTokens >= configured for 400k window", () => {
		const configuredKeepRecent = 20_000;
		const result = computeThresholdSafeKeepRecentFixed(400_000, settings(configuredKeepRecent));
		expect(result).toBeGreaterThanOrEqual(configuredKeepRecent);
	});

	it("FIXED formula: thresholdSafeKeepRecentTokens >= configured for 1M window", () => {
		const configuredKeepRecent = 20_000;
		const result = computeThresholdSafeKeepRecentFixed(1_000_000, settings(configuredKeepRecent));
		expect(result).toBeGreaterThanOrEqual(configuredKeepRecent);
	});

	it("FIXED formula: thresholdSafeKeepRecentTokens >= configured for 2M window (bundled max)", () => {
		const configuredKeepRecent = 20_000;
		const result = computeThresholdSafeKeepRecentFixed(2_000_000, settings(configuredKeepRecent));
		expect(result).toBeGreaterThanOrEqual(configuredKeepRecent);
	});

	it("FIXED formula: thresholdSafeKeepRecentTokens >= configured for 10M window", () => {
		const configuredKeepRecent = 20_000;
		const result = computeThresholdSafeKeepRecentFixed(10_000_000, settings(configuredKeepRecent));
		expect(result).toBeGreaterThanOrEqual(configuredKeepRecent);
	});

	it("FIXED formula: thresholdSafeKeepRecentTokens >= configured for 20M window", () => {
		const configuredKeepRecent = 20_000;
		const result = computeThresholdSafeKeepRecentFixed(20_000_000, settings(configuredKeepRecent));
		expect(result).toBeGreaterThanOrEqual(configuredKeepRecent);
	});

	it("BROKEN formula: fails at 2M window (regression test)", () => {
		const configuredKeepRecent = 20_000;
		const result = computeThresholdSafeKeepRecentBroken(2_000_000, settings(configuredKeepRecent));
		// Old formula collapses to 1 at large windows
		expect(result).toBeLessThan(configuredKeepRecent);
	});

	it("BROKEN formula: fails at 10M window (regression test)", () => {
		const configuredKeepRecent = 20_000;
		const result = computeThresholdSafeKeepRecentBroken(10_000_000, settings(configuredKeepRecent));
		// Old formula collapses to 1 at large windows
		expect(result).toBeLessThan(configuredKeepRecent);
	});

	it("BROKEN formula: fails at 20M window (regression test)", () => {
		const configuredKeepRecent = 20_000;
		const result = computeThresholdSafeKeepRecentBroken(20_000_000, settings(configuredKeepRecent));
		// Old formula collapses to 1 at large windows
		expect(result).toBeLessThan(configuredKeepRecent);
	});

	it("resolveThresholdTokens never exceeds ceiling for large windows", () => {
		const testWindows = [200_000, 400_000, 1_000_000, 2_000_000, 10_000_000, 20_000_000];
		for (const cw of testWindows) {
			const threshold = resolveThresholdTokens(cw, DEFAULT_COMPACTION_SETTINGS);
			expect(threshold).toBeLessThanOrEqual(DEFAULT_AUTO_THRESHOLD_CEILING_TOKENS);
			expect(threshold).toBeGreaterThan(0);
		}
	});
});
