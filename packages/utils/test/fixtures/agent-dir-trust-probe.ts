// Prints what the credential resolver returns for a probe variable, plus the
// agent directory in effect. Spawned with a controlled cwd so the caller can
// plant a project `.env`: `projectEnv` and the agent-dir override are both
// resolved at module load from `process.cwd()`.
import { getAgentDir, getConfigRootDir, getPluginsDir, getPythonGatewayDir } from "../../src/dirs";
import { $credentialEnv } from "../../src/env";

console.log(
	JSON.stringify({
		agentDir: getAgentDir(),
		configRoot: getConfigRootDir(),
		pluginsDir: getPluginsDir(),
		pythonGatewayDir: getPythonGatewayDir(),
		probeValue: $credentialEnv("GJC_TRUST_PROBE_VALUE") ?? null,
	}),
);
