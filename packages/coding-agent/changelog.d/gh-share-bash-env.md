### Fixed

- The default `/share` GitHub CLI child environment now omits project-declared shell, Node, Python, and Ruby startup hooks and module paths (`BASH_ENV`, `ENV`, `ZDOTDIR`, `NODE_OPTIONS`, `NODE_PATH`, `PYTHONHOME`, `PYTHONPATH`, `PYTHONUSERBASE`, `PYTHONSTARTUP`, `RUBYOPT`, and `RUBYLIB`), preventing checkout-controlled code from running with operator GitHub credentials.
