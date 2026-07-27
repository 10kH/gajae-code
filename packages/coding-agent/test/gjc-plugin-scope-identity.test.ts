import { describe, expect, test } from "bun:test";
import {
	bundleIdentity,
	GjcPluginLoadError,
	type GjcPluginRegistryEntry,
	type NormalizedGjcPluginBundle,
	type NormalizedGjcPluginSurfaces,
	reconcileEnablement,
	validateInstallPlan,
	validateSessionBundles,
} from "../src/extensibility/gjc-plugins";

function surfaces(over: Partial<NormalizedGjcPluginSurfaces> = {}): NormalizedGjcPluginSurfaces {
	return { subskills: [], tools: [], hooks: [], mcps: [], systemAppendices: [], agentAppendices: [], ...over };
}

function entry(
	scope: "user" | "project",
	name: string,
	s: Partial<NormalizedGjcPluginSurfaces> = {},
): GjcPluginRegistryEntry {
	return {
		name,
		version: "1.0.0",
		scope,
		enabled: true,
		pluginRoot: `/tmp/${scope}-${name}`,
		manifestPath: `/tmp/${scope}-${name}/gajae-plugin.json`,
		manifestHash: "a".repeat(64),
		source: { kind: "path", uri: `/tmp/${scope}-${name}`, resolvedAt: "2026-01-01T00:00:00.000Z" },
		installedAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		copiedFiles: [],
		surfaces: surfaces(s),
		disabledSurfaceIds: [],
	};
}

function bundle(name: string, s: Partial<NormalizedGjcPluginSurfaces>): NormalizedGjcPluginBundle {
	return {
		name,
		version: "1.0.0",
		root: "/tmp/source",
		manifestPath: "/tmp/source/gajae-plugin.json",
		manifestHash: "b".repeat(64),
		surfaces: surfaces(s),
		files: [],
	};
}

describe("GJC plugin scope-qualified identities", () => {
	test("pre-quarantine for user/foo does not suppress project/foo", () => {
		const projectFoo = entry("project", "foo");
		const result = validateSessionBundles([projectFoo], {}, [
			{
				identity: bundleIdentity("user", "foo"),
				plugin: "foo",
				surfaceId: "plugin:foo",
				code: "runtime_mismatch",
				message: "user bundle drifted",
			},
		]);

		expect(result.active).toEqual([projectFoo]);
	});

	test("scope-aware installation validation retains opposite-scope same-name peers", () => {
		const tool = { extensionId: "tool:shared", name: "shared", relativePath: "tool.ts", sha256: "c".repeat(64) };
		expect(() =>
			validateInstallPlan(bundle("foo", { tools: [tool] }), [entry("user", "foo", { tools: [tool] })], "project"),
		).toThrow(GjcPluginLoadError);
	});

	test("recomputes candidate quarantine while retaining enablement intent", () => {
		const result = reconcileEnablement(
			["disabled", "removed", "disabled"],
			["disabled", "fixed", "kept", "new"],
			[
				{ surfaceId: "kept", code: "runtime_mismatch", message: "still bad", detectedAt: "2" },
				{ surfaceId: "kept", code: "runtime_mismatch", message: "duplicate", detectedAt: "3" },
				{ surfaceId: "removed", code: "runtime_mismatch", message: "not a candidate surface", detectedAt: "4" },
			],
		);

		expect(result.disabledSurfaceIds).toEqual(["disabled"]);
		expect(result.quarantine).toEqual([
			{ surfaceId: "kept", code: "runtime_mismatch", message: "still bad", detectedAt: "2" },
		]);
	});
});
