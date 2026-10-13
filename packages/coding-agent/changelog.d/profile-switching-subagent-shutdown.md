### Fixed

- Model profile switching now rebases configured agent-role bindings from the current configuration instead of restoring values captured before a configuration reload. Removed configured bindings are no longer revived from an active profile's baseline.

- Subagent shutdown proofs preserve queued records while their owners are fenced and restart that work when a live rollback or session-switch preflight failure releases the fence; proofs also validate captured record identity and generation and wait for backing executions to physically settle.
