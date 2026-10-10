// Prints the base URL `registerGrokCli` stores on the grok-build provider.
// Spawned with a controlled cwd so a planted project `.env` is what Bun loads.
// Import first so the module snapshot is taken before `.env` is removed or the
// process changes directory. Registration is the production entry: `register.ts`
// and `billing.ts` both call `getBaseUrl()` with no arguments.
import * as fs from "node:fs";
import * as os from "node:os";
import registerGrokCli from "../../src/defaults/gjc/extensions/grok-cli-vendor/src/provider/register";

const drop = process.env.GJC_BASEURL_PROBE_DROP;
if (drop === "unlink") {
	fs.rmSync("./.env", { force: true });
} else if (drop === "chdir") {
	process.chdir(os.tmpdir());
}

let registeredBaseUrl = "";
registerGrokCli({
	registerProvider(_name: string, config: { baseUrl: string }) {
		registeredBaseUrl = config.baseUrl;
	},
	registerCommand() {},
	on() {},
} as never);

console.log(JSON.stringify(registeredBaseUrl));
