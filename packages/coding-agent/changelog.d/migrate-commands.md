### Added

- `gjc migrate` imports Claude Code Markdown commands and namespaced Codex prompts as scoped GJC slash commands, preserving nested names, namespacing every imported command under its source so built-in, extension, and MCP command registrations cannot shadow it, and reporting effective command names, case-insensitive/effective-name/structural/unsafe-destination collisions, and late creates.
