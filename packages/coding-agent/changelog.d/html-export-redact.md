### Fixed

- Session HTML export masks credential-shaped text and opaque values stored under common sensitive JSON keys, including `token`, `secret`, `credential`, `private_key`, and `cookie`, before base64 encoding.
