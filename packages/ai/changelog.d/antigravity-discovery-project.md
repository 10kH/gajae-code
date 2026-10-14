### Fixed

- Antigravity model discovery now sends the `project` field in the request body so tier-gated models (e.g., Gemini 4 Argon) appear in `/model` when a Google AI Ultra project is configured. Both `google-antigravity` and `google-gemini-cli` providers now extract and forward the project ID from stored OAuth credentials to the discovery endpoint.
