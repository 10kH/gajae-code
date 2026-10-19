### Fixed

- Preserve proven lifecycle terminal results when a late transition attempts to overwrite them, avoiding contradictory ledger history on restart. Existing uncertain or quarantined history is not repaired automatically.
