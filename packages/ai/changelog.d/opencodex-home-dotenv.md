### Fixed

- OpenCodex model discovery resolves `OPENCODEX_HOME` from the launching shell and user-owned env files, so a project `.env` cannot choose `runtime-port.json`. When that resolution rejects the live value, discovery removes it from the process environment.
