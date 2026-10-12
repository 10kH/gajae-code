// Prints the hook-capable variables in the bash tool spawn env, plus what the
// shared shell-config env (also consumed by Python kernels) still carries.
// Spawned with a controlled cwd so the caller can plant a project `.env`, which
// is parsed at module load from `process.cwd()`.
import { getShellConfig } from "../../src/procmgr";
import { projectSafeSpawnEnv } from "../../src/shell-config";

const env = projectSafeSpawnEnv();
const shared = getShellConfig().env;
const keys = [
	"BASH_ENV",
	"ZDOTDIR",
	"ENV",
	"XDG_CONFIG_HOME",
	"GIT_DIR",
	"GIT_COMMON_DIR",
	"GIT_SSH_COMMAND",
	"GIT_EXTERNAL_DIFF",
	"GIT_CONFIG_COUNT",
	"GIT_CONFIG_KEY_0",
	"GIT_CONFIG_VALUE_0",
	"GIT_CONFIG_PARAMETERS",
	"UNRELATED_PROJECT_VAR",
];
console.log(
	JSON.stringify({
		...Object.fromEntries(keys.map(key => [key, env[key] ?? null])),
		SHARED_XDG_CONFIG_HOME: shared.XDG_CONFIG_HOME ?? null,
	}),
);
