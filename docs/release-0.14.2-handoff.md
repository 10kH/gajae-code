# Release 0.14.2 — maintainer handoff

Patch release assembled per the deep-interview spec (`.gjc/_session-*/specs/deep-interview-release-0-14-2-patch-scope.md`). Scope: patch-like changes only, **zero team → autoresearch cutover content** (PR #4430 and dependents stay on dev for a later minor).

## What is on this branch

- Base: `main` tip `d49c40a6` (v0.14.1). The branch was reset there before any picks.
- 54 cherry-picked commits from `dev`, selected by the frozen dependency-aware manifest at `artifacts/release-0.14.2/manifest.json` (allowlist + negative list + blocked).
- 33 dev commits dropped as already shipped on main (28 patch-id duplicates + 5 subject-provenance backports).
- 1 commit blocked: `7869dd256f` (fix(acp)) depends on `collectModelCatalogAndActiveProviders` from the excluded `perf(acp)` commits; an alternate form exists on `origin/probepark/perf/acp-session-new-catalog` (`014a679f2d`).
- Changelogs rebuilt once from the manifest ledger (no cherry-picked changelog hunks).
- **No version bump on this branch** — `bun run release` performs the 0.14.2 bump on main.

## Verification evidence (pre-promotion, all four layers)

Recorded under `artifacts/release-0.14.2/gate/`:

1. **Branch-vs-manifest proof** — every allowlisted SHA's change is present in branch history; blocked/dropped sets recorded.
2. **Legacy-surface scan** — `scripts/check-visible-definitions.ts` passes with the pre-cutover surface (`deep-interview, ralplan, team, ultragoal`); new public autoresearch surface files absent; zero autoresearch mentions in the branch diff; team runtime/command/skill present.
3. **Full check suite + targeted tests** — `bun run check` green; targeted suites: team-runtime checkpoint classifier, ralplan worktree-root, postmortem/handled-error (crash relay).
4. **Version + changelog consistency** — `package.json` still 0.14.1 on branch; `[Unreleased]` bullets map 1:1 to shipped SHAs; no cutover bullets.

## Split-run release procedure (maintainer, after this PR merges)

`bun run release` is main-only and pushes atomically; its own `ci:check:full` does not cover the full gate, and tag CI skips the main check/test graph. To cover the release-generated commit (version bump, changelog cut, lockfiles, native sentinel, regenerated plugins/schemas):

1. Merge this PR to `main` and check out a clean `main`.
2. Run the release generation locally (`bun run release` up to the point it would commit/push — interrupt before the atomic push, or use its dry-run/staging flow if available).
3. On the generated tree, run the full gate: `bun run check` plus the targeted tests above.
4. Only if green, allow the push/tag of `v0.14.2` to proceed.

## v0.14.2-nightly tag disposition

The pre-existing `v0.14.2-nightly.20260818150120.32217566985.gd49c40a6c3c0` tag points at the unpatched main tip. It does **not** block the exact stable `v0.14.2` tag (release tooling and CI treat suffix-bearing tags as non-stable). Decision: **leave it untouched** — do not move, retag, or delete; nightly-tag hygiene belongs to the nightly workflow owner, not this release.
