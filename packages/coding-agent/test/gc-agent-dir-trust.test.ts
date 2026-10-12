import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { getAgentDir, getSessionsDir } from "@gajae-code/utils";
import { runGjcGcCommand } from "../src/gjc-runtime/gc-runtime";

const tempDirs: string[] = [];

afterEach(async () => {
	for (const dir of tempDirs.splice(0)) {
		await fs.rm(dir, { recursive: true, force: true });
	}
});

async function makeRepo(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-gc-agent-trust-"));
	tempDirs.push(dir);
	return dir;
}

function gcEnv(root: string, agentDir: string, key: "GJC_CODING_AGENT_DIR" | "PI_CODING_AGENT_DIR"): NodeJS.ProcessEnv {
	return {
		[key]: agentDir,
		GJC_HARNESS_ROOT_REGISTRY_DIR: path.join(root, "harness-roots"),
		TMPDIR: path.join(root, "tmp"),
	};
}

async function diskSessionsRoot(root: string, env: NodeJS.ProcessEnv): Promise<string> {
	const result = await runGjcGcCommand(["--disk", "--json"], root, env, []);
	expect(result.status).not.toBe(2);
	const report = JSON.parse(result.stdout) as {
		disk: { surfaces: { sessions: { root: string }; backups: { root: string }; natives: { root: string } } };
	};
	return report.disk.surfaces.sessions.root;
}

describe("gjc gc agent dir provenance", () => {
	test("refuses a project dotenv GJC_CODING_AGENT_DIR", async () => {
		const root = await makeRepo();
		const attacker = path.join(root, "attacker", "agent");
		await fs.mkdir(attacker, { recursive: true });
		await Bun.write(path.join(root, ".env"), `GJC_CODING_AGENT_DIR=${attacker}\n`);

		const sessions = await diskSessionsRoot(root, gcEnv(root, attacker, "GJC_CODING_AGENT_DIR"));
		expect(sessions.startsWith(attacker)).toBe(false);
		expect(sessions).toBe(getSessionsDir(getAgentDir()));
	});

	test("refuses a project dotenv PI_CODING_AGENT_DIR", async () => {
		const root = await makeRepo();
		const attacker = path.join(root, "attacker", "agent");
		await fs.mkdir(attacker, { recursive: true });
		await Bun.write(path.join(root, ".env"), `PI_CODING_AGENT_DIR=${attacker}\n`);

		const sessions = await diskSessionsRoot(root, gcEnv(root, attacker, "PI_CODING_AGENT_DIR"));
		expect(sessions.startsWith(attacker)).toBe(false);
		expect(sessions).toBe(getSessionsDir(getAgentDir()));
	});

	test("refuses a dynamic project dotenv GJC_CODING_AGENT_DIR", async () => {
		const root = await makeRepo();
		const attacker = path.join(root, "attacker", "agent");
		await fs.mkdir(attacker, { recursive: true });
		await Bun.write(path.join(root, ".env"), "GJC_CODING_AGENT_DIR=$HOME/planted\n");

		const sessions = await diskSessionsRoot(root, gcEnv(root, attacker, "GJC_CODING_AGENT_DIR"));
		expect(sessions.startsWith(attacker)).toBe(false);
		expect(sessions).toBe(getSessionsDir(getAgentDir()));
	});

	test("keeps an operator agent dir the project does not declare", async () => {
		const root = await makeRepo();
		const operator = path.join(root, "operator", "agent");
		await fs.mkdir(operator, { recursive: true });
		await Bun.write(path.join(root, ".env"), "UNRELATED=1\n");

		const sessions = await diskSessionsRoot(root, gcEnv(root, operator, "GJC_CODING_AGENT_DIR"));
		expect(sessions).toBe(getSessionsDir(operator));
	});

	test("keeps an operator agent dir that differs from the project dotenv", async () => {
		const root = await makeRepo();
		const attacker = path.join(root, "attacker", "agent");
		const operator = path.join(root, "operator", "agent");
		await fs.mkdir(attacker, { recursive: true });
		await fs.mkdir(operator, { recursive: true });
		await Bun.write(path.join(root, ".env"), `GJC_CODING_AGENT_DIR=${attacker}\n`);

		const sessions = await diskSessionsRoot(root, gcEnv(root, operator, "GJC_CODING_AGENT_DIR"));
		expect(sessions).toBe(getSessionsDir(operator));
	});

	test("keeps an operator PI_CODING_AGENT_DIR the project does not declare", async () => {
		const root = await makeRepo();
		const operator = path.join(root, "operator", "agent");
		await fs.mkdir(operator, { recursive: true });
		await Bun.write(path.join(root, ".env"), "UNRELATED=1\n");

		const sessions = await diskSessionsRoot(root, gcEnv(root, operator, "PI_CODING_AGENT_DIR"));
		expect(sessions).toBe(getSessionsDir(operator));
	});
});
