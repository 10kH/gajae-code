### Fixed

- Antigravity model discovery now identifies with the Gemini CLI user agent so Gemini 4 Argon can be returned without relying on project metadata. Both `google-antigravity` and `google-gemini-cli` still forward project IDs from stored OAuth credentials or structured Google keys when available, and the generated-model refresh path forwards the stored project ID too. Discovery diagnostics redact endpoint credentials, and custom loggers keep their method receiver.
