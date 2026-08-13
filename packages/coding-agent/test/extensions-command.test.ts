/**
 * Issue #4291 acceptance: `/extensions` is registered, discoverable, and
 * described exactly as "Configure skills, hooks, and MCPs."; non-interactive
 * (ACP/text) mode gets an explicit rejection instead of silence.
 */
import { describe, expect, test } from "bun:test";
import {
	BUILTIN_SLASH_COMMAND_DEFS,
	lookupBuiltinSlashCommand,
} from "@gajae-code/coding-agent/slash-commands/builtin-registry";
import type { ParsedSlashCommand, SlashCommandRuntime } from "@gajae-code/coding-agent/slash-commands/types";

describe("/extensions slash command registration", () => {
	test("is registered with the exact owner-contract description", () => {
		const spec = lookupBuiltinSlashCommand("extensions");
		expect(spec).toBeDefined();
		expect(spec?.description).toBe("Configure skills, hooks, and MCPs.");
	});

	test("is discoverable through the autocomplete/help defs", () => {
		const def = BUILTIN_SLASH_COMMAND_DEFS.find(entry => entry.name === "extensions");
		expect(def).toBeDefined();
		expect(def?.description).toBe("Configure skills, hooks, and MCPs.");
	});

	test("exposes an interactive TUI handler", () => {
		const spec = lookupBuiltinSlashCommand("extensions");
		expect(typeof spec?.handleTui).toBe("function");
	});

	test("non-interactive dispatch outputs an explicit rejection", async () => {
		const spec = lookupBuiltinSlashCommand("extensions");
		expect(typeof spec?.handle).toBe("function");
		const outputs: string[] = [];
		const runtime = {
			output: async (text: string) => {
				outputs.push(text);
			},
		} as unknown as SlashCommandRuntime;
		const command = { name: "extensions", args: "" } as unknown as ParsedSlashCommand;
		const result = await spec!.handle!(command, runtime);
		expect(result).toEqual({ consumed: true });
		expect(outputs).toHaveLength(1);
		expect(outputs[0]).toContain("/extensions");
		expect(outputs[0]).toContain("interactive");
		expect(outputs[0]).toContain("skills, hooks, and MCPs");
	});
});
