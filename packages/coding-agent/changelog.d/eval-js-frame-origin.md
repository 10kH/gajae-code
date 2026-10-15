### Fixed

- A JavaScript eval cell can no longer forge a tool call or a successful result by posting on the worker `parentPort`. A tool reply from the host still returns that tool's value.
