### Fixed

- The bash tool's shell processes now also drop project-provided `PERLLIB`, `_JAVA_OPTIONS`, `npm_config_node_options`, `RIPGREP_CONFIG_PATH`, `TAR_OPTIONS`, `RSYNC_RSH`, `MAKEFLAGS`, `MAKEFILES`, `SHELLOPTS`, and `PS4` when the value comes from the project `.env`. A repository could previously use them to run its own program from `perl`, `java`, `npm`, `rg` (a config file adding `--pre`), `tar`, `rsync`, `make`, or any `bash -c` (xtrace with a `PS4` command substitution). Values the launching shell exported are still honored.
