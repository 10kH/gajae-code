### Fixed

- A repository `.gjc/config.yml` or `.gjc/settings.json` can no longer set `searxng.endpoint`, and a runtime override cannot replace the user value. Web search keeps the user config endpoint, or `SEARXNG_ENDPOINT` when that value is unset.
