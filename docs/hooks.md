# Hooks

GJC exposes three distinct hook categories. They share a canonical event model but differ in authority, distribution, and trust. This document separates them clearly so you never need to understand separate runner internals.

> **TL;DR** — Use the table below to pick the right hook type, then read its section.

| Category | What it is | Authority | Distributable | Trust |
|----------|-----------|-----------|---------------|-------|
| **Command hooks** | Shell scripts in `.gjc/hooks/`, `.claude/hooks/`, `.codex/hooks/` or Codex `hooks.json` | Shell execution | Per-project files | Project trust required |
| **In-process extensions** | TypeScript hook modules with full `HookAPI` | Full (sendMessage, exec, commands) | First-party / user-installed only | Project trust required |
| **Distributable plugin hooks** | Hooks inside GJC plugin bundles (`gajae-plugin.json`) | Constrained (observe + structured result only) | Yes — installable from git/tarball | No shell, no message injection |

## Canonical event model

All three categories normalize to one internal event IR. Every event documents its ordering, cancellation, timeout, error behavior, and authority requirements.

| Canonical event | Claude Code name | Codex name | In-process name | Command hooks? | Plugin hooks? |
|----------------|-----------------|------------|-----------------|----------------|---------------|
| `user_prompt_submit` | `UserPromptSubmit` | `UserPromptSubmit` (hooks.json) | `before_agent_start` | hooks.json only | ✗ |
| `pre_tool_use` | `pre/` dir | `pre-*` file / `pre/` dir | `tool_call` | ✓ | ✓ |
| `post_tool_use` | `post/` dir | `post-*` file / `post/` dir | `tool_result` | ✓ | ✓ |
| `stop` | — | `Stop` (hooks.json) | `turn_end` / `agent_end` | hooks.json only | ✗ |
| `session_start` | — | — | `session_start` | — | ✗ |
| `session_shutdown` | — | — | `session_shutdown` | — | ✗ |

### Event contract reference

| Event | Async | Ordering | Can cancel | Can mutate | Timeout | Error isolation | Shell |
|-------|-------|----------|-----------|------------|---------|-----------------|-------|
| `user_prompt_submit` | yes | sequential | no | no | none | isolate | allowed |
| `pre_tool_use` | yes | sequential | **yes** (block) | no | 30s | isolate | allowed |
| `post_tool_use` | yes | sequential | no | **yes** (modify result) | 30s | isolate | allowed |
| `stop` | yes | sequential | no | no | 30s | isolate | allowed |
| `session_start` | yes | sequential | no | no | none | isolate | none |
| `session_shutdown` | no | sequential | no | no | 5s | isolate | none |

Key behaviors:
- **Sequential ordering**: handlers run in registration order; each is awaited before the next.
- **Error isolation**: a handler error does not stop other handlers; the originating operation proceeds unless a block result was already returned.
- **Pre-tool cancellation**: a `pre_tool_use` handler returning `{ block: true, reason: "..." }` stops the tool from executing.
- **Post-tool mutation**: a `post_tool_use` handler can return modified `{ content }` to change what the agent sees.
- **Secret redaction**: `pre_tool_use` and `post_tool_use` redact known secret keys from logged payloads; `user_prompt_submit` redacts values, keeping only keys for diagnostics.

---

## 1. Command hooks (shell scripts)

Shell scripts that run at tool execution boundaries. GJC discovers them from three directory conventions plus the Codex `hooks.json` managed integration.

### Native GJC hooks (`.gjc/hooks/`)

```
.gjc/hooks/
  pre/
    bash          # runs before the bash tool
    edit          # runs before the edit tool
    *             # runs before every tool
  post/
    bash          # runs after the bash tool
    write         # runs after the write tool
```

- File name (minus extension) = tool name, or `*` for all tools.
- `pre/` scripts run before the tool; `post/` scripts run after.
- Both user (`~/.gjc/hooks/`) and project (`.gjc/hooks/`) levels are discovered.

### Claude Code hooks (`.claude/hooks/`)

```
.claude/hooks/
  pre/
    edit.sh
  post/
    write.sh
```

Same layout as native GJC hooks. Discovered from the project `.claude/` directory. Extensions `.sh`, `.bash`, `.zsh`, `.fish` are stripped when deriving the tool name.

### Codex project hooks (`.codex/hooks/`)

```
.codex/hooks/
  pre-edit.ts      # runs before the edit tool
  post-write.js    # runs after the write tool
```

File names use the `pre-<tool>` / `post-<tool>` convention with `.ts` or `.js` extensions.

### Codex `hooks.json` managed integration

GJC installs a managed integration into `~/.codex/hooks.json` for `UserPromptSubmit` and `Stop` events:

```sh
gjc setup hooks           # install the managed hooks
gjc setup hooks --check   # verify installation
```

This wires `gjc codex-native-hook` as the command for those two events. The managed integration is merged idempotently — existing user hooks are preserved.

### Command hook semantics

- **Authority**: shell execution (Command).
- **Project trust**: required — command hooks run executables and are only loaded from trusted project/user directories.
- **Timeout**: `pre_tool_use` and `post_tool_use` have a 30-second default timeout.
- **Error behavior**: isolated — one hook's failure does not block others or the tool itself unless a pre-hook explicitly blocks.

---

## 2. In-process extension hooks

TypeScript modules that run inside the GJC process with full `HookAPI` access. These are first-party hooks installed by the user, not distributable.

### Layout

Hook modules are TypeScript files exporting a default factory:

```typescript
// ~/.gjc/hooks/my-hook.ts
import type { HookFactory } from "@gajae-code/coding-agent";

export default ((pi) => {
  // Register for canonical events via the in-process event names
  pi.on("tool_call", (event) => {
    if (event.toolName === "bash" && event.input.command?.includes("rm -rf")) {
      return { block: true, reason: "Destructive command blocked by hook" };
    }
  });

  pi.on("tool_result", (event) => {
    // Observe or modify results
  });

  pi.on("turn_end", () => {
    // Turn cleanup
  });
}) satisfies HookFactory;
```

### Available API

In-process hooks receive the full `HookAPI`:
- `pi.on(event, handler)` — subscribe to events.
- `pi.sendMessage(message)` — inject messages into the agent conversation.
- `pi.appendEntry(customType, data)` — append session entries.
- `pi.registerCommand(command)` — register slash commands.
- `pi.registerMessageRenderer(type, renderer)` — custom TUI rendering.
- `pi.exec(command, options)` — shell execution.

### Semantics

- **Authority**: InProcess (broadest — full API access).
- **Distribution**: first-party / user-installed only. Never loaded from distributable plugin bundles.
- **Trust**: project trust required.
- **Events**: all canonical events are available, plus additional lifecycle/context events (`session_before_compact`, `context`, `auto_compaction_start`, etc.) that run directly through the extension runner.

---

## 3. Distributable plugin hooks (GJC plugin bundles)

Hooks inside GJC plugin bundles (`gajae-plugin.json`). These are **constrained**: they can observe events and return structured results (block/modify) but **cannot** call shell, inject messages, or register commands.

### Manifest declaration

```json
{
  "kind": "gajae-code-plugin",
  "name": "audit-bundle",
  "version": "1.0.0",
  "hooks": [
    {
      "name": "audit-read",
      "event": "tool_call",
      "target": "read",
      "phase": "before",
      "path": "hooks/audit-read.ts"
    }
  ]
}
```

### Hook implementation

```typescript
// hooks/audit-read.ts
export default function (pi) {
  // Constrained API: only pi.on(event, handler) and pi.logger
  // Calling pi.sendMessage, pi.registerCommand, pi.exec throws security_policy
  pi.on("tool_call", (event) => {
    pi.logger.info(`Read accessed: ${event.toolCallId}`);
    // Can return { block: true, reason: "..." } to block
    // Cannot call shell or inject messages
  });
}
```

### Constrained authority guarantees

The constrained hook loader enforces these restrictions at load time:

| API method | Available? |
|-----------|-----------|
| `pi.on(event, handler)` | ✓ (must register exactly the declared event) |
| `pi.logger` | ✓ |
| `pi.sendMessage(...)` | ✗ throws `security_policy` |
| `pi.appendEntry(...)` | ✗ throws `security_policy` |
| `pi.registerCommand(...)` | ✗ throws `security_policy` |
| `pi.registerMessageRenderer(...)` | ✗ throws `security_policy` |
| `pi.exec(...)` | ✗ throws `security_policy` |

### Additional guarantees

- **Hash verification**: plugin hook implementation files are hash-verified at session start. Hash drift quarantines the hook.
- **Single-event enforcement**: the factory must register exactly the declared event — registering anything else quarantines the hook.
- **No normalization escape hatch**: the canonical event model grants plugin hooks only `Constrained` authority. There is no path from a plugin hook to `Command` or `InProcess` authority through the normalization layer.

### Supported events

Plugin hooks support only tool-scoped events:
- `tool_call` (phase `before`) → `pre_tool_use`
- `tool_result` (phase `after`) → `post_tool_use`

User prompt, stop, and session lifecycle events are **not available** to plugin hooks. Use command hooks (shell scripts) or in-process extensions for those events.

---

## Normalization contract

The canonical event IR (`packages/coding-agent/src/hooks/events.ts`) and adapters (`packages/coding-agent/src/hooks/normalize.ts`) enforce these rules:

1. **Overlap normalizes to the same IR**: a pre-tool shell script in `.gjc/hooks/pre/edit`, `.claude/hooks/pre/edit.sh`, and `.codex/hooks/pre-edit.ts` all produce the same canonical `pre_tool_use` event with `Command` authority.

2. **Unsupported semantics fail explicitly**: if a convention does not support an event kind (e.g., native `.gjc/hooks` directories cannot express `UserPromptSubmit`), the adapter emits an `unsupported_convention_event` diagnostic. Nothing is silently ignored.

3. **Authority is an enum, not an escape hatch**: each convention grants a fixed authority level per event. Plugin hooks are always `Constrained` regardless of event — the normalization layer cannot be tricked into granting `InProcess` or `Command` authority to a distributable plugin.

4. **Constrained hooks remain constrained**: the `CONVENTION_AUTHORITY` table is the single source of truth. The constrained hook loader (`constrained-hooks.ts`) independently enforces the API denial list at module load time as defense in depth.
