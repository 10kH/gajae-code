### Bug fixes

- Fixed: Human approval now works when a PR has no verdict line in its body. GJC checks GitHub reviews for human approval on the current head instead.
- Fixed: A valid PR contract with no approval yet now shows a "Waiting for approval" notice instead of an error.

### Documentation

- Updated: Clarified that human reviewers only need to approve the current head on GitHub; body verdict lines are required only for agent reviewers and owner self-approval.
