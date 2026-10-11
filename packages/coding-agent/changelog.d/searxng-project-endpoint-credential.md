### Fixed

- SearXNG no longer attaches an operator environment credential (`SEARXNG_TOKEN` or basic-auth username and password) to an endpoint that came from the project settings layer. A credential set in that project layer is still sent, and an endpoint and credential that both come from the operator environment are still sent.
