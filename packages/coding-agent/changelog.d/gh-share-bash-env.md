### Fixed

- The default `/share` GitHub CLI child environment now omits project-declared shell startup variables (`BASH_ENV`, `ENV`, and `ZDOTDIR`), preventing checkout-controlled shell hooks from running with operator GitHub credentials.
