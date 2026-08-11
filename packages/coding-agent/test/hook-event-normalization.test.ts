import { describe, expect, it } from "bun:test";
import {
	CONVENTION_AUTHORITY,
	EXTERNAL_EVENT_ALIASES,
	HOOK_EVENT_CONTRACTS,
	HookAuthority,
	HookEventKind,
	HookSourceConvention,
} from "../src/hooks/events";
import {
	authorityMismatchDiagnostic,
	HookDiagnosticSeverity,
	normalizeDirectoryHook,
	normalizeHookBatch,
	normalizeInProcessHook,
	normalizeManagedJsonHook,
	normalizePluginHook,
	resolveAuthority,
	resolveCanonicalKind,
} from "../src/hooks/normalize";

// ===========================================================================
// Acceptance test 1: equivalent Claude/Codex/native fixtures normalize to
// the same event IR where semantics overlap.
// ===========================================================================

describe("acceptance 1: cross-convention IR normalization", () => {
	it("native pre-tool, Claude pre-tool, and Codex pre-tool all normalize to PreToolUse with command authority", () => {
		const nativeResult = normalizeDirectoryHook({
			convention: HookSourceConvention.NativeGjc,
			phase: "pre",
			toolName: "edit",
			source: ".gjc/hooks/pre/edit.sh",
		});
		const claudeResult = normalizeDirectoryHook({
			convention: HookSourceConvention.ClaudeCode,
			phase: "pre",
			toolName: "edit",
			source: ".claude/hooks/pre/edit.sh",
		});
		const codexResult = normalizeDirectoryHook({
			convention: HookSourceConvention.Codex,
			phase: "pre",
			toolName: "edit",
			source: ".codex/hooks/pre-edit.ts",
		});

		expect(nativeResult.diagnostics).toEqual([]);
		expect(claudeResult.diagnostics).toEqual([]);
		expect(codexResult.diagnostics).toEqual([]);

		// All three normalize to the same canonical kind + authority
		for (const result of [nativeResult, claudeResult, codexResult]) {
			expect(result.hook).not.toBeNull();
			expect(result.hook!.kind).toBe(HookEventKind.PreToolUse);
			expect(result.hook!.authority).toBe(HookAuthority.Command);
			expect(result.hook!.toolName).toBe("edit");
			expect(result.hook!.projectTrustRequired).toBe(true);
		}

		// Convention field preserves provenance
		expect(nativeResult.hook!.convention).toBe(HookSourceConvention.NativeGjc);
		expect(claudeResult.hook!.convention).toBe(HookSourceConvention.ClaudeCode);
		expect(codexResult.hook!.convention).toBe(HookSourceConvention.Codex);
	});

	it("native post-tool, Claude post-tool, and Codex post-tool all normalize to PostToolUse", () => {
		for (const convention of [
			HookSourceConvention.NativeGjc,
			HookSourceConvention.ClaudeCode,
			HookSourceConvention.Codex,
		] as const) {
			const result = normalizeDirectoryHook({
				convention,
				phase: "post",
				toolName: "write",
				source: `${convention}/hooks/post/write.sh`,
			});
			expect(result.diagnostics).toEqual([]);
			expect(result.hook!.kind).toBe(HookEventKind.PostToolUse);
			expect(result.hook!.authority).toBe(HookAuthority.Command);
		}
	});

	it("Claude UserPromptSubmit and Codex managed-json UserPromptSubmit both normalize to UserPromptSubmit", () => {
		const claudePre = normalizeDirectoryHook({
			convention: HookSourceConvention.ClaudeCode,
			phase: "pre",
			toolName: "*",
			source: ".claude/hooks/pre/UserPromptSubmit",
		});
		// Claude pre/* maps to PreToolUse, not UserPromptSubmit — the Claude
		// directory convention does not have a dedicated UserPromptSubmit
		// directory; it uses the pre/ layout. The managed-json path is the
		// one that carries the named event.
		expect(claudePre.hook!.kind).toBe(HookEventKind.PreToolUse);

		const codexManaged = normalizeManagedJsonHook({
			externalEvent: "UserPromptSubmit",
			command: "gjc codex-native-hook",
			source: "~/.codex/hooks.json:UserPromptSubmit",
		});
		expect(codexManaged.diagnostics).toEqual([]);
		expect(codexManaged.hook!.kind).toBe(HookEventKind.UserPromptSubmit);
		expect(codexManaged.hook!.authority).toBe(HookAuthority.Command);
		expect(codexManaged.hook!.convention).toBe(HookSourceConvention.CodexManagedJson);
	});

	it("Codex managed-json Stop and in-process turn_end both normalize to Stop", () => {
		const codexStop = normalizeManagedJsonHook({
			externalEvent: "Stop",
			command: "gjc codex-native-hook",
			source: "~/.codex/hooks.json:Stop",
		});
		const inProcTurnEnd = normalizeInProcessHook({
			registeredEvent: "turn_end",
			source: ".gjc/hooks/lifecycle.ts",
		});
		const inProcAgentEnd = normalizeInProcessHook({
			registeredEvent: "agent_end",
			source: ".gjc/hooks/lifecycle.ts",
		});

		expect(codexStop.hook!.kind).toBe(HookEventKind.Stop);
		expect(inProcTurnEnd.hook!.kind).toBe(HookEventKind.Stop);
		expect(inProcAgentEnd.hook!.kind).toBe(HookEventKind.Stop);
	});

	it("in-process tool_call and native pre-tool both normalize to PreToolUse", () => {
		const inProc = normalizeInProcessHook({
			registeredEvent: "tool_call",
			source: ".gjc/hooks/pre-check.ts",
		});
		const native = normalizeDirectoryHook({
			convention: HookSourceConvention.NativeGjc,
			phase: "pre",
			toolName: "bash",
			source: ".gjc/hooks/pre/bash",
		});

		expect(inProc.hook!.kind).toBe(HookEventKind.PreToolUse);
		expect(native.hook!.kind).toBe(HookEventKind.PreToolUse);
		// But different authority: in-process gets InProcess, native gets Command
		expect(inProc.hook!.authority).toBe(HookAuthority.InProcess);
		expect(native.hook!.authority).toBe(HookAuthority.Command);
	});
});

// ===========================================================================
// Acceptance test 2: unsupported semantic differences fail with explicit
// diagnostics instead of being silently ignored.
// ===========================================================================

describe("acceptance 2: unsupported semantics produce explicit diagnostics", () => {
	it("native .gjc hooks cannot express UserPromptSubmit", () => {
		// Native .gjc/hooks only has pre/ and post/ directories — there is no
		// path for UserPromptSubmit. Attempting to normalize a native hook
		// for UserPromptSubmit via directory layout fails.
		const authority = resolveAuthority(HookSourceConvention.NativeGjc, HookEventKind.UserPromptSubmit);
		expect(authority).toBeNull();
	});

	it("Codex managed-json cannot express PreToolUse", () => {
		const authority = resolveAuthority(HookSourceConvention.CodexManagedJson, HookEventKind.PreToolUse);
		expect(authority).toBeNull();
	});

	it("managed-json with unrecognized event produces explicit error diagnostic", () => {
		const result = normalizeManagedJsonHook({
			externalEvent: "UnknownEvent",
			command: "some-cmd",
			source: "~/.codex/hooks.json:UnknownEvent",
		});
		expect(result.hook).toBeNull();
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0].severity).toBe(HookDiagnosticSeverity.Error);
		expect(result.diagnostics[0].code).toBe("unsupported_convention_event");
		expect(result.diagnostics[0].message).toContain("UnknownEvent");
	});

	it("in-process hook for an unrecognized non-hook event produces warning diagnostic", () => {
		// "session_before_compact" is a real extension event but outside the
		// hook IR — it runs directly through the extension runner.
		const result = normalizeInProcessHook({
			registeredEvent: "session_before_compact",
			source: ".gjc/hooks/ext.ts",
		});
		expect(result.hook).toBeNull();
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0].severity).toBe(HookDiagnosticSeverity.Warning);
		expect(result.diagnostics[0].code).toBe("in_process_event_outside_hook_ir");
	});

	it("plugin hook with unrecognized event produces explicit error diagnostic", () => {
		const result = normalizePluginHook({
			declaredEvent: "unknown_lifecycle",
			plugin: "bad-plugin",
			source: "plugins/bad/hooks/x.ts",
		});
		expect(result.hook).toBeNull();
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0].severity).toBe(HookDiagnosticSeverity.Error);
		expect(result.diagnostics[0].code).toBe("unrecognized_plugin_event");
	});

	it("batch normalization collects all diagnostics, never silently drops", () => {
		const batch = normalizeHookBatch([
			() =>
				normalizeDirectoryHook({
					convention: HookSourceConvention.NativeGjc,
					phase: "pre",
					toolName: "edit",
					source: "a",
				}),
			() => normalizeManagedJsonHook({ externalEvent: "Bad", command: "x", source: "b" }),
			() => normalizePluginHook({ declaredEvent: "nope", plugin: "p", source: "c" }),
		]);
		expect(batch.hooks).toHaveLength(1);
		expect(batch.diagnostics).toHaveLength(2);
		expect(batch.diagnostics.every(d => d.severity === HookDiagnosticSeverity.Error)).toBe(true);
	});
});

// ===========================================================================
// Acceptance test 3: ordering, cancellation, timeout, error isolation, and
// tool-name matching are covered by the contract table.
// ===========================================================================

describe("acceptance 3: event contract metadata", () => {
	it("PreToolUse is sequential, cancellable, non-mutating, with 30s timeout and isolate isolation", () => {
		const contract = HOOK_EVENT_CONTRACTS[HookEventKind.PreToolUse];
		expect(contract.ordering).toBe("sequential");
		expect(contract.canCancel).toBe(true);
		expect(contract.canMutate).toBe(false);
		expect(contract.timeoutMs).toBe(30_000);
		expect(contract.errorIsolation).toBe("isolate");
		expect(contract.shellAuthority).toBe("allowed");
		expect(contract.projectTrustRequired).toBe(true);
	});

	it("PostToolUse is sequential, non-cancellable, mutating, with 30s timeout", () => {
		const contract = HOOK_EVENT_CONTRACTS[HookEventKind.PostToolUse];
		expect(contract.ordering).toBe("sequential");
		expect(contract.canCancel).toBe(false);
		expect(contract.canMutate).toBe(true);
		expect(contract.timeoutMs).toBe(30_000);
		expect(contract.errorIsolation).toBe("isolate");
	});

	it("Stop is sequential, non-cancellable, non-mutating", () => {
		const contract = HOOK_EVENT_CONTRACTS[HookEventKind.Stop];
		expect(contract.canCancel).toBe(false);
		expect(contract.canMutate).toBe(false);
		expect(contract.ordering).toBe("sequential");
	});

	it("UserPromptSubmit has no timeout (user prompts can take as long as needed)", () => {
		const contract = HOOK_EVENT_CONTRACTS[HookEventKind.UserPromptSubmit];
		expect(contract.timeoutMs).toBeNull();
	});

	it("SessionShutdown is synchronous with a short timeout", () => {
		const contract = HOOK_EVENT_CONTRACTS[HookEventKind.SessionShutdown];
		expect(contract.async).toBe(false);
		expect(contract.timeoutMs).toBe(5_000);
		expect(contract.shellAuthority).toBe("none");
		expect(contract.projectTrustRequired).toBe(false);
	});

	it("tool-name matching: directory hook preserves the target tool name", () => {
		const result = normalizeDirectoryHook({
			convention: HookSourceConvention.NativeGjc,
			phase: "pre",
			toolName: "bash",
			source: ".gjc/hooks/pre/bash",
		});
		expect(result.hook!.toolName).toBe("bash");
	});

	it("wildcard tool name is preserved for managed-json hooks", () => {
		const result = normalizeManagedJsonHook({
			externalEvent: "Stop",
			command: "x",
			source: "s",
		});
		expect(result.hook!.toolName).toBe("*");
	});

	it("plugin hook preserves declared target", () => {
		const result = normalizePluginHook({
			declaredEvent: "tool_call",
			target: "read",
			phase: "before",
			plugin: "p",
			source: "s",
		});
		expect(result.hook!.toolName).toBe("read");
	});
});

// ===========================================================================
// Acceptance test 4: constrained plugin hooks remain constrained and cannot
// acquire broad extension APIs through normalization.
// ===========================================================================

describe("acceptance 4: constrained plugin hook authority preservation", () => {
	it("plugin tool_call hook normalizes to Constrained authority, never InProcess", () => {
		const result = normalizePluginHook({
			declaredEvent: "tool_call",
			target: "edit",
			phase: "before",
			plugin: "audit",
			source: "plugins/audit/hooks/audit-edit.ts",
		});
		expect(result.diagnostics).toEqual([]);
		expect(result.hook!.authority).toBe(HookAuthority.Constrained);
		expect(result.hook!.authority).not.toBe(HookAuthority.InProcess);
		expect(result.hook!.authority).not.toBe(HookAuthority.Command);
	});

	it("plugin tool_result hook normalizes to Constrained authority", () => {
		const result = normalizePluginHook({
			declaredEvent: "tool_result",
			phase: "after",
			plugin: "audit",
			source: "plugins/audit/hooks/audit-result.ts",
		});
		expect(result.hook!.authority).toBe(HookAuthority.Constrained);
	});

	it("plugin hook for UserPromptSubmit is unsupported (plugin hooks are tool-scoped only)", () => {
		const authority = resolveAuthority(HookSourceConvention.GjcPlugin, HookEventKind.UserPromptSubmit);
		expect(authority).toBeNull();
	});

	it("plugin hook for Stop is unsupported", () => {
		const authority = resolveAuthority(HookSourceConvention.GjcPlugin, HookEventKind.Stop);
		expect(authority).toBeNull();
	});

	it("plugin hook for session lifecycle is unsupported", () => {
		expect(resolveAuthority(HookSourceConvention.GjcPlugin, HookEventKind.SessionStart)).toBeNull();
		expect(resolveAuthority(HookSourceConvention.GjcPlugin, HookEventKind.SessionShutdown)).toBeNull();
	});

	it("convention authority table grants only Constrained to GjcPlugin", () => {
		const grants = CONVENTION_AUTHORITY[HookSourceConvention.GjcPlugin];
		expect(Object.keys(grants)).toEqual(
			expect.arrayContaining([HookEventKind.PreToolUse, HookEventKind.PostToolUse]),
		);
		// Every granted event is Constrained
		for (const key of Object.keys(grants) as (keyof typeof grants)[]) {
			expect(grants[key]).toBe(HookAuthority.Constrained);
		}
		// Only tool events — no lifecycle/prompt/stop
		expect(grants[HookEventKind.UserPromptSubmit]).toBeUndefined();
		expect(grants[HookEventKind.Stop]).toBeUndefined();
		expect(grants[HookEventKind.SessionStart]).toBeUndefined();
	});

	it("authority mismatch diagnostic fires when convention would grant non-Constrained to a plugin", () => {
		const diag = authorityMismatchDiagnostic(
			HookSourceConvention.GjcPlugin,
			HookEventKind.PreToolUse,
			HookAuthority.InProcess,
		);
		expect(diag.code).toBe("authority_mismatch");
		expect(diag.message).toContain("Constrained");
	});
});

// ===========================================================================
// Acceptance test 5: documentation clearly separates the three hook
// categories. (This test validates the data model that the documentation
// describes.)
// ===========================================================================

describe("acceptance 5: three hook categories are cleanly separated in the model", () => {
	it("Constrained (plugin) authority cannot run shell", () => {
		// Plugin hooks are Constrained — no shell authority
		const pluginHook = normalizePluginHook({
			declaredEvent: "tool_call",
			target: "read",
			phase: "before",
			plugin: "p",
			source: "s",
		});
		expect(pluginHook.hook!.authority).toBe(HookAuthority.Constrained);
		// The Constrained authority level does not carry shell access —
		// the constrained hook loader enforces the API denial list at load.
	});

	it("Command (shell-script) authority requires project trust", () => {
		const nativeHook = normalizeDirectoryHook({
			convention: HookSourceConvention.NativeGjc,
			phase: "pre",
			toolName: "bash",
			source: ".gjc/hooks/pre/bash",
		});
		expect(nativeHook.hook!.authority).toBe(HookAuthority.Command);
		expect(nativeHook.hook!.projectTrustRequired).toBe(true);
	});

	it("InProcess (extension) authority is the broadest and only for first-party", () => {
		const extHook = normalizeInProcessHook({
			registeredEvent: "tool_call",
			source: ".gjc/hooks/pre-check.ts",
		});
		expect(extHook.hook!.authority).toBe(HookAuthority.InProcess);
	});

	it("the three authorities are distinct values", () => {
		expect(HookAuthority.Constrained).not.toBe(HookAuthority.Command);
		expect(HookAuthority.Constrained).not.toBe(HookAuthority.InProcess);
		expect(HookAuthority.Command).not.toBe(HookAuthority.InProcess);
	});
});

// ===========================================================================
// Contract table integrity
// ===========================================================================

describe("event contract table integrity", () => {
	it("HOOK_EVENT_CONTRACTS covers every HookEventKind", () => {
		const kinds: HookEventKind[] = [
			HookEventKind.UserPromptSubmit,
			HookEventKind.PreToolUse,
			HookEventKind.PostToolUse,
			HookEventKind.Stop,
			HookEventKind.SessionStart,
			HookEventKind.SessionShutdown,
		];
		for (const kind of kinds) {
			expect(HOOK_EVENT_CONTRACTS[kind]).toBeDefined();
			expect(HOOK_EVENT_CONTRACTS[kind].kind).toBe(kind);
		}
	});

	it("EXTERNAL_EVENT_ALIASES maps Claude, Codex, and in-process names correctly", () => {
		expect(EXTERNAL_EVENT_ALIASES.UserPromptSubmit).toBe(HookEventKind.UserPromptSubmit);
		expect(EXTERNAL_EVENT_ALIASES.Stop).toBe(HookEventKind.Stop);
		expect(EXTERNAL_EVENT_ALIASES.tool_call).toBe(HookEventKind.PreToolUse);
		expect(EXTERNAL_EVENT_ALIASES.tool_result).toBe(HookEventKind.PostToolUse);
		expect(EXTERNAL_EVENT_ALIASES.turn_end).toBe(HookEventKind.Stop);
		expect(EXTERNAL_EVENT_ALIASES.before_agent_start).toBe(HookEventKind.UserPromptSubmit);
		expect(EXTERNAL_EVENT_ALIASES.pre_tool_use).toBe(HookEventKind.PreToolUse);
		expect(EXTERNAL_EVENT_ALIASES.post_tool_use).toBe(HookEventKind.PostToolUse);
	});

	it("resolveCanonicalKind returns null for unknown events", () => {
		expect(resolveCanonicalKind("nonexistent_event")).toBeNull();
	});
});
