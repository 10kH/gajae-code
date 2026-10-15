### Fixed

- Task subagents now copy the parent ACP/SDK approval mode. Deny still rejects a child tool call, and prompt still asks through the parent permission callback. Allow is unchanged, and terminal or filesystem routing is not copied onto the child.
