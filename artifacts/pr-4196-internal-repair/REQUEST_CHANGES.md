# PR #4196 — Adversarial review verdict: REQUEST_CHANGES (exact head `efdd79c789`)

**Reviewed head:** `efdd79c789a0073b6f7f8b9194b3d9f9dd0a6199`
**Verdict:** REQUEST_CHANGES
**Date:** 2026-08-11
**Reviewer lane:** internal repair (pr-4196-internal-repair)

## Summary

The exact head raises the synchronous session-context materialization budget to
512 MiB and adds a `GJC_SESSION_CONTEXT_BUDGET_BYTES` override. The direction is
correct and the feature works for well-formed input, but the override contract
fails closed-loop review on four material points, all in the review scope of this
PR: env parsing fail-closed behavior, finite integer/bounds/overflow cases,
memory-safety implications of the raised default, and test-preload scope so
production/test semantics cannot drift silently. The CI-green status of the
exact head and the presence of the exact-head Codex review do not cover these
dimensions.

## Findings (blockers)

1. **Fail-open env parsing (memory-safety).** The resolver uses
   `Number.parseInt(override, 10)` and accepts anything that is finite and > 0.
   Probe-verified behavior:
   - `GJC_SESSION_CONTEXT_BUDGET_BYTES=1e9` → parsed as `1` byte. A user
     expressing 1 GiB in scientific notation silently gets a 1-byte budget and
     every session fails the preflight.
   - `GJC_SESSION_CONTEXT_BUDGET_BYTES=512abc` → parsed as `512` bytes; trailing
     garbage is silently dropped.
   - `GJC_SESSION_CONTEXT_BUDGET_BYTES=99999999999999999999999999` → parsed as
     `1e26` (finite, > 0) → the materialization guard is effectively disabled by
     a typo or hostile value. The entire point of the preflight is to keep the
     synchronous build from allocating unbounded memory; a malformed override
     must fail closed, not widen or disable the guard.
   - `9007199254740992` (2^53) is accepted even though it is not a safe integer.

2. **No upper bound.** Any finite positive value is honored. A memory guard whose
   ceiling is silently unbounded is not a guard. The repaired contract caps the
   override at 8 GiB and documents the ceiling.

3. **Test-preload scope hides the production default.** `scripts/test-preload.ts`
   pins `GJC_SESSION_CONTEXT_BUDGET_BYTES=64 MiB` for every test process, so no
   test ever exercises the new 512 MiB production default. A future change to
   the default constant would ship with every test green. Deterministic coverage
   of the production default is required so test/production semantics cannot
   drift silently.

4. **Zero deterministic coverage of the resolver.** The exact head adds the
   env-var override with no unit coverage of accept/reject/bounds/overflow
   behavior.

## Required changes (implemented on the branch)

The pushed branch `feat/session-context-budget-override` (head
`de426d712c39c159a1254ef1c9f21f73fca58c0c`) implements:

- Fail-closed canonical parsing: only `/^[0-9]+$/` values that are safe positive
  integers at or below the 8 GiB ceiling are honored; everything else falls back
  to the 512 MiB default and emits a `logger.warn` (never silent), matching the
  model-registry "ignored override" convention.
- Exported `SESSION_CONTEXT_MATERIALIZATION_BUDGET_BYTES_DEFAULT` (512 MiB) and
  `..._MAX` (8 GiB) constants.
- Deterministic resolver coverage (24 cases) in
  `session-context-budget.test.ts`, including a clean-subprocess probe that
  asserts the module-load-time budget resolves to 512 MiB with
  `GJC_SESSION_CONTEXT_BUDGET_BYTES` absent — so the 64 MiB test-preload pin
  cannot drift from production semantics silently.
- Docs (`docs/environment-variables.md`) and changelog now state the fail-closed
  contract, the ceiling, and the default.
- The 64 MiB test-preload pin is retained with an explanatory comment: overflow
  fixtures were authored against the former default, and bun test runs every
  file in one shared process, so a per-file override would leak across files.
  The clean-subprocess probe makes the pin safe against silent drift.

## Verification performed

- `bun test` focused suites: session-context-budget (24 pass), 
  session-context-overflow (20 pass), sdk-memory-startup + goal-mode-request +
  render-initial-messages-dedupe (22 pass) — 66 tests total, 0 fail.
- `bun --cwd=packages/coding-agent run check` — biome + tsc clean.
- Clean-subprocess probe confirms `{"budgetBytes":536870912}` (512 MiB) with the
  override absent.

## Disposition

Merge is not recommended on the exact head. The repaired branch is ready for
review and CI; merge that head instead.

Signed-off-by: gaebal-gajae <gaebal-gajae@users.noreply.github.com>
