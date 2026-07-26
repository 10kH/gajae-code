import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { getShellConfig, resetShellConfigCache } from "../src/procmgr";

// Env knobs read by the shell config, plus CI which the spawn env would
// otherwise inherit and confound the GJC_BASH_NO_CI assertion.
const KEYS = [
	"GJC_BASH_NO_CI",
	"PI_BASH_NO_CI",
	"CLAUDE_BASH_NO_CI",
	"GJC_BASH_NO_LOGIN",
	"PI_BASH_NO_LOGIN",
	"CLAUDE_BASH_NO_LOGIN",
	"GJC_SHELL_PREFIX",
	"PI_SHELL_PREFIX",
	"CLAUDE_CODE_SHELL_PREFIX",
	"CI",
] as const;

const saved = new Map<string, string | undefined>();

beforeEach(() => {
	for (const key of KEYS) {
		saved.set(key, Bun.env[key]);
		delete Bun.env[key];
	}
	resetShellConfigCache();
});

afterEach(() => {
	for (const [key, value] of saved) {
		if (value === undefined) delete Bun.env[key];
		else Bun.env[key] = value;
	}
	resetShellConfigCache();
});

describe("getShellConfig honors documented GJC_ bash/shell knobs", () => {
	it("adds CI=true by default", () => {
		expect(getShellConfig().env.CI).toBe("true");
	});

	it("GJC_BASH_NO_CI suppresses CI=true (documented name honored)", () => {
		Bun.env.GJC_BASH_NO_CI = "1";
		resetShellConfigCache();
		expect(getShellConfig().env.CI).toBeUndefined();
	});

	it("legacy PI_BASH_NO_CI still suppresses CI=true", () => {
		Bun.env.PI_BASH_NO_CI = "1";
		resetShellConfigCache();
		expect(getShellConfig().env.CI).toBeUndefined();
	});

	it("uses a login shell by default", () => {
		expect(getShellConfig().args).toEqual(["-l", "-c"]);
	});

	it("GJC_BASH_NO_LOGIN drops the login flag", () => {
		Bun.env.GJC_BASH_NO_LOGIN = "1";
		resetShellConfigCache();
		expect(getShellConfig().args).toEqual(["-c"]);
	});

	it("has no shell prefix by default", () => {
		expect(getShellConfig().prefix).toBeUndefined();
	});

	it("honors GJC_SHELL_PREFIX", () => {
		Bun.env.GJC_SHELL_PREFIX = "strace -f";
		resetShellConfigCache();
		expect(getShellConfig().prefix).toBe("strace -f");
	});

	it("resolves GJC-first: GJC_SHELL_PREFIX wins over legacy PI_SHELL_PREFIX", () => {
		Bun.env.GJC_SHELL_PREFIX = "gjc-prefix";
		Bun.env.PI_SHELL_PREFIX = "pi-prefix";
		resetShellConfigCache();
		expect(getShellConfig().prefix).toBe("gjc-prefix");
	});
});
