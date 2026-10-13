### Fixed

- Prevent Windows file-lock staging cleanup from opening live publishers' metadata, use liveness-probed legacy names when process identity is unavailable, retry sharing violations as contention, preserve permanent access-denied publication errors in file locks and managed sessions, and show a manual cleanup command for ambiguous empty locks (issue #6603).
