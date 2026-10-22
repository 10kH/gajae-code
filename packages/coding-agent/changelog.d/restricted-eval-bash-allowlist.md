### Fixed

- Eval refuses to run when the session has a bash allowlist or a read-only bash profile, so in-process Python or JavaScript cannot bypass that restriction. Sessions without those restrictions still run eval.
