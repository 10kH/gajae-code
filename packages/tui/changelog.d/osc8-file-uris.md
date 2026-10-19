### Fixed

- Normalize local Markdown links to absolute, percent-encoded `file://` OSC 8 destinations, resolving relative paths from the active working directory and `~/` paths from the home directory. Targets containing control characters remain non-clickable.
