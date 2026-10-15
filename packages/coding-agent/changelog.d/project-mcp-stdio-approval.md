### Fixed

- A project `.gjc/mcp.json` stdio server is no longer spawned unless the user config sets `mcp.enableProjectConfig` to true. A project settings file cannot turn that opt-out back on. A stdio server in the user `mcp.json` still starts.
