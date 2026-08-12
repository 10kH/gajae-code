/**
 * Inventory aggregation for the `/extensions` umbrella customization surface.
 *
 * Rows are derived from the same authoritative loaders the runtime/session
 * uses — the capability skill scan semantics (`.gjc` native scopes), the
 * hook capability discovery plus the canonical hook IR normalizer, and the
 * runtime-mcp per-file config loader — so the dashboard agrees with actual
 * session discovery. Foreign Claude/Codex conventions appear as read-only
 * provenance rows; they are import sources, never managed in place.
 *
 * Nothing here ever renders raw credential material: MCP display fields keep
 * env-var references unexpanded, redact endpoints, and never include env or
 * header values.
 */
import { type Dirent, promises as fs } from "node:fs";
import * as path from "node:path";
import { parseFrontmatter } from "@gajae-code/utils";
import type { Hook } from "../capability/hook";
import { hookCapability } from "../capability/hook";
import { type MCPServer, mcpCapability } from "../capability/mcp";
import type { SkillFrontmatter } from "../capability/skill";
import { BUNDLED_GJC_SKILL_CATALOG } from "../defaults/gjc-skills.generated";
import { loadCapability } from "../discovery";
import { SKILL_FRONTMATTER_SCAN_TOTAL_BYTES } from "../discovery/helpers";
import { loadMCPJsonFile } from "../discovery/mcp-json";
import { HookSourceConvention } from "../hooks/events";
import { normalizeDirectoryHook } from "../hooks/normalize";
import { redactMCPEndpoint } from "../runtime-mcp/redaction";
import type { CustomizationSurface, GjcScope, InventoryRow, InventoryStatus } from "./types";
import { resolveScopePaths, scopeLabel } from "./types";

/** Frontmatter key written by the import flow to record provenance. */
export const IMPORTED_FROM_FRONTMATTER_KEY = "x-gjc-imported-from";

export interface LoadCustomizationInventoryOptions {
	/** Project working directory (project `.gjc` root resolution). */
	cwd: string;
	/** `disabledExtensions` setting entries (`skill:<name>` disables a skill). */
	disabledExtensions?: readonly string[];
	/** Master skills switch from settings (default true). */
	skillsEnabled?: boolean;
	/** Project-scope skill gate from settings (default true). */
	enableProjectSkills?: boolean;
	/** User-scope skill gate from settings (default true). */
	enableUserSkills?: boolean;
}

export interface CustomizationInventory {
	rows: InventoryRow[];
	/** Human-facing diagnostics (redacted). */
	warnings: string[];
}

const BUNDLED_SKILL_NAMES: ReadonlySet<string> = new Set(
	BUNDLED_GJC_SKILL_CATALOG.flatMap(entry =>
		entry.kind === "skill" && typeof entry.name === "string" ? [entry.name] : [],
	),
);

/** Stable row identity used for in-session mutation tracking (restart-required). */
export function inventoryRowId(surface: CustomizationSurface, scope: GjcScope, name: string): string {
	return `${surface}:${scope}:${name}`;
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

interface SkillCandidate {
	scope: GjcScope;
	dirName: string;
	skillPath: string;
	frontmatter: SkillFrontmatter | null;
	/** Present when the SKILL.md could not be read/parsed at all. */
	parseError?: string;
}

async function scanSkillDir(scope: GjcScope, skillsDir: string): Promise<SkillCandidate[]> {
	let entries: Dirent[];
	try {
		entries = await fs.readdir(skillsDir, { withFileTypes: true });
	} catch {
		return [];
	}
	const candidates: SkillCandidate[] = [];
	for (const entry of entries) {
		if (entry.name.startsWith(".")) continue;
		if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
		const skillPath = path.join(skillsDir, entry.name, "SKILL.md");
		let text: string;
		try {
			const stat = await fs.stat(skillPath);
			const file = Bun.file(skillPath);
			text = await file.slice(0, Math.min(stat.size, SKILL_FRONTMATTER_SCAN_TOTAL_BYTES)).text();
		} catch {
			continue; // no SKILL.md — not a skill directory
		}
		const parsed = parseFrontmatter(text, { source: skillPath });
		const frontmatter = parsed.frontmatter as SkillFrontmatter;
		const hasFrontmatter = /^---[ \t]*(?:\r?\n|$)/.test(text) && Object.keys(frontmatter).length > 0;
		candidates.push({
			scope,
			dirName: entry.name,
			skillPath,
			frontmatter: hasFrontmatter ? frontmatter : null,
			parseError: hasFrontmatter ? undefined : "missing or unparseable YAML frontmatter",
		});
	}
	return candidates;
}

async function loadSkillRows(options: LoadCustomizationInventoryOptions, warnings: string[]): Promise<InventoryRow[]> {
	const candidates = [
		...(await scanSkillDir("project", resolveScopePaths("project", options.cwd).skillsDir)),
		...(await scanSkillDir("global", resolveScopePaths("global", options.cwd).skillsDir)),
	];
	const disabledExtensions = new Set(
		(options.disabledExtensions ?? []).filter(id => id.startsWith("skill:")).map(id => id.slice("skill:".length)),
	);
	const skillsEnabled = options.skillsEnabled ?? true;
	const levelEnabled = (scope: GjcScope): boolean =>
		scope === "project" ? (options.enableProjectSkills ?? true) : (options.enableUserSkills ?? true);

	const rows: InventoryRow[] = [];
	// Project scope shadows global scope for identical names (runtime order:
	// project config dirs load before user dirs and first name wins).
	const claimedNames = new Set<string>();
	const shadowed: InventoryRow[] = [];

	for (const candidate of candidates) {
		const frontmatter = candidate.frontmatter;
		const name =
			typeof frontmatter?.name === "string" && frontmatter.name.trim().length > 0
				? frontmatter.name.trim()
				: candidate.dirName;
		const description = typeof frontmatter?.description === "string" ? frontmatter.description : undefined;
		const diagnostics: string[] = [];

		let status: InventoryStatus;
		if (candidate.parseError || !frontmatter) {
			status = "invalid";
			diagnostics.push(candidate.parseError ?? "missing frontmatter");
			diagnostics.push("Fix the SKILL.md frontmatter (--- delimited YAML with name/description).");
		} else if (!description || description.trim().length === 0) {
			status = "invalid";
			diagnostics.push("frontmatter.description is required — the runtime loader skips skills without one");
		} else if (!skillsEnabled) {
			status = "disabled";
			diagnostics.push("skills are disabled globally by settings (skills.enabled=false)");
		} else if (frontmatter.enabled === false) {
			status = "disabled";
			diagnostics.push("disabled via frontmatter enabled:false");
		} else if (disabledExtensions.has(name)) {
			status = "disabled";
			diagnostics.push(`disabled via settings disabledExtensions entry "skill:${name}"`);
		} else if (!levelEnabled(candidate.scope)) {
			status = "disabled";
			diagnostics.push(
				candidate.scope === "project"
					? "project skills are disabled by settings (skills.enablePiProject=false)"
					: "user skills are disabled by settings (skills.enablePiUser=false)",
			);
		} else {
			status = "enabled";
		}

		if (BUNDLED_SKILL_NAMES.has(name)) {
			diagnostics.push(
				`"${name}" is a protected bundled workflow skill name; local overrides are unsupported and may be reverted on upgrade`,
			);
		}

		// parseFrontmatter camelCases keys; check both the persisted and parsed forms.
		const importedFrom =
			frontmatter?.[IMPORTED_FROM_FRONTMATTER_KEY] ?? frontmatter?.["xGjcImportedFrom" as keyof SkillFrontmatter];
		const provenance =
			typeof importedFrom === "string" && importedFrom.length > 0
				? `${scopeLabel(candidate.scope)} · imported from ${importedFrom === "claude-code" ? "Claude Code" : importedFrom}`
				: scopeLabel(candidate.scope);

		const row: InventoryRow = {
			surface: "skills",
			name,
			displayName: name,
			status: status === "enabled" && typeof importedFrom === "string" && importedFrom ? "imported" : status,
			provenance,
			path: candidate.skillPath,
			scope: candidate.scope,
			description,
			diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
			raw: frontmatter ? { name, description, hide: frontmatter.hide === true } : null,
		};

		if ((row.status === "enabled" || row.status === "imported") && claimedNames.has(name)) {
			row.status = "shadowed";
			row.diagnostics = [
				...(row.diagnostics ?? []),
				`shadowed by the project-scope skill named "${name}" (project .gjc wins over global .gjc)`,
			];
			shadowed.push(row);
		} else {
			if (row.status === "enabled" || row.status === "imported") claimedNames.add(name);
			rows.push(row);
		}
	}

	// Project candidates were scanned first; re-append shadowed global rows so
	// every candidate remains visible with its effective status.
	rows.push(...shadowed);
	rows.sort((a, b) => a.name.localeCompare(b.name) || a.scope.localeCompare(b.scope));
	return rows;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

const HOOK_CONVENTIONS: Readonly<Record<string, HookSourceConvention>> = {
	native: HookSourceConvention.NativeGjc,
	claude: HookSourceConvention.ClaudeCode,
	codex: HookSourceConvention.Codex,
};

function hookProvenance(hook: Hook): string {
	const provider = hook._source.provider;
	if (provider === "native") return hook.level === "project" ? scopeLabel("project") : scopeLabel("global");
	if (provider === "claude") return "Claude Code (project) — import to manage";
	if (provider === "codex") return "Codex (project) — import to manage";
	return provider;
}

async function loadHookRows(options: LoadCustomizationInventoryOptions, warnings: string[]): Promise<InventoryRow[]> {
	const result = await loadCapability<Hook>(hookCapability.id, { cwd: options.cwd });
	for (const warning of result.warnings ?? []) warnings.push(warning);

	const rows: InventoryRow[] = [];
	for (const hook of result.items) {
		const provider = hook._source.provider;
		const convention = HOOK_CONVENTIONS[provider];
		if (!convention) continue; // plugin-owned or unknown hook providers are not local customization

		const normalized = normalizeDirectoryHook({
			convention,
			phase: hook.type,
			toolName: hook.tool,
			source: hook.path,
			externalName: hook.name,
		});
		const scope: GjcScope = hook.level === "project" ? "project" : "global";
		const status: InventoryStatus = normalized.hook ? "enabled" : "invalid";
		const diagnostics = normalized.diagnostics.map(d => `${d.code}: ${d.message}`);
		rows.push({
			surface: "hooks",
			name: `${hook.type}-${hook.tool}`,
			displayName: hook.name,
			status,
			provenance: hookProvenance(hook),
			path: hook.path,
			scope,
			description: normalized.hook
				? `${normalized.hook.contract.kind} via ${normalized.hook.contract.runtimeEvent} (${hook.tool})`
				: `${hook.type} hook for ${hook.tool}`,
			diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
			raw: normalized.hook
				? {
						convention,
						kind: normalized.hook.contract.kind,
						runtimeEvent: normalized.hook.contract.runtimeEvent,
						authority: normalized.hook.contract.authority,
						timeoutMs: normalized.hook.contract.timeoutMs,
					}
				: { convention, phase: hook.type, tool: hook.tool },
		});
	}
	rows.sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path));
	return rows;
}

// ---------------------------------------------------------------------------
// MCPs
// ---------------------------------------------------------------------------

function mcpDescription(server: MCPServer): string {
	const transport = server.transport ?? (server.command ? "stdio" : server.url ? "http" : "stdio");
	if (transport === "stdio") {
		const command = server.command ?? "(missing command)";
		const argCount = Array.isArray(server.args) ? server.args.length : 0;
		return `stdio: ${command}${argCount > 0 ? ` (${argCount} arg${argCount === 1 ? "" : "s"})` : ""}`;
	}
	return `${transport}: ${redactMCPEndpoint(server.url) ?? "(missing url)"}`;
}

async function loadMcpRows(options: LoadCustomizationInventoryOptions, warnings: string[]): Promise<InventoryRow[]> {
	const rows: InventoryRow[] = [];
	const perScope = new Map<GjcScope, { items: MCPServer[]; disabledServers: string[]; fileExists: boolean }>();
	let userDisabledServers: string[] = [];

	for (const scope of ["project", "global"] as const) {
		const paths = resolveScopePaths(scope, options.cwd);
		const level = scope === "project" ? "project" : "user";
		let fileExists = false;
		try {
			await fs.stat(paths.mcpConfigPath);
			fileExists = true;
		} catch {
			fileExists = false;
		}
		const result = await loadMCPJsonFile(paths.mcpConfigPath, level, { quiet: false, useCache: false });
		if (result.warnings && result.warnings.length > 0) {
			if (fileExists && result.items.length === 0) {
				rows.push({
					surface: "mcps",
					name: `${scope}-mcp-json`,
					displayName: path.basename(paths.mcpConfigPath),
					status: "invalid",
					provenance: scopeLabel(scope),
					path: paths.mcpConfigPath,
					scope,
					description: "MCP configuration file could not be parsed",
					diagnostics: [
						...result.warnings.map(w => `malformed MCP configuration: ${w}`),
						"Fix or remove the malformed JSON; the runtime ignores unparseable config files.",
					],
					raw: null,
				});
			} else {
				for (const warning of result.warnings) warnings.push(`${scopeLabel(scope)} mcp.json: ${warning}`);
			}
		}
		perScope.set(scope, { items: result.items, disabledServers: result.disabledServers, fileExists });
		if (scope === "global") userDisabledServers = result.disabledServers;
	}

	// Effective-runtime shadowing: the capability merge keeps the last same-name
	// server in provider load order (project files before user files), so a
	// user-scope definition silently wins over a project-scope one today.
	const effectiveWinnerPath = new Map<string, string>();
	for (const scope of ["project", "global"] as const) {
		const scopeData = perScope.get(scope);
		if (!scopeData) continue;
		for (const server of scopeData.items) {
			if (server.enabled === false || userDisabledServers.includes(server.name)) continue;
			effectiveWinnerPath.set(server.name, server._source.path);
		}
	}

	for (const scope of ["project", "global"] as const) {
		const scopeData = perScope.get(scope);
		if (!scopeData) continue;
		for (const server of scopeData.items) {
			const validationError = mcpCapability.validate?.(server);
			const diagnostics: string[] = [];
			let status: InventoryStatus;
			if (validationError) {
				status = "invalid";
				diagnostics.push(validationError);
				diagnostics.push("Fix the server entry in mcp.json; invalid entries are skipped by the runtime.");
			} else if (server.enabled === false) {
				status = "disabled";
				diagnostics.push("disabled via enabled:false in mcp.json");
			} else if (userDisabledServers.includes(server.name)) {
				status = "disabled";
				diagnostics.push("disabled via disabledServers in the user-global mcp.json");
			} else if (effectiveWinnerPath.get(server.name) !== server._source.path) {
				status = "shadowed";
				diagnostics.push(
					`shadowed by the user-global mcp.json entry named "${server.name}" (runtime merge keeps the later definition)`,
				);
			} else {
				status = "enabled";
			}
			if (scope === "project" && scopeData.disabledServers.includes(server.name)) {
				diagnostics.push(
					"project-scope disabledServers is not honored by the runtime; use enabled:false or the user-global disabledServers list",
				);
			}
			rows.push({
				surface: "mcps",
				name: server.name,
				displayName: server.name,
				status,
				provenance: scopeLabel(scope),
				path: server._source.path,
				scope,
				description: mcpDescription(server),
				diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
				raw: {
					transport: server.transport ?? (server.command ? "stdio" : "http"),
					url: redactMCPEndpoint(server.url),
					command: server.command,
					argCount: Array.isArray(server.args) ? server.args.length : 0,
					envKeys: server.env ? Object.keys(server.env) : [],
					headerKeys: server.headers ? Object.keys(server.headers) : [],
					enabled: server.enabled !== false,
					autoload: server.autoload !== false,
				},
			});
		}
	}
	// Read-only foreign-convention rows so the inventory reflects everything the
	// session capability scan discovers (Claude/Codex/root mcp.json providers).
	// These are import sources only — never managed in place.
	const discovered = await loadCapability<MCPServer>(mcpCapability.id, { cwd: options.cwd });
	for (const warning of discovered.warnings ?? []) warnings.push(String(warning));
	for (const server of discovered.items) {
		const provider = server._source.provider;
		if (provider === "native") continue;
		const providerLabel =
			provider === "claude"
				? "Claude Code"
				: provider === "codex"
					? "Codex"
					: provider === "mcp-json"
						? "project mcp.json"
						: provider;
		rows.push({
			surface: "mcps",
			name: server.name,
			displayName: server.name,
			status: server.enabled === false ? "disabled" : "enabled",
			provenance: `${providerLabel} (${server._source.level}) — import to manage`,
			path: server._source.path,
			scope: server._source.level === "project" ? "project" : "global",
			description: mcpDescription(server),
			diagnostics: ["discovered outside .gjc; use Import to normalize it into a canonical .gjc scope"],
			raw: {
				transport: server.transport ?? (server.command ? "stdio" : "http"),
				url: redactMCPEndpoint(server.url),
				command: server.command,
				envKeys: server.env ? Object.keys(server.env) : [],
				headerKeys: server.headers ? Object.keys(server.headers) : [],
			},
		});
	}
	rows.sort((a, b) => a.name.localeCompare(b.name) || a.scope.localeCompare(b.scope));
	return rows;
}

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

/**
 * Load the full Skills/Hooks/MCPs inventory for the `/extensions` dashboard.
 * Reads only the canonical `.gjc` scopes plus the same hook capability scan
 * the session performs; never scans foreign home directories.
 */
export async function loadCustomizationInventory(
	options: LoadCustomizationInventoryOptions,
): Promise<CustomizationInventory> {
	const warnings: string[] = [];
	const [skills, hooks, mcps] = await Promise.all([
		loadSkillRows(options, warnings),
		loadHookRows(options, warnings),
		loadMcpRows(options, warnings),
	]);
	return { rows: [...skills, ...hooks, ...mcps], warnings };
}
