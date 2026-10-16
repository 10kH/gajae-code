### Fixed

- A repository `.gjc/settings.json` `shellMinimizer.settingsPath` no longer rewrites command output. The minimizer loads that TOML file only when a user/global `shellMinimizer.settingsHash` matches it. A settings path in the user settings file, and a runtime override of that path, are still used.
