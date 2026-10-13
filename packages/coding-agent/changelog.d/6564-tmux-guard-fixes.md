### Security

- fix(tmux-self-injection-guard): Fix multiple command-parsing vulnerabilities in the tmux injection guard
  - Restrict `command -v`/`-V` lookup suppression to the same command invocation; previously suppressed across command boundaries (`;`, `|`)
  - Preserve environment variable assignments like `env FOO=bar` in wrapper context; previously treated them as wrapped commands
  - Separate flag-only options (`setsid -c/-w`, `sudo -s/-i`, `xargs -0/-t/-x`) from argument-taking options to prevent adjacent words from being consumed as option arguments
  - Recognize shell option operands (`bash -O extglob`, `bash -o pipefail`) and skip over them when scanning for script payloads; previously halted at option operands
  - Removed unreachable dead code in wrapper mode state machine
- Preserve argv boundaries when recursively inspecting `env -S` payloads, including nested `bash -c` commands, and avoid treating `builtin` or non-executing `sudo` modes as external command executions.
- Treat `sudo -e`/`--edit` as file editing rather than command execution when checking wrapper arguments.
- Document that the guard is best-effort and does not cover arbitrary interpreter one-liners, shell variable indirection, or commands launched by the Python/eval tools.
