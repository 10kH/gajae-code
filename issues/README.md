# RPC Control-Plane Dogfood Findings

These issues were found by **operating real `gjc --mode rpc` through the `gjc_rpc`
Python client** (and a raw JSONL probe) and exercising the full control-plane
command surface and sub-protocols. Each issue is scoped to the primary source
file(s) that own the defect.

Repro harness: `/tmp/gjcdf/harness.py` (Python `gjc_rpc` → real bun CLI) plus a
raw JSONL Bun probe. All findings below were verified both empirically against a
live RPC process and against the source.

## Resolution status (ralplan → ultragoal pass, on origin/dev)

Landed + verified (consensus: Architect REQUEST CHANGES → revision → Critic OKAY; `bun run check:ts` green; targeted `bun test` green; re-dogfooded on the real binary):

- **01** fixed — `dispatchRpcCommand` switch wrapped in try/catch → correlated `rpcError(id, command.type, …)`.
- **02** fixed — enum validation for thinking/steering/follow-up/interrupt setters.
- **03** fixed — `negotiate()` rejects unknown scopes/action classes (`invalid_unattended_declaration`).
- **04** fixed — read-only/control commands no longer charge `max_tool_calls` (wall-time still enforced).
- **05** fixed — mandatory floor (`prompt` scope + `command.prompt` action) merged in `negotiate()`.
- **06** fixed — `gjc_rpc` `SessionState.context_usage` (`ContextUsage` model + parse).
- **07** fixed — `gjc_rpc` typed `negotiate_unattended`/`handoff`/`login`/`get_login_providers` + models.
- **11** fixed — `docs/rpc.md` workflow-gate section reconciled to `RpcWorkflowGate`.
- **13** fixed — RPC stdin loop de-serialized: ordered commands run through a serial chain (causal order preserved) while `abort`/`abort_bash`/`abort_retry` run on an immediate fast lane; `abort_bash` now cancels a running `bash`; shutdown drains in-flight commands (bounded).
- **08** fixed — added an env-gated (`GJC_RPC_REAL_BINARY=1`) real-binary integration lane that drives actual `gjc --mode rpc` and checks the typed client against the live protocol (`context_usage`, correlated errors, negotiate floor, unknown-scope rejection); skips by default.
- **12** already fixed on dev (`$pickenv("GJC_RPC_EMIT_TITLE","PI_RPC_EMIT_TITLE")`).

Deferred (designed; tracked as follow-ups, NOT claimed fixed):

- **09** persistent/detached session, **10** session registry — architectural (own follow-up PR).

Plan + consensus artifacts: `.gjc/plans/ralplan/2026-06-13-1236-71f5/` (`pending-approval.md`).


| # | Severity | Disposition | Scope (primary file) | Summary |
|---|----------|-------------|----------------------|---------|
| [01](01-command-dispatch-handler-exceptions-lose-id.md) | High | Resolved | `packages/coding-agent/src/modes/shared/agent-wire/command-dispatch.ts` | Handler exceptions now return correlated command-specific failures. |
| [02](02-command-dispatch-missing-enum-validation.md) | High | Resolved | `packages/coding-agent/src/modes/shared/agent-wire/command-dispatch.ts` | RPC mode setters now validate enum values at the boundary. |
| [03](03-unattended-negotiate-unvalidated-scopes-actions.md) | High | Resolved | `packages/coding-agent/src/modes/shared/agent-wire/unattended-run-controller.ts` | Unknown unattended scopes and action classes are rejected. |
| [04](04-unattended-control-commands-consume-tool-call-budget.md) | High | Resolved | `packages/coding-agent/src/modes/shared/agent-wire/unattended-session.ts` | Read-only/control commands no longer consume the tool-call budget. |
| [05](05-unattended-mandatory-floor-not-enforced.md) | Medium | Resolved | `packages/coding-agent/src/modes/shared/agent-wire/scopes.ts` | Negotiation now merges the mandatory prompt floor. |
| [06](06-gjcrpc-sessionstate-missing-contextusage.md) | Medium | Resolved | `python/gjc-rpc/src/gjc_rpc/protocol.py` | Typed Python context-usage parsing is present. |
| [07](07-gjcrpc-missing-unattended-handoff-login-methods.md) | High | Resolved | `python/gjc-rpc/src/gjc_rpc/client.py` | Typed unattended, handoff, login, and provider methods are present. |
| [08](08-gjcrpc-tested-only-against-fake-server.md) | Medium | Resolved | `python/gjc-rpc/tests/test_client.py` | An environment-gated real-binary integration lane is present. |
| [09](09-rpc-no-persistent-detached-session.md) | High | Deferred architecture | RPC transport/session design | Persistent detached sessions require a replacement transport design. |
| [10](10-rpc-no-session-registry.md) | High | Deferred architecture | RPC transport/session design | Cross-process discovery depends on persistent-session support. |
| [11](11-docs-rpc-workflow-gate-stale-contradictory.md) | Low | Obsolete | Retired RPC docs | The retired RPC documentation is no longer an active surface. |
| [12](12-rpc-emit-title-env-var-mismatch.md) | Low | Obsolete | Retired RPC configuration | The retired RPC configuration is no longer a supported surface. |
| [13](13-rpc-serial-input-loop-head-of-line-blocking.md) | High | Obsolete | Retired RPC transport | The retired stdio RPC loop is no longer an implementation target. |

## Reconciled status

Audited on 2026-07-31 against current source, tests, and docs:

- **Resolved:** issues **01–08, 14–18, 20–21**, plus low-fruit fixes **#3594** and **#3470**.
- **Obsolete:** issues **11–13, 19** because the stdio RPC mode was retired.
- **Deferred architectural follow-ups:** issues **09–10**; they require a replacement persistent transport/session design.
- **Not active backlog:** historical issue descriptions remain for provenance, but only the categories above represent current work.
- Existing dirty work in the checkout was preserved and not reset.
