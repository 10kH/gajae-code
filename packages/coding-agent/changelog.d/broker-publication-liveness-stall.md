### Fixed

- A stalled discovery publication fsync/rename no longer keeps an SDK broker alive past its liveness deadline. The broker still self-exits with `publication-liveness-timeout` (`max(60s, heartbeat TTL × 4)`) while that write is pending, including when the write blocks the JS thread.
