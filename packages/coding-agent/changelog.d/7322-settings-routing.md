### Added

- Add a schema-derived, read-only SDK settings catalog with layer provenance, explicit withheld values, runtime-choice gaps and unclassified application behavior. Free-form strings and compound values never enter its display snapshot; full settings UI parity remains incomplete.
- Expose canonical smart-routing preview/apply/refresh/clear/enable intents shared with the TUI, with instance-bound preview ownership, stale-source refusal, global-only refresh and explicit durability/activation outcomes.

### Fixed

- Refuse modified or raced smart-routing previews instead of silently applying unseen generated routes. Keep preview authority inside the host while returning detached display snapshots.
- Forward the actual committed preview through the controller, model selector and panel instead of regenerating unpublished routes after a catalog change or reporting post-save preview failures as failed commits.
- Preserve newer routing writers during post-save notification failure by restoring only through the atomic receipt's CAS ownership check.
- Bind hand-edit confirmation to the exact guarded state and retain refresh source/order authority; reject intervening edits or catalog drift instead of replacing them unseen.
- Prevent queued or asynchronous current-value atomic builders from overtaking newer local setters, including setters already captured by an earlier save. Keep synchronous memory publication and ordinary queued batches correctly ordered.
- Derive catalog provenance through canonical cumulative merges, including scalar/null/array ancestor replacement, and retain real keyboard access to fresh routing review after a failed apply.
