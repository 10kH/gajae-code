### Fixed

- The default `/share` GitHub CLI child environment now omits project-declared `BASH_ENV`, preventing checkout-controlled Bash startup hooks from running with operator GitHub credentials.
