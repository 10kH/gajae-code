/**
 * Import flow for the `/extensions` umbrella customization surface (issue #4291).
 *
 * Imports Claude Code / Codex skills, hooks, and MCP servers — from either the
 * project-local or user-global source layout — into the canonical `.gjc`
 * project/global destination. The flow is preview-first: `buildImportPreview`
 * performs all reads and normalization, applies the deterministic collision
 * policy (skip / rename / overwrite), redacts secrets from everything the UI
 * can render, and only `applyImport` writes — with journaled rollback so a
 * failed import never leaves partial state.
 *
 * Normalization consumes the sibling contracts instead of reimplementing them:
 * the migrate skill normalizer + MCP mapper (#4284/#4285 ownership) and the
 * canonical hook IR normalizer (#4286). Unsupported foreign semantics surface
 * as preview diagnostics, never silent drops.
 */
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { isEnoent, parseFrontmatter } from "@gajae-code/utils";
import { TOML, YAML } from "bun";
import { HookSourceConvention } from "../hooks/events";
import { normalizeDirectoryHook } from "../hooks/normalize";
import { collectMarkdownPrompts, collectSkillDir } from "../migrate/adapters/index";
import { mapMcpEntry } from "../migrate/mcp-mapper";
import { readMCPConfigFile, validateServerName, writeMCPConfigFile } from "../runtime-mcp/config-writer";
import type { MCPConfigFile, MCPServerConfig } from "../runtime-mcp/types";
import { IMPORTED_FROM_FRONTMATTER_KEY } from "./inventory";
import type {
	CustomizationSurface,
	GjcScope,
	ImportCollisionPolicy,
	ImportPreview,
	ImportPreviewEntry,
	ImportProduct,
	ImportResult,
	ImportResultEntry,
	ImportSourceScope,
	NormalizedPayload,
} from "./types";
import { productLabel, resolveScopePaths, sourceConfigDir, sourceScopeLabel } from "./types";

export interface BuildImportPreviewOptions {
	product: ImportProduct;
	sourceScope: ImportSourceScope;
	destinationScope: GjcScope;
	/** Surfaces to import; defaults to all three. */
	surfaces?: readonly CustomizationSurface[];
	collisionPolicy: ImportCollisionPolicy;
	/** Project working directory (project source/destination resolution). */
	cwd: string;
	/** Home directory root; overridable for tests. */
	homeDir: string;
}

// ---------------------------------------------------------------------------
// Source layouts
// ---------------------------------------------------------------------------

interface SourceLayout {
	skillsDir: string;
	hooksDir: string;
	/** Product-specific MCP config file (`.claude.json` / `.mcp.json` / `config.toml`). */
	mcpConfigPath: string;
	/** How MCP entries are encoded in that file. */
	mcpFormat: "json-mcpServers" | "toml-mcp_servers";
	/** How skills are encoded: SKILL.md directories (Claude) or markdown prompts (Codex). */
	skillFormat: "skill-dirs" | "markdown-prompts";
}

function sourceLayout(
	product: ImportProduct,
	sourceScope: ImportSourceScope,
	cwd: string,
	homeDir: string,
): SourceLayout {
	const configDir = sourceConfigDir(product, sourceScope, cwd, homeDir);
	if (product === "claude-code") {
		return {
			skillsDir: path.join(configDir, "skills"),
			hooksDir: path.join(configDir, "hooks"),
			// Project-scope Claude MCP servers live in `<project>/.mcp.json`;
			// user-global servers live in `~/.claude.json`.
			mcpConfigPath: sourceScope === "project" ? path.join(cwd, ".mcp.json") : path.join(homeDir, ".claude.json"),
			mcpFormat: "json-mcpServers",
			skillFormat: "skill-dirs",
		};
	}
	return {
		// Codex "skills" are markdown prompts; both scopes follow the same layout.
		skillsDir: path.join(configDir, "prompts"),
		hooksDir: path.join(configDir, "hooks"),
		mcpConfigPath: path.join(configDir, "config.toml"),
		mcpFormat: "toml-mcp_servers",
		skillFormat: "markdown-prompts",
	};
}

// ---------------------------------------------------------------------------
// Provenance marker
// ---------------------------------------------------------------------------

/** Inject the imported-from provenance key into a normalized SKILL.md. */
function withImportProvenance(content: string, product: ImportProduct): string {
	const { frontmatter, body } = parseFrontmatter(content, { level: "off" });
	const fm: Record<string, unknown> = { ...frontmatter, [IMPORTED_FROM_FRONTMATTER_KEY]: product };
	const yaml = YAML.stringify(fm).trimEnd();
	return `---\n${yaml}\n---\n\n${body.trim()}\n`;
}

// ---------------------------------------------------------------------------
// Source collection
// ---------------------------------------------------------------------------

async function readJsonMcpServers(filePath: string): Promise<{ servers: Record<string, unknown> } | { error: string }> {
	let text: string;
	try {
		text = await fs.readFile(filePath, "utf-8");
	} catch (error) {
		if (isEnoent(error)) return { servers: {} };
		return { error: `failed to read ${filePath}: ${(error as Error).message}` };
	}
	try {
		const data = JSON.parse(text) as Record<string, unknown>;
		const servers = data?.mcpServers;
		if (servers && typeof servers === "object" && !Array.isArray(servers)) {
			return { servers: servers as Record<string, unknown> };
		}
		return { servers: {} };
	} catch (error) {
		return { error: `invalid JSON in ${filePath}: ${(error as Error).message}` };
	}
}

async function readTomlMcpServers(filePath: string): Promise<{ servers: Record<string, unknown> } | { error: string }> {
	let text: string;
	try {
		text = await fs.readFile(filePath, "utf-8");
	} catch (error) {
		if (isEnoent(error)) return { servers: {} };
		return { error: `failed to read ${filePath}: ${(error as Error).message}` };
	}
	try {
		const data = TOML.parse(text) as Record<string, unknown>;
		const servers = data?.mcp_servers;
		if (servers && typeof servers === "object" && !Array.isArray(servers)) {
			return { servers: servers as Record<string, unknown> };
		}
		return { servers: {} };
	} catch (error) {
		return { error: `invalid TOML in ${filePath}: ${(error as Error).message}` };
	}
}

interface RawHookCandidate {
	fileName: string;
	filePath: string;
	content: string;
}

async function collectSourceHooks(hooksDir: string): Promise<RawHookCandidate[]> {
	let names: string[];
	try {
		names = await fs.readdir(hooksDir);
	} catch {
		return [];
	}
	const candidates: RawHookCandidate[] = [];
	for (const name of names.sort()) {
		if (!/\.(ts|js)$/.test(name)) continue;
		const filePath = path.join(hooksDir, name);
		try {
			const stat = await fs.lstat(filePath);
			if (!stat.isFile() || stat.isSymbolicLink()) continue;
			candidates.push({ fileName: name, filePath, content: await fs.readFile(filePath, "utf-8") });
		} catch {}
	}
	return candidates;
}

// ---------------------------------------------------------------------------
// Collision handling
// ---------------------------------------------------------------------------

/** Find a free `<base>-imported` / `<base>-imported-N` destination name. */
function renamedDestination(base: string, taken: (name: string) => boolean): string {
	let candidate = `${base}-imported`;
	let index = 2;
	while (taken(candidate)) {
		candidate = `${base}-imported-${index}`;
		index += 1;
	}
	return candidate;
}

function applyCollision(
	entry: Omit<ImportPreviewEntry, "status"> & { status?: ImportPreviewEntry["status"] },
	exists: boolean,
	identical: boolean,
	policy: ImportCollisionPolicy,
	rename: (base: string) => string,
): ImportPreviewEntry {
	if (!exists) return { ...entry, status: entry.status ?? "add" };
	if (identical) {
		return {
			...entry,
			status: "conflict",
			reason: "identical content already present at destination (import is a no-op)",
		};
	}
	switch (policy) {
		case "skip":
			return { ...entry, status: "conflict", reason: "destination exists (collision policy: skip)" };
		case "overwrite":
			return { ...entry, status: "overwrite", reason: "destination exists (collision policy: overwrite)" };
		case "rename": {
			const destinationName = rename(entry.destinationName);
			return {
				...entry,
				destinationName,
				status: "add",
				reason: `destination "${entry.destinationName}" exists; renamed under collision policy: rename`,
			};
		}
	}
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

/**
 * Read the selected source product/scope, normalize every candidate through
 * the sibling contracts, and produce a redacted preview. Pure reads only —
 * nothing is written until `applyImport`.
 */
export async function buildImportPreview(options: BuildImportPreviewOptions): Promise<ImportPreview> {
	const surfaces = options.surfaces ?? (["skills", "hooks", "mcps"] as const);
	const takenSkillNames = new Set<string>();
	const takenHookNames = new Set<string>();
	const takenMcpNames = new Set<string>();
	const layout = sourceLayout(options.product, options.sourceScope, options.cwd, options.homeDir);
	const destination = resolveScopePaths(options.destinationScope, options.cwd);
	const entries: ImportPreviewEntry[] = [];
	const warnings: string[] = [];
	const productName = productLabel(options.product);
	const sourceLabel = `${productName} ${sourceScopeLabel(options.sourceScope)}`;

	// --- Skills -------------------------------------------------------------
	if (surfaces.includes("skills")) {
		const collected =
			layout.skillFormat === "skill-dirs"
				? await collectSkillDir(layout.skillsDir, options.product)
				: await collectMarkdownPrompts(layout.skillsDir, options.product);
		for (const diagnostic of collected.diagnostics) {
			warnings.push(`${sourceLabel} skills: ${diagnostic.message}`);
		}
		for (const candidate of collected.candidates) {
			const slug = candidate.slug;
			const content = withImportProvenance(candidate.content, options.product);
			const destPath = path.join(destination.skillsDir, slug, "SKILL.md");
			const existing = await readIfExists(destPath);
			const payload: NormalizedPayload = { skill: { slug, content } };
			const entry = applyCollision(
				{
					surface: "skills",
					sourceName: slug,
					destinationName: slug,
					sourceCategory: layout.skillFormat === "skill-dirs" ? "skill directory" : "markdown prompt",
					description: `import skill "${slug}" into ${destination.skillsDir}`,
					_payload: payload,
				},
				existing !== null,
				existing === content,
				options.collisionPolicy,
				base => renamedDestination(base, name => takenSkillNames.has(name)),
			);
			takenSkillNames.add(entry.destinationName);
			if (entry.destinationName !== slug && entry._payload?.skill) {
				entry._payload = {
					skill: {
						slug: entry.destinationName,
						content: withImportProvenance(candidate.content, options.product),
					},
				};
			}
			for (const warning of candidate.warnings) warnings.push(`${sourceLabel} skill "${slug}": ${warning}`);
			entries.push(entry);
		}
	}

	// --- Hooks --------------------------------------------------------------
	if (surfaces.includes("hooks")) {
		const convention =
			options.product === "claude-code" ? HookSourceConvention.ClaudeCode : HookSourceConvention.Codex;
		const candidates = await collectSourceHooks(layout.hooksDir);
		for (const candidate of candidates) {
			const baseName = candidate.fileName.replace(/\.(ts|js)$/, "");
			const match = baseName.match(/^(pre|post)-(.+)$/);
			if (!match) {
				entries.push({
					surface: "hooks",
					sourceName: candidate.fileName,
					destinationName: candidate.fileName,
					status: "unsupported",
					sourceCategory: "hook file",
					description: `hook file "${candidate.fileName}"`,
					reason: `filename must follow the pre-<tool>.ts|js or post-<tool>.ts|js convention`,
				});
				continue;
			}
			const phase = match[1] as "pre" | "post";
			const toolName = match[2];
			const normalized = normalizeDirectoryHook({
				convention,
				phase,
				toolName,
				source: candidate.filePath,
				externalName: candidate.fileName,
			});
			if (!normalized.hook) {
				entries.push({
					surface: "hooks",
					sourceName: candidate.fileName,
					destinationName: candidate.fileName,
					status: "unsupported",
					sourceCategory: "hook file",
					description: `${phase} hook for ${toolName}`,
					reason: normalized.diagnostics.map(d => `${d.code}: ${d.message}`).join("; "),
				});
				continue;
			}
			const destPath = path.join(destination.hooksDir, candidate.fileName);
			const existing = await readIfExists(destPath);
			const payload: NormalizedPayload = {
				hook: {
					sourceName: candidate.fileName,
					destinationName: candidate.fileName,
					content: candidate.content,
					warnings: [],
				},
			};
			const entry = applyCollision(
				{
					surface: "hooks",
					sourceName: candidate.fileName,
					destinationName: candidate.fileName,
					sourceCategory: "hook file",
					description: `${phase} hook for ${toolName} (${normalized.hook.contract.runtimeEvent})`,
					_payload: payload,
				},
				existing !== null,
				existing === candidate.content,
				options.collisionPolicy,
				base => {
					const renamed = renamedDestination(base.replace(/\.(ts|js)$/, ""), name =>
						takenHookNames.has(`${name}.ts`),
					);
					return `${renamed}${path.extname(base)}`;
				},
			);
			if (entry.destinationName !== candidate.fileName && entry._payload?.hook) {
				entry._payload = { hook: { ...entry._payload.hook, destinationName: entry.destinationName } };
			}
			takenHookNames.add(entry.destinationName);
			entries.push(entry);
		}
	}

	// --- MCPs ---------------------------------------------------------------
	if (surfaces.includes("mcps")) {
		const read =
			layout.mcpFormat === "json-mcpServers"
				? await readJsonMcpServers(layout.mcpConfigPath)
				: await readTomlMcpServers(layout.mcpConfigPath);
		if ("error" in read) {
			warnings.push(`${sourceLabel} MCPs: ${read.error}`);
		} else {
			const existingConfig = await readMCPConfigFile(destination.mcpConfigPath).catch(() => null);
			if (existingConfig === null) {
				warnings.push(`destination ${destination.mcpConfigPath} is malformed; MCP entries cannot be imported`);
			}
			const existingServers = existingConfig?.mcpServers ?? {};
			for (const [name, raw] of Object.entries(read.servers)) {
				const nameError = validateServerName(name);
				if (nameError) {
					entries.push({
						surface: "mcps",
						sourceName: name,
						destinationName: name,
						status: "unsupported",
						sourceCategory: "MCP server entry",
						description: `MCP server "${name}"`,
						reason: nameError,
					});
					continue;
				}
				const mapped = mapMcpEntry(options.product, name, raw);
				if (!mapped.ok) {
					entries.push({
						surface: "mcps",
						sourceName: name,
						destinationName: name,
						status: "unsupported",
						sourceCategory: "MCP server entry",
						description: `MCP server "${name}"`,
						reason: mapped.reason,
					});
					continue;
				}
				for (const warning of mapped.warnings) warnings.push(`${sourceLabel} MCP "${name}": ${warning}`);
				const existing = existingServers[name];
				const secretKeys = [
					...("env" in mapped.config && mapped.config.env
						? Object.keys(mapped.config.env).map(k => `env:${k}`)
						: []),
					...("headers" in mapped.config && mapped.config.headers
						? Object.keys(mapped.config.headers).map(k => `header:${k}`)
						: []),
				];
				const payload: NormalizedPayload = { mcp: { name, config: mapped.config } };
				const baseEntry = {
					surface: "mcps" as const,
					sourceName: name,
					destinationName: name,
					sourceCategory: "MCP server entry",
					description:
						mapped.config.type === "stdio"
							? `stdio MCP "${name}" (${mapped.config.command})`
							: `${mapped.config.type ?? "http"} MCP "${name}"`,
					_payload: payload,
				};
				const entry = applyCollision(
					baseEntry,
					existing !== undefined,
					existing !== undefined && JSON.stringify(existing) === JSON.stringify(mapped.config),
					options.collisionPolicy,
					base =>
						renamedDestination(base, candidate => takenMcpNames.has(candidate) || candidate in existingServers),
				);
				if (entry.destinationName !== name && entry._payload?.mcp) {
					entry._payload = { mcp: { name: entry.destinationName, config: mapped.config } };
				}
				takenMcpNames.add(entry.destinationName);
				if (secretKeys.length > 0 && (entry.status === "add" || entry.status === "overwrite")) {
					entry.status = "redacted";
					entry.reason = `${entry.reason ? `${entry.reason}; ` : ""}secret values hidden in preview (keys: ${secretKeys.join(", ")})`;
				}
				entries.push(entry);
			}
		}
	}

	return {
		product: options.product,
		sourceScope: options.sourceScope,
		destinationScope: options.destinationScope,
		surfaces: [...surfaces],
		entries,
		warnings,
	};
}

async function readIfExists(filePath: string): Promise<string | null> {
	try {
		const stat = await fs.lstat(filePath);
		if (!stat.isFile() || stat.isSymbolicLink()) return null;
		return await fs.readFile(filePath, "utf-8");
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------------------
// Apply (journaled rollback)
// ---------------------------------------------------------------------------

interface FileSnapshot {
	path: string;
	/** Previous content, or null when the file did not exist. */
	previous: string | null;
}

/**
 * Apply a confirmed preview. Writes are bounded and journaled: every file a
 * write touches is snapshotted first, and any failure restores all snapshots
 * (no partial import). MCP entries are merged into one in-memory config and
 * written atomically via the canonical config writer.
 */
export async function applyImport(preview: ImportPreview, options: { cwd: string }): Promise<ImportResult> {
	const destination = resolveScopePaths(preview.destinationScope, options.cwd);
	const results: ImportResultEntry[] = [];
	const snapshots: FileSnapshot[] = [];
	const written: ImportPreviewEntry[] = [];

	const writable = preview.entries.filter(
		entry => entry.status === "add" || entry.status === "overwrite" || entry.status === "redacted",
	);
	for (const entry of preview.entries) {
		if (entry.status === "conflict") {
			results.push({
				surface: entry.surface,
				sourceName: entry.sourceName,
				destinationName: entry.destinationName,
				outcome: "skipped",
				reason: entry.reason,
			});
		} else if (entry.status === "unsupported") {
			results.push({
				surface: entry.surface,
				sourceName: entry.sourceName,
				destinationName: entry.destinationName,
				outcome: "skipped",
				reason: entry.reason ?? "unsupported semantics",
			});
		}
	}

	// Snapshot skill/hook destinations.
	const skillHookWrites: Array<{ entry: ImportPreviewEntry; path: string; content: string }> = [];
	const mcpWrites: Array<{ entry: ImportPreviewEntry; name: string; config: MCPServerConfig }> = [];
	for (const entry of writable) {
		if (entry.surface === "skills" && entry._payload?.skill) {
			const slug = entry._payload.skill.slug;
			skillHookWrites.push({
				entry,
				path: path.join(destination.skillsDir, slug, "SKILL.md"),
				content: entry._payload.skill.content,
			});
		} else if (entry.surface === "hooks" && entry._payload?.hook) {
			skillHookWrites.push({
				entry,
				path: path.join(destination.hooksDir, entry._payload.hook.destinationName),
				content: entry._payload.hook.content,
			});
		} else if (entry.surface === "mcps" && entry._payload?.mcp) {
			mcpWrites.push({ entry, name: entry._payload.mcp.name, config: entry._payload.mcp.config });
		}
	}

	try {
		for (const write of skillHookWrites) {
			snapshots.push({ path: write.path, previous: await readIfExists(write.path) });
		}
		let mcpConfig: MCPConfigFile | null = null;
		if (mcpWrites.length > 0) {
			mcpConfig = await readMCPConfigFile(destination.mcpConfigPath);
			snapshots.push({
				path: destination.mcpConfigPath,
				previous: await readIfExists(destination.mcpConfigPath),
			});
		}

		// Write skill/hook files.
		for (const write of skillHookWrites) {
			await fs.mkdir(path.dirname(write.path), { recursive: true, mode: 0o700 });
			const stat = await fs.lstat(write.path).catch(() => null);
			if (stat?.isSymbolicLink()) throw new Error(`refusing to write through symlink: ${write.path}`);
			await fs.writeFile(write.path, write.content, { encoding: "utf-8", mode: 0o600 });
			written.push(write.entry);
		}

		// Merge + single atomic MCP config write.
		if (mcpConfig && mcpWrites.length > 0) {
			const servers = { ...(mcpConfig.mcpServers ?? {}) };
			for (const write of mcpWrites) {
				servers[write.name] = write.config;
				written.push(write.entry);
			}
			await writeMCPConfigFile(destination.mcpConfigPath, { ...mcpConfig, mcpServers: servers });
		}
	} catch (error) {
		// Roll back every snapshot: restore previous content or remove created files.
		const reason = (error as Error).message;
		for (const snapshot of snapshots.reverse()) {
			try {
				if (snapshot.previous === null) {
					await fs.rm(snapshot.path, { force: true });
				} else {
					await fs.writeFile(snapshot.path, snapshot.previous, "utf-8");
				}
			} catch {
				// best-effort rollback; the failure reason still reports the original error
			}
		}
		for (const entry of writable) {
			results.push({
				surface: entry.surface,
				sourceName: entry.sourceName,
				destinationName: entry.destinationName,
				outcome: "failed",
				reason: `import failed and was rolled back: ${reason}`,
			});
		}
		return { entries: results, ok: false };
	}

	// Post-import verification against the persisted destination state.
	let verifyFailure: string | null = null;
	for (const entry of written) {
		if (entry.surface === "skills" && entry._payload?.skill) {
			const destPath = path.join(destination.skillsDir, entry._payload.skill.slug, "SKILL.md");
			const content = await readIfExists(destPath);
			if (content !== entry._payload.skill.content)
				verifyFailure = `skill "${entry._payload.skill.slug}" not persisted`;
		} else if (entry.surface === "hooks" && entry._payload?.hook) {
			const destPath = path.join(destination.hooksDir, entry._payload.hook.destinationName);
			const content = await readIfExists(destPath);
			if (content !== entry._payload.hook.content)
				verifyFailure = `hook "${entry._payload.hook.destinationName}" not persisted`;
		} else if (entry.surface === "mcps" && entry._payload?.mcp) {
			const config = await readMCPConfigFile(destination.mcpConfigPath).catch(() => null);
			if (!config?.mcpServers?.[entry._payload.mcp.name])
				verifyFailure = `MCP "${entry._payload.mcp.name}" not persisted`;
		}
		if (verifyFailure) break;
	}

	for (const entry of writable) {
		const base = {
			surface: entry.surface,
			sourceName: entry.sourceName,
			destinationName: entry.destinationName,
		};
		if (verifyFailure) {
			results.push({ ...base, outcome: "failed", reason: `post-import verification failed: ${verifyFailure}` });
		} else if (entry.status === "overwrite") {
			results.push({ ...base, outcome: "overwritten" });
		} else if (entry.destinationName !== entry.sourceName) {
			results.push({ ...base, outcome: "renamed" });
		} else {
			results.push({ ...base, outcome: "imported" });
		}
	}
	return { entries: results, ok: verifyFailure === null };
}
