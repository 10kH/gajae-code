### Fixed

- Allow SDK `session.close`, `session.resume`, `session.delete`, and `session.reconcile_uncertain` requests past unrelated final legacy lifecycle rows recorded for other sessions, while keeping live, same-session, unrecorded-session, and reused-key legacy rows fenced (issue #TBD).
