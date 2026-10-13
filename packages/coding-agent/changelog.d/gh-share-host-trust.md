### Fixed

- The default `/share` gist upload no longer forwards project `.env` routing, config, proxy, CA, executable-search, or native-loader values to `gh`; it resolves the CLI and child search path only through absolute operator PATH directories and executables whose resolved paths stay outside the launch and active checkouts, while keeping undeclared operator values. Launching from the filesystem root no longer incorrectly marks every PATH entry as checkout-owned.
