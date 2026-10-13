### Fixed

- Durable crash records redact full quoted values, including whitespace-bearing credentials, under common sensitive labels such as `token`, `secret`, `credential`, `private_key`, `private_token`, `OPENAI_API_KEY`, `api_token`, `AWS_SECRET_ACCESS_KEY`, and `cookie`.
