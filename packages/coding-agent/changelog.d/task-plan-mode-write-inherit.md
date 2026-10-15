### Fixed

- Task subagents now copy an enabled parent plan mode before the first prompt, so a product-file write on the child is refused the same way as on the parent. Writes outside plan mode, and writes of the plan file, stay allowed.
