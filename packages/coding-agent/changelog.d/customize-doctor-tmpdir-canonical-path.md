### Fixed

- The `customize doctor` read-only contract test compares canonical working-directory paths, so it no longer fails on every macOS host where `$TMPDIR` lives under the `/var` -> `/private/var` symlink and the report's path and the `mkdtemp` path name the same directory through different prefixes.
