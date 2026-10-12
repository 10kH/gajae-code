### Fixed

- The per-line column cap drops the start of a configured plain secret when that secret straddles the cut, or when the kept head still ends on an open prefix of one, including a shorter prefix that remains after a longer candidate is rejected, so the retained tool output does not send that prefix in plaintext.
