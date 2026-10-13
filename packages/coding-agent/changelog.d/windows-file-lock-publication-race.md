### Fixed

- Prevent Windows file-lock staging cleanup from opening live publishers' metadata, retry transient pre-mutation access-denied renames as contention, and reclaim aged empty publication residues safely (issue #6603).
