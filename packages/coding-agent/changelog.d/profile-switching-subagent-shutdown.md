### Fixed

- Model profile switching now rebases configured agent-role bindings from the current configuration instead of restoring values captured before a configuration reload. Removed configured bindings are no longer revived from an active profile's baseline.

- Subagent shutdown proofs now preserve queued records on lease release, validate the captured record identity and generation, and wait for backing executions to physically settle before confirming shutdown.
