### Fixed

- Concurrent Slack root requests now wait up to five seconds for the active durable publisher before failing, avoiding false timeouts during slow filesystem turns.
