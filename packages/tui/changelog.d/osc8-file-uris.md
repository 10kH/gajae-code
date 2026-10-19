### Fixed

- Normalize local Markdown links to absolute, percent-encoded `file://` OSC 8 destinations, resolving relative paths from the active working directory and `~/` paths from the home directory. Link destinations are read as URI references, so percent-escapes are decoded and `#fragment` / `?query` suffixes (for example `src/file.ts#L12`) stay URI components. Network-path references (`//host/path`) are left unchanged rather than read as local absolute paths. Targets containing control characters remain non-clickable.
