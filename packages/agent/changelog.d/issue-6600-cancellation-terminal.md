### Fixed

- Standalone agent loops now report `agent_end.stopReason: "cancelled"` when cancellation aborts a provider request or pending tool execution, including when a pause is requested at the same boundary.
