### Merge gate improvements

- **Option 1**: Pending approval is now clearly labeled as a pending state, not a contract failure. Fresh PRs without a verdict line and without approval show as pending rather than failing the contract check.
- **Option 4**: Human-reviewed PRs with a non-author GitHub APPROVED review on the exact current head SHA, with no later CHANGES_REQUESTED, are now sufficient on their own without requiring a body verdict line. The verdict body line remains required only for agent-reviewer approvals (architect/critic) and the owner merge-self-approved path. This enables faster human reviews without manual verdict line generation (issue #6037).
