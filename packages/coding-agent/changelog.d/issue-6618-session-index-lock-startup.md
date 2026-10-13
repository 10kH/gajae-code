### Fixed

- Retry validated pre-mutation Windows access-denied lock publications within the bounded publish and acquisition budgets; report exhaustion with the lock path and failure code without labeling it proven live contention (issue #6618).
- Stop retrying pre-mutation publication after its staging cleanup fails, preventing repeated attempts from multiplying same-process residue; keep generic failures distinct from proven contention.
- Accept the distinct Windows `access_denied` code in managed-session security validation so ACL access refusals remain classified security errors.
