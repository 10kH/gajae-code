### Fixed

- Preserve and reuse a verified Windows update candidate after a transient access-denied publication failure, report the affected target path, remove redundant staged downloads on retry, and preserve the structured error code through `doctor install.restore-binary`.
