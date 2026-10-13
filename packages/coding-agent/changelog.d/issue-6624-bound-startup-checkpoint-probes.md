### Fixed

- Keep SDK broker heartbeat checkpoint work within its monotonic budget by avoiding redundant process probes during structural projection and stopping further synchronous identity probes after the deadline expires (issue #6624).
