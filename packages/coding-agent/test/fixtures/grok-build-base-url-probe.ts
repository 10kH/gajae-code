// Prints the credential base URL `getBaseUrl()` resolves with no arguments.
// Spawned with a controlled cwd so a planted project `.env` is what Bun loads.
// Import first so the module snapshot is taken before `.env` is removed or the
// process changes directory.
import * as fs from "node:fs";
import * as os from "node:os";
import { getBaseUrl } from "../../src/defaults/gjc/extensions/grok-cli-vendor/src/shared/base-url";

const drop = process.env.GJC_BASEURL_PROBE_DROP;
if (drop === "unlink") {
	fs.rmSync("./.env", { force: true });
} else if (drop === "chdir") {
	process.chdir(os.tmpdir());
}

console.log(JSON.stringify(getBaseUrl()));
