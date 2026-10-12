### Fixed

- A project `.env` can no longer make bash tool commands run repository code. `BASH_ENV`/`ENV` (sourced by the shell before every command), `GIT_CONFIG_*`/`GIT_CONFIG_PARAMETERS`, `XDG_CONFIG_HOME`, `GIT_DIR`/`GIT_COMMON_DIR` (all of which can supply e.g. `core.fsmonitor`, which git executes during `git status`), and `GIT_EXTERNAL_DIFF`/`GIT_SSH`/`GIT_SSH_COMMAND` are dropped from the bash tool's isolated shell worker chain and interactive PTY sessions when the project declares them. Values exported by the launching shell are kept.
