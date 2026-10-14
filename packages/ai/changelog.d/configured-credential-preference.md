### Added

- `AuthStorageOptions.credentialPreferences` accepts a persisted soft OAuth account preference per provider (`ConfiguredCredentialPreference`: selector plus optional `maxUsedFraction`). The preferred row is moved ahead of balanced/earliest-reset ranking while it is usable, and yields to the normal ranking when it is blocked, no longer stored, or its most-used known usage window has reached `maxUsedFraction`. Runtime `--credential`/`--prefer-credential` selectors and session stickiness take precedence.
