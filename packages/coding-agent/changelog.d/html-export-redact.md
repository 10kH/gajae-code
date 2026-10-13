### Fixed

- Session HTML export masks credential-shaped text and opaque values stored under whole sensitive JSON keys, including `token`, `secret`, `credential`, `private_key`, and `cookie`, before base64 encoding while preserving ordinary names such as `tokensBefore`, `maxTokens`, and `token_budget`.
