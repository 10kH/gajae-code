// Prints the hook-capable variables in the bash tool spawn env, plus what the
// shared shell-config env (also consumed by Python kernels) still carries.
// Spawned with a controlled cwd so the caller can plant a project `.env`, which
// is parsed at module load from `process.cwd()`.
import { getTrustedHomeDir } from "../../src/dirs";
import { getShellConfig } from "../../src/procmgr";
import { projectSafeSpawnEnv } from "../../src/shell-config";

const env = projectSafeSpawnEnv();
const shared = getShellConfig().env;
let trustedHome: string | null = null;
try {
	trustedHome = getTrustedHomeDir();
} catch {
	// A missing independently verifiable account home leaves HOME unset.
}
const keys = [
	"BASH_ENV",
	"GIT_ASKPASS",
	"GIT_EXEC_PATH",
	"GIT_PROXY_COMMAND",
	"GIT_SEQUENCE_EDITOR",
	"GIT_TEMPLATE_DIR",
	"ZDOTDIR",
	"ENV",
	"USERPROFILE",
	"HOMEDRIVE",
	"HOMEPATH",
	"XDG_CONFIG_HOME",
	"GIT_DIR",
	"GIT_COMMON_DIR",
	"GIT_SSH_COMMAND",
	"GIT_EXTERNAL_DIFF",
	"GIT_CONFIG_COUNT",
	"GIT_CONFIG_KEY_0",
	"GIT_CONFIG_VALUE_0",
	"GIT_CONFIG_PARAMETERS",
	"HOME",
	"UNRELATED_PROJECT_VAR",
];
console.log(
	JSON.stringify({
		...Object.fromEntries(keys.map(key => [key, env[key] ?? null])),
		TRUSTED_HOME: trustedHome,
		SHARED_XDG_CONFIG_HOME: shared.XDG_CONFIG_HOME ?? null,
	}),
);
