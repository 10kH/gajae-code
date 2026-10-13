### Fixed

- Retry Windows session-index lock publication after an explicitly pre-mutation access denial, and report exhausted startup contention with the lock path and failure code instead of an uncaught crash (issue #6618).
- Stop retrying pre-mutation publication after its staging cleanup fails, preventing repeated access-denied attempts from multiplying same-process residue; keep generic failures distinct from proven contention.
- Accept the distinct Windows `access_denied` code in managed-session security validation so ACL access refusals remain classified security errors.
