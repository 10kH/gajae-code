### Fixed

- The default `/share` gist upload no longer forwards project `.env` routing, config, proxy, CA, executable-search, or native-loader values to `gh`; the executable is resolved only from absolute entries on the trusted operator PATH, and undeclared operator values are kept.
