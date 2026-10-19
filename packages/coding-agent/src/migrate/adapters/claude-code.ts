/**
 * Claude Code adapter: reads MCP servers, user skills, selected-scope commands,
 * selected-scope subagents, and the selected scope's `CLAUDE.md`.
 */
import * as path from "node:path";
import type { AdapterResult, ManualAction, McpCandidate } from "../types";
import {
	type Adapter,
	type AdapterOptions,
	collectInstructionFile,
	collectMarkdownAgents,
	collectMarkdownCommands,
	collectSkillDir,
	parseSourceJson,
	readOptionalJson,
	readSourceText,
} from "./index";

const SOURCE = "claude-code" as const;
const MAX_LISTED_KEYS = 8;

function listKeys(keys: string[]): string {
	if (keys.length <= MAX_LISTED_KEYS) return keys.join(", ");
	return `${keys.slice(0, MAX_LISTED_KEYS).join(", ")}, +${keys.length - MAX_LISTED_KEYS} more`;
}

function stringArray(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** Count the shell commands a `hooks` object would run, per hook event. */
function countHookCommands(hooks: Record<string, unknown>): Array<{ event: string; commands: number }> {
	const counted: Array<{ event: string; commands: number }> = [];
	for (const [event, matchers] of Object.entries(hooks)) {
		if (!Array.isArray(matchers)) continue;
		let commands = 0;
		for (const matcher of matchers) {
			if (!matcher || typeof matcher !== "object") continue;
			const inner = (matcher as Record<string, unknown>).hooks;
			if (!Array.isArray(inner)) continue;
			for (const hook of inner) {
				if (hook && typeof hook === "object" && typeof (hook as Record<string, unknown>).command === "string") {
					commands += 1;
				}
			}
		}
		if (commands > 0) counted.push({ event, commands });
	}
	return counted;
}

/**
 * Describe Claude Code settings that gjc cannot import. These are reported
 * rather than translated: gjc hooks are TypeScript modules, model ids are
 * provider-specific, and an approval policy that changed meaning silently would
 * be a security regression. Environment values are never read.
 */
function describeSettings(data: Record<string, unknown>, label: string): ManualAction[] {
	const actions: ManualAction[] = [];
	const hooks = data.hooks;
	if (hooks && typeof hooks === "object" && !Array.isArray(hooks)) {
		for (const { event, commands } of countHookCommands(hooks as Record<string, unknown>)) {
			actions.push({
				source: SOURCE,
				area: `${label}: hooks.${event}`,
				detail: `${commands} shell command${commands === 1 ? "" : "s"} run on ${event}; gjc hooks are TypeScript modules, so port ${
					commands === 1 ? "it" : "them"
				} to a .gjc/hooks module that subscribes to the equivalent event.`,
			});
		}
	}
	const model = data.model;
	if (typeof model === "string" && model.trim()) {
		actions.push({
			source: SOURCE,
			area: `${label}: model`,
			detail: `model "${model}" is provider-specific and was not imported; select it with gjc config or --model.`,
		});
	}
	const permissions = data.permissions;
	if (permissions && typeof permissions === "object" && !Array.isArray(permissions)) {
		const record = permissions as Record<string, unknown>;
		const allow = stringArray(record.allow).length;
		const deny = stringArray(record.deny).length;
		const ask = stringArray(record.ask).length;
		if (allow + deny + ask > 0) {
			actions.push({
				source: SOURCE,
				area: `${label}: permissions`,
				detail: `${allow} allow, ${deny} deny, ${ask} ask rule${allow + deny + ask === 1 ? "" : "s"} have no gjc equivalent and were not imported; re-express the approvals you still need in gjc's tool settings.${
					deny > 0 ? " Deny rules are the security-relevant ones — review them first." : ""
				}`,
			});
		}
	}
	const env = data.env;
	if (env && typeof env === "object" && !Array.isArray(env)) {
		const keys = Object.keys(env as Record<string, unknown>).sort();
		if (keys.length > 0) {
			actions.push({
				source: SOURCE,
				area: `${label}: env`,
				detail: `${keys.length} variable${keys.length === 1 ? "" : "s"} (${listKeys(keys)}) were not imported and their values were not read; export them in your shell or project environment instead.`,
			});
		}
	}
	return actions;
}

export const claudeCodeAdapter: Adapter = {
	source: SOURCE,
	async collect({ homeDir, cwd, scope }: AdapterOptions): Promise<AdapterResult> {
		const result: AdapterResult = {
			mcpCandidates: [],
			skillCandidates: [],
			slashCommandCandidates: [],
			agentCandidates: [],
			instructionCandidates: [],
			diagnostics: [],
			manualActions: [],
		};

		const configPath = path.join(homeDir, ".claude.json");
		const read = await readSourceText(configPath, SOURCE, "mcp");
		if ("diagnostic" in read) {
			result.diagnostics.push(read.diagnostic);
		} else {
			const parsed = parseSourceJson(read.text, configPath, SOURCE, "mcp");
			if ("diagnostic" in parsed) {
				result.diagnostics.push(parsed.diagnostic);
			} else {
				const servers = parsed.data.mcpServers;
				if (servers && typeof servers === "object" && !Array.isArray(servers)) {
					for (const [name, raw] of Object.entries(servers as Record<string, unknown>)) {
						result.mcpCandidates.push({ source: SOURCE, name, raw } satisfies McpCandidate);
					}
				}
			}
		}

		const skills = await collectSkillDir(path.join(homeDir, ".claude", "skills"), SOURCE);
		result.skillCandidates.push(...skills.candidates);
		result.diagnostics.push(...skills.diagnostics);

		const commandsDir =
			scope === "project" ? path.join(cwd, ".claude", "commands") : path.join(homeDir, ".claude", "commands");
		const commands = await collectMarkdownCommands(commandsDir, SOURCE, { recursive: true });
		result.slashCommandCandidates.push(...commands.candidates);
		result.diagnostics.push(...commands.diagnostics);

		const agentsDir =
			scope === "project" ? path.join(cwd, ".claude", "agents") : path.join(homeDir, ".claude", "agents");
		const agents = await collectMarkdownAgents(agentsDir, SOURCE);
		result.agentCandidates.push(...agents.candidates);
		result.diagnostics.push(...agents.diagnostics);

		const instructionsPath =
			scope === "project" ? path.join(cwd, "CLAUDE.md") : path.join(homeDir, ".claude", "CLAUDE.md");
		const instructions = await collectInstructionFile(instructionsPath, SOURCE);
		result.instructionCandidates.push(...instructions.candidates);
		result.diagnostics.push(...instructions.diagnostics);

		const settingsFiles =
			scope === "project"
				? [path.join(cwd, ".claude", "settings.json"), path.join(cwd, ".claude", "settings.local.json")]
				: [path.join(homeDir, ".claude", "settings.json")];
		for (const file of settingsFiles) {
			const settings = await readOptionalJson(file, SOURCE, "source");
			if ("absent" in settings) continue;
			if ("diagnostic" in settings) {
				result.diagnostics.push(settings.diagnostic);
				continue;
			}
			result.manualActions.push(...describeSettings(settings.data, path.basename(file)));
		}

		return result;
	},
};
