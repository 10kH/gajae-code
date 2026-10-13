### Fixed

- Classify Windows `access_denied` publication failures as retryable contention when they occur before mutation, matching the handling of `sharing_violation` and enabling recovery without losing lock staging state (issue #6618).
