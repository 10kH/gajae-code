## What

<!-- Brief description of the change -->

## Why

<!-- Motivation, context, or link to issue (fixes #N) -->

## Testing

<!-- How was this tested? -->

## Risk classification

<!-- Classify honestly; exactly one box must be checked — the exact-head gate fails closed on zero or multiple. The checked class selects the merge path (issue #4703). -->

- [ ] `low-risk` — ordinary fix/maintenance; the repository owner may use the explicit `merge-self-approved` solo verdict (no independent human review; the verdict name itself records this) with a risk-record comment bound to the exact head.
- [ ] `regression-risk` — fix with material regression risk; requires one assigned independent domain reviewer whose authenticated exact-head `APPROVED` review the gate verifies (`extra:independent:<login>`; the token alone never suffices).
- [ ] `high-risk` — large refactor, feature, or materially high-risk change (security/auth/install/remove/public API/destructive lifecycle/architecture); requires one assigned independent domain reviewer with an authenticated exact-head `APPROVED` review (`extra:independent:<login>`).

## GJC verdict

<!--
Human review: leave this section empty. A GitHub APPROVED review on the exact current head, from a reviewer with write access who is not the PR author, authorizes the merge on its own; until then the "Merge approval" check shows "Waiting for approval".

Agent review (architect/critic) and the owner's low-risk solo path: add exactly one line below this comment, on its own line, starting with the verdict prefix. reviewer-id is the reviewer's GitHub login. An agent merge-approved verdict still requires an authenticated exact-head APPROVED review from an identity distinct from the PR author. merge-self-approved is only for the repository owner on a low-risk change with a valid exact-head risk-record comment; its name records that no independent human reviewed. merge-blocked and needs-human hold the merge.

Format (kept mid-line so it is never read as a verdict): gajae.pr-review-verdict.v1 <merge-approved|merge-self-approved|merge-blocked|needs-human> sha256:<exact-base...head-diff-hash> reviewer:<architect|critic|human> reviewer-id:<identity> evidence:<ci-run-url-or-local-command>
-->

---

- [ ] Target branch is `dev`
- [ ] `bun check` passes
- [ ] Tested locally
- [ ] Changelog fragment added under `packages/<pkg>/changelog.d/` (if user-facing)
- [ ] Human approval or the required agent/owner verdict matches the exact PR head, not an earlier commit
- [ ] Risk classification above matches the actual review path taken
