import { describe, expect, test } from "bun:test";
import { canonicalDiffSha256, parseGhPrCreate, parsePrVerdict, validatePrContract } from "./verify-pr-verdict";

const base = "a".repeat(40);
const head = "b".repeat(40);
const digest = "c".repeat(64);
const approved = `gajae.pr-review-verdict.v1 merge-approved sha256:${digest} reviewer:architect reviewer-id:review-agent evidence:bun test scripts/verify-pr-verdict.test.ts`;

function validInput(overrides: Partial<Parameters<typeof validatePrContract>[0]> = {}) {
	return {
		body: `## GJC verdict\n\n${approved}\n`,
		baseRef: "dev",
		baseSha: base,
		headSha: head,
		authorLogin: "author",
		computedDiffSha256: digest,
		baseIsAncestor: true,
		fastGatePassed: true,
		requireMergeApproved: true,
		...overrides,
	};
}

describe("parsePrVerdict", () => {
	test("accepts exactly one strict verdict line", () => {
		expect(parsePrVerdict(approved)).toEqual({
			verdict: {
				verdict: "merge-approved",
				diffSha256: digest,
				reviewerRole: "architect",
				reviewerId: "review-agent",
				evidence: "bun test scripts/verify-pr-verdict.test.ts",
			},
			diagnostics: [],
		});
	});

	test("fails closed for missing, duplicate, and malformed verdicts", () => {
		expect(parsePrVerdict("no verdict").diagnostics[0]).toContain("exactly one");
		expect(parsePrVerdict(`${approved}\n${approved}`).diagnostics[0]).toContain("contains 2");
		expect(parsePrVerdict(approved.replace("sha256:", "hash:")).diagnostics[0]).toContain("Malformed");
		expect(parsePrVerdict(approved.replace(" reviewer-id:review-agent", "")).diagnostics[0]).toContain("Malformed");
	});
});

describe("validatePrContract", () => {
	test("accepts exact-head independently approved contract", () => {
		expect(validatePrContract(validInput())).toMatchObject({ ok: true, diagnostics: [] });
	});

	test("reports base, ancestry, digest, fast-gate, and self-review failures together", () => {
		const result = validatePrContract(validInput({
			baseRef: "main",
			baseIsAncestor: false,
			computedDiffSha256: "d".repeat(64),
			fastGatePassed: false,
			authorLogin: "review-agent",
		}));
		expect(result.ok).toBe(false);
		expect(result.diagnostics).toHaveLength(5);
		expect(result.diagnostics.join("\n")).toContain("base must be dev");
		expect(result.diagnostics.join("\n")).toContain("does not contain immutable event base");
		expect(result.diagnostics.join("\n")).toContain("is stale");
		expect(result.diagnostics.join("\n")).toContain("fast gate failed");
		expect(result.diagnostics.join("\n")).toContain("cannot be self-approved");
	});

	test("local preflight permits blocking verdicts but server merge gate rejects them", () => {
		const body = approved.replace("merge-approved", "needs-human");
		expect(validatePrContract(validInput({ body, requireMergeApproved: false })).ok).toBe(true);
		expect(validatePrContract(validInput({ body, requireMergeApproved: true })).diagnostics[0]).toContain("intentionally blocks merge");
	});

	test("rejects invalid event hashes", () => {
		const result = validatePrContract(validInput({ baseSha: "HEAD", headSha: "head", computedDiffSha256: "sha" }));
		expect(result.diagnostics.join("\n")).toContain("40-hex");
		expect(result.diagnostics.join("\n")).toContain("lowercase SHA-256");
	});
});

describe("parseGhPrCreate", () => {
	test("extracts body and base flags without executing the command", () => {
		expect(parseGhPrCreate("gh pr create --base dev --body-file /tmp/pr.md --title x")).toEqual({ base: "dev", bodyFile: "/tmp/pr.md" });
		expect(parseGhPrCreate("env X=1 gh pr create -B dev -b 'body text'")).toEqual({ base: "dev", body: "body text" });
	});

	test("ignores unrelated commands and fails closed for compound gh commands", () => {
		expect(parseGhPrCreate("git status")).toBeNull();
		expect(parseGhPrCreate("git status && gh pr create --body x")).toEqual({});
	});
});

test("canonicalDiffSha256 hashes exact bytes", () => {
	expect(canonicalDiffSha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("workflow is pull_request-scoped, read-only, exact-head, and invokes the validator", async () => {
	const workflow = await Bun.file(new URL("../.github/workflows/pr-validation.yml", import.meta.url)).text();
	expect(workflow).toContain("pull_request:");
	expect(workflow).not.toContain("pull_request_target");
	expect(workflow).toContain("permissions:\n  contents: read");
	expect(workflow).toContain("ref: ${{ github.event.pull_request.head.sha }}");
	expect(workflow).toContain("ref: ${{ github.event.pull_request.base.sha }}");
	expect(workflow).toContain("validator=trusted-base/scripts/verify-pr-verdict.ts");
	expect(workflow).toContain("validator=pr-head/scripts/verify-pr-verdict.ts");
	expect(workflow).toContain('bun "$validator" --event "$GITHUB_EVENT_PATH" --repo pr-head --trusted-root trusted-base');
	expect(workflow).not.toContain("continue-on-error");
});

test("template pins reviewer identity and exact diff digest", async () => {
	const template = await Bun.file(new URL("../.github/PULL_REQUEST_TEMPLATE.md", import.meta.url)).text();
	expect(template).toContain("reviewer-id:<identity>");
	expect(template).toContain("sha256:<exact-base...head-diff-hash>");
});
