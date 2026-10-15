### Added

- Added the `task.compactSubagentPanel` setting. When it is on, the subagent await panel collapses into a fixed three-row summary (such as `12 subagents running · 3 idle >30s`) until tool output is expanded, and await progress refreshes only when that summary changes, so redraw cost and frequency no longer grow with the number of live subagents (#6774).
