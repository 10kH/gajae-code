### Fixed

- Crash redaction no longer re-masks a value that is already a redaction placeholder (`«redacted-npm-token»`, `[REDACTED_TOKEN]`), so generated commit messages and crash records keep the specific credential type an earlier pass identified. A value that only begins with a placeholder is still masked, including a quoted placeholder followed by an adjacent credential suffix.
