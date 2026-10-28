### Fixed

- Retire exact MCP grants at session ownership boundaries using both loaded session ID and transcript path, including same-path transcript replacement; fence queued controls, rollback and disposal without recreating separately revoked authority.
- Refuse deletion of a custom profile claimed during the final write preparation, preserving the profile and returning the explicit replacement-required error.
