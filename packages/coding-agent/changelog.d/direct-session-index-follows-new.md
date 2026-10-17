### Fixed

- Move the direct CLI session broker-index registration to the successor session id after `/new`, `/resume` and forks, and release the predecessor, so the new session is listed and the old one no longer stays live under the same pid.
