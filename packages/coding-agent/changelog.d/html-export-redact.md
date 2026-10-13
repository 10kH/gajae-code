### Fixed

- Session HTML export masks credential-shaped text and full quoted values under sensitive JSON keys, including `auth`, `bearer`, `session_key`, and delimiter-separated labels such as `OPENAI_API_KEY` and `api_token`, before base64 encoding while preserving ordinary identifiers such as `session_id`, `source_session_id`, and `native_session_id` as well as `tokensBefore`, `maxTokens`, and `token_budget`.
