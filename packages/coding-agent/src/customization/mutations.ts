/**
 * Safe mutations for the `/extensions` umbrella customization surface
 * (issue #4291). Every operation goes through the same canonical
 * loaders/writers the runtime and CLI use — no parallel state model.
 *
 * - Skills: enable/disable via frontmatter `enabled`, remove with bundled-name
 *   and symlink protection.
 * - MCPs: enable/disable via the `enabled` flag and remove via the canonical
 *   config writer (atomic write, cache invalidation included).
 * - Hooks: remove only (directory hook files); enable/disable is not part of
 *   the canonical hook contract and is rejected with a diagnostic.
 */
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { parseFrontmatter } from "@gajae-code/utils";
import { YAML } from "bun";
import { BUNDLED_GJC_SKILL_CATALOG } from "../defaults/gjc-skills.generated";
import { readMCPConfigFile, removeMCPServer, writeMCPConfigFile } from "../runtime-mcp/config-writer";
import type { GjcScopePaths } from "./types";

const BUNDLED_SKILL_NAMES: ReadonlySet<string> = new Set(
	BUNDLED_GJC_SKILL_CATALOG.flatMap(entry =>
		entry.kind === "skill" && typeof entry.name === "string" ? [entry.name] : [],
	),
);

export type MutationResult = { ok: true } | { ok: false; reason: string };

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

async function resolveSkillDir(paths: GjcScopePaths, slug: string): Promise<{ dir: string } | { error: string }> {
	const dir = path.join(paths.skillsDir, slug);
	const relative = path.relative(paths.skillsDir, dir);
	if (relative.startsWith("..") || path.isAbsolute(relative)) {
		return { error: `skill name "${slug}" escapes the skills directory` };
	}
	try {
		const stat = await fs.lstat(dir);
		if (stat.isSymbolicLink()) return { error: `refusing to mutate symlinked skill directory: ${dir}` };
		if (!stat.isDirectory()) return { error: `not a skill directory: ${dir}` };
	} catch {
		return { error: `skill "${slug}" not found at ${dir}` };
	}
	return { dir };
}

/** Toggle a local skill via its frontmatter `enabled` flag. */
export async function setSkillEnabled(paths: GjcScopePaths, slug: string, enabled: boolean): Promise<MutationResult> {
	if (BUNDLED_SKILL_NAMES.has(slug)) {
		return { ok: false, reason: `"${slug}" is a protected bundled workflow skill name` };
	}
	const resolved = await resolveSkillDir(paths, slug);
	if ("error" in resolved) return { ok: false, reason: resolved.error };
	const skillPath = path.join(resolved.dir, "SKILL.md");
	let text: string;
	try {
		text = await fs.readFile(skillPath, "utf-8");
	} catch {
		return { ok: false, reason: `no SKILL.md at ${skillPath}` };
	}
	const { frontmatter, body } = parseFrontmatter(text, { level: "off" });
	const fm: Record<string, unknown> = { ...frontmatter };
	if (enabled) {
		delete fm.enabled;
	} else {
		fm.enabled = false;
	}
	const yaml = YAML.stringify(fm).trimEnd();
	await fs.writeFile(skillPath, `---\n${yaml}\n---\n\n${body.trim()}\n`, "utf-8");
	return { ok: true };
}

/** Remove a local skill directory. Never removes bundled-name shadows blindly. */
export async function removeSkill(paths: GjcScopePaths, slug: string): Promise<MutationResult> {
	if (BUNDLED_SKILL_NAMES.has(slug)) {
		return { ok: false, reason: `"${slug}" is a protected bundled workflow skill name` };
	}
	const resolved = await resolveSkillDir(paths, slug);
	if ("error" in resolved) return { ok: false, reason: resolved.error };
	await fs.rm(resolved.dir, { recursive: true, force: true });
	return { ok: true };
}

// ---------------------------------------------------------------------------
// MCPs
// ---------------------------------------------------------------------------

/** Toggle a server's `enabled` flag in the canonical mcp.json writer. */
export async function setMcpServerEnabled(
	mcpConfigPath: string,
	name: string,
	enabled: boolean,
): Promise<MutationResult> {
	const config = await readMCPConfigFile(mcpConfigPath).catch(() => null);
	if (!config) return { ok: false, reason: `${mcpConfigPath} is malformed; fix or remove it first` };
	const server = config.mcpServers?.[name];
	if (!server) return { ok: false, reason: `server "${name}" not found in ${mcpConfigPath}` };
	const updatedServer = { ...server };
	if (enabled) {
		delete updatedServer.enabled;
	} else {
		updatedServer.enabled = false;
	}
	await writeMCPConfigFile(mcpConfigPath, {
		...config,
		mcpServers: { ...config.mcpServers, [name]: updatedServer },
	});
	return { ok: true };
}

/** Remove a server via the canonical config writer. */
export async function removeMcpServerEntry(mcpConfigPath: string, name: string): Promise<MutationResult> {
	try {
		await removeMCPServer(mcpConfigPath, name);
		return { ok: true };
	} catch (error) {
		return { ok: false, reason: (error as Error).message };
	}
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Remove a directory hook file; refuses symlinks and paths outside the hooks dir. */
export async function removeHookFile(paths: GjcScopePaths, fileName: string): Promise<MutationResult> {
	const filePath = path.join(paths.hooksDir, fileName);
	const relative = path.relative(paths.hooksDir, filePath);
	if (relative.startsWith("..") || path.isAbsolute(relative)) {
		return { ok: false, reason: `hook name "${fileName}" escapes the hooks directory` };
	}
	try {
		const stat = await fs.lstat(filePath);
		if (stat.isSymbolicLink()) return { ok: false, reason: `refusing to remove symlinked hook: ${filePath}` };
		await fs.rm(filePath, { force: true });
		return { ok: true };
	} catch (error) {
		return { ok: false, reason: (error as Error).message };
	}
}
