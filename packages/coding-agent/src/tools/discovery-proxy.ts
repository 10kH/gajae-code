/**
 * Discovery Proxy Tool - maintains cache-prefix stability by dispatching to discovered tools
 * without modifying the request tools array mid-session.
 *
 * When tools are discovered and activated, they're described in a model-visible message
 * instead of being added to the request tools array. The proxy tool acts as the dispatcher
 * for any discovered tool invocations.
 *
 * This preserves the provider's prompt cache prefix (tools + system + messages) which would
 * otherwise be invalidated when the tools array changes mid-session.
 */

import type { AgentTool, AgentToolContext, AgentToolResult, AgentToolUpdateCallback } from "@gajae-code/agent-core";
import * as z from "zod/v4";
import { ToolError } from "./tool-errors";

const discoveryProxySchema = z.object({
	toolName: z.string().describe("name of the discovered tool to dispatch to"),
	arguments: z.record(z.unknown()).describe("arguments to pass to the discovered tool"),
});

type DiscoveryProxyParams = z.infer<typeof discoveryProxySchema>;

export interface DiscoveryProxyToolOptions {
	getToolRegistry: () => Map<string, AgentTool> | undefined;
	getActiveToolNames: () => string[];
}

/**
 * Dispatch tool that enables calling discovered tools without modifying the request structure.
 * Wraps the discovered tool with the same guards (ACP permission, validation, rendering).
 */
export class DiscoveryProxyTool implements AgentTool<typeof discoveryProxySchema> {
	readonly name = "call_discovered_tool";
	readonly label = "Call Discovered Tool";
	readonly loadMode = "essential" as const;
	readonly description =
		"Dispatch to a discovered tool by name with its arguments. Used internally when tools are activated mid-session.";
	readonly parameters = discoveryProxySchema;
	readonly strict = true;

	constructor(private readonly options: DiscoveryProxyToolOptions) {}

	async execute(
		_toolCallId: string,
		params: DiscoveryProxyParams,
		_signal?: AbortSignal,
		_onUpdate?: AgentToolUpdateCallback<DiscoveryProxyParams>,
		_context?: AgentToolContext,
	): Promise<AgentToolResult> {
		const toolName = params.toolName?.trim();
		if (!toolName) {
			throw new ToolError("toolName is required and must not be empty.");
		}

		const registry = this.options.getToolRegistry();
		if (!registry) {
			throw new ToolError("Tool registry is not available.");
		}

		const tool = registry.get(toolName);
		if (!tool) {
			throw new ToolError(`Discovered tool "${toolName}" is not registered.`);
		}

		const activeNames = this.options.getActiveToolNames();
		if (!activeNames.includes(toolName)) {
			throw new ToolError(`Discovered tool "${toolName}" is not activated.`);
		}

		// Execute the discovered tool
		try {
			return await tool.execute(
				// Use a scoped call ID for the inner tool
				`proxy_to_${toolName}`,
				params.arguments ?? {},
				_signal,
				_onUpdate,
				_context,
			);
		} catch (error) {
			if (error instanceof Error) {
				throw new ToolError(`Failed to execute "${toolName}": ${error.message}`);
			}
			throw error;
		}
	}
}

/**
 * Builder for discovery metadata messages that describe newly activated tools.
 * These messages are appended to the agent history instead of modifying the tools array.
 */
export function buildDiscoveryMetadataMessage(
	activatedTools: Array<{ name: string; label: string; description: string; parameters: unknown }>,
): string {
	if (activatedTools.length === 0) {
		return "";
	}

	const toolsJson = activatedTools
		.map(tool => ({
			name: tool.name,
			label: tool.label,
			description: tool.description,
			parameters: tool.parameters,
		}))
		.map(tool => JSON.stringify(tool))
		.join(",\n");

	return (
		`The following tools have been discovered and activated:\n\n` +
		`[\n${toolsJson}\n]\n\n` +
		`You can now invoke these tools using the 'call_discovered_tool' proxy with the tool name and arguments.`
	);
}
