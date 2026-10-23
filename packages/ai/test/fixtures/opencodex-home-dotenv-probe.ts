// Public OpenCodex discovery. Spawned with a controlled cwd so a project `.env` is parsed at env-module load.
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fetchOpenCodexModels } from "@gajae-code/ai/providers/openai-opencodex-responses";

const models = await fetchOpenCodexModels();
const first = models?.[0];
const script = "process.stdout.write(process.env.OPENCODEX_HOME ?? '')";
const empty = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-opencodex-child-"));
let explicitHome = "";
let inheritedHome = "";
let nodeHome = "";
try {
	// A directory with no dotenv, so the child reports only the env object it was given.
	const explicit = Bun.spawnSync({
		cmd: [process.execPath, "-e", script],
		env: process.env,
		cwd: empty,
		stdout: "pipe",
		stderr: "pipe",
	});
	const inherited = Bun.spawnSync({
		cmd: [process.execPath, "-e", script],
		cwd: empty,
		stdout: "pipe",
		stderr: "pipe",
	});
	const nodeChild = spawnSync(process.execPath, ["-e", script], { cwd: empty, encoding: "utf8" });
	const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
	explicitHome = decode(explicit.stdout);
	inheritedHome = decode(inherited.stdout);
	nodeHome = nodeChild.stdout ?? "";
} finally {
	fs.rmSync(empty, { recursive: true, force: true });
}
console.log(
	JSON.stringify({
		baseUrl: first?.baseUrl ?? null,
		modelId: first?.id ?? null,
		parentHome: process.env.OPENCODEX_HOME ?? null,
		grandchildHome: explicitHome,
		inheritedHome,
		nodeHome,
	}),
);
