### Fixed

- The default `/share` GitHub CLI child environment now omits project-declared shell, Node, Python, Ruby, and Perl startup hooks and module paths (`BASH_ENV`, `ENV`, `ZDOTDIR`, `NODE_OPTIONS`, `NODE_PATH`, `PYTHONHOME`, `PYTHONPATH`, `PYTHONUSERBASE`, `PYTHONSTARTUP`, `RUBYOPT`, `RUBYLIB`, `PERL5OPT`, `PERL5LIB`, and `PERLLIB`), preventing checkout-controlled code from running with operator GitHub credentials.
