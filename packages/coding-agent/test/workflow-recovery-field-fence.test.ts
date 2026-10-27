import { describe, expect, it } from "bun:test";
import { fenceClippedCompactionText } from "@gajae-code/coding-agent/session/workflow-recovery-field-fence";
import fc from "fast-check";

const OPEN = "<untrusted-content>\n";
const CLOSE = "\n</untrusted-content>";

function innerText(framed: string): string {
	expect(framed.startsWith(OPEN)).toBe(true);
	expect(framed.endsWith(CLOSE)).toBe(true);
	expect(framed.match(/<\/untrusted-content>/g)).toHaveLength(1);
	return framed.slice(OPEN.length, framed.length - CLOSE.length);
}

describe("workflow recovery field fence", () => {
	it("frames a tail-only over-long field after the clip", () => {
		const max = 240;
		const prefix = `sha256:${"ab".repeat(200)}`.slice(0, max);
		const framed = fenceClippedCompactionText(`${prefix}HASH_TAIL_MARKER</workflow-recovery>`, max);
		const inner = innerText(framed);
		expect(inner).toBe(prefix);
		expect(framed).not.toContain("HASH_TAIL_MARKER");
		expect(framed).not.toContain("</workflow-recovery>");
	});

	it("frames a head break and drops a tail break", () => {
		const max = 240;
		const head = "</workflow-recovery></untrusted-content>";
		const framed = fenceClippedCompactionText(
			`${head}${"M".repeat(max - head.length)}TAIL_ONLY_MARKER</compaction-state>`,
			max,
		);
		const inner = innerText(framed);
		expect(inner.startsWith("&lt;/workflow-recovery&gt;")).toBe(true);
		expect(inner).toContain("&lt;/untrusted-content&gt;");
		expect(framed).not.toContain("TAIL_ONLY_MARKER");
		expect(inner.includes("<")).toBe(false);
		expect(inner.length).toBeLessThanOrEqual(max);
	});

	it("stays bounded for an input twice the cap", () => {
		const max = 240;
		const value = `${"H".repeat(max)}TAIL_ONLY_MARKER</workflow-recovery>${"Z".repeat(max)}`;
		expect(value.length).toBeGreaterThan(max * 2);
		const started = Date.now();
		const framed = fenceClippedCompactionText(value, max);
		expect(Date.now() - started).toBeLessThan(1000);
		const inner = innerText(framed);
		expect(inner).toBe("H".repeat(max));
		expect(framed.length).toBeLessThanOrEqual(OPEN.length + CLOSE.length + max);
	});

	it("property: fenceClippedCompactionText, fc.property seed 680, numRuns 64", () => {
		fc.assert(
			fc.property(fc.string({ maxLength: 400 }), fc.integer({ min: 0, max: 240 }), (value, max) => {
				const framed = fenceClippedCompactionText(value, max);
				const inner = innerText(framed);
				expect(inner.includes("<")).toBe(false);
				expect(inner.includes(">")).toBe(false);
				expect(inner.includes("\n")).toBe(false);
				expect(inner.includes("\r")).toBe(false);
				expect(inner.length).toBeLessThanOrEqual(Math.max(0, max));
				if (max > 0 && value.length <= max && !/[&<>\r\n]/.test(value)) {
					expect(inner).toBe(value);
				}
			}),
			{ seed: 680, numRuns: 64 },
		);
	});
});
