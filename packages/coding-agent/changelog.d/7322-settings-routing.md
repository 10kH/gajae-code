### Added

- Add a schema-derived, read-only SDK settings catalog with layer provenance, explicit withheld values, runtime-choice gaps and unclassified application behavior. Free-form strings and compound values never enter its display snapshot; full settings UI parity remains incomplete.
- Expose canonical smart-routing preview/apply/refresh/clear/enable intents shared with the TUI, with instance-bound preview ownership, stale-source refusal, global-only refresh and explicit durability/activation outcomes.

### Fixed

- Refuse modified or raced smart-routing previews instead of silently applying unseen generated routes. Keep preview authority inside the host while returning detached display snapshots.
- Preserve newer routing writers during post-save notification failure by restoring only through the atomic receipt's CAS ownership check.
