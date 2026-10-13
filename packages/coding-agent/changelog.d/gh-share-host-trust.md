### Fixed

- The default `/share` gist upload no longer forwards project `.env` routing, config (including XDG, home-directory, and Windows app-data fallbacks), or GitHub CLI authentication values to `gh`; operator values the project does not declare are kept.
