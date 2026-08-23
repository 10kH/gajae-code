import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import { getAddonFilenames, resolveLoaderCandidates, shouldStageNodeModulesAddon } from "../native/loader-state.js";
import packageJson from "../package.json" with { type: "json" };

const winNodeModulesNativeDir = "C:\\Users\\Admin\\node_modules\\@gajae-code\\pi-natives\\native";
const posixNodeModulesNativeDir = "/home/u/proj/node_modules/@gajae-code/natives/native";

describe("windows native addon loading", () => {
	it("does not stage node_modules addons without descriptor-bound load authority", () => {
		expect(
			shouldStageNodeModulesAddon({
				platform: "win32",
				isCompiledBinary: false,
				nativeDir: winNodeModulesNativeDir,
			}),
		).toBe(false);
	});

	it("keeps package candidates ahead of no cache candidates", () => {
		const versionedDir = "C:\\Users\\Admin\\.gjc\\natives\\15.0.1";
		const candidates = resolveLoaderCandidates({
			addonFilenames: getAddonFilenames({ tag: "win32-x64", arch: "x64", variant: "baseline" }),
			isCompiledBinary: false,
			stageFromNodeModules: true,
			nativeDir: winNodeModulesNativeDir,
			execDir: "C:\\Users\\Admin\\node_modules\\.bin",
			versionedDir,
			userDataDir: "C:\\Users\\Admin\\AppData\\Local\\gjc",
		});
		const versionedBaseline = path.join(versionedDir, "pi_natives.win32-x64-baseline.node");
		const packageBaseline = path.join(winNodeModulesNativeDir, "pi_natives.win32-x64-baseline.node");
		expect(candidates).not.toContain(versionedBaseline);
		expect(candidates).toContain(packageBaseline);
	});

	it("keeps regular package candidates on non-Windows platforms", () => {
		const candidates = resolveLoaderCandidates({
			addonFilenames: getAddonFilenames({ tag: "linux-x64", arch: "x64", variant: "baseline" }),
			isCompiledBinary: false,
			nativeDir: posixNodeModulesNativeDir,
			execDir: "/usr/bin",
			versionedDir: "/home/u/.gjc/natives/15.0.1",
			userDataDir: "/home/u/.local/bin",
		});
		expect(candidates).toContain(path.join(posixNodeModulesNativeDir, "pi_natives.linux-x64-baseline.node"));
	});
});

describe("pi-natives version sentinel", () => {
	it("Rust js_name matches the package version", async () => {
		const libRs = await Bun.file(path.join(import.meta.dir, "../../../crates/pi-natives/src/lib.rs")).text();
		const sentinelMatch = libRs.match(/js_name = "(__piNativesV[A-Za-z0-9_]+)"/);
		expect(sentinelMatch).not.toBeNull();
		expect(sentinelMatch?.[1]).toBe(`__piNativesV${packageJson.version.replace(/[^A-Za-z0-9]/g, "_")}`);
	});
});
