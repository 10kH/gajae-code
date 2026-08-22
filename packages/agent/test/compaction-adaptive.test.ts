import { describe, expect, it } from "bun:test";
import type { AdaptiveCompactionOptions } from "../src/compaction/adaptive";
import {
	type CompactionSettings,
	computeAdaptiveThresholdPercent,
	DEFAULT_COMPACTION_SETTINGS,
	resolveThresholdTokens,
	shouldCompact,
} from "../src/compaction/compaction";

const adaptiveOptions: AdaptiveCompactionOptions = {
	enabled: true,
	turnWindow: 15,
	baseThresholdPercent: 85,
	aggression: 0.5,
	minThresholdPercent: 50,
};

const adaptiveSettings: CompactionSettings = {
	...DEFAULT_COMPACTION_SETTINGS,
	thresholdPercent: 85,
	adaptive: adaptiveOptions,
};

describe("adaptive compaction threshold", () => {
	it("keeps the legacy threshold when adaptive is disabled", () => {
		const settings: CompactionSettings = {
			...adaptiveSettings,
			adaptive: { ...adaptiveOptions, enabled: false },
		};

		expect(resolveThresholdTokens(100_000, settings)).toBe(85_000);
		expect(shouldCompact(84_000, 100_000, settings)).toBe(false);
		expect(shouldCompact(86_000, 100_000, settings)).toBe(true);
	});

	it("lowers the effective threshold when context is large and call rate is high", () => {
		const lowRate = computeAdaptiveThresholdPercent(
			85,
			80_000,
			100_000,
			{
				turnsSinceCompact: 20,
				callsInWindow: 1,
			},
			adaptiveOptions,
		);
		const highRate = computeAdaptiveThresholdPercent(
			85,
			80_000,
			100_000,
			{
				turnsSinceCompact: 20,
				callsInWindow: 60,
			},
			adaptiveOptions,
		);

		expect(highRate).toBeLessThan(lowRate);
		expect(
			resolveThresholdTokens(100_000, {
				...adaptiveSettings,
				adaptiveState: { turnsSinceCompact: 20, callsInWindow: 60 },
			}),
		).toBeLessThan(
			resolveThresholdTokens(100_000, {
				...adaptiveSettings,
				adaptiveState: { turnsSinceCompact: 20, callsInWindow: 1, lastContextTokens: 80_000 },
			}),
		);
	});

	it("can trigger below the static threshold but suppresses immediate re-fires", () => {
		const hotSessionSettings: CompactionSettings = {
			...adaptiveSettings,
			adaptiveState: { turnsSinceCompact: 20, callsInWindow: 60 },
		};
		const justCompactedSettings: CompactionSettings = {
			...adaptiveSettings,
			adaptiveState: { turnsSinceCompact: 2, callsInWindow: 60 },
		};

		expect(shouldCompact(76_000, 100_000, hotSessionSettings)).toBe(true);
		expect(shouldCompact(76_000, 100_000, justCompactedSettings)).toBe(false);
	});

	it("gives thresholdTokens precedence for backward compatibility", () => {
		expect(
			resolveThresholdTokens(100_000, {
				...adaptiveSettings,
				thresholdTokens: 90_000,
				adaptiveState: { turnsSinceCompact: 20, callsInWindow: 60 },
			}),
		).toBe(90_000);
	});
});
