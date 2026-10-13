### Security

- fix(tmux-self-injection-guard): Fix multiple command-parsing vulnerabilities in the tmux injection guard
  - Restrict `command -v`/`-V` lookup suppression to the same command invocation; previously suppressed across command boundaries (`;`, `|`)
  - Preserve environment variable assignments like `env FOO=bar` in wrapper context; previously treated them as wrapped commands
  - Separate flag-only options (`setsid -c/-w`, `sudo -s/-i`, `xargs -0/-t/-x`) from argument-taking options to prevent adjacent words from being consumed as option arguments
  - Recognize shell option operands (`bash -O extglob`, `bash -o pipefail`) and skip over them when scanning for script payloads; previously halted at option operands
  - Removed unreachable dead code in wrapper mode state machine
- Preserve argv boundaries when recursively inspecting `env -S` payloads, including nested `bash -c` commands, and avoid treating `builtin` or non-executing `sudo` modes as external command executions.
- Inspect executable here-document input and unquoted command substitutions, follow shell stdin through wrappers, pipelines, and identity descriptor redirects, while leaving literal data-only consumers unblocked.
- Honor bundled `env` split-string options and environment unsets, ignore lookup-only `env -S` operands, and stop shell command scanning at a pre-command `--`.
- Resolve `env -C` from the tmux command's simple-command segment and respect bundled `xargs` option operands when detecting socket overrides.
- Propagate `env -C` working directories into nested shell payloads and inspect only the final repeated `tmux -c` command.
- Inspect assignment-prefixed `eval` strings and shell scripts in their effective working directory, while respecting non-executing wrapper and Bash modes.
- Respect unambiguous GNU wrapper-option abbreviations and bundled options inside `env -S` payloads.
- Treat `sudo -e`/`--edit` as file editing rather than command execution when checking wrapper arguments.
- Document that the guard is best-effort and does not cover arbitrary interpreter one-liners, shell variable indirection, or commands launched by the Python/eval tools.
