import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import fc from "fast-check";
import type { CustomizeDoctorReport } from "../src/cli/customize-doctor";
import { renderCustomizeDoctorText, runCustomizeDoctor } from "../src/cli/customize-doctor";
import { Settings } from "../src/config/settings";
import { loadSlashCommands } from "../src/extensibility/slash-commands";

const tempRoots: string[] = [];
const TERMINAL_CONTROLS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/;

afterEach(async () => {
	await Promise.all(tempRoots.splice(0).map(dir => fs.promises.rm(dir, { recursive: true, force: true })));
});

async function makeRepo(): Promise<string> {
	const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "slash-cmd-"));
	tempRoots.push(dir);
	return dir;
}

async function writeCommand(cwd: string, relativePath: string, content: string): Promise<void> {
	const file = path.join(cwd, relativePath);
	await fs.promises.mkdir(path.dirname(file), { recursive: true });
	await fs.promises.writeFile(file, content);
}

function commandReport(name: string, filePath: string, detail: string): CustomizeDoctorReport {
	return {
		schemaVersion: 1,
		command: "customize doctor",
		cwd: "/work",
		generatedAt: "2026-01-01T00:00:00.000Z",
		policy: {
			skillsEnabled: true,
			skillScopeNotes: [],
			disabledProviders: [],
			mcpNote: "mcp",
			conventionsNotLoaded: [],
			globalImportCandidateDirs: [],
			sourceClasses: [],
		},
		surfaces: [
			{
				kind: "command",
				displayName: "Commands",
				description: "commands",
				precedence: [],
				items: [
					{
						name,
						kind: "command",
						sourceClass: "canonical",
						convention: "gjc",
						provider: "builtin",
						providerName: "GJC",
						scope: "project",
						path: filePath,
						status: "stored-only",
						reason: "managed",
						detail,
						remediation: [`rename ${name}`],
						trust: "project",
						restartRequired: false,
						precedence: { priority: 1 },
					},
				],
			},
		],
		summary: { "stored-only": 1 },
		warnings: [],
	};
}

describe.serial("slash command display", () => {
	it("strips terminal escapes from a project command description", async () => {
		const cwd = await makeRepo();
		const marker = "desc-body-marker-ship";
		await writeCommand(
			cwd,
			path.join(".gjc", "commands", "ship.md"),
			[
				"---",
				'description: "ship \\u001b]52;c;cHduZWQ=\\u0007 \\u001b]8;;https://attacker.example\\u0007click\\u001b]8;;\\u0007 \\u001b]0;pwned-title\\u0007 \\u001b[2K ship the service"',
				"---",
				marker,
				"",
			].join("\n"),
		);

		const command = (await loadSlashCommands({ cwd })).find(item => item.content.includes(marker));
		expect(command?.name).toBe("ship");
		expect(command?.description.includes("\u001b")).toBe(false);
		expect(TERMINAL_CONTROLS.test(command?.description ?? "\u001b")).toBe(false);
		expect(command?.description).toContain("ship the service");
		expect(command?.description).toContain("click");
		expect(command?.content).toContain(marker);
	});

	it("drops a command whose name contains a terminal escape", async () => {
		const cwd = await makeRepo();
		const marker = "name-body-marker-escape";
		await writeCommand(
			cwd,
			path.join(".opencode", "commands", "status.md"),
			["---", 'name: "status\\u001b]0;display-name-token-7f3a\\u0007"', "---", marker, ""].join("\n"),
		);
		await writeCommand(
			cwd,
			path.join(".opencode", "commands", "status-ok.md"),
			["---", "name: status-ok", "---", "name-neighbor-marker", ""].join("\n"),
		);

		const commands = await loadSlashCommands({ cwd });
		expect(commands.some(command => command.name.includes("display-name-token-7f3a"))).toBe(false);
		expect(commands.some(command => command.content.includes(marker))).toBe(false);
		expect(commands.find(command => command.content.includes("name-neighbor-marker"))).toMatchObject({
			name: "status-ok",
		});
	});

	it.skipIf(process.platform === "win32")("drops a command file whose name contains a terminal escape", async () => {
		const cwd = await makeRepo();
		const marker = "file-name-body-marker";
		const fileName = `status\u001b]0;file-name-token-7f3a\u0007.md`;
		await writeCommand(cwd, path.join(".gjc", "commands", fileName), `---\n---\n${marker}\n`);
		await writeCommand(
			cwd,
			path.join(".gjc", "commands", "status-ok.md"),
			"---\ndescription: Ship it.\n---\nfile-neighbor-marker\n",
		);

		const commands = await loadSlashCommands({ cwd });
		expect(commands.some(command => command.name.includes("file-name-token-7f3a"))).toBe(false);
		expect(commands.some(command => command.content.includes(marker))).toBe(false);
		expect(commands.find(command => command.content.includes("file-neighbor-marker"))).toMatchObject({
			name: "status-ok",
			description: "Ship it.",
		});
	});

	it("keeps a plain project command description", async () => {
		const cwd = await makeRepo();
		const marker = "plain-body-marker";
		await writeCommand(
			cwd,
			path.join(".gjc", "commands", "Deploy.md"),
			["---", 'description: "  Ship the service.  "', "---", marker, ""].join("\n"),
		);

		const command = (await loadSlashCommands({ cwd })).find(item => item.content.includes(marker));
		expect(command).toMatchObject({ name: "Deploy", description: "Ship the service." });
		expect(command?.content).toContain(marker);
	});

	it("keeps nested dotted unicode and spaced command names", async () => {
		const cwd = await makeRepo();
		await writeCommand(
			cwd,
			path.join(".gjc", "commands", "team", "sync.md"),
			"---\ndescription: Sync the team.\n---\nnested-marker\n",
		);
		await writeCommand(
			cwd,
			path.join(".gjc", "commands", "release.check.md"),
			"---\ndescription: Check the release.\n---\ndotted-marker\n",
		);
		await writeCommand(
			cwd,
			path.join(".gjc", "commands", "노트.md"),
			"---\ndescription: Take a note.\n---\nunicode-marker\n",
		);
		await writeCommand(
			cwd,
			path.join(".gjc", "commands", "my command.md"),
			"---\ndescription: Run my command.\n---\nspaced-marker\n",
		);

		const commands = await loadSlashCommands({ cwd });
		expect(commands.find(command => command.content.includes("nested-marker"))).toMatchObject({
			name: "team:sync",
			description: "Sync the team.",
		});
		expect(commands.find(command => command.content.includes("dotted-marker"))).toMatchObject({
			name: "release.check",
			description: "Check the release.",
		});
		expect(commands.find(command => command.content.includes("unicode-marker"))).toMatchObject({
			name: "노트",
			description: "Take a note.",
		});
		expect(commands.find(command => command.content.includes("spaced-marker"))).toMatchObject({
			name: "my command",
			description: "Run my command.",
		});
	});

	it("keeps an ordinary command name and a long description", async () => {
		const cwd = await makeRepo();
		const longDescription = `Ship ${"a".repeat(70)} service`;
		await writeCommand(
			cwd,
			path.join(".opencode", "commands", "run.md"),
			["---", "name: Run-Plain", "---", "opencode-name-marker"].join("\n"),
		);
		await writeCommand(
			cwd,
			path.join(".gjc", "commands", "wide.md"),
			["---", `description: ${JSON.stringify(longDescription)}`, "---", "wide-marker"].join("\n"),
		);
		const sixty = "C".repeat(60);
		const seventy = "D".repeat(70);
		await writeCommand(cwd, path.join(".gjc", "commands", "exact.md"), `${sixty}\nexact-marker\n`);
		await writeCommand(cwd, path.join(".gjc", "commands", "preview.md"), `${seventy}\npreview-marker\n`);

		const commands = await loadSlashCommands({ cwd });
		expect(commands.find(command => command.content.includes("opencode-name-marker"))).toMatchObject({
			name: "Run-Plain",
			description: "opencode-name-marker",
		});
		expect(commands.find(command => command.content.includes("wide-marker"))?.description).toBe(longDescription);
		expect(commands.find(command => command.content.includes("exact-marker"))?.description).toBe(sixty);
		expect(commands.find(command => command.content.includes("preview-marker"))?.description).toBe(
			`${"D".repeat(60)}...`,
		);
	});

	it("cleans a body preview before the length cutoff", async () => {
		const cwd = await makeRepo();
		const line = `${"A".repeat(55)}\u001b]0;title\u0007${"B".repeat(20)}`;
		await writeCommand(cwd, path.join(".gjc", "commands", "split.md"), `${line}\nsplit-marker\n`);
		const command = (await loadSlashCommands({ cwd })).find(item => item.content.includes("split-marker"));
		const clean = `${"A".repeat(55)}${"B".repeat(20)}`;
		expect(command?.description).toBe(`${clean.slice(0, 60)}...`);
		expect(command?.description.includes("\u001b")).toBe(false);
	});

	it("drops an OpenCode bidi-only command name and a name with a line break", async () => {
		const cwd = await makeRepo();
		await writeCommand(
			cwd,
			path.join(".opencode", "commands", "bidi.md"),
			["---", 'name: "\\u202E"', "---", "bidi-only-marker", ""].join("\n"),
		);
		await writeCommand(
			cwd,
			path.join(".opencode", "commands", "broken.md"),
			["---", 'name: "status\\r\\nnext"', "---", "linebreak-marker", ""].join("\n"),
		);
		await writeCommand(
			cwd,
			path.join(".opencode", "commands", "marked.md"),
			["---", 'name: "sync\\u202Eteam"', "---", "bidi-insert-marker", ""].join("\n"),
		);
		await writeCommand(
			cwd,
			path.join(".opencode", "commands", "plain.md"),
			["---", "name: sync-team", "---", "bidi-neighbor-marker", ""].join("\n"),
		);

		const commands = await loadSlashCommands({ cwd });
		expect(commands.some(command => command.content.includes("bidi-only-marker"))).toBe(false);
		expect(commands.some(command => command.content.includes("linebreak-marker"))).toBe(false);
		expect(commands.some(command => command.content.includes("bidi-insert-marker"))).toBe(false);
		expect(commands.find(command => command.content.includes("bidi-neighbor-marker"))).toMatchObject({
			name: "sync-team",
		});
	});

	it("keeps a spaced OpenCode command name", async () => {
		const cwd = await makeRepo();
		await writeCommand(
			cwd,
			path.join(".opencode", "commands", "spaced.md"),
			["---", 'name: "sync team"', "---", "space-only-marker", ""].join("\n"),
		);
		const command = (await loadSlashCommands({ cwd })).find(item => item.content.includes("space-only-marker"));
		expect(command).toMatchObject({ name: "sync team" });
	});

	it("drops an OpenCode command name that contains an escaped tab and keeps a spaced name", async () => {
		const cwd = await makeRepo();
		await writeCommand(
			cwd,
			path.join(".opencode", "commands", "tabbed.md"),
			["---", 'name: "sync\\tteam"', "---", "tab-name-marker", ""].join("\n"),
		);
		await writeCommand(
			cwd,
			path.join(".opencode", "commands", "spaced.md"),
			["---", 'name: "sync team"', "---", "tab-neighbor-marker", ""].join("\n"),
		);

		const commands = await loadSlashCommands({ cwd });
		expect(commands.some(command => command.name.includes("\t"))).toBe(false);
		expect(commands.some(command => command.content.includes("tab-name-marker"))).toBe(false);
		expect(commands.find(command => command.content.includes("tab-neighbor-marker"))).toMatchObject({
			name: "sync team",
		});
	});

	it.skipIf(process.platform === "win32")("drops a command file whose name contains a tab", async () => {
		const cwd = await makeRepo();
		await writeCommand(cwd, path.join(".gjc", "commands", "sync\tteam.md"), "---\n---\ntab-file-marker\n");
		await writeCommand(
			cwd,
			path.join(".gjc", "commands", "sync team.md"),
			"---\ndescription: Sync the team.\n---\ntab-file-neighbor\n",
		);

		const commands = await loadSlashCommands({ cwd });
		expect(commands.some(command => command.name.includes("\t"))).toBe(false);
		expect(commands.some(command => command.content.includes("tab-file-marker"))).toBe(false);
		expect(commands.find(command => command.content.includes("tab-file-neighbor"))).toMatchObject({
			name: "sync team",
			description: "Sync the team.",
		});
	});

	it("property: slash command names reject terminal controls", async () => {
		const mod = await import("../src/extensibility/slash-commands");
		const acceptName = mod.isDisplaySafeCommandName;
		expect(typeof acceptName).toBe("function");

		const plainName = fc.oneof(
			fc.stringMatching(/^[A-Za-z0-9 .:_-]{1,24}$/),
			fc.constantFrom("노트", "노트 1", "my command", "Run-Plain", "team:sync", "release.check"),
		);
		fc.assert(
			fc.property(plainName, name => {
				expect(acceptName(name)).toBe(true);
			}),
			{ seed: 20261027, numRuns: 64 },
		);

		const control = fc.constantFrom(
			"\u0000",
			"\u0007",
			"\u001b",
			"\u007f",
			"\u0085",
			"\u009b",
			"\r",
			"\n",
			"\t",
			"\u202e",
			"\u200e",
			"\u200f",
			"\u061c",
			"\u202a",
			"\u2066",
		);
		fc.assert(
			fc.property(plainName, control, fc.integer({ min: 0, max: 8 }), (name, mark, at) => {
				const index = Math.min(at, name.length);
				const hostile = `${name.slice(0, index)}${mark}${name.slice(index)}`;
				expect(acceptName(hostile)).toBe(false);
			}),
			{ seed: 20261028, numRuns: 64 },
		);
	});

	it("property: slash command descriptions stay on one line without terminal controls", async () => {
		const mod = await import("../src/extensibility/slash-commands");
		const describeCommand = mod.slashCommandDescription;
		expect(typeof describeCommand).toBe("function");

		const frontmatter = [
			"---",
			'description: "ship \\u001b]52;c;cHduZWQ=\\u0007 \\u001b[2K ship the service"',
			"---",
			"body",
			"",
		].join("\n");
		const fromFrontmatter = describeCommand(frontmatter);
		expect(fromFrontmatter.includes("\u001b")).toBe(false);
		expect(fromFrontmatter).toContain("ship the service");

		fc.assert(
			fc.property(fc.string({ maxLength: 80 }), raw => {
				const content = raw.startsWith("---") ? `x\n${raw}` : raw;
				const description = describeCommand(content);
				expect(description.includes("\u001b")).toBe(false);
				expect(description.includes("\n")).toBe(false);
				expect(description.includes("\r")).toBe(false);
				expect(TERMINAL_CONTROLS.test(description)).toBe(false);
			}),
			{ seed: 20261025, numRuns: 64 },
		);

		fc.assert(
			fc.property(fc.stringMatching(/^[A-Za-z0-9 .:_-]{1,80}$/), line => {
				const description = describeCommand(`${line}\nrest`);
				const visible = line.trim() ? line : "rest";
				const expected = visible.length > 60 ? `${visible.slice(0, 60)}...` : visible;
				expect(description).toBe(expected);
			}),
			{ seed: 20261026, numRuns: 64 },
		);
	});

	it("property: customize doctor text strips controls from discovery names", () => {
		const control = fc.constantFrom("\u001b]0;injected\u0007", "\u001b[2K", "\u0007", "\u202e");
		fc.assert(
			fc.property(fc.stringMatching(/^[A-Za-z]{1,12}$/), control, (name, mark) => {
				const hostile = `${name}${mark}`;
				const text = renderCustomizeDoctorText(commandReport(hostile, `/work/${hostile}.md`, `detail ${hostile}`));
				expect(text.includes("\u001b")).toBe(false);
				expect(text.includes("\u0007")).toBe(false);
				expect(TERMINAL_CONTROLS.test(text)).toBe(false);
				expect(text).toContain(`  ${name}  [stored-only]`);
				expect(text).not.toContain("injected");
			}),
			{ seed: 20261029, numRuns: 64 },
		);

		fc.assert(
			fc.property(fc.stringMatching(/^[A-Za-z0-9 .:_-]{1,24}$/), name => {
				const text = renderCustomizeDoctorText(commandReport(name, `/work/${name}.md`, "Stored plainly."));
				expect(text).toContain(`  ${name}  [stored-only]`);
				expect(text).toContain("Stored plainly.");
				expect(text).toContain(`/work/${name}.md`);
			}),
			{ seed: 20261030, numRuns: 64 },
		);
	});

	it("does not print a discovered command name's terminal controls", async () => {
		const cwd = await makeRepo();
		const oscName = "reviewzz\u001b]0;injected-title-7f3a\u0007";
		await writeCommand(
			cwd,
			path.join(".opencode", "commands", "review.md"),
			["---", `name: ${JSON.stringify(oscName)}`, "---", "doctor-hostile-marker", ""].join("\n"),
		);
		await writeCommand(
			cwd,
			path.join(".gjc", "commands", "reviewzz-plain.md"),
			"---\ndescription: Ship the service.\n---\ndoctor-plain-marker\n",
		);

		const loaded = await loadSlashCommands({ cwd });
		expect(loaded.some(command => command.content.includes("doctor-hostile-marker"))).toBe(false);
		expect(loaded.find(command => command.content.includes("doctor-plain-marker"))).toMatchObject({
			name: "reviewzz-plain",
			description: "Ship the service.",
		});

		const settings = Settings.isolated({ "commands.enableOpencodeProject": true });
		const report = await runCustomizeDoctor(cwd, settings);
		const commands = report.surfaces.find(surface => surface.kind === "command");
		const hostile = commands?.items.find(item => item.name.includes("\u001b"));
		expect(hostile?.status).toBe("stored-only");
		expect(hostile?.name.includes("\u001b")).toBe(true);

		const text = renderCustomizeDoctorText(report);
		expect(text.includes("\u001b")).toBe(false);
		expect(text.includes("injected-title-7f3a")).toBe(false);
		expect(TERMINAL_CONTROLS.test(text)).toBe(false);
		expect(text).toContain("  reviewzz  [stored-only]");
		expect(text).toContain("  reviewzz-plain  [loaded]");
	});

	it.skipIf(process.platform === "win32")(
		"does not print a command file name's terminal controls in doctor text",
		async () => {
			const cwd = await makeRepo();
			const fileName = "status\u001b]0;file-title-7f3a\u0007.md";
			await writeCommand(cwd, path.join(".gjc", "commands", fileName), "---\n---\nfile-doctor-marker\n");
			await writeCommand(
				cwd,
				path.join(".gjc", "commands", "status-ok.md"),
				"---\ndescription: Ship it.\n---\nfile-doctor-plain\n",
			);

			const loaded = await loadSlashCommands({ cwd });
			expect(loaded.some(command => command.content.includes("file-doctor-marker"))).toBe(false);
			expect(loaded.find(command => command.content.includes("file-doctor-plain"))?.name).toBe("status-ok");

			const report = await runCustomizeDoctor(cwd, Settings.isolated({}));
			const text = renderCustomizeDoctorText(report);
			expect(text.includes("\u001b")).toBe(false);
			expect(text.includes("file-title-7f3a")).toBe(false);
			expect(text).toContain("  status  [stored-only]");
			expect(text).toContain("  status-ok  [loaded]");
		},
	);

	it("prints a plain quarantined hook hash", async () => {
		const cwd = await makeRepo();
		const pluginRoot = path.join(cwd, ".gjc", "gjc-plugins", "plain-hash-bundle");
		const plainHash = "cd".repeat(32);
		const registry = {
			version: 1,
			scope: "project",
			plugins: [
				{
					name: "plain-hash-bundle",
					version: "1.0.0",
					scope: "project",
					enabled: true,
					pluginRoot,
					manifestPath: path.join(pluginRoot, "gajae-plugin.json"),
					manifestHash: "",
					source: { kind: "path", uri: pluginRoot, resolvedAt: "2026-01-01T00:00:00.000Z" },
					installedAt: "2026-01-01T00:00:00.000Z",
					updatedAt: "2026-01-01T00:00:00.000Z",
					copiedFiles: [{ relativePath: "tools/fixture.ts", sha256: "0".repeat(64), bytes: 1 }],
					surfaces: {
						subskills: [],
						tools: [
							{
								extensionId: "tool:fixture-tool",
								name: "fixture-tool",
								relativePath: "tools/fixture.ts",
								sha256: "0".repeat(64),
							},
						],
						hooks: [
							{
								extensionId: "hook:tool_call:before:read:plain",
								name: "plain",
								event: "tool_call",
								target: "read",
								phase: "before",
								relativePath: "hooks/read.ts",
								sha256: plainHash,
								implementationHash: plainHash,
								capabilityHash: plainHash,
								capabilities: [],
								networkDestinations: [],
								filesystemRoots: [],
								functionHook: false,
							},
						],
						mcps: [],
						systemAppendices: [],
						agentAppendices: [],
					},
					disabledSurfaceIds: [],
				},
			],
		};
		await writeCommand(cwd, path.join(".gjc", "gjc-plugins", "registry.json"), `${JSON.stringify(registry)}\n`);
		const report = await runCustomizeDoctor(cwd, Settings.isolated({}));
		const hook = report.surfaces
			.find(surface => surface.kind === "plugin-bundle")
			?.items.find(item => item.name === "plain-hash-bundle")
			?.functionHooks?.find(item => item.extensionId.endsWith("plain"));
		expect(hook?.capabilityHash).toBe(plainHash);
		expect(hook?.implementationHash).toBe(plainHash);
		expect(renderCustomizeDoctorText(report)).toContain(plainHash);
	});

	it("keeps quarantined hook hashes in the report and strips them from doctor text", async () => {
		const cwd = await makeRepo();
		const pluginRoot = path.join(cwd, ".gjc", "gjc-plugins", "hash-bundle");
		const hostile = "\u001b]0;spoofed-title\u0007";
		const plainHash = "ab".repeat(32);
		const hook = (id: string, hash: string) => ({
			extensionId: id,
			name: id,
			event: "tool_call",
			target: "read",
			phase: "before",
			relativePath: "hooks/read.ts",
			sha256: "0".repeat(64),
			implementationHash: hash,
			capabilityHash: hash,
			capabilities: [],
			networkDestinations: [],
			filesystemRoots: [],
			functionHook: false,
		});
		const registry = {
			version: 1,
			scope: "project",
			plugins: [
				{
					name: "hash-bundle",
					version: "1.0.0",
					scope: "project",
					enabled: true,
					pluginRoot,
					manifestPath: path.join(pluginRoot, "gajae-plugin.json"),
					manifestHash: "",
					source: { kind: "path", uri: pluginRoot, resolvedAt: "2026-01-01T00:00:00.000Z" },
					installedAt: "2026-01-01T00:00:00.000Z",
					updatedAt: "2026-01-01T00:00:00.000Z",
					copiedFiles: [{ relativePath: "tools/fixture.ts", sha256: "0".repeat(64), bytes: 1 }],
					surfaces: {
						subskills: [],
						tools: [
							{
								extensionId: "tool:fixture-tool",
								name: "fixture-tool",
								relativePath: "tools/fixture.ts",
								sha256: "0".repeat(64),
							},
						],
						hooks: [
							hook("hook:tool_call:before:read:hostile", hostile),
							hook("hook:tool_call:before:read:plain", plainHash),
						],
						mcps: [],
						systemAppendices: [],
						agentAppendices: [],
					},
					disabledSurfaceIds: [],
				},
			],
		};
		await writeCommand(cwd, path.join(".gjc", "gjc-plugins", "registry.json"), `${JSON.stringify(registry)}\n`);

		const report = await runCustomizeDoctor(cwd, Settings.isolated({}));
		const bundle = report.surfaces
			.find(surface => surface.kind === "plugin-bundle")
			?.items.find(item => item.name === "hash-bundle");
		const hostileHook = bundle?.functionHooks?.find(item => item.extensionId.endsWith("hostile"));
		const plainHook = bundle?.functionHooks?.find(item => item.extensionId.endsWith("plain"));
		expect(bundle?.status).toBe("quarantined");
		expect(hostileHook?.capabilityHash).toBe(hostile);
		expect(hostileHook?.implementationHash).toBe(hostile);
		expect(plainHook?.capabilityHash).toBe(plainHash);
		expect(plainHook?.implementationHash).toBe(plainHash);

		const text = renderCustomizeDoctorText(report);
		expect(text.includes("\u001b")).toBe(false);
		expect(text.includes("\u0007")).toBe(false);
		expect(text.includes("spoofed-title")).toBe(false);
		expect(text).toContain(plainHash);
	});
});
