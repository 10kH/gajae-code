### Fixed

- Compaction, handoff, and branch-summary requests use the session message converter, so a registered secret is obfuscated before the summary is sent to the provider.
