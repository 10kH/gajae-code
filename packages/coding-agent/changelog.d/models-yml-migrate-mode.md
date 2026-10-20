### Fixed
- JSON-to-YAML config migration creates the new file as mode 0600, does not follow a dangling symlink, publishes that file only after its contents are fully written, and still publishes it when the volume does not support hard links.
