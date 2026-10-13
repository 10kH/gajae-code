### Fixed

- In the default (non-PTY) bash tool, a builtin read of piped stdin no longer swallows the rest of the input: after `read -n1`, a command started next (for example `cat`) receives the remaining bytes instead of nothing.
