### Fixed

- Durable crash records redact full quoted values, including whitespace-bearing, backslash-escaped, and unterminated credentials, under common sensitive labels such as `auth`, `bearer`, `token`, `secret`, `credential`, `private_key`, `private_token`, `session_key`, `OPENAI_API_KEY`, `api_token`, `AWS_SECRET_ACCESS_KEY`, and `cookie`.
