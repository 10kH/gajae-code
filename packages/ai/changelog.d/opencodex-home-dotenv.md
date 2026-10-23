### Fixed

- OpenCodex model discovery resolves `OPENCODEX_HOME` from the launching shell and user-owned env files, so a project `.env` cannot choose `runtime-port.json`. A rejected live value is removed from the process environment, and later Bun spawns in that process omit it.
