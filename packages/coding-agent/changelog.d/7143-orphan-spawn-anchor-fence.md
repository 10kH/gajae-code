### Fixed

- SDK broker spawn-claim mirror rows in the lifecycle ledger no longer turn into fenced legacy rows once their claim leaves the spawn-authority journal, so an orphaned mirror stops blocking `session.create` and `session.close` with `legacy_lifecycle_ambiguous`. New mirrors carry `spawnAnchor: true`; mirrors written by older brokers are derived once into `sdk/lifecycle-ledger.spawn-anchors.json`, and genuine pre-index legacy rows stay fenced (#7143).
