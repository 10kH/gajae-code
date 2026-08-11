/**
 * Hook normalization adapters.
 *
 * Convert the six hook surfaces into the canonical {@link HookEvent} IR.
 *
 * Surfaces handled:
 *  1. Native `.gjc/hooks/{pre,post}/<tool>` shell scripts.
 *  2. Claude `.claude/hooks/{pre,post}/<tool>` shell scripts.
 *  3. Codex `.codex/hooks/{pre,post}-<tool>.{ts,js}` modules.
 *  4. Codex `hooks.json` managed events (`UserPromptSubmit`, `Stop`).
 *  5. GJC plugin bundle constrained hooks.
 *  6. In-process extension hooks.
 *
 * When semantics overlap, the fixtures normalize to the same IR. When
 * authority or semantics differ irreconcilably, the adapter emits an
 * explicit {@link HookNormalizationDiagnostic} instead of silently
 * ignoring the mapping.
 */

import {
	CONVENTION_AUTHORITY,
	EXTERNAL_EVENT_ALIASES,
	HOOK_EVENT_CONTRACTS,
	HookAuthority,
	HookEventKind,
	HookSourceConvention,
} from "./events";

/**
 * Severity of a normalization diagnostic.
 */
export const HookDiagnosticSeverity = {
	Error: "error",
	Warning: "warning",
} as const;

export type HookDiagnosticSeverity = (typeof HookDiagnosticSeverity)[keyof typeof HookDiagnosticSeverity];

/**
 * Diagnostic emitted when a hook surface cannot be cleanly normalized to
 * the canonical IR.
 */
export interface HookNormalizationDiagnostic {
	severity: HookDiagnosticSeverity;
	code: string;
	message: string;
	convention: HookSourceConvention;
	externalEvent?: string;
	canonicalKind?: HookEventKind;
}

/**
 * A hook that has been normalized to the canonical IR.
 */
export interface NormalizedHook {
	/** Canonical event kind. */
	kind: HookEventKind;
	/** Authority granted to this hook. */
	authority: HookAuthority;
	/** Source convention. */
	convention: HookSourceConvention;
	/** Tool name target (for pre/post tool events), or `*` for all. */
	toolName: string;
	/** Human-readable source path or descriptor. */
	source: string;
	/** Whether this is a project-trust-gated hook. */
	projectTrustRequired: boolean;
}

/**
 * Result of normalizing a hook surface.
 */
export interface NormalizeHookResult {
	hook: NormalizedHook | null;
	diagnostics: HookNormalizationDiagnostic[];
}

// ---------------------------------------------------------------------------
// Authority resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the authority a convention grants for a canonical event kind.
 * Returns `null` if the convention does not support that event, which the
 * caller MUST surface as an explicit diagnostic.
 */
export function resolveAuthority(convention: HookSourceConvention, kind: HookEventKind): HookAuthority | null {
	return CONVENTION_AUTHORITY[convention][kind] ?? null;
}

/**
 * Resolve an external event name to a canonical kind.
 * Returns `null` if the name is unrecognized.
 */
export function resolveCanonicalKind(externalEvent: string): HookEventKind | null {
	return EXTERNAL_EVENT_ALIASES[externalEvent] ?? null;
}

// ---------------------------------------------------------------------------
// Diagnostics for unsupported semantic differences
// ---------------------------------------------------------------------------

/**
 * Build a diagnostic for an event a convention does not support.
 */
export function unsupportedEventDiagnostic(
	convention: HookSourceConvention,
	externalEvent: string,
	canonicalKind: HookEventKind | null,
): HookNormalizationDiagnostic {
	return {
		severity: HookDiagnosticSeverity.Error,
		code: "unsupported_convention_event",
		message: canonicalKind
			? `Convention "${convention}" does not support canonical event "${canonicalKind}". The hook is ignored and must be migrated to a supported convention.`
			: `Convention "${convention}" received unrecognized external event "${externalEvent}". The hook is ignored.`,
		convention,
		externalEvent,
		canonicalKind: canonicalKind ?? undefined,
	};
}

/**
 * Build a diagnostic for an authority mismatch — when the requested
 * authority exceeds what the convention is allowed to grant.
 */
export function authorityMismatchDiagnostic(
	convention: HookSourceConvention,
	kind: HookEventKind,
	requested: HookAuthority,
): HookNormalizationDiagnostic {
	return {
		severity: HookDiagnosticSeverity.Error,
		code: "authority_mismatch",
		message: `Convention "${convention}" cannot grant "${requested}" authority for event "${kind}". Constrained plugin hooks cannot acquire broad extension APIs through normalization.`,
		convention,
		canonicalKind: kind,
	};
}

// ---------------------------------------------------------------------------
// Pre/post directory hook normalization (native, Claude, Codex)
// ---------------------------------------------------------------------------

export interface DirectoryHookInput {
	/** Source convention. */
	convention: HookSourceConvention;
	/** "pre" → PreToolUse, "post" → PostToolUse. */
	phase: "pre" | "post";
	/** Tool name derived from filename, or `*` for all tools. */
	toolName: string;
	/** Source file path for diagnostics. */
	source: string;
}

/**
 * Normalize a pre/post directory hook (native `.gjc/hooks`, Claude
 * `.claude/hooks`, Codex `.codex/hooks`) to the canonical IR.
 *
 * These all map cleanly: pre → PreToolUse, post → PostToolUse, with
 * command authority.
 */
export function normalizeDirectoryHook(input: DirectoryHookInput): NormalizeHookResult {
	const kind = input.phase === "pre" ? HookEventKind.PreToolUse : HookEventKind.PostToolUse;
	const authority = resolveAuthority(input.convention, kind);

	if (!authority) {
		return {
			hook: null,
			diagnostics: [unsupportedEventDiagnostic(input.convention, input.phase, kind)],
		};
	}

	return {
		hook: {
			kind,
			authority,
			convention: input.convention,
			toolName: input.toolName,
			source: input.source,
			projectTrustRequired: HOOK_EVENT_CONTRACTS[kind].projectTrustRequired,
		},
		diagnostics: [],
	};
}

// ---------------------------------------------------------------------------
// Codex hooks.json managed integration normalization
// ---------------------------------------------------------------------------

export interface ManagedJsonHookInput {
	/** External event name from hooks.json (e.g. "UserPromptSubmit", "Stop"). */
	externalEvent: string;
	/** Command string from hooks.json. */
	command: string;
	/** Source descriptor. */
	source: string;
}

/**
 * Normalize a Codex `hooks.json` managed hook to the canonical IR.
 *
 * `UserPromptSubmit` → UserPromptSubmit, `Stop` → Stop. Both get command
 * authority via the CodexManagedJson convention.
 */
export function normalizeManagedJsonHook(input: ManagedJsonHookInput): NormalizeHookResult {
	const kind = resolveCanonicalKind(input.externalEvent);

	if (!kind) {
		return {
			hook: null,
			diagnostics: [unsupportedEventDiagnostic(HookSourceConvention.CodexManagedJson, input.externalEvent, null)],
		};
	}

	const authority = resolveAuthority(HookSourceConvention.CodexManagedJson, kind);

	if (!authority) {
		return {
			hook: null,
			diagnostics: [unsupportedEventDiagnostic(HookSourceConvention.CodexManagedJson, input.externalEvent, kind)],
		};
	}

	return {
		hook: {
			kind,
			authority,
			convention: HookSourceConvention.CodexManagedJson,
			toolName: "*",
			source: input.source,
			projectTrustRequired: HOOK_EVENT_CONTRACTS[kind].projectTrustRequired,
		},
		diagnostics: [],
	};
}

// ---------------------------------------------------------------------------
// GJC plugin constrained hook normalization
// ---------------------------------------------------------------------------

export interface PluginHookInput {
	/** Event name declared in the manifest (e.g. "tool_call", "tool_result"). */
	declaredEvent: string;
	/** Target tool name, if any. */
	target?: string;
	/** Phase: "before" → pre, "after" → post. */
	phase?: "before" | "after";
	/** Plugin name for diagnostics. */
	plugin: string;
	/** Source descriptor. */
	source: string;
}

/**
 * Normalize a GJC plugin bundle constrained hook to the canonical IR.
 *
 * Plugin hooks are ALWAYS constrained authority regardless of event. This
 * function enforces that: if the event resolves to a canonical kind but
 * the convention only grants Constrained, the hook is normalized with
 * Constrained authority. The constrained hook loader separately enforces
 * the API denial list at load time; this function is the normalization
 * contract layer.
 */
export function normalizePluginHook(input: PluginHookInput): NormalizeHookResult {
	// Map plugin event names to canonical kinds
	let kind: HookEventKind | null = null;

	if (input.declaredEvent === "tool_call") {
		kind = HookEventKind.PreToolUse;
	} else if (input.declaredEvent === "tool_result") {
		// tool_result with phase "after" is post-tool; "before" is unusual but
		// maps to pre-tool in the constrained model (observes before result).
		kind = input.phase === "before" ? HookEventKind.PreToolUse : HookEventKind.PostToolUse;
	} else {
		kind = resolveCanonicalKind(input.declaredEvent);
	}

	if (!kind) {
		return {
			hook: null,
			diagnostics: [
				{
					severity: HookDiagnosticSeverity.Error,
					code: "unrecognized_plugin_event",
					message: `Plugin "${input.plugin}" declared unrecognized hook event "${input.declaredEvent}". The hook is quarantined.`,
					convention: HookSourceConvention.GjcPlugin,
					externalEvent: input.declaredEvent,
				},
			],
		};
	}

	const grantedAuthority = resolveAuthority(HookSourceConvention.GjcPlugin, kind);

	if (!grantedAuthority) {
		return {
			hook: null,
			diagnostics: [unsupportedEventDiagnostic(HookSourceConvention.GjcPlugin, input.declaredEvent, kind)],
		};
	}

	// Plugin hooks are always Constrained — even if the event kind could
	// theoretically support higher authority in other conventions.
	if (grantedAuthority !== HookAuthority.Constrained) {
		return {
			hook: null,
			diagnostics: [authorityMismatchDiagnostic(HookSourceConvention.GjcPlugin, kind, grantedAuthority)],
		};
	}

	return {
		hook: {
			kind,
			authority: HookAuthority.Constrained,
			convention: HookSourceConvention.GjcPlugin,
			toolName: input.target ?? "*",
			source: input.source,
			projectTrustRequired: false,
		},
		diagnostics: [],
	};
}

// ---------------------------------------------------------------------------
// In-process extension hook normalization
// ---------------------------------------------------------------------------

export interface InProcessHookInput {
	/** Event name registered via `pi.on()`. */
	registeredEvent: string;
	/** Source descriptor (hook file path). */
	source: string;
}

/**
 * Normalize an in-process extension hook registration to the canonical IR.
 *
 * In-process hooks get InProcess authority — the broadest level — but are
 * first-party/user-installed only and not distributable.
 */
export function normalizeInProcessHook(input: InProcessHookInput): NormalizeHookResult {
	const kind = resolveCanonicalKind(input.registeredEvent);

	if (!kind) {
		// In-process hooks can register for arbitrary events (e.g.
		// session_before_compact, context). Those are not in the canonical
		// hook IR because they are lifecycle/context events handled by the
		// extension runner directly, not the hook normalization layer.
		return {
			hook: null,
			diagnostics: [
				{
					severity: HookDiagnosticSeverity.Warning,
					code: "in_process_event_outside_hook_ir",
					message: `In-process hook registered for "${input.registeredEvent}" which is outside the canonical hook event IR. It runs via the extension runner directly and is not normalized.`,
					convention: HookSourceConvention.InProcess,
					externalEvent: input.registeredEvent,
				},
			],
		};
	}

	return {
		hook: {
			kind,
			authority: HookAuthority.InProcess,
			convention: HookSourceConvention.InProcess,
			toolName: "*",
			source: input.source,
			projectTrustRequired: HOOK_EVENT_CONTRACTS[kind].projectTrustRequired,
		},
		diagnostics: [],
	};
}

// ---------------------------------------------------------------------------
// Batch normalization
// ---------------------------------------------------------------------------

export interface BatchNormalizeResult {
	hooks: NormalizedHook[];
	diagnostics: HookNormalizationDiagnostic[];
}

/**
 * Normalize a batch of hook surface inputs into the canonical IR.
 * Collects all diagnostics; never throws on individual failures.
 */
export function normalizeHookBatch(inputs: ReadonlyArray<() => NormalizeHookResult>): BatchNormalizeResult {
	const hooks: NormalizedHook[] = [];
	const diagnostics: HookNormalizationDiagnostic[] = [];

	for (const normalize of inputs) {
		const result = normalize();
		if (result.hook) hooks.push(result.hook);
		diagnostics.push(...result.diagnostics);
	}

	return { hooks, diagnostics };
}
