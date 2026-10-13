### Fixed

- The embedded shell reads its own standard input without buffering, so input that a builtin such as `read -n1` did not consume is still available to the next command that inherits stdin, and `read -t` no longer times out on input that was already read into the buffer.
