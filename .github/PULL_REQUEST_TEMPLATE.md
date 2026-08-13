## What

<!-- Brief description of the change -->

## Why

<!-- Motivation, context, or link to issue (fixes #N) -->

## Testing

<!-- How was this tested? -->

## GJC verdict

<!-- Paste one exact-head verdict. reviewer-id is the independent reviewer's GitHub login or stable agent identity. Self-approval is BLOCK. If there was no independent architect/critic/human review, write needs-human and stop. -->

```text
gajae.pr-review-verdict.v1 <merge-approved|merge-blocked|needs-human> sha256:<exact-base...head-diff-hash> reviewer:<architect|critic|human> reviewer-id:<identity> evidence:<ci-run-url-or-local-command>
```

---

- [ ] Target branch is `dev`
- [ ] `bun check` passes
- [ ] Tested locally
- [ ] CHANGELOG updated (if user-facing)
- [ ] Verdict above matches the exact PR head, not an earlier commit
