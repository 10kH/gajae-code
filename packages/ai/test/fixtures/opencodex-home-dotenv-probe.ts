// Public OpenCodex discovery. Spawned with a controlled cwd so a project `.env` is parsed at env-module load.
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fetchOpenCodexModels } from "@gajae-code/ai/providers/openai-opencodex-responses";

const copied: Record<string, string> = {};
for (const [key, value] of Object.entries(process.env)) {
	if (value !== undefined) copied[key] = value;
}
const models = await fetchOpenCodexModels();
const first = models?.[0];
const script = "process.stdout.write(process.env.OPENCODEX_HOME ?? '')";
const empty = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-opencodex-child-"));
const project = process.cwd();
const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

function syncHome(options: { cwd: string; env?: Record<string, string | undefined> }): string {
	const result = Bun.spawnSync({
		cmd: [process.execPath, "-e", script],
		stdout: "pipe",
		stderr: "pipe",
		...options,
	});
	if (result.exitCode !== 0) throw new Error(decode(result.stderr));
	return decode(result.stdout);
}

let explicitHome = "";
let inheritedHome = "";
let nodeHome = "";
let copiedHome = "";
let projectSyncHome = "";
let projectAsyncHome = "";
let projectPassedHome = "";
let projectCopiedHome = "";
let projectArrayHome = "";
try {
	// A directory with no dotenv, so the child reports only the env object it was given.
	explicitHome = syncHome({ cwd: empty, env: process.env });
	inheritedHome = syncHome({ cwd: empty });
	copiedHome = syncHome({ cwd: empty, env: copied });
	const nodeChild = spawnSync(process.execPath, ["-e", script], { cwd: empty, encoding: "utf8" });
	if (nodeChild.status !== 0) throw new Error(nodeChild.stderr ?? "");
	nodeHome = nodeChild.stdout ?? "";
	// The project directory still has the `.env`. Bun reloads it when the name is absent.
	projectSyncHome = syncHome({ cwd: project });
	projectPassedHome = syncHome({ cwd: project, env: process.env });
	projectCopiedHome = syncHome({ cwd: project, env: copied });
	const arrayChild = Bun.spawnSync([process.execPath, "-e", script], {
		cwd: project,
		stdout: "pipe",
		stderr: "pipe",
	});
	if (arrayChild.exitCode !== 0) throw new Error(decode(arrayChild.stderr));
	projectArrayHome = decode(arrayChild.stdout);
	const asyncChild = Bun.spawn({
		cmd: [process.execPath, "-e", script],
		cwd: project,
		stdout: "pipe",
		stderr: "pipe",
	});
	projectAsyncHome = await new Response(asyncChild.stdout).text();
	if ((await asyncChild.exited) !== 0) throw new Error(await new Response(asyncChild.stderr).text());
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
		copiedHome,
		nodeHome,
		projectSyncHome,
		projectAsyncHome,
		projectPassedHome,
		projectCopiedHome,
		projectArrayHome,
	}),
);
