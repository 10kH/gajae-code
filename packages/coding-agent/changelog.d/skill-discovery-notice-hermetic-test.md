### Fixed

- The skill-discovery genuine-emptiness case pins an empty home directory instead of reading the developer's real `~/.claude/skills`. Convention-import diagnostics from a populated home made the notice appear locally and vanish on a clean CI runner, so the case asserted opposite outcomes per machine. The contract it pins is unchanged: an explicit user-scope request that scans nothing and diagnoses nothing carries no `notice`, while the same empty environment under source `all` always scans the four bundled workflow skills and therefore explains the conjunctive filter.
