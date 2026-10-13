### Fixed

- Model profile switching now rebases configured agent-role bindings from the current configuration instead of restoring values captured before a configuration reload. Removed configured bindings are no longer revived from an active profile's baseline.

- Subagent shutdown proofs preserve queued records during live rollbacks and restart their queued work when the shutdown lease is released; proofs also validate captured record identity and generation and wait for backing executions to physically settle.
