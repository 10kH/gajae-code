### Fixed

- Reserve the Windows lock retirement path before scrubbing owner metadata, and reclaim aged empty legacy locks only through identity-bound detachment and a fresh staged acquisition, preventing abandoned session-index locks from wedging the SDK broker (issue #6008).
