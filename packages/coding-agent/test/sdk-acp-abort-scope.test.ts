import { expect, test } from "bun:test";
import { resolveAcpAbortScope } from "../src/modes/acp/abort-scope";

test("resolveAcpAbortScope defaults to owned for an external client turn-end", () => {
	expect(resolveAcpAbortScope(undefined, {})).toBe("owned");
	expect(resolveAcpAbortScope(null, {})).toBe("owned");
	expect(resolveAcpAbortScope({}, {})).toBe("owned");
	expect(resolveAcpAbortScope({ gjc: {} }, {})).toBe("owned");
});

test("resolveAcpAbortScope honors _meta.gjc.abortScope over the environment", () => {
	expect(resolveAcpAbortScope({ gjc: { abortScope: "turn" } }, { GJC_ACP_ABORT_SCOPE: "owned" })).toBe("turn");
	expect(resolveAcpAbortScope({ gjc: { abortScope: "owned" } }, { GJC_ACP_ABORT_SCOPE: "turn" })).toBe("owned");
});

test("resolveAcpAbortScope falls back to GJC_ACP_ABORT_SCOPE when _meta is absent", () => {
	expect(resolveAcpAbortScope(undefined, { GJC_ACP_ABORT_SCOPE: "turn" })).toBe("turn");
	expect(resolveAcpAbortScope({}, { GJC_ACP_ABORT_SCOPE: "owned" })).toBe("owned");
});

test("resolveAcpAbortScope rejects malformed metadata and env values safely to owned", () => {
	expect(resolveAcpAbortScope({ gjc: { abortScope: "everything" } }, {})).toBe("owned");
	expect(resolveAcpAbortScope({ gjc: { abortScope: 42 } }, { GJC_ACP_ABORT_SCOPE: "turn" })).toBe("owned");
	expect(resolveAcpAbortScope(undefined, { GJC_ACP_ABORT_SCOPE: "invalid" })).toBe("owned");
});
