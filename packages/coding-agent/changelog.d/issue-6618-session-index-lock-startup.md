### Fixed

- Briefly retry validated pre-mutation Windows access-denied lock publications, but keep persistent denials distinct from lock contention; include the lock path and failure code in the startup error instead of crashing (issue #6618).
- Stop retrying pre-mutation publication after its staging cleanup fails, preventing repeated attempts from multiplying same-process residue; keep generic failures distinct from proven contention.
- Accept the distinct Windows `access_denied` code in managed-session security validation so ACL access refusals remain classified security errors.
