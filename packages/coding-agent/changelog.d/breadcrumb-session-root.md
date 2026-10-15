### Fixed

- `--continue` no longer resumes a terminal breadcrumb whose session file is absent from the selected continuation inventory. A project-local session already in that inventory is still resumed ahead of a newer sibling. A breadcrumb that names a session the managed listing owns is unchanged, and an explicit session directory still prefers its own terminal breadcrumb when that file stays inside the directory.
