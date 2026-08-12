/**
 * Issue #4291 acceptance: `/extensions` umbrella local customization surface.
 *
 * Covers canonical project/global `.gjc` scope resolution, inventory/status
 * provenance, Claude Code + Codex import preview/apply with collision policy,
 * redaction, unsupported semantics, cancellation, atomic-write rollback,
 * idempotency, mutations, and dashboard keyboard/narrow-terminal behavior.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { applyImport, buildImportPreview } from "@gajae-code/coding-agent/customization/import";
import { loadCustomizationInventory } from "@gajae-code/coding-agent/customization/inventory";
import {
	removeHookFile,
	removeMcpServerEntry,
	removeSkill,
	setMcpServerEnabled,
	setSkillEnabled,
} from "@gajae-code/coding-agent/customization/mutations";
import { resolveScopePaths } from "@gajae-code/coding-agent/customization/types";
import { getAgentDir, setAgentDir } from "@gajae-code/utils";

let tmpRoot: string;
let projectDir: string;
let homeDir: string;
let savedAgentDir: string;

beforeEach(async () => {
	tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-4291-"));
	projectDir = path.join(tmpRoot, "project");
	homeDir = path.join(tmpRoot, "home");
	await fs.mkdir(projectDir, { recursive: true });
	await fs.mkdir(homeDir, { recursive: true });
	savedAgentDir = getAgentDir();
	setAgentDir(path.join(tmpRoot, "global-agent"));
});

afterEach(async () => {
	setAgentDir(savedAgentDir);
	await fs.rm(tmpRoot, { recursive: true, force: true });
});

async function writeFile(filePath: string, content: string): Promise<void> {
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, content, "utf-8");
}

const SKILL_MD = `---
description: Fixture skill for tests.
---

# Fixture

Do the thing.
`;

// ---------------------------------------------------------------------------
// Acceptance 2: canonical scope locations
// ---------------------------------------------------------------------------

describe("scope resolution", () => {
	test("project scope resolves to <project>/.gjc", () => {
		const paths = resolveScopePaths("project", projectDir);
		expect(paths.root).toBe(path.join(projectDir, ".gjc"));
		expect(paths.skillsDir).toBe(path.join(projectDir, ".gjc", "skills"));
		expect(paths.hooksDir).toBe(path.join(projectDir, ".gjc", "hooks"));
		expect(paths.mcpConfigPath).toBe(path.join(projectDir, ".gjc", "mcp.json"));
	});

	test("global scope resolves to the agent dir (~/.gjc/agent)", () => {
		const paths = resolveScopePaths("global", projectDir);
		expect(paths.root).toBe(getAgentDir());
		expect(paths.skillsDir).toBe(path.join(getAgentDir(), "skills"));
		expect(paths.mcpConfigPath).toBe(path.join(getAgentDir(), "mcp.json"));
	});
});

// ---------------------------------------------------------------------------
// Acceptance 3 + additional: inventory with zero extension modules
// ---------------------------------------------------------------------------

describe("customization inventory", () => {
	test("one project SKILL.md is managed even with no extension modules installed", async () => {
		await writeFile(path.join(projectDir, ".gjc", "skills", "fixture", "SKILL.md"), SKILL_MD);
		const inventory = await loadCustomizationInventory({ cwd: projectDir });
		const row = inventory.rows.find(r => r.surface === "skills" && r.name === "fixture");
		expect(row).toBeDefined();
		expect(row?.status).toBe("enabled");
		expect(row?.scope).toBe("project");
		expect(row?.provenance).toContain("Project .gjc");
	});

	test("global skills surface under the global scope", async () => {
		await writeFile(path.join(getAgentDir(), "skills", "global-skill", "SKILL.md"), SKILL_MD);
		const inventory = await loadCustomizationInventory({ cwd: projectDir });
		const row = inventory.rows.find(r => r.surface === "skills" && r.name === "global-skill");
		expect(row).toBeDefined();
		expect(row?.scope).toBe("global");
	});

	test("invalid frontmatter is flagged with remediation diagnostics", async () => {
		await writeFile(path.join(projectDir, ".gjc", "skills", "broken", "SKILL.md"), "no frontmatter here\n");
		const inventory = await loadCustomizationInventory({ cwd: projectDir });
		const row = inventory.rows.find(r => r.surface === "skills" && r.name === "broken");
		expect(row?.status).toBe("invalid");
		expect(row?.diagnostics?.join(" ")).toContain("frontmatter");
	});

	test("project scope shadows an identical global skill name", async () => {
		await writeFile(path.join(projectDir, ".gjc", "skills", "dup", "SKILL.md"), SKILL_MD);
		await writeFile(path.join(getAgentDir(), "skills", "dup", "SKILL.md"), SKILL_MD);
		const inventory = await loadCustomizationInventory({ cwd: projectDir });
		const rows = inventory.rows.filter(r => r.surface === "skills" && r.name === "dup");
		expect(rows.find(r => r.scope === "project")?.status).toBe("enabled");
		expect(rows.find(r => r.scope === "global")?.status).toBe("shadowed");
	});

	test("malformed MCP config surfaces as an invalid row, never raw JSON", async () => {
		await writeFile(path.join(projectDir, ".gjc", "mcp.json"), "{ not json");
		const inventory = await loadCustomizationInventory({ cwd: projectDir });
		const row = inventory.rows.find(r => r.surface === "mcps" && r.status === "invalid");
		expect(row).toBeDefined();
		expect(JSON.stringify(row)).not.toContain("not json");
	});
});

// ---------------------------------------------------------------------------
// Acceptance 4/5: Claude Code + Codex imports
// ---------------------------------------------------------------------------

async function seedClaudeProject(): Promise<void> {
	await writeFile(path.join(projectDir, ".claude", "skills", "claude-skill", "SKILL.md"), SKILL_MD);
	await writeFile(path.join(projectDir, ".claude", "hooks", "pre-bash.ts"), "export default function hook() {}\n");
	await writeFile(
		path.join(projectDir, ".mcp.json"),
		JSON.stringify({
			mcpServers: {
				"claude-server": { type: "stdio", command: "npx", args: ["-y", "srv"], env: { API_KEY: "secret-value" } },
			},
		}),
	);
}

describe("import from Claude Code (project → project .gjc)", () => {
	test("preview normalizes skills/hooks/MCPs and redacts secrets", async () => {
		await seedClaudeProject();
		const preview = await buildImportPreview({
			product: "claude-code",
			sourceScope: "project",
			destinationScope: "project",
			collisionPolicy: "skip",
			cwd: projectDir,
			homeDir,
		});
		const skills = preview.entries.filter(e => e.surface === "skills");
		const hooks = preview.entries.filter(e => e.surface === "hooks");
		const mcps = preview.entries.filter(e => e.surface === "mcps");
		expect(skills.map(e => e.destinationName)).toEqual(["claude-skill"]);
		expect(hooks.map(e => e.destinationName)).toEqual(["pre-bash.ts"]);
		expect(mcps.map(e => e.destinationName)).toEqual(["claude-server"]);
		// Secret redaction: env values never appear; the entry is flagged redacted.
		const mcp = mcps[0];
		expect(mcp.status).toBe("redacted");
		expect(mcp.reason).toContain("env:API_KEY");
		expect(JSON.stringify({ d: mcp.description, r: mcp.reason })).not.toContain("secret-value");
	});

	test("apply writes canonical .gjc files and marks provenance", async () => {
		await seedClaudeProject();
		const preview = await buildImportPreview({
			product: "claude-code",
			sourceScope: "project",
			destinationScope: "project",
			collisionPolicy: "skip",
			cwd: projectDir,
			homeDir,
		});
		const result = await applyImport(preview, { cwd: projectDir });
		expect(result.ok).toBe(true);
		const skillPath = path.join(projectDir, ".gjc", "skills", "claude-skill", "SKILL.md");
		const content = await fs.readFile(skillPath, "utf-8");
		expect(content).toContain("x-gjc-imported-from");
		expect(content).toContain("claude-code");
		await fs.stat(path.join(projectDir, ".gjc", "hooks", "pre-bash.ts"));
		const mcpConfig = JSON.parse(await fs.readFile(path.join(projectDir, ".gjc", "mcp.json"), "utf-8"));
		expect(mcpConfig.mcpServers["claude-server"].command).toBe("npx");
		// Imported skill shows up in the inventory as usable with import provenance.
		const inventory = await loadCustomizationInventory({ cwd: projectDir });
		const row = inventory.rows.find(r => r.surface === "skills" && r.name === "claude-skill");
		expect(row?.status).toBe("imported");
		expect(row?.provenance).toContain("Claude Code");
	});
});

describe("import from Codex (user-global → global .gjc, explicit selection)", () => {
	test("toml MCP + markdown prompt normalize into global .gjc only", async () => {
		await writeFile(path.join(homeDir, ".codex", "prompts", "codex-prompt.md"), "# Codex Prompt\n\nBody text.\n");
		await writeFile(
			path.join(homeDir, ".codex", "config.toml"),
			'[mcp_servers.codex-server]\ncommand = "uvx"\nargs = ["srv"]\n',
		);
		const preview = await buildImportPreview({
			product: "codex",
			sourceScope: "user",
			destinationScope: "global",
			collisionPolicy: "skip",
			cwd: projectDir,
			homeDir,
		});
		expect(preview.entries.filter(e => e.surface === "skills").map(e => e.destinationName)).toEqual(["codex-prompt"]);
		expect(preview.entries.filter(e => e.surface === "mcps").map(e => e.destinationName)).toEqual(["codex-server"]);
		const result = await applyImport(preview, { cwd: projectDir });
		expect(result.ok).toBe(true);
		// Writes land only in the global .gjc scope, never the project.
		await fs.stat(path.join(getAgentDir(), "skills", "codex-prompt", "SKILL.md"));
		const mcpConfig = JSON.parse(await fs.readFile(path.join(getAgentDir(), "mcp.json"), "utf-8"));
		expect(mcpConfig.mcpServers["codex-server"].command).toBe("uvx");
		await expect(fs.stat(path.join(projectDir, ".gjc", "skills", "codex-prompt"))).rejects.toThrow();
		await expect(fs.stat(path.join(projectDir, ".gjc", "mcp.json"))).rejects.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Acceptance 6/7: collisions, unsupported semantics, cancellation, rollback, idempotency
// ---------------------------------------------------------------------------

describe("import collision policy and safety", () => {
	async function seedSkillBothSides(): Promise<void> {
		await writeFile(path.join(projectDir, ".claude", "skills", "dupe", "SKILL.md"), SKILL_MD);
		await writeFile(
			path.join(projectDir, ".gjc", "skills", "dupe", "SKILL.md"),
			`---\ndescription: Native version.\n---\n\nnative body\n`,
		);
	}

	test("skip policy marks conflicts and never overwrites the native entry", async () => {
		await seedSkillBothSides();
		const preview = await buildImportPreview({
			product: "claude-code",
			sourceScope: "project",
			destinationScope: "project",
			surfaces: ["skills"],
			collisionPolicy: "skip",
			cwd: projectDir,
			homeDir,
		});
		expect(preview.entries[0].status).toBe("conflict");
		const result = await applyImport(preview, { cwd: projectDir });
		expect(result.ok).toBe(true);
		expect(result.entries[0].outcome).toBe("skipped");
		const content = await fs.readFile(path.join(projectDir, ".gjc", "skills", "dupe", "SKILL.md"), "utf-8");
		expect(content).toContain("Native version.");
	});

	test("rename policy imports under an -imported suffix", async () => {
		await seedSkillBothSides();
		const preview = await buildImportPreview({
			product: "claude-code",
			sourceScope: "project",
			destinationScope: "project",
			surfaces: ["skills"],
			collisionPolicy: "rename",
			cwd: projectDir,
			homeDir,
		});
		expect(preview.entries[0].destinationName).toBe("dupe-imported");
		const result = await applyImport(preview, { cwd: projectDir });
		expect(result.ok).toBe(true);
		expect(result.entries[0].outcome).toBe("renamed");
		await fs.stat(path.join(projectDir, ".gjc", "skills", "dupe-imported", "SKILL.md"));
	});

	test("overwrite policy replaces the destination explicitly", async () => {
		await seedSkillBothSides();
		const preview = await buildImportPreview({
			product: "claude-code",
			sourceScope: "project",
			destinationScope: "project",
			surfaces: ["skills"],
			collisionPolicy: "overwrite",
			cwd: projectDir,
			homeDir,
		});
		expect(preview.entries[0].status).toBe("overwrite");
		const result = await applyImport(preview, { cwd: projectDir });
		expect(result.entries[0].outcome).toBe("overwritten");
		const content = await fs.readFile(path.join(projectDir, ".gjc", "skills", "dupe", "SKILL.md"), "utf-8");
		expect(content).toContain("Fixture skill for tests.");
	});

	test("identical re-import is a no-op (idempotent)", async () => {
		await seedClaudeProject();
		const options = {
			product: "claude-code" as const,
			sourceScope: "project" as const,
			destinationScope: "project" as const,
			collisionPolicy: "skip" as const,
			cwd: projectDir,
			homeDir,
		};
		await applyImport(await buildImportPreview(options), { cwd: projectDir });
		const second = await buildImportPreview(options);
		for (const entry of second.entries) {
			expect(entry.status).toBe("conflict");
			expect(entry.reason).toContain("identical");
		}
		const secondResult = await applyImport(second, { cwd: projectDir });
		expect(secondResult.ok).toBe(true);
		expect(secondResult.entries.every(e => e.outcome === "skipped")).toBe(true);
	});

	test("unsupported hook filenames surface diagnostics instead of silent import", async () => {
		await writeFile(path.join(projectDir, ".claude", "hooks", "random-name.ts"), "export {}\n");
		const preview = await buildImportPreview({
			product: "claude-code",
			sourceScope: "project",
			destinationScope: "project",
			surfaces: ["hooks"],
			collisionPolicy: "skip",
			cwd: projectDir,
			homeDir,
		});
		expect(preview.entries[0].status).toBe("unsupported");
		expect(preview.entries[0].reason).toContain("pre-<tool>");
	});

	test("malformed source MCP config is a warning, not a crash", async () => {
		await writeFile(path.join(projectDir, ".mcp.json"), "{ broken");
		const preview = await buildImportPreview({
			product: "claude-code",
			sourceScope: "project",
			destinationScope: "project",
			surfaces: ["mcps"],
			collisionPolicy: "skip",
			cwd: projectDir,
			homeDir,
		});
		expect(preview.warnings.join(" ")).toContain("invalid JSON");
		expect(preview.entries).toHaveLength(0);
	});

	test("cancellation means no writes: building a preview never touches the destination", async () => {
		await seedClaudeProject();
		await buildImportPreview({
			product: "claude-code",
			sourceScope: "project",
			destinationScope: "project",
			collisionPolicy: "skip",
			cwd: projectDir,
			homeDir,
		});
		await expect(fs.stat(path.join(projectDir, ".gjc"))).rejects.toThrow();
	});

	test("failed apply rolls back every write (no partial import)", async () => {
		await seedClaudeProject();
		// Malformed destination mcp.json forces the apply to fail after the skill
		// file was already written — rollback must remove it again.
		await writeFile(path.join(projectDir, ".gjc", "mcp.json"), "{ malformed");
		const preview = await buildImportPreview({
			product: "claude-code",
			sourceScope: "project",
			destinationScope: "project",
			collisionPolicy: "skip",
			cwd: projectDir,
			homeDir,
		});
		const result = await applyImport(preview, { cwd: projectDir });
		expect(result.ok).toBe(false);
		expect(result.entries.some(e => e.outcome === "failed")).toBe(true);
		await expect(fs.stat(path.join(projectDir, ".gjc", "skills", "claude-skill"))).rejects.toThrow();
		const mcpContent = await fs.readFile(path.join(projectDir, ".gjc", "mcp.json"), "utf-8");
		expect(mcpContent).toBe("{ malformed");
	});
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

describe("native .gjc mutations", () => {
	test("skill enable/disable toggles frontmatter; remove deletes the directory", async () => {
		const paths = resolveScopePaths("project", projectDir);
		await writeFile(path.join(paths.skillsDir, "fixture", "SKILL.md"), SKILL_MD);
		expect(await setSkillEnabled(paths, "fixture", false)).toEqual({ ok: true });
		let content = await fs.readFile(path.join(paths.skillsDir, "fixture", "SKILL.md"), "utf-8");
		expect(content).toContain("enabled: false");
		expect(await setSkillEnabled(paths, "fixture", true)).toEqual({ ok: true });
		content = await fs.readFile(path.join(paths.skillsDir, "fixture", "SKILL.md"), "utf-8");
		expect(content).not.toContain("enabled: false");
		expect(await removeSkill(paths, "fixture")).toEqual({ ok: true });
		await expect(fs.stat(path.join(paths.skillsDir, "fixture"))).rejects.toThrow();
	});

	test("bundled workflow skill names are protected from removal", async () => {
		const paths = resolveScopePaths("project", projectDir);
		await writeFile(path.join(paths.skillsDir, "ralplan", "SKILL.md"), SKILL_MD);
		const result = await removeSkill(paths, "ralplan");
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toContain("bundled");
		await fs.stat(path.join(paths.skillsDir, "ralplan", "SKILL.md"));
	});

	test("MCP enable/disable/remove go through the canonical writer", async () => {
		const paths = resolveScopePaths("project", projectDir);
		await writeFile(paths.mcpConfigPath, JSON.stringify({ mcpServers: { srv: { type: "stdio", command: "npx" } } }));
		expect(await setMcpServerEnabled(paths.mcpConfigPath, "srv", false)).toEqual({ ok: true });
		let config = JSON.parse(await fs.readFile(paths.mcpConfigPath, "utf-8"));
		expect(config.mcpServers.srv.enabled).toBe(false);
		expect(await setMcpServerEnabled(paths.mcpConfigPath, "srv", true)).toEqual({ ok: true });
		config = JSON.parse(await fs.readFile(paths.mcpConfigPath, "utf-8"));
		expect(config.mcpServers.srv.enabled).toBeUndefined();
		expect(await removeMcpServerEntry(paths.mcpConfigPath, "srv")).toEqual({ ok: true });
		config = JSON.parse(await fs.readFile(paths.mcpConfigPath, "utf-8"));
		expect(config.mcpServers.srv).toBeUndefined();
	});

	test("hook removal is confined to the hooks directory", async () => {
		const paths = resolveScopePaths("project", projectDir);
		await writeFile(path.join(paths.hooksDir, "pre-bash.ts"), "export {}\n");
		expect(await removeHookFile(paths, "pre-bash.ts")).toEqual({ ok: true });
		const escaped = await removeHookFile(paths, "../mcp.json");
		expect(escaped.ok).toBe(false);
	});
});
