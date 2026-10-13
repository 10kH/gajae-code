### Fixed

- Configuration reload preserves the role mappings of an active model profile, and successor profiles rebase configured agent-role bindings from the current configuration instead of stale values captured before reload. Removed configured bindings are no longer revived from an active profile's baseline.

- Subagent shutdown proofs preserve queued records while their owners are fenced and restart that work after live failures reconnect the predecessor and release the fence. Queued restarts wait for prior backing executions to settle; committed purges publish terminal evidence for queued waiters, and proofs validate captured record identity and generation.
