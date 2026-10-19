### Changed

- First-party Anthropic requests (`api.anthropic.com` over HTTPS) now send gzip-compressed bodies with `Content-Encoding: gzip`, which shrinks large, repetitive prompts substantially. Third-party endpoints, non-standard ports, and stream bodies are sent unchanged, and a stale `Content-Length` is dropped so the transport recomputes it.
