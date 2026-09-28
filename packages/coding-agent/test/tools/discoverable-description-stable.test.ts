import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import path from "node:path";
import { type SettingPath, Settings } from "@gajae-code/coding-agent/config/settings";
import { BUILTIN_TOOL_DESCRIPTORS, LazyAgentTool, type ToolSession } from "@gajae-code/coding-agent/tools";

// A discoverable tool is advertised before its implementation loads. If the advertised description
// changes once the implementation loads, the provider-visible `tools` block changes mid-session and
// the prompt-cache prefix is lost (#5992).

const ENV_KEYS = ["GJC_PY", "PI_PY", "PI_JS"] as const;
let savedEnv = new Map<string, string | undefined>();
beforeEach(() => {
	savedEnv = new Map(ENV_KEYS.map(key => [key, Bun.env[key]]));
	for (const key of ENV_KEYS) delete Bun.env[key];
});
afterEach(() => {
	for (const [key, value] of savedEnv) {
		if (value === undefined) delete Bun.env[key];
		else Bun.env[key] = value;
	}
});

function session(
	overrides: Partial<Record<SettingPath, unknown>> = {},
	sessionOverrides: Partial<ToolSession> = {},
): ToolSession {
	return {
		cwd: os.tmpdir(),
		hasUI: false,
		getSessionFile: () => null,
		getSessionSpawns: () => "*",
		settings: Settings.isolated(overrides),
		...sessionOverrides,
	};
}

async function descriptionBeforeAndAfterLoad(name: string, toolSession: ToolSession, beforeLoad?: () => void) {
	const descriptor = BUILTIN_TOOL_DESCRIPTORS[name];
	if (!descriptor) throw new Error(`no descriptor for ${name}`);
	const facade = new LazyAgentTool(descriptor, undefined, () => descriptor.load(toolSession), toolSession);
	const before = facade.description;
	const parametersBefore = name === "task" ? JSON.stringify(facade.parameters) : undefined;
	beforeLoad?.();
	try {
		await facade.materializeForTests();
	} catch {
		return undefined;
	}
	return {
		before,
		after: facade.description,
		parametersBefore,
		parametersAfter: name === "task" ? JSON.stringify(facade.parameters) : undefined,
	};
}

const discoverable = Object.values(BUILTIN_TOOL_DESCRIPTORS)
	.filter(descriptor => descriptor.metadata.loadMode === "discoverable")
	.map(descriptor => descriptor.metadata.name);

describe("discoverable tool descriptions are stable across first load (#5992)", () => {
	it.each(
		discoverable,
	)("#given the default session #when %s loads #then its advertised description does not change", async name => {
		// given
		const toolSession = session();

		// when
		const observed = await descriptionBeforeAndAfterLoad(name, toolSession);

		// then
		if (observed === undefined) {
			expect(name).not.toBe("task");
			return;
		}
		expect(observed.before).toBe(observed.after);
		if (name === "task") {
			expect(observed.parametersBefore).toBeDefined();
			expect(observed.parametersBefore).toBe(observed.parametersAfter);
		}
	});
	it.each([
		["isolation enabled", { "task.isolation.mode": "auto" }, true],
		["schema-free mode", { "task.simple": "schema-free" }, false],
		["independent mode", { "task.simple": "independent" }, false],
	] as const)("keeps task parameters stable for %s", async (_label, overrides, isolationEnabled) => {
		const observed = await descriptionBeforeAndAfterLoad("task", session(overrides));

		expect(observed).toBeDefined();
		expect(observed?.before).toBe(observed?.after);
		expect(observed?.parametersBefore).toBeDefined();
		expect(observed?.parametersBefore).toBe(observed?.parametersAfter);
		if (isolationEnabled) expect(observed?.parametersBefore).toContain('"isolated"');
		else expect(observed?.parametersBefore).not.toContain('"isolated"');
	});
	it("keeps task description stable when a project agent is discovered", async () => {
		const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-task-description-agent-"));
		try {
			const agentsDir = path.join(cwd, ".gjc", "agents");
			await fs.mkdir(agentsDir, { recursive: true });
			await fs.writeFile(
				path.join(agentsDir, "reviewer-lite.md"),
				"---\nname: reviewer-lite\ndescription: Lightweight project reviewer\n---\nYou review code.\n",
			);
			const observed = await descriptionBeforeAndAfterLoad("task", session({}, { cwd }));

			expect(observed).toBeDefined();
			expect(observed?.before).toBe(observed?.after);
			for (const name of ["executor", "architect", "planner", "critic"]) {
				expect(observed?.before).toContain(name);
			}
			expect(observed?.before).not.toContain("reviewer-lite");
		} finally {
			await fs.rm(cwd, { recursive: true, force: true });
		}
	});

	it("keeps parity when a project agent overrides a bundled role name", async () => {
		const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-task-description-override-"));
		try {
			const agentsDir = path.join(cwd, ".gjc", "agents");
			await fs.mkdir(agentsDir, { recursive: true });
			await fs.writeFile(
				path.join(agentsDir, "executor.md"),
				"---\nname: executor\ndescription: Project-specific executor policy\n---\nYou handle project tasks.\n",
			);
			const observed = await descriptionBeforeAndAfterLoad("task", session({}, { cwd }));

			expect(observed).toBeDefined();
			expect(observed?.before).toBe(observed?.after);
			expect(observed?.before).toContain("Bundled role names: executor, architect, planner, critic.");
			expect(observed?.before).toContain(
				"A configured agent may override a bundled role name and takes precedence.",
			);
			expect(observed?.before).not.toContain("Autonomous implementation agent for bounded code changes");
		} finally {
			await fs.rm(cwd, { recursive: true, force: true });
		}
	});
	it("keeps task description stable when irc becomes available", async () => {
		let ircAvailable = false;
		const toolSession = session(
			{ "irc.enabled": true },
			{
				getToolByName: name => (name === "irc" && ircAvailable ? ({ name: "irc" } as never) : undefined),
			},
		);
		const observed = await descriptionBeforeAndAfterLoad("task", toolSession, () => {
			ircAvailable = true;
		});

		expect(observed).toBeDefined();
		expect(observed?.before).toBe(observed?.after);
	});

	it.each([
		["line-number display", { readLineNumbers: true, readHashLines: false } as Partial<Record<SettingPath, unknown>>],
		["plain display", { readLineNumbers: false, readHashLines: false } as Partial<Record<SettingPath, unknown>>],
	])("#given a %s session #when search loads #then its advertised description does not change", async (_label, overrides) => {
		// given
		const toolSession = session(overrides);

		// when
		const observed = await descriptionBeforeAndAfterLoad("search", toolSession);

		// then
		expect(observed).toBeDefined();
		expect(observed?.before).toBe(observed?.after);
	});

	it.each([
		["python only", { "eval.py": true, "eval.js": false } as Partial<Record<SettingPath, unknown>>, undefined],
		["javascript only", { "eval.py": false, "eval.js": true } as Partial<Record<SettingPath, unknown>>, undefined],
		[
			"GJC_PY=js overriding settings",
			{ "eval.py": true, "eval.js": true } as Partial<Record<SettingPath, unknown>>,
			"js",
		],
	])("#given eval allowed for %s #when eval loads #then its advertised description does not change", async (_label, overrides, gjcPy) => {
		// given
		if (gjcPy !== undefined) Bun.env.GJC_PY = gjcPy;
		const toolSession = session(overrides);

		// when
		const observed = await descriptionBeforeAndAfterLoad("eval", toolSession);

		// then
		expect(observed).toBeDefined();
		expect(observed?.before).toBe(observed?.after);
	});
});
