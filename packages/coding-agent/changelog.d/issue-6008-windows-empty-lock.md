### Fixed

- Record and reap interrupted Windows retirements before successor publication, reserve `.removing` before scrubbing owner metadata, bound derived sibling components, and retry transient retirement and receipt cleanup failures. Ownerless canonical legacy locks remain fail-closed because age cannot prove a paused writer is dead (issue #6008).
