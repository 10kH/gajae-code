### Fixed

- Model profile switching now rebases configured agent-role bindings from the current configuration instead of restoring values captured before a configuration reload. Removed configured bindings are no longer revived from an active profile's baseline.

- Subagent shutdown proofs preserve queued records while their owners are fenced and restart that work when live rollbacks, failed switch preflights, or shared-retirement failures release the fence. Queued restarts wait for prior backing executions to physically settle, and proofs validate captured record identity and generation.
