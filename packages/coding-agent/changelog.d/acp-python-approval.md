### Fixed

- The python tool now uses the same ACP and SDK permission gate as eval. Prompt mode asks before it runs, and deny mode rejects it. Allow mode is unchanged, and tool names outside that gate still run without a prompt.
