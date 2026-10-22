### Fixed

- Fixed the flaky "a stale deadline callback cannot terminalize after its submission was cleared" test: its `setTimeout` capture matched the bus deadline by delay window alone, so the SDK broker discovery timer the bus arms concurrently during startup (~35s, inside the 30–60s lease window) was intermittently captured as a second deadline. The capture now attributes timers to the `armPromptDeadline` arming site.
