### Fixed

- Session title debug logs scrub both credential-bearing request text and generated titles, and marketplace clone debug logs scrub credential-bearing URLs. Shared redaction covers generic and compound sensitive labels, including `auth`, `bearer`, `session_key`, `private_token`, `OPENAI_API_KEY`, `api_token`, and `AWS_SECRET_ACCESS_KEY`, before they are written.
