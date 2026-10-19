### Fixed

- A project dotenv entry can no longer choose the harness receipt spool directory, and `spool.jsonl` is opened without following a final-component symlink. An existing spool file is tightened to owner-only mode before a receipt is appended.
