### Fixed

- Launch worktree cleanup no longer follows a symlink into `git worktree remove --force`, so a copied `.git` file cannot make that cleanup delete another directory.
