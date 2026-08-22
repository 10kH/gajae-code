# Adaptive Compaction QA Evidence

Date: 2026-08-22

## Scope

- Added adaptive compaction threshold logic in `packages/agent/src/compaction`.
- Wired adaptive state into `packages/coding-agent/src/session/agent-session.ts`.
- Exposed `compaction.adaptive.*` settings in the coding-agent schema.

## Focused Commands

```bash
GJC_CODING_AGENT_DIR=$PWD/.gjc/test-home bun test packages/agent/test/adaptive-compaction-state.test.ts
```

Result: PASS. Final rerun used:

```bash
HOME=$PWD/.gjc/test-home GJC_CODING_AGENT_DIR=$PWD/.gjc/test-home/agent bun test packages/agent/test/adaptive-compaction-state.test.ts
```

Final result: 3 pass, 0 fail.

## Passing Gates

```bash
HOME=$PWD/.gjc/test-home GJC_CODING_AGENT_DIR=$PWD/.gjc/test-home/agent bun run generate-schemas
HOME=$PWD/.gjc/test-home GJC_CODING_AGENT_DIR=$PWD/.gjc/test-home/agent bun run generate-docs-index
HOME=$PWD/.gjc/test-home GJC_CODING_AGENT_DIR=$PWD/.gjc/test-home/agent bun scripts/check-visible-definitions.ts
HOME=$PWD/.gjc/test-home GJC_CODING_AGENT_DIR=$PWD/.gjc/test-home/agent bun scripts/verify-g002-gates.ts
HOME=$PWD/.gjc/test-home GJC_CODING_AGENT_DIR=$PWD/.gjc/test-home/agent bun scripts/rebrand-inventory.ts --strict
HOME=$PWD/.gjc/test-home GJC_CODING_AGENT_DIR=$PWD/.gjc/test-home/agent bun run check
```

Result: PASS.

## Blocked Commands

```bash
GJC_CODING_AGENT_DIR=$PWD/.gjc/test-home bun test packages/agent/test/compaction-adaptive.test.ts
```

Result: BLOCKED before assertions. Importing the full compaction module requires the native addon, but no `pi_natives.darwin-arm64.node` file is present.

```bash
GJC_CODING_AGENT_DIR=$PWD/.gjc/test-home bun run build:native
```

Result: BLOCKED. The wrapper failed at `cargo metadata`; direct `cargo --version` also failed with `command not found`.

```bash
HOME=$PWD/.gjc/test-home GJC_CODING_AGENT_DIR=$PWD/.gjc/test-home/agent bun test packages/agent packages/coding-agent
```

Result: FAIL/BLOCKED by the same missing native addon cascade. Summary: 1635 pass, 758 fail, 685 errors. Many failures reported `Failed to load pi_natives native addon for darwin-arm64`; RPC socket tests also failed after spawned GJC processes could not start.

## Expected Behavior Covered By Tests

- Adaptive tracker records calls, sliding call-rate window state, and latest context tokens.
- Adaptive threshold tests cover default-off legacy behavior, thresholdTokens precedence, high-call-rate threshold lowering, and post-compaction re-fire suppression. These are present but native-blocked in this environment.
- Session integration tests cover adaptive-on compaction below the static threshold and adaptive-off non-compaction for the same token level. These are present but native-blocked in this environment.
