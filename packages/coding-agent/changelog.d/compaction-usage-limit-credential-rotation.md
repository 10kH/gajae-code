### Fixed

- Auto-compaction now moves to another stored credential row when its summarization request hits a provider usage limit, the way a normal turn already does. It used to retry the exhausted row until its retries ran out, and because compaction runs before the next request, a session whose context was full stayed stuck on that row while other rows still had quota. Each failed row is tried once per compaction, a `--credential` pin is still never rotated, and only rows of the session model's provider are marked.
