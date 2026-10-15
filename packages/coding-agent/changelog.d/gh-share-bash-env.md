### Fixed

- The default `/share` GitHub CLI child environment now omits project-declared shell and Node startup hooks (`BASH_ENV`, `ENV`, `ZDOTDIR`, and `NODE_OPTIONS`), preventing checkout-controlled code from running with operator GitHub credentials.
