### Fixed

- Session listing, including `/resume`, reads a project's retired-session tombstones once per listing instead of once per session candidate. It used to open and parse every tombstone again for each candidate, so listing slowed down as sessions were deleted. With 116 sessions and 252 tombstone files that was 29,232 file reads and 8–10 s. It is now 252 reads and 1–3 s, and the same sessions are hidden (#6757).
