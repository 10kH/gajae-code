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

<!-- Only agent reviewers (architect/critic) and the owner's merge-self-approved path need to fill in exactly one verdict line below. Human reviewers do NOT need a body verdict line: an authenticated GitHub APPROVED review on the exact current head from a reviewer other than the PR author is sufficient, subject to the risk-classified review policy. For human-only review, remove the entire example code block below rather than leaving its placeholder line. reviewer-id is the reviewer's GitHub login. An agent merge-approved verdict still requires an authenticated exact-head APPROVED review from an identity distinct from the PR author. The repository owner may use merge-self-approved only for a low-risk change with a valid exact-head risk-record comment; its name records that no independent human reviewed. Agent reviewers who cannot approve must use needs-human or merge-blocked. -->

```text
gajae.pr-review-verdict.v1 <merge-approved|merge-self-approved|merge-blocked|needs-human> sha256:<exact-base...head-diff-hash> reviewer:<architect|critic|human> reviewer-id:<identity> evidence:<ci-run-url-or-local-command>
```

---

- [ ] Target branch is `dev`
- [ ] `bun check` passes
- [ ] Tested locally
- [ ] Changelog fragment added under `packages/<pkg>/changelog.d/` (if user-facing)
- [ ] Human approval or the required agent/owner verdict matches the exact PR head, not an earlier commit
- [ ] Risk classification above matches the actual review path taken
