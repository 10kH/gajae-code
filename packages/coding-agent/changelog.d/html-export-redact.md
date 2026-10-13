### Fixed

- Session HTML export masks credential-shaped text and full quoted values under sensitive JSON keys, including delimiter-separated labels such as `OPENAI_API_KEY` and `api_token`, before base64 encoding while preserving ordinary names such as `tokensBefore`, `maxTokens`, and `token_budget`.
