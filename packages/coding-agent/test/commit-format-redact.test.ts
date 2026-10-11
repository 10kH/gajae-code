import { describe, expect, it } from "bun:test";
import { formatCommitMessage } from "../src/commit/message";
import type { ConventionalAnalysis } from "../src/commit/types";

const GITHUB_PAT = "github_pat_11ABCDEFG0hijklmnopq_RSTUVWXYZ0123456789abcdefghij";
const SK = "sk-ant-GJCCANARY-commitfmt-9f3c1d7a2b6e";

function analysis(details: string[], scope: string | null = "commit"): ConventionalAnalysis {
	return {
		type: "fix",
		scope,
		details: details.map(text => ({ text, userVisible: true })),
		issueRefs: [],
	};
}

describe("formatCommitMessage credential text", () => {
	it("redacts a github_pat_ or sk- token in the summary", () => {
		const message = formatCommitMessage(
			analysis([`body keeps ${GITHUB_PAT}`, ` body keeps ${SK} `]),
			`document ${GITHUB_PAT} and ${SK}`,
		);

		expect(message).not.toContain(GITHUB_PAT);
		expect(message).not.toContain(SK);
		expect(message).toContain("[REDACTED_TOKEN]");
		expect(message).toBe(
			[
				"fix(commit): document [REDACTED_TOKEN] and [REDACTED_TOKEN]",
				"",
				"- body keeps [REDACTED_TOKEN]",
				"- body keeps [REDACTED_TOKEN]",
			].join("\n"),
		);

		const [header = "", , ...body] = message.split("\n");
		const again = formatCommitMessage(
			analysis(body.map(line => line.slice(2))),
			header.replace(/^fix\(commit\): /, ""),
		);
		expect(again).toBe(message);
	});

	it("leaves an ordinary summary and detail unchanged", () => {
		const message = formatCommitMessage(analysis(["keep the formatter"], null), "redact formatted commit text");
		expect(message).toBe("fix: redact formatted commit text\n\n- keep the formatter");
	});
});
