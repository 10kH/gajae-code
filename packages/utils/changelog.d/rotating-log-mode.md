### Fixed

- On POSIX, rotating logs use an owner-only directory and owner-only log files, and an existing directory or regular log file with group or world access is tightened to those modes. The 0600 guarantee is POSIX-scoped. Root-alias spellings are not chmodded. A symlinked log directory keeps its target mode, while a regular log file reached through it is still tightened. A trailing backslash stays part of a POSIX directory name.
