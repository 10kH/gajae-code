### Fixed

- Record and reap interrupted Windows retirements before successor publication, reserve `.removing` before scrubbing owner metadata, bound derived sibling components, and retry transient retirement and receipt cleanup failures. Completed same-host receipts no longer block acquisition while their publisher PID is still live. Ownerless canonical legacy locks remain fail-closed because age cannot prove a paused writer is dead (issue #6008).
- Preserve the exact-removal detach contract for marketplace restores so the existing plugin tree remains available as a rollback backup on Windows.
