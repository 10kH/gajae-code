### Fixed

- Workflow intent tracking is persisted only after the final prompt preflight gate, so a prompt cancelled during admission no longer leaves a `workflow-intent-diff` entry for work that never started (#7138).
