### Fixed

- Durable crash records redact full quoted values, complete bracketed arrays/objects under sensitive labels, and complete Cookie/Set-Cookie header values, including whitespace-bearing, escaped, and unterminated credentials; URL userinfo is also scrubbed when it contains only a username token or an empty password. Arbitrary unquoted Authorization schemes are redacted through line end, while short Bearer/Basic/Token credentials preserve following diagnostic fields. Long non-credential keys no longer trigger quadratic matching.
