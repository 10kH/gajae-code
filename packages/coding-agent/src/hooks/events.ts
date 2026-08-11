/**
 * Canonical hook event IR.
 *
 * GJC has historically exposed multiple things called "hooks":
 *
 *  1. Native pre/post shell-script hooks (`.gjc/hooks/{pre,post}/<tool>`).
 *  2. Claude project hooks (`.claude/hooks/{pre,post}/<tool>`).
 *  3. Codex project hooks (`.codex/hooks/{pre,post}-<tool>.{ts,js}`).
 *  4. Codex `hooks.json` managed integration (`UserPromptSubmit`/`Stop`).
 *  5. Constrained plugin hooks (GJC plugin bundles with `hooks: [...]`).
 *  6. In-process extension hooks (`extensibility/hooks/` with full HookAPI).
 *
 * This module defines ONE canonical internal event model. External
 * conventions (Claude Code, Codex, native `.gjc`) normalize to it via the
 * adapters in `normalize.ts`. The in-process extension runner and the
 * constrained plugin hook loader are the runtime execution surfaces; this IR
 * is the stable contract they all target.
 *
 * Design rules enforced by the adapters and tests:
 *
 * - Events with overlapping semantics normalize to the same IR.
 * - Events with irreconcilable authority/semantic differences fail with
 *   explicit diagnostics, never silent ignore.
 * - Constrained plugin hooks cannot acquire broad extension APIs through
 *   normalization (authority is an enum, not an escape hatch).
 */

/**
 * Canonical hook event kind.
 *
 * These are the stable internal event names. External conventions map to
 * these; adapters reject mappings that would require authority a convention
 * does not have.
 */
export const HookEventKind = {
	/** User submitted a prompt. Maps to Codex `UserPromptSubmit`, Claude `UserPromptSubmit`. */
	UserPromptSubmit: "user_prompt_submit",
	/** Before a tool executes. Maps to native `.gjc/hooks/pre/*`, Claude `.claude/hooks/pre/*`, Codex `.codex/hooks/pre-*`, in-process `tool_call`. */
	PreToolUse: "pre_tool_use",
	/** After a tool executes / result available. Maps to native `.gjc/hooks/post/*`, Claude `.claude/hooks/post/*`, Codex `.codex/hooks/post-*`, in-process `tool_result`. */
	PostToolUse: "post_tool_use",
	/** Turn / agent loop end. Maps to Codex `Stop`, in-process `turn_end`/`agent_end`. */
	Stop: "stop",
	/** Session start. Maps to in-process `session_start`. Safe lifecycle event. */
	SessionStart: "session_start",
	/** Session shutdown. Maps to in-process `session_shutdown`. Safe lifecycle event. */
	SessionShutdown: "session_shutdown",
} as const;

export type HookEventKind = (typeof HookEventKind)[keyof typeof HookEventKind];

/**
 * Authority level a hook may exercise. This is the contract: adapters
 * normalize *to* a level and the runtime enforces it. Constrained plugin
 * hooks get `Constrained` — they can observe and return a structured result
 * but cannot call shell, send messages, or register commands.
 */
export const HookAuthority = {
	/**
	 * Constrained: observe event, return a structured result (block/modify).
	 * No shell, no message injection, no command registration. Used by
	 * distributable plugin hooks.
	 */
	Constrained: "constrained",
	/**
	 * Command: run an executable script (shell-script hooks in `.gjc/hooks`,
	 * `.claude/hooks`, `.codex/hooks`). Shell authority, project trust
	 * required, output parsed for block/exit semantics.
	 */
	Command: "command",
	/**
	 * In-process extension: full HookAPI access (sendMessage, appendEntry,
	 * registerCommand, exec). First-party only, user-installed, project
	 * trust required.
	 */
	InProcess: "in-process",
} as const;

export type HookAuthority = (typeof HookAuthority)[keyof typeof HookAuthority];

/**
 * The source convention a normalized hook originated from.
 */
export const HookSourceConvention = {
	NativeGjc: "native-gjc",
	ClaudeCode: "claude-code",
	Codex: "codex",
	CodexManagedJson: "codex-managed-json",
	GjcPlugin: "gjc-plugin",
	InProcess: "in-process",
} as const;

export type HookSourceConvention = (typeof HookSourceConvention)[keyof typeof HookSourceConvention];

// ---------------------------------------------------------------------------
// Canonical event payloads (input schemas)
// ---------------------------------------------------------------------------

export interface HookEventUserPromptSubmit {
	kind: "user_prompt_submit";
	prompt: string;
	sessionId?: string;
	threadId?: string;
}

export interface HookEventPreToolUse {
	kind: "pre_tool_use";
	toolName: string;
	toolCallId: string;
	input: Record<string, unknown>;
}

export interface HookEventPostToolUse {
	kind: "post_tool_use";
	toolName: string;
	toolCallId: string;
	input: Record<string, unknown>;
	content: ReadonlyArray<{ type: "text" | "image"; text?: string }>;
	isError: boolean;
}

export interface HookEventStop {
	kind: "stop";
	sessionId?: string;
	threadId?: string;
}

export interface HookEventSessionStart {
	kind: "session_start";
}

export interface HookEventSessionShutdown {
	kind: "session_shutdown";
}

/**
 * Union of all canonical hook event payloads.
 */
export type HookEvent =
	| HookEventUserPromptSubmit
	| HookEventPreToolUse
	| HookEventPostToolUse
	| HookEventStop
	| HookEventSessionStart
	| HookEventSessionShutdown;

// ---------------------------------------------------------------------------
// Canonical handler results (output schemas)
// ---------------------------------------------------------------------------

/**
 * Result a pre-tool-use hook can return to block or modify execution.
 */
export interface HookPreToolUseResult {
	/** Block tool execution with this reason. */
	block?: boolean;
	reason?: string;
}

/**
 * Result a post-tool-use hook can return to modify the displayed result.
 */
export interface HookPostToolUseResult {
	content?: ReadonlyArray<{ type: "text" | "image"; text?: string }>;
}

/**
 * Result for user-prompt-submit / stop / lifecycle events. Currently
 * observational; future iterations may add context injection.
 */
export interface HookObservationResult {
	/** Optional advisory message surfaced to the user, never mutates execution. */
	message?: string;
}

export type HookResult = HookPreToolUseResult | HookPostToolUseResult | HookObservationResult;

// ---------------------------------------------------------------------------
// Event contract metadata (documentation enforced as data)
// ---------------------------------------------------------------------------

export interface HookEventContract {
	kind: HookEventKind;
	/** Human-readable label. */
	label: string;
	/** Whether handlers are awaited sequentially (true) or may be fire-and-forget (false). */
	async: boolean;
	/** Ordering: "sequential" = handlers run in registration order, "parallel" = concurrent. */
	ordering: "sequential" | "parallel";
	/** Whether a handler can cancel/block the subsequent operation. */
	canCancel: boolean;
	/** Whether a handler can mutate the event payload or tool result. */
	canMutate: boolean;
	/** Default timeout in milliseconds, or `null` for no timeout. */
	timeoutMs: number | null;
	/**
	 * Error isolation policy:
	 * - "isolate": one handler's error does not stop others; the originating
	 *   operation proceeds unless a block result was already returned.
	 * - "abort": handler errors abort the event chain.
	 */
	errorIsolation: "isolate" | "abort";
	/** Shell/process authority required to run handlers for this event. */
	shellAuthority: "none" | "allowed";
	/** Whether project trust is required to execute handlers for this event. */
	projectTrustRequired: boolean;
	/** Secret redaction level applied to logged payloads. */
	secretRedaction: "full" | "keys-only" | "none";
}

/**
 * The authoritative contract for each canonical event kind.
 *
 * Tests assert this table is exhaustive and consistent.
 */
export const HOOK_EVENT_CONTRACTS: Record<HookEventKind, HookEventContract> = {
	[HookEventKind.UserPromptSubmit]: {
		kind: HookEventKind.UserPromptSubmit,
		label: "User Prompt Submit",
		async: true,
		ordering: "sequential",
		canCancel: false,
		canMutate: false,
		timeoutMs: null,
		errorIsolation: "isolate",
		shellAuthority: "allowed",
		projectTrustRequired: true,
		secretRedaction: "keys-only",
	},
	[HookEventKind.PreToolUse]: {
		kind: HookEventKind.PreToolUse,
		label: "Pre-Tool Use",
		async: true,
		ordering: "sequential",
		canCancel: true,
		canMutate: false,
		timeoutMs: 30_000,
		errorIsolation: "isolate",
		shellAuthority: "allowed",
		projectTrustRequired: true,
		secretRedaction: "keys-only",
	},
	[HookEventKind.PostToolUse]: {
		kind: HookEventKind.PostToolUse,
		label: "Post-Tool Use",
		async: true,
		ordering: "sequential",
		canCancel: false,
		canMutate: true,
		timeoutMs: 30_000,
		errorIsolation: "isolate",
		shellAuthority: "allowed",
		projectTrustRequired: true,
		secretRedaction: "keys-only",
	},
	[HookEventKind.Stop]: {
		kind: HookEventKind.Stop,
		label: "Stop / Turn End",
		async: true,
		ordering: "sequential",
		canCancel: false,
		canMutate: false,
		timeoutMs: 30_000,
		errorIsolation: "isolate",
		shellAuthority: "allowed",
		projectTrustRequired: true,
		secretRedaction: "full",
	},
	[HookEventKind.SessionStart]: {
		kind: HookEventKind.SessionStart,
		label: "Session Start",
		async: true,
		ordering: "sequential",
		canCancel: false,
		canMutate: false,
		timeoutMs: null,
		errorIsolation: "isolate",
		shellAuthority: "none",
		projectTrustRequired: false,
		secretRedaction: "full",
	},
	[HookEventKind.SessionShutdown]: {
		kind: HookEventKind.SessionShutdown,
		label: "Session Shutdown",
		async: false,
		ordering: "sequential",
		canCancel: false,
		canMutate: false,
		timeoutMs: 5_000,
		errorIsolation: "isolate",
		shellAuthority: "none",
		projectTrustRequired: false,
		secretRedaction: "full",
	},
};

/**
 * Authority each convention grants for each event kind. Events not listed
 * for a convention are unsupported and the adapter must emit a diagnostic.
 */
export const CONVENTION_AUTHORITY: Record<HookSourceConvention, Partial<Record<HookEventKind, HookAuthority>>> = {
	[HookSourceConvention.NativeGjc]: {
		[HookEventKind.PreToolUse]: HookAuthority.Command,
		[HookEventKind.PostToolUse]: HookAuthority.Command,
	},
	[HookSourceConvention.ClaudeCode]: {
		[HookEventKind.PreToolUse]: HookAuthority.Command,
		[HookEventKind.PostToolUse]: HookAuthority.Command,
		[HookEventKind.UserPromptSubmit]: HookAuthority.Command,
		[HookEventKind.Stop]: HookAuthority.Command,
	},
	[HookSourceConvention.Codex]: {
		[HookEventKind.PreToolUse]: HookAuthority.Command,
		[HookEventKind.PostToolUse]: HookAuthority.Command,
	},
	[HookSourceConvention.CodexManagedJson]: {
		[HookEventKind.UserPromptSubmit]: HookAuthority.Command,
		[HookEventKind.Stop]: HookAuthority.Command,
	},
	[HookSourceConvention.GjcPlugin]: {
		[HookEventKind.PreToolUse]: HookAuthority.Constrained,
		[HookEventKind.PostToolUse]: HookAuthority.Constrained,
	},
	[HookSourceConvention.InProcess]: {
		[HookEventKind.UserPromptSubmit]: HookAuthority.InProcess,
		[HookEventKind.PreToolUse]: HookAuthority.InProcess,
		[HookEventKind.PostToolUse]: HookAuthority.InProcess,
		[HookEventKind.Stop]: HookAuthority.InProcess,
		[HookEventKind.SessionStart]: HookAuthority.InProcess,
		[HookEventKind.SessionShutdown]: HookAuthority.InProcess,
	},
};

/**
 * External event-name aliases that map to canonical kinds. Keys are the
 * external names used by Claude Code / Codex / the in-process runner.
 */
export const EXTERNAL_EVENT_ALIASES: Readonly<Record<string, HookEventKind>> = {
	// Codex hooks.json managed events
	UserPromptSubmit: HookEventKind.UserPromptSubmit,
	Stop: HookEventKind.Stop,
	// Claude Code event names
	user_prompt_submit: HookEventKind.UserPromptSubmit,
	pre_tool_use: HookEventKind.PreToolUse,
	post_tool_use: HookEventKind.PostToolUse,
	stop: HookEventKind.Stop,
	// In-process extension runner event names
	before_agent_start: HookEventKind.UserPromptSubmit,
	tool_call: HookEventKind.PreToolUse,
	tool_result: HookEventKind.PostToolUse,
	turn_end: HookEventKind.Stop,
	agent_end: HookEventKind.Stop,
	session_start: HookEventKind.SessionStart,
	session_shutdown: HookEventKind.SessionShutdown,
};
