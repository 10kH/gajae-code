### Fixed

- The lspmux status probe passes the project-safe spawn environment, so a repository dotenv cannot deliver `BASH_ENV`, `LD_PRELOAD`, or `NODE_OPTIONS` to that child. A value exported by the launching shell is kept.
