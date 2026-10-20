### Fixed
- JSON-to-YAML config migration creates the new file as mode 0600, does not follow a dangling symlink, and publishes that file only after its contents are fully written.
