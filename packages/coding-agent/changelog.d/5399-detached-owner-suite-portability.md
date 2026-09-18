### Fixed

- The detached-owner lifecycle suite (`gjc harness start --detach`, B1) no longer skips wholesale on non-Linux hosts. Its `tmux` is a bash fixture and its cgroup inputs are injected through `GJC_HARNESS_TEST_*`, so six of its seven cases carried no real Linux dependency yet only ever ran in CI — leaving a red `dev` undiagnosable for anyone developing on macOS. Only the case that drives the Linux-only `unsafe_service` cgroup branch stays gated.
- An owner-routed `harness finalize` that never reaches its owner answers `{ completed: false, reason: "owner-not-live" }` with no `finalize` key, so the suite's assertion reported a bare `Received: undefined` and hid the routing reason. It now projects that reason into the assertion and names it.
