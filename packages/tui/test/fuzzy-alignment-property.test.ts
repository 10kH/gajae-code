import { describe, expect, it } from "bun:test";
import { fuzzyMatch } from "../src/fuzzy";

// Reference scorer: enumerates every alignment of the query in the text and
// applies the documented per-character rules, with the original word-boundary
// regex as the oracle for the boundary predicate.
const WORD_BOUNDARY = /[\s\-_./:]/;

function exhaustiveBestScore(queryLower: string, textLower: string): number {
	let best = Number.POSITIVE_INFINITY;
	const visit = (queryIndex: number, lastMatch: number, run: number, score: number): void => {
		if (queryIndex === queryLower.length) {
			best = Math.min(best, score);
			return;
		}
		for (let i = lastMatch + 1; i < textLower.length; i++) {
			if (textLower[i] !== queryLower[queryIndex]) continue;
			let next = score;
			let nextRun = 0;
			if (lastMatch === i - 1) {
				nextRun = run + 1;
				next -= nextRun * 5;
			} else if (lastMatch >= 0) {
				next += (i - lastMatch - 1) * 2;
			}
			if (i === 0 || WORD_BOUNDARY.test(textLower[i - 1]!)) next -= 10;
			next += i * 0.1;
			visit(queryIndex + 1, i, nextRun, next);
		}
	};
	visit(0, -1, 0, 0);
	return best;
}

describe("fuzzyMatch alignment", () => {
	it("scores generated query/text pairs exactly like an exhaustive alignment search", () => {
		let state = 0x7417;
		const next = () => {
			state = (Math.imul(state, 1_103_515_245) + 12_345) >>> 0;
			return state / 4_294_967_296;
		};
		// Repeated letters force competing alignments; every boundary class is present.
		// No digits, so the alphanumeric-swap fallback never runs and only the direct
		// alignment is compared.
		const textAlphabet = "abmod- /._:\t ";
		const queryAlphabet = "abmod";
		const pick = (alphabet: string, length: number) =>
			Array.from({ length }, () => alphabet[Math.floor(next() * alphabet.length)]).join("");

		let matched = 0;
		for (let iteration = 0; iteration < 5_000; iteration++) {
			const text = pick(textAlphabet, 1 + Math.floor(next() * 12));
			const query = pick(queryAlphabet, 1 + Math.floor(next() * 5));
			const expected = exhaustiveBestScore(query, text);
			const actual = fuzzyMatch(query, text);

			expect(actual.matches).toBe(expected !== Number.POSITIVE_INFINITY);
			if (!actual.matches) continue;
			matched++;
			expect(actual.score).toBeCloseTo(expected, 9);
		}
		// Guard against a generator that stops producing matches.
		expect(matched).toBeGreaterThan(500);
	});

	it("treats exactly the original boundary characters as word boundaries for every UTF-16 code unit", () => {
		for (let code = 0; code <= 0xffff; code++) {
			const text = `${String.fromCharCode(code)}b`;
			const textLower = text.toLowerCase();
			// Skip code units whose lowercase form is or contains the query letter.
			if (textLower.indexOf("b") !== textLower.length - 1) continue;
			const actual = fuzzyMatch("b", text);
			const expected = exhaustiveBestScore("b", textLower);
			if (Math.abs(actual.score - expected) > 1e-9) {
				throw new Error(
					`boundary mismatch at U+${code.toString(16).padStart(4, "0")}: ${actual.score} vs ${expected}`,
				);
			}
		}
	});
});
