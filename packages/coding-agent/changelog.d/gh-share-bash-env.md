### Fixed

- The default `/share` GitHub CLI child environment now omits project-declared shell, Node, Python, Ruby, Perl, and Java startup hooks and module paths (`BASH_ENV`, `ENV`, `ZDOTDIR`, `NODE_OPTIONS`, `NODE_PATH`, `PYTHONHOME`, `PYTHONPATH`, `PYTHONUSERBASE`, `PYTHONSTARTUP`, `RUBYOPT`, `RUBYLIB`, `PERL5OPT`, `PERL5LIB`, `PERLLIB`, `JAVA_TOOL_OPTIONS`, `JDK_JAVA_OPTIONS`, `_JAVA_OPTIONS`, and `CLASSPATH`), preventing checkout-controlled code from running with operator GitHub credentials.
