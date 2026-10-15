### Fixed

- `ast_edit` refuses a single-file path whose real path leaves its reference root, so a symlink cannot rewrite a file outside that root.
