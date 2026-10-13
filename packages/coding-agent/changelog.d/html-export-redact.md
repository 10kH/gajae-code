### Fixed

- Session HTML export masks credential-shaped object keys, complete bracketed credential containers, and sensitive JSON-key values, including `auth`, `bearer`, `session_key`, `credentials`, `secrets`, and delimiter-separated labels such as `OPENAI_API_KEY` and `api_token`, before base64 encoding while preserving distinct values on key collisions and ordinary identifiers such as `session_id`, `source_session_id`, and `native_session_id` as well as `tokensBefore`, `maxTokens`, and `token_budget`.
