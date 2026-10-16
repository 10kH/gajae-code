import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Agent, type AgentTool } from "@gajae-code/agent-core";
import { getBundledModel, type ToolCall } from "@gajae-code/ai";
import { AssistantMessageEventStream } from "@gajae-code/ai/utils/event-stream";
import { parseRuleConditionAndScope, type Rule } from "@gajae-code/coding-agent/capability/rule";
import { buildRuleFromMarkdown } from "@gajae-code/coding-agent/discovery/helpers";
import { TtsrManager } from "@gajae-code/coding-agent/export/ttsr";
import { Snowflake } from "@gajae-code/utils";
import { ModelRegistry } from "../src/config/model-registry";
import { Settings } from "../src/config/settings";
import { EditTool } from "../src/edit";
import { AgentSession } from "../src/session/agent-session";
import { AuthStorage } from "../src/session/auth-storage";
import { SessionManager } from "../src/session/session-manager";
import type { ToolSession } from "../src/tools";
import { WriteTool } from "../src/tools/write";

function makeRule(partial: Partial<Rule>): Rule {
	return {
		name: partial.name ?? "rule",
		path: partial.path ?? "/tmp/rule.md",
		content: partial.content ?? "Do not use as any",
		globs: partial.globs,
		alwaysApply: partial.alwaysApply,
		description: partial.description,
		condition: partial.condition,
		astCondition: partial.astCondition,
		scope: partial.scope,
		repeatMode: partial.repeatMode,
		repeatGap: partial.repeatGap,

		_source: partial._source ?? {
			provider: "test",
			providerName: "test",
			path: "/tmp/rule.md",
			level: "project",
		},
	};
}

function bucketRulesWithTtsrDisabled(rules: Rule[]): { rulebookRules: Rule[]; alwaysApplyRules: Rule[] } {
	const ttsrManager = new TtsrManager({ enabled: false });
	const rulebookRules: Rule[] = [];
	const alwaysApplyRules: Rule[] = [];
	for (const rule of rules) {
		const isTtsrRule = rule.condition && rule.condition.length > 0 ? ttsrManager.addRule(rule) : false;
		if (isTtsrRule) {
			continue;
		}
		if (rule.alwaysApply === true) {
			alwaysApplyRules.push(rule);
			continue;
		}
		if (rule.description) {
			rulebookRules.push(rule);
		}
	}
	return { rulebookRules, alwaysApplyRules };
}

describe("parseRuleConditionAndScope", () => {
	it("accepts condition and scope as literal strings", () => {
		const parsed = parseRuleConditionAndScope({
			condition: "\\bas any\\b",
			scope: "tool:edit",
		});

		expect(parsed.condition).toEqual(["\\bas any\\b"]);
		expect(parsed.scope).toEqual(["tool:edit"]);
	});

	it("accepts condition and scope as arrays", () => {
		const parsed = parseRuleConditionAndScope({
			condition: ["foo", "bar"],
			scope: ["tool:edit", "tool:write"],
		});

		expect(parsed.condition).toEqual(["foo", "bar"]);
		expect(parsed.scope).toEqual(["tool:edit", "tool:write"]);
	});

	it("accepts legacy ttsr_trigger as condition fallback", () => {
		const parsed = parseRuleConditionAndScope({
			ttsr_trigger: "forbidden",
		});

		expect(parsed.condition).toEqual(["forbidden"]);
		expect(parsed.scope).toBeUndefined();
	});

	it("accepts legacy ttsrTrigger as condition fallback", () => {
		const parsed = parseRuleConditionAndScope({
			ttsrTrigger: "legacy-camel-case",
		});

		expect(parsed.condition).toEqual(["legacy-camel-case"]);
		expect(parsed.scope).toBeUndefined();
	});

	it("keeps regex-like conditions as regex and does not infer file scope", () => {
		const parsed = parseRuleConditionAndScope({
			condition: "error.*timeout",
		});

		expect(parsed.condition).toEqual(["error.*timeout"]);
		expect(parsed.scope).toBeUndefined();
	});

	it("splits comma-delimited scope without corrupting brace globs", () => {
		const parsed = parseRuleConditionAndScope({
			scope: "text, tool:edit(*.{ts,tsx})",
		});

		expect(parsed.condition).toBeUndefined();
		expect(parsed.scope).toEqual(["text", "tool:edit(*.{ts,tsx})"]);
	});

	it("maps glob-like condition to edit/write scoped shorthand", () => {
		const parsed = parseRuleConditionAndScope({
			condition: "*.rs",
		});

		expect(parsed.condition).toEqual([".*"]);
		expect(parsed.scope).toEqual(["tool:edit(*.rs)", "tool:write(*.rs)"]);
	});

	it("parses per-rule repeat policy frontmatter", () => {
		const rule = buildRuleFromMarkdown(
			"rule.md",
			'---\ncondition: "forbidden"\nrepeatMode: "after-gap"\nrepeatGap: 3\n---\nContent',
			"/tmp/rule.md",
			{ provider: "test", providerName: "test", path: "/tmp/rule.md", level: "project" },
		);

		expect(rule.condition).toEqual(["forbidden"]);
		expect(rule.repeatMode).toBe("after-gap");
		expect(rule.repeatGap).toBe(3);
	});
});

describe("TtsrManager disabled behavior", () => {
	it("does not register rules when disabled", () => {
		const manager = new TtsrManager({ enabled: false });
		const rule = makeRule({
			name: "disabled-rule",
			condition: ["forbidden"],
			scope: ["text"],
		});

		expect(manager.addRule(rule)).toBe(false);
		expect(manager.hasRules()).toBe(false);
		manager.restoreInjected([rule.name]);
		expect(manager.getInjectedRuleNames()).toEqual([]);
	});

	it("does not match deltas when disabled", () => {
		const manager = new TtsrManager({ enabled: false });
		const rule = makeRule({
			name: "disabled-match",
			condition: ["forbidden"],
			scope: ["text"],
		});

		expect(manager.addRule(rule)).toBe(false);
		expect(manager.checkDelta("forbidden", { source: "text" })).toEqual([]);
	});

	it("keeps disabled conditional-only rules out of sdk rulebook bucketing", () => {
		const conditionalOnly = makeRule({
			name: "conditional-only",
			condition: ["forbidden"],
		});
		const conditionalWithDescription = makeRule({
			name: "conditional-with-description",
			condition: ["forbidden"],
			description: "Visible in rulebook when TTSR is disabled",
		});
		const conditionalAlwaysApply = makeRule({
			name: "conditional-always-apply",
			condition: ["forbidden"],
			alwaysApply: true,
		});

		// Mirrors sdk/session.ts discovery bucketing: addRule(false) must not turn conditional-only rules into rulebook rules.
		const { rulebookRules, alwaysApplyRules } = bucketRulesWithTtsrDisabled([
			conditionalOnly,
			conditionalWithDescription,
			conditionalAlwaysApply,
		]);

		expect(rulebookRules).toEqual([conditionalWithDescription]);
		expect(alwaysApplyRules).toEqual([conditionalAlwaysApply]);
	});
});

describe("TtsrManager scope matching", () => {
	it("applies file-scoped tool rules without cross-language contamination", () => {
		const manager = new TtsrManager();
		const rule = makeRule({
			name: "ts-no-as-any",
			condition: ["\\bas any\\b"],
			scope: ["tool:edit(*.ts)", "tool:write(*.ts)"],
		});

		manager.addRule(rule);

		expect(
			manager.checkDelta("as any", {
				source: "tool",
				toolName: "edit",
				filePaths: ["src/main.ts"],
			}),
		).toEqual([rule]);

		expect(
			manager.checkDelta("as any", {
				source: "tool",
				toolName: "edit",
				filePaths: ["src/main.rs"],
			}),
		).toEqual([]);

		expect(
			manager.checkDelta("as any", {
				source: "text",
			}),
		).toEqual([]);
	});

	it("treats bare tool names as specific tools, not as the generic tool scope", () => {
		const manager = new TtsrManager();
		const rule = makeRule({
			name: "tooling-only",
			condition: ["forbidden"],
			scope: ["tooling"],
		});

		manager.addRule(rule);

		expect(
			manager.checkDelta("forbidden", {
				source: "tool",
				toolName: "edit",
			}),
		).toEqual([]);

		expect(
			manager.checkDelta("forbidden", {
				source: "tool",
				toolName: "tooling",
			}),
		).toEqual([rule]);
	});

	it("preserves path glob casing in tool scope matching", () => {
		const manager = new TtsrManager();
		const rule = makeRule({
			name: "upper-ext-only",
			condition: ["forbidden"],
			scope: ["tool:edit(*.TS)"],
		});

		manager.addRule(rule);

		expect(
			manager.checkDelta("forbidden", {
				source: "tool",
				toolName: "edit",
				filePaths: ["src/main.ts"],
			}),
		).toEqual([]);

		expect(
			manager.checkDelta("forbidden", {
				source: "tool",
				toolName: "edit",
				filePaths: ["src/main.TS"],
			}),
		).toEqual([rule]);
	});

	it("returns false when registering rules with only invalid condition regex", () => {
		const manager = new TtsrManager();
		const added = manager.addRule(
			makeRule({
				name: "invalid-regex",
				condition: ["("],
			}),
		);

		expect(added).toBe(false);
	});

	it("returns false when registering rules with unreachable malformed scope", () => {
		const manager = new TtsrManager();
		const added = manager.addRule(
			makeRule({
				name: "invalid-scope",
				condition: ["forbidden"],
				scope: ["tool:edit(*.ts"],
			}),
		);

		expect(added).toBe(false);
		expect(
			manager.checkDelta("forbidden", {
				source: "tool",
				toolName: "edit",
				filePaths: ["src/main.ts"],
			}),
		).toEqual([]);
	});

	it("matches write scope and rejects thinking/tool mismatches for the same rule", () => {
		const manager = new TtsrManager();
		const rule = makeRule({
			name: "ts-no-write-as-any",
			condition: ["\\bas any\\b"],
			scope: ["tool:write(*.ts)"],
		});

		manager.addRule(rule);

		expect(
			manager.checkDelta("as any", {
				source: "tool",
				toolName: "write",
				filePaths: ["src/main.ts"],
			}),
		).toEqual([rule]);
		expect(
			manager.checkDelta("as any", {
				source: "thinking",
			}),
		).toEqual([]);
		expect(
			manager.checkDelta("as any", {
				source: "tool",
				toolName: "edit",
				filePaths: ["src/main.ts"],
			}),
		).toEqual([]);
	});

	it("matches file-scoped rules across relative and absolute path variants", () => {
		const manager = new TtsrManager();
		const rule = makeRule({
			name: "variant-paths",
			condition: ["forbidden"],
			scope: ["tool:edit(*.ts)"],
		});
		const absolutePath = path.resolve("/tmp", "src", "main.ts");

		manager.addRule(rule);

		expect(
			manager.checkDelta("forbidden", {
				source: "tool",
				toolName: "edit",
				filePaths: ["./src/main.ts"],
			}),
		).toEqual([rule]);
		expect(
			manager.checkDelta("forbidden", {
				source: "tool",
				toolName: "edit",
				filePaths: ["src/main.ts"],
			}),
		).toEqual([rule]);
		expect(
			manager.checkDelta("forbidden", {
				source: "tool",
				toolName: "edit",
				filePaths: [absolutePath],
			}),
		).toEqual([rule]);
	});
});

describe("TtsrManager bounded matching", () => {
	it("matches safe conditions across chunk boundaries", () => {
		const manager = new TtsrManager();
		const rule = makeRule({ name: "boundary", condition: ["forbidden"], scope: ["text"] });
		manager.addRule(rule);

		expect(manager.checkDelta("for", { source: "text" })).toEqual([]);
		expect(manager.checkDelta("bidden", { source: "text" })).toEqual([rule]);
	});

	it("falls back to full-buffer matching for anchored unsafe regex", () => {
		const manager = new TtsrManager();
		const rule = makeRule({ name: "anchored", condition: ["^hello.*forbidden$"], scope: ["text"] });
		manager.addRule(rule);

		expect(manager.checkDelta("hello ", { source: "text" })).toEqual([]);
		expect(manager.checkDelta("forbidden", { source: "text" })).toEqual([rule]);
	});

	it("does not scan conditions when no rule is triggerable for the context", () => {
		const manager = new TtsrManager();
		const rule = makeRule({ name: "once-only", condition: ["forbidden"], scope: ["text"] });
		manager.addRule(rule);
		manager.markInjected([rule]);

		expect(manager.checkDelta("forbidden", { source: "text" })).toEqual([]);
	});
});

describe("TtsrManager repeat behavior", () => {
	const turnContext = { source: "text" as const };

	function createRepeatRule(name = "repeat-rule"): Rule {
		return makeRule({
			name,
			condition: ["forbidden"],
			scope: ["text"],
		});
	}

	function runTurn(manager: TtsrManager, rule: Rule): Rule[] {
		manager.resetBuffer();
		const matches = manager.checkDelta("forbidden", turnContext);
		if (matches.length > 0) {
			manager.markInjected([rule]);
		}
		manager.incrementMessageCount();
		return matches;
	}

	it("never repeats when repeat mode is once", () => {
		const manager = new TtsrManager({
			enabled: true,
			contextMode: "discard",
			interruptMode: "always",
			repeatMode: "once",
			repeatGap: 10,
		});
		const rule = createRepeatRule("once");
		manager.addRule(rule);

		expect(runTurn(manager, rule)).toEqual([rule]);
		expect(runTurn(manager, rule)).toEqual([]);
		expect(runTurn(manager, rule)).toEqual([]);
	});

	it("repeats every turn when repeat mode is after-gap and gap is 1", () => {
		const manager = new TtsrManager({
			enabled: true,
			contextMode: "discard",
			interruptMode: "always",
			repeatMode: "after-gap",
			repeatGap: 1,
		});
		const rule = createRepeatRule("gap-1");
		manager.addRule(rule);

		expect(runTurn(manager, rule)).toEqual([rule]);
		expect(runTurn(manager, rule)).toEqual([rule]);
		expect(runTurn(manager, rule)).toEqual([rule]);
	});

	it("respects repeat gap when repeat mode is after-gap", () => {
		const manager = new TtsrManager({
			enabled: true,
			contextMode: "discard",
			interruptMode: "always",
			repeatMode: "after-gap",
			repeatGap: 2,
		});
		const rule = createRepeatRule("gap-2");
		manager.addRule(rule);

		expect(runTurn(manager, rule)).toEqual([rule]);
		expect(runTurn(manager, rule)).toEqual([]);
		expect(runTurn(manager, rule)).toEqual([rule]);
		expect(runTurn(manager, rule)).toEqual([]);
		expect(runTurn(manager, rule)).toEqual([rule]);
	});

	it("honors per-rule once override when global mode is after-gap", () => {
		const manager = new TtsrManager({ repeatMode: "after-gap", repeatGap: 1 });
		const rule = makeRule({ name: "rule-once", condition: ["forbidden"], scope: ["text"], repeatMode: "once" });
		manager.addRule(rule);

		expect(runTurn(manager, rule)).toEqual([rule]);
		expect(runTurn(manager, rule)).toEqual([]);
	});

	it("honors per-rule after-gap override when global mode is once", () => {
		const manager = new TtsrManager({ repeatMode: "once", repeatGap: 10 });
		const rule = makeRule({
			name: "rule-after-gap",
			condition: ["forbidden"],
			scope: ["text"],
			repeatMode: "after-gap",
			repeatGap: 1,
		});
		manager.addRule(rule);

		expect(runTurn(manager, rule)).toEqual([rule]);
		expect(runTurn(manager, rule)).toEqual([rule]);
	});

	it("honors per-rule repeat gap override", () => {
		const manager = new TtsrManager({ repeatMode: "after-gap", repeatGap: 10 });
		const rule = makeRule({ name: "rule-gap", condition: ["forbidden"], scope: ["text"], repeatGap: 2 });
		manager.addRule(rule);

		expect(runTurn(manager, rule)).toEqual([rule]);
		expect(runTurn(manager, rule)).toEqual([]);
		expect(runTurn(manager, rule)).toEqual([rule]);
	});

	it("blocks restored rules in once mode across resumed sessions", () => {
		const manager = new TtsrManager({
			enabled: true,
			contextMode: "discard",
			interruptMode: "always",
			repeatMode: "once",
			repeatGap: 10,
		});
		const rule = createRepeatRule("restored-once");
		manager.addRule(rule);
		manager.restoreInjected([rule.name]);

		expect(runTurn(manager, rule)).toEqual([]);
		expect(runTurn(manager, rule)).toEqual([]);
	});

	it("applies repeat gap to restored rules in after-gap mode", () => {
		const manager = new TtsrManager({
			enabled: true,
			contextMode: "discard",
			interruptMode: "always",
			repeatMode: "after-gap",
			repeatGap: 2,
		});
		const rule = createRepeatRule("restored-gap");
		manager.addRule(rule);
		manager.restoreInjected([rule.name]);

		expect(runTurn(manager, rule)).toEqual([]);
		expect(runTurn(manager, rule)).toEqual([]);
		expect(runTurn(manager, rule)).toEqual([rule]);
	});

	it("restores new record arrays with exact lastInjectedAt", () => {
		const manager = new TtsrManager({ repeatMode: "after-gap", repeatGap: 3 });
		const rule = createRepeatRule("record-gap");
		manager.addRule(rule);
		manager.restoreMessageCount(4);
		manager.restoreInjected([{ name: rule.name, lastInjectedAt: 2, repeatMode: "after-gap", repeatGap: 3 }]);

		expect(runTurn(manager, rule)).toEqual([]);
		expect(runTurn(manager, rule)).toEqual([rule]);
	});

	it("resumes after-gap with exact remaining gap from restored message count", () => {
		const manager = new TtsrManager({ repeatMode: "after-gap", repeatGap: 5 });
		const rule = createRepeatRule("resume-gap");
		manager.addRule(rule);
		manager.restoreMessageCount(7);
		manager.restoreInjected([{ name: rule.name, lastInjectedAt: 3, repeatMode: "after-gap", repeatGap: 5 }]);

		expect(manager.checkDelta("forbidden", turnContext)).toEqual([]);
		manager.incrementMessageCount();
		manager.resetBuffer();
		expect(manager.checkDelta("forbidden", turnContext)).toEqual([rule]);
	});

	it("tracks only one injection record per rule per turn", () => {
		const manager = new TtsrManager({
			enabled: true,
			contextMode: "discard",
			interruptMode: "always",
			repeatMode: "after-gap",
			repeatGap: 1,
		});
		const rule = createRepeatRule("single-record");
		manager.addRule(rule);

		manager.markInjected([rule]);
		manager.markInjected([rule]);
		manager.markInjected([rule]);
		expect(manager.getInjectedRuleNames()).toEqual([rule.name]);

		manager.incrementMessageCount();
		expect(manager.checkDelta("forbidden", turnContext)).toEqual([rule]);
	});
});

describe("TtsrManager enabled gating (Finding 10)", () => {
	const textContext = { source: "text" as const };

	function makeSettings(enabled: boolean) {
		return {
			enabled,
			contextMode: "discard" as const,
			interruptMode: "always" as const,
			repeatMode: "after-gap" as const,
			repeatGap: 1,
		};
	}

	function forbiddenRule(): Rule {
		return makeRule({ name: "forbidden-rule", condition: ["forbidden"], scope: ["text"] });
	}

	it("does not match when disabled, even with a registered matching rule", () => {
		const manager = new TtsrManager(makeSettings(false));
		manager.addRule(forbiddenRule());
		expect(manager.checkDelta("forbidden", textContext)).toEqual([]);
		// Repeated deltas still never match while disabled.
		expect(manager.checkDelta(" forbidden again", textContext)).toEqual([]);
	});

	it("matches once re-enabled (control)", () => {
		const rule = forbiddenRule();
		const enabled = new TtsrManager(makeSettings(true));
		enabled.addRule(rule);
		expect(enabled.checkDelta("forbidden", textContext)).toEqual([rule]);
	});

	it("disabled manager buffers nothing, so enabling later starts from a clean slate", () => {
		const manager = new TtsrManager(makeSettings(false));
		manager.addRule(forbiddenRule());
		// Feed a partial match while disabled; it must not be retained.
		expect(manager.checkDelta("forbif", textContext)).toEqual([]);
	});
});

describe("TTSR AST conditions", () => {
	it("accepts rules with astCondition and no regex condition", () => {
		const manager = new TtsrManager();
		const rule = makeRule({
			name: "ast-only",
			astCondition: ["function Foo() {}"],
		});

		const added = manager.addRule(rule);
		expect(added).toBe(true);
	});

	it("accepts rules with both regex and AST conditions", () => {
		const manager = new TtsrManager();
		const rule = makeRule({
			name: "both-conditions",
			condition: ["error"],
			astCondition: ["function Foo() {}"],
		});

		const added = manager.addRule(rule);
		expect(added).toBe(true);
	});

	it("normalizes astCondition from string to string array", () => {
		const parsed = parseRuleConditionAndScope({
			astCondition: "function Foo() {}",
		});

		expect(parsed.astCondition).toEqual(["function Foo() {}"]);
	});

	it("deduplicates astCondition array", () => {
		const parsed = parseRuleConditionAndScope({
			astCondition: ["function Foo() {}", "function Foo() {}"],
		});

		expect(parsed.astCondition).toEqual(["function Foo() {}"]);
	});

	it("returns undefined for empty astCondition", () => {
		const parsed = parseRuleConditionAndScope({
			astCondition: "",
		});

		expect(parsed.astCondition).toBeUndefined();
	});

	it("checkAstCondition returns false for unknown language", async () => {
		const manager = new TtsrManager();
		const rule = makeRule({
			name: "ast-rule",
			astCondition: ["function Foo() {}"],
		});

		manager.addRule(rule);
		const match = await manager.checkAstCondition(rule, "unknown.xyz", "function Foo() {}");
		expect(match).toBe(false);
	});

	it("checkAstCondition returns false for parse failures", async () => {
		const manager = new TtsrManager();
		const rule = makeRule({
			name: "ast-rule",
			astCondition: ["function Foo() {}"],
		});

		manager.addRule(rule);
		// Invalid JavaScript that won't parse
		const match = await manager.checkAstCondition(rule, "test.js", "function {");
		expect(match).toBe(false);
	});

	it("checkAstCondition returns false when no rule matches", async () => {
		const manager = new TtsrManager();
		const rule = makeRule({
			name: "ast-rule",
			astCondition: ["const x = 123;"],
		});

		manager.addRule(rule);
		// Code without the pattern
		const match = await manager.checkAstCondition(rule, "test.ts", "function Foo() {}");
		expect(match).toBe(false);
	});

	it("checkAstCondition returns true when pattern matches", async () => {
		const manager = new TtsrManager();
		const rule = makeRule({
			name: "ast-rule",
			astCondition: ["function $NAME() {}"],
		});

		manager.addRule(rule);
		// Code with the pattern
		const match = await manager.checkAstCondition(rule, "test.ts", "function Foo() {}");
		expect(match).toBe(true);
	});

	it("checkAstCondition returns false when rule has no astCondition", async () => {
		const manager = new TtsrManager();
		const rule = makeRule({
			name: "no-ast",
			condition: ["forbidden"],
		});

		manager.addRule(rule);
		const match = await manager.checkAstCondition(rule, "test.ts", "function Foo() {}");
		expect(match).toBe(false);
	});

	it("infers language from file path", async () => {
		const manager = new TtsrManager();
		const rule = makeRule({
			name: "ast-rule",
			astCondition: ["function $NAME() {}"],
		});

		manager.addRule(rule);
		// Python file (should fail to match JavaScript pattern)
		const pythonMatch = await manager.checkAstCondition(rule, "test.py", "def foo(): pass");
		expect(pythonMatch).toBe(false);

		// TypeScript file (should match)
		const tsMatch = await manager.checkAstCondition(rule, "test.ts", "function Foo() {}");
		expect(tsMatch).toBe(true);
	});

	it("getRules returns all registered rules", () => {
		const manager = new TtsrManager();
		const rule1 = makeRule({ name: "rule-1", condition: ["pattern1"] });
		const rule2 = makeRule({ name: "rule-2", astCondition: ["pattern2"] });

		manager.addRule(rule1);
		manager.addRule(rule2);

		const rules = manager.getRules();
		expect(rules).toHaveLength(2);
		expect(rules.map(r => r.name)).toEqual(["rule-1", "rule-2"]);
	});

	it("canTrigger respects repeat gating", () => {
		const manager = new TtsrManager();
		const rule = makeRule({ name: "rule-1", condition: ["pattern"] });

		manager.addRule(rule);
		expect(manager.canTrigger("rule-1")).toBe(true);

		// Mark as injected
		manager.markInjectedByNames(["rule-1"]);
		// With default repeatMode "once", should not trigger again
		expect(manager.canTrigger("rule-1")).toBe(false);
	});

	it("checkScope matches tool scope context", () => {
		const manager = new TtsrManager();
		const ruleWithToolScope = makeRule({
			name: "tool-rule",
			condition: ["pattern"],
			scope: ["tool:write"],
		});
		const ruleWithAnyToolScope = makeRule({
			name: "any-tool-rule",
			condition: ["pattern"],
			scope: ["tool"],
		});

		manager.addRule(ruleWithToolScope);
		manager.addRule(ruleWithAnyToolScope);

		const writeContext = { source: "tool" as const, toolName: "write" };
		const editContext = { source: "tool" as const, toolName: "edit" };

		expect(manager.checkScope(ruleWithToolScope, writeContext)).toBe(true);
		expect(manager.checkScope(ruleWithToolScope, editContext)).toBe(false);
		expect(manager.checkScope(ruleWithAnyToolScope, writeContext)).toBe(true);
		expect(manager.checkScope(ruleWithAnyToolScope, editContext)).toBe(true);
	});
});

describe("TTSR beforeToolCall integration", () => {
	let session: AgentSession;
	let tempDir: string;
	let authStorage: AuthStorage;
	let modelRegistry: ModelRegistry;

	beforeEach(async () => {
		tempDir = path.join(os.tmpdir(), `ttsr-integration-test-${Snowflake.next()}`);
		fs.mkdirSync(tempDir, { recursive: true });
		authStorage = await AuthStorage.create(path.join(tempDir, "auth.db"));
		authStorage.setRuntimeApiKey("anthropic", "test-key");
		modelRegistry = new ModelRegistry(authStorage);
	});

	afterEach(async () => {
		if (session) {
			await session.dispose();
		}
		if (tempDir && fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true });
		}
	});

	function createToolSession(): ToolSession {
		return {
			cwd: tempDir,
			hasUI: false,
			enableLsp: false,
			settings: Settings.isolated(),
			getSessionFile: () => null,
			getSessionSpawns: () => "*",
			getArtifactsDir: () => null,
			getSessionId: () => null,
			getPlanModeState: () => undefined,
		} as unknown as ToolSession;
	}

	function assistantMessageWithCalls(
		calls: ToolCall[],
	): Parameters<typeof AssistantMessageEventStream.prototype.push>[0] {
		return {
			type: "start",
			partial: {
				content: calls.map(call => ({
					type: "toolCall" as const,
					id: call.id,
					name: call.name,
					arguments: call.arguments,
				})),
				stopReason: "toolUse" as const,
			} as any,
		};
	}

	it("beforeToolCall checks astCondition for write tool with matching code and triggers ttsr_triggered event", async () => {
		const model = getBundledModel("anthropic", "claude-sonnet-4-5")!;
		const writeTool = new WriteTool(createToolSession());
		const ttsrManager = new TtsrManager();
		const rule = makeRule({
			name: "function-detect",
			scope: ["tool:write"],
			astCondition: ["function testFn() {}"],
		});
		ttsrManager.addRule(rule);

		let callCount = 0;
		const agent = new Agent({
			initialState: {
				model,
				systemPrompt: ["Test"],
				tools: [writeTool],
				messages: [],
			},
			streamFn: () => {
				callCount++;
				const stream = new AssistantMessageEventStream();
				queueMicrotask(() => {
					if (callCount === 1) {
						// First call: return tool call
						const toolCall: ToolCall = {
							type: "toolCall",
							id: "write-call-1",
							name: "write",
							arguments: {
								path: path.join(tempDir, "test.ts"),
								content: "function testFn() {}",
							},
						};
						stream.push(assistantMessageWithCalls([toolCall]));
						const message = {
							role: "assistant" as const,
							content: [toolCall],
							api: model.api,
							provider: model.provider,
							model: model.id,
							usage: {
								input: 1,
								output: 1,
								cacheRead: 0,
								cacheWrite: 0,
								totalTokens: 2,
								cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
							},
							stopReason: "toolUse" as const,
							timestamp: Date.now(),
						};
						stream.push({ type: "done", reason: "toolUse", message });
					} else {
						// Second call: return final stop response
						const message = {
							role: "assistant" as const,
							content: [{ type: "text" as const, text: "Done" }],
							api: model.api,
							provider: model.provider,
							model: model.id,
							usage: {
								input: 1,
								output: 1,
								cacheRead: 0,
								cacheWrite: 0,
								totalTokens: 2,
								cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
							},
							stopReason: "stop" as const,
							timestamp: Date.now(),
						};
						stream.push({ type: "start", partial: message });
						stream.push({ type: "done", reason: "stop", message });
					}
					stream.end();
				});
				return stream;
			},
		});

		const sessionManager = SessionManager.inMemory();
		session = new AgentSession({
			agent,
			sessionManager,
			settings: Settings.isolated({ "compaction.enabled": false }),
			ttsrManager,
			modelRegistry,
			toolRegistry: new Map([[writeTool.name, writeTool as AgentTool]]),
		});

		const ttsr_triggered_events: Array<{ type: string; rules: Rule[] }> = [];
		session.subscribe(event => {
			if (event.type === "ttsr_triggered") {
				ttsr_triggered_events.push(event as any);
			}
		});

		await session.prompt("Write a test function");
		await session.waitForIdle();

		// Verify ttsr_triggered event was emitted with matching rule
		expect(ttsr_triggered_events.length).toBeGreaterThan(0);
		const triggeredRules = ttsr_triggered_events.flatMap(e => e.rules);
		expect(triggeredRules.some(r => r.name === "function-detect")).toBe(true);
	});

	it("beforeToolCall does not trigger event for write tool with non-matching code", async () => {
		const model = getBundledModel("anthropic", "claude-sonnet-4-5")!;
		const writeTool = new WriteTool(createToolSession());
		const ttsrManager = new TtsrManager();
		const rule = makeRule({
			name: "function-detect",
			scope: ["tool:write"],
			astCondition: ["function testFn() {}"],
		});
		ttsrManager.addRule(rule);

		let callCount = 0;
		const agent = new Agent({
			initialState: {
				model,
				systemPrompt: ["Test"],
				tools: [writeTool],
				messages: [],
			},
			streamFn: () => {
				callCount++;
				const stream = new AssistantMessageEventStream();
				queueMicrotask(() => {
					if (callCount === 1) {
						const toolCall: ToolCall = {
							type: "toolCall",
							id: "write-call-1",
							name: "write",
							arguments: {
								path: path.join(tempDir, "test.ts"),
								content: "function otherFn() {}",
							},
						};
						stream.push(assistantMessageWithCalls([toolCall]));
						const message = {
							role: "assistant" as const,
							content: [toolCall],
							api: model.api,
							provider: model.provider,
							model: model.id,
							usage: {
								input: 1,
								output: 1,
								cacheRead: 0,
								cacheWrite: 0,
								totalTokens: 2,
								cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
							},
							stopReason: "toolUse" as const,
							timestamp: Date.now(),
						};
						stream.push({ type: "done", reason: "toolUse", message });
					} else {
						const message = {
							role: "assistant" as const,
							content: [{ type: "text" as const, text: "Done" }],
							api: model.api,
							provider: model.provider,
							model: model.id,
							usage: {
								input: 1,
								output: 1,
								cacheRead: 0,
								cacheWrite: 0,
								totalTokens: 2,
								cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
							},
							stopReason: "stop" as const,
							timestamp: Date.now(),
						};
						stream.push({ type: "start", partial: message });
						stream.push({ type: "done", reason: "stop", message });
					}
					stream.end();
				});
				return stream;
			},
		});

		const sessionManager = SessionManager.inMemory();
		session = new AgentSession({
			agent,
			sessionManager,
			settings: Settings.isolated({ "compaction.enabled": false }),
			ttsrManager,
			modelRegistry,
			toolRegistry: new Map([[writeTool.name, writeTool as AgentTool]]),
		});

		const ttsr_triggered_events: Array<{ type: string; rules: Rule[] }> = [];
		session.subscribe(event => {
			if (event.type === "ttsr_triggered") {
				ttsr_triggered_events.push(event as any);
			}
		});

		await session.prompt("Write a test function");
		await session.waitForIdle();

		// No TTSR event should be triggered because content doesn't match the astCondition
		expect(ttsr_triggered_events.length).toBe(0);
	});

	it("gating: second matching write call does not trigger event under once mode", async () => {
		const model = getBundledModel("anthropic", "claude-sonnet-4-5")!;
		const writeTool = new WriteTool(createToolSession());
		const ttsrManager = new TtsrManager();
		const rule = makeRule({
			name: "function-detect",
			scope: ["tool:write"],
			astCondition: ["function testFn() {}"],
			repeatMode: "once",
		});
		ttsrManager.addRule(rule);

		let streamCallCount = 0;
		let toolCallIndex = 0;
		const agent = new Agent({
			initialState: {
				model,
				systemPrompt: ["Test"],
				tools: [writeTool],
				messages: [],
			},
			streamFn: () => {
				streamCallCount++;
				const stream = new AssistantMessageEventStream();
				queueMicrotask(() => {
					// Odd calls (1, 3, 5...): return tool call; even calls (2, 4, 6...): return stop
					if (streamCallCount % 2 === 1) {
						toolCallIndex++;
						const toolCall: ToolCall = {
							type: "toolCall",
							id: `write-call-${toolCallIndex}`,
							name: "write",
							arguments: {
								path: path.join(tempDir, `test${toolCallIndex}.ts`),
								content: "function testFn() {}",
							},
						};
						stream.push(assistantMessageWithCalls([toolCall]));
						const message = {
							role: "assistant" as const,
							content: [toolCall],
							api: model.api,
							provider: model.provider,
							model: model.id,
							usage: {
								input: 1,
								output: 1,
								cacheRead: 0,
								cacheWrite: 0,
								totalTokens: 2,
								cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
							},
							stopReason: "toolUse" as const,
							timestamp: Date.now(),
						};
						stream.push({ type: "done", reason: "toolUse", message });
				} else {
					const message = {
						role: "assistant" as const,
						content: [{ type: "text" as const, text: "Done" }],
						api: model.api,
						provider: model.provider,
						model: model.id,
						usage: {
							input: 1,
							output: 1,
							cacheRead: 0,
							cacheWrite: 0,
							totalTokens: 2,
							cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
						},
						stopReason: "stop" as const,
						timestamp: Date.now(),
					};
					stream.push({ type: "start", partial: message });
					stream.push({ type: "done", reason: "stop", message });
				}
				stream.end();
				});
				return stream;
			},
		});

		const sessionManager = SessionManager.inMemory();
		session = new AgentSession({
			agent,
			sessionManager,
			settings: Settings.isolated({ "compaction.enabled": false }),
			ttsrManager,
			modelRegistry,
			toolRegistry: new Map([[writeTool.name, writeTool as AgentTool]]),
		});

		const ttsr_triggered_events: Array<{ type: string; rules: Rule[] }> = [];
		session.subscribe(event => {
			if (event.type === "ttsr_triggered") {
				ttsr_triggered_events.push(event as any);
			}
		});

		// First matching write
		await session.prompt("Write first function");
		await session.waitForIdle();
		const eventsAfterFirst = ttsr_triggered_events.length;

		// Verify rule triggered on first write
		expect(eventsAfterFirst).toBeGreaterThan(0);
		const firstTriggeredRules = ttsr_triggered_events.flatMap(e => e.rules);
		expect(firstTriggeredRules.some(r => r.name === "function-detect")).toBe(true);

		// Check that rule was marked as injected
		const injectedAfterFirst = ttsrManager.getInjectedRuleNames();
		expect(injectedAfterFirst).toContain("function-detect");

		// Second matching write - rule should NOT trigger again due to once mode
		await session.prompt("Write second function");
		await session.waitForIdle();

		// No new events should be triggered on second matching write
		expect(ttsr_triggered_events.length).toBe(eventsAfterFirst);
	});

	it("beforeToolCall checks astCondition for edit tool with matching post-edit content", async () => {
		const model = getBundledModel("anthropic", "claude-sonnet-4-5")!;
		const editTool = new EditTool(createToolSession());
		const ttsrManager = new TtsrManager();
		const rule = makeRule({
			name: "export-detect",
			scope: ["tool:edit"],
			astCondition: ["export function testFn() {}"],
		});
		ttsrManager.addRule(rule);

		// Create a temp file with initial content
		// Create a temp file with function that will be exported after edit
		const testFile = path.join(tempDir, "test.ts");
		fs.writeFileSync(testFile, "function testFn() {}\n");

		let callCount = 0;
		const agent = new Agent({
			initialState: {
				model,
				systemPrompt: ["Test"],
				tools: [editTool],
				messages: [],
			},
			streamFn: () => {
				callCount++;
				const stream = new AssistantMessageEventStream();
				queueMicrotask(() => {
					if (callCount === 1) {
						const toolCall: ToolCall = {
							type: "toolCall",
							id: "edit-call-1",
							name: "edit",
							arguments: {
								path: testFile,
								edits: [
									{
										old_text: "function testFn() {}",
										new_text: "export function testFn() {}",
									},
								],
							},
						};
						stream.push(assistantMessageWithCalls([toolCall]));
						const message = {
							role: "assistant" as const,
							content: [toolCall],
							api: model.api,
							provider: model.provider,
							model: model.id,
							usage: {
								input: 1,
								output: 1,
								cacheRead: 0,
								cacheWrite: 0,
								totalTokens: 2,
								cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
							},
							stopReason: "toolUse" as const,
							timestamp: Date.now(),
						};
						stream.push({ type: "done", reason: "toolUse", message });
					} else {
						const message = {
							role: "assistant" as const,
							content: [{ type: "text" as const, text: "Done" }],
							api: model.api,
							provider: model.provider,
							model: model.id,
							usage: {
								input: 1,
								output: 1,
								cacheRead: 0,
								cacheWrite: 0,
								totalTokens: 2,
								cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
							},
							stopReason: "stop" as const,
							timestamp: Date.now(),
						};
						stream.push({ type: "start", partial: message });
						stream.push({ type: "done", reason: "stop", message });
					}
					stream.end();
				});
				return stream;
			},
		});

		const sessionManager = SessionManager.inMemory();
		session = new AgentSession({
			agent,
			sessionManager,
			settings: Settings.isolated({ "compaction.enabled": false }),
			ttsrManager,
			modelRegistry,
			toolRegistry: new Map([[editTool.name, editTool as AgentTool]]),
		});

		const ttsr_triggered_events: Array<{ type: string; rules: Rule[] }> = [];
		session.subscribe(event => {
			if (event.type === "ttsr_triggered") {
				ttsr_triggered_events.push(event as any);
			}
		});

		// Verify file was created with initial content
		const initialContent = fs.readFileSync(testFile, "utf8");
		expect(initialContent).toContain("function testFn() {}");

		await session.prompt("Export the function");
		await session.waitForIdle();

		// Verify ttsr_triggered event was emitted with matching rule
		expect(ttsr_triggered_events.length).toBeGreaterThan(0);
		const triggeredRules = ttsr_triggered_events.flatMap(e => e.rules);
		expect(triggeredRules.some(r => r.name === "export-detect")).toBe(true);
	});
});
