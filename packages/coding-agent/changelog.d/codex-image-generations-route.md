### Fixed

- Codex image-only models (`gpt-image-*`) now post to `/codex/images/generations` instead of the Responses route, including when the Codex base URL already ends in `/codex` or `/codex/responses`; Codex chat models stay on `/codex/responses`.
