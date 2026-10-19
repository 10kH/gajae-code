import { expect, test } from "bun:test";
import { fuzzyMatch } from "@gajae-code/tui";

/**
 * Tests for model selector search ranking fix:
 * When a query is typed, models should be ordered by match quality (fuzzy score),
 * not by default-role rank, MRU, provider tier, or version.
 * Substring matches should rank above scattered subsequence matches regardless of MRU.
 */

test("fuzzyMatch: contiguous substring has lower score than scattered subsequence", () => {
	// "argon" as contiguous substring
	const contiguousMatch = fuzzyMatch("argon", "argon");
	// "argon" as scattered letters (a-r-g-o-n scattered throughout)
	const scatteredMatch = fuzzyMatch("argon", "anthropic-gpt-argon");

	// Lower score is better
	expect(contiguousMatch.matches).toBe(true);
	expect(scatteredMatch.matches).toBe(true);
	expect(contiguousMatch.score).toBeLessThan(scatteredMatch.score);
});

test("fuzzyMatch: word-boundary matches score better", () => {
	// "argon" at word boundary
	const boundaryMatch = fuzzyMatch("argon", "argon-mini");
	// "argon" scattered
	const scatteredMatch = fuzzyMatch("argon", "a-r-g-o-n-mini");

	expect(boundaryMatch.matches).toBe(true);
	expect(scatteredMatch.matches).toBe(true);
	expect(boundaryMatch.score).toBeLessThan(scatteredMatch.score);
});

test("fuzzyMatch: consecutive character matches reward bonus", () => {
	// Full consecutive sequence
	const consecutive = fuzzyMatch("test", "test");
	// Same letters but not consecutive
	const scattered = fuzzyMatch("test", "t-e-s-t");

	expect(consecutive.matches).toBe(true);
	expect(scattered.matches).toBe(true);
	expect(consecutive.score).toBeLessThan(scattered.score);
});

test("fuzzyMatch: gap penalty applies to non-consecutive matches", () => {
	// "abc" with small gap
	const smallGap = fuzzyMatch("abc", "a-b-c");
	// "abc" with large gap
	const largeGap = fuzzyMatch("abc", "a----b----c");

	expect(smallGap.matches).toBe(true);
	expect(largeGap.matches).toBe(true);
	expect(smallGap.score).toBeLessThan(largeGap.score);
});

test("fuzzyMatch: partial match followed by contiguous match ranks high", () => {
	// "gpt4" as scattered letters first
	const scattered = fuzzyMatch("gpt4", "great-powerful-transformer-4");
	// "gpt4" with contiguous substring
	const contiguous = fuzzyMatch("gpt4", "gpt-4");

	expect(scattered.matches).toBe(true);
	expect(contiguous.matches).toBe(true);
	expect(contiguous.score).toBeLessThan(scattered.score);
});
