### Fixed

- Codex MCP import keeps `bearer_token_env_var`, `env_vars`, and `env_http_headers` as `${NAME}` references. It no longer writes the resolved secret into project `.gjc/mcp.json`.

