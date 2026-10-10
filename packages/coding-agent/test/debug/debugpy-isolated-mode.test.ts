import { afterEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as piUtils from "@gajae-code/utils";
import { TempDir } from "@gajae-code/utils";
import { Settings } from "../../src/config/settings";
import { selectLaunchAdapter } from "../../src/dap/config";
import { dapSessionManager } from "../../src/dap/session";
import type { ToolSession } from "../../src/tools";
import { DebugTool } from "../../src/tools/debug";

const PYTHON3 = piUtils.$which("python3");

function sessionFor(cwd: string): ToolSession {
	return {
		cwd,
		hasUI: false,
		getSessionFile: () => null,
		getSessionSpawns: () => "*",
		settings: Settings.isolated({ "debug.enabled": true }),
	};
}

afterEach(async () => {
	vi.restoreAllMocks();
	if (dapSessionManager.getActiveSession()) {
		await dapSessionManager.terminate(undefined, 1_000);
	}
});

describe("debugpy adapter isolated mode", () => {
	it.skipIf(!PYTHON3)(
		"does not import a repository debugpy package from a trusted python (skipped when python3 is absent)",
		async () => {
			if (!PYTHON3) throw new Error("python3 is absent");
			const python3 = PYTHON3;
			using tempDir = TempDir.createSync("@gjc-dap-trust-debugpy-module-");
			const marker = tempDir.join("project-debugpy-loaded");
			const repo = path.join(tempDir.path(), "repo");
			await fs.promises.mkdir(path.join(repo, ".git"), { recursive: true });
			await fs.promises.mkdir(path.join(repo, "debugpy"), { recursive: true });
			await Bun.write(path.join(repo, "pyproject.toml"), "[project]\nname = 'example'\n");
			await Bun.write(path.join(repo, "app.py"), "print(1)\n");
			const loader = `from pathlib import Path\nPath(${JSON.stringify(marker)}).write_text("loaded\\n")\n`;
			await Bun.write(path.join(repo, "debugpy", "__init__.py"), loader);
			await Bun.write(path.join(repo, "debugpy", "adapter.py"), loader);
			vi.spyOn(piUtils, "$which").mockImplementation(command => (command === "python" ? python3 : null));
			const tool = new DebugTool(sessionFor(repo));
			const selected = selectLaunchAdapter(path.join(repo, "app.py"), repo, "debugpy");
			expect(selected?.resolvedCommand).toBe(python3);
			expect(selected?.args.slice(0, 3)).toEqual(["-I", "-m", "debugpy.adapter"]);

			try {
				await tool.execute("call-debugpy-module", {
					action: "launch",
					program: "app.py",
					adapter: "debugpy",
					timeout: 5,
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				expect(message).not.toMatch(/No debugger adapter available/);
			}
			expect(fs.existsSync(marker)).toBe(false);
		},
		20_000,
	);
});
