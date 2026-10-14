### Fixed

- `--continue` no longer resumes a terminal breadcrumb whose session file is outside the managed sessions directory when resume uses that managed directory. A breadcrumb that names a session the managed listing owns is unchanged, and an explicit session directory still prefers its own terminal breadcrumb when that file stays inside the directory.
