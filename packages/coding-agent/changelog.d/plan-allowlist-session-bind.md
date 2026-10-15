### Fixed

- Planning-phase bash now allows `.gjc/_session-*` specs and plans only for the current session's encoded directory. Another session's specs and plans are refused. The current session's own specs and plans, and unscoped `.gjc/specs` and `.gjc/plans`, stay writable.
