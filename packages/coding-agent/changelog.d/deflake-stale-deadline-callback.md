### Bug Fixes

- Fix flaky "stale deadline callback" test in sdk-bus-prompt-deadline.test.ts by preventing concurrent deadline re-arming during agent_end processing. When noteTerminalTransition is called after the deadline clears the lease, it now checks if the deadline is currently expiring before re-arming, eliminating a race condition that caused terminal frames to be lost or deferred.
