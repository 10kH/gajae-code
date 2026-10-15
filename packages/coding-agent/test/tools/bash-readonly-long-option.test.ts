import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { disposeAllShellSessions } from "../../src/exec/bash-executor";
import type { ToolSession } from "../../src/tools";
import { BashTool } from "../../src/tools/bash";
import { checkBashAllowedPrefixes } from "../../src/tools/bash-allowed-prefixes";
import { stubBashExecutorSettings } from "../helpers/tool-session-settings";

afterEach(async () => {
	await disposeAllShellSessions();
});

function createReadOnlyBashTool(cwd: string, prefixes: string[]): BashTool {
	const session = {
		cwd,
		getSessionFile: () => null,
		getSessionId: () => "read-only-bash-test",
		bashAllowedPrefixes: prefixes,
		bashRestrictionProfile: "read-only" as const,
		settings: {
			has(key: string) {
				return this.get(key) !== undefined;
			},
			get(key: string) {
				if (key === "bashInterceptor.enabled") return false;
				if (key === "async.enabled") return false;
				if (key === "bash.autoBackground.enabled") return false;
				if (key === "bash.autoBackground.thresholdMs") return 60_000;
				if (key === "bash.stripTrailingHeadTail") return false;
				return undefined;
			},
			getBashInterceptorRules() {
				return [];
			},
			...stubBashExecutorSettings,
		},
	} as unknown as ToolSession;
	return new BashTool(session);
}

describe("read-only bash long-option denylist", () => {
	it.skipIf(process.platform === "win32")(
		"rejects a GNU abbreviation of tree --output before the program runs",
		async () => {
			const root = await fs.mkdtemp(path.join(process.cwd(), ".tmp-read-only-tree-abbrev-"));
			const marker = path.join(root, "ran");
			const stub = path.join(root, "tree");
			const originalWhich = Bun.which;
			try {
				const quote = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;
				await fs.writeFile(
					stub,
					["#!/bin/sh", `printf 'ran\\n' > ${quote(marker)}`, "printf 'tree-ran\\n'", ""].join("\n"),
				);
				await fs.chmod(stub, 0o755);
				Bun.which = ((command: string) => (command === "tree" ? stub : originalWhich(command))) as typeof Bun.which;
				const tool = createReadOnlyBashTool(root, ["tree"]);
				for (const command of ["tree --outp=out.txt", "tree --out out.txt", "tree --output=out.txt"]) {
					await expect(tool.execute("tool-call", { command })).rejects.toThrow(
						"read-only bash does not allow tree output-file writes",
					);
				}
				await expect(fs.access(marker)).rejects.toThrow();
			} finally {
				Bun.which = originalWhich;
				await fs.rm(root, { recursive: true, force: true });
			}
		},
	);

	it.skipIf(process.platform === "win32" || !Bun.which("file"))(
		"rejects file -C and --compile before magic compilation",
		async () => {
			const root = await fs.mkdtemp(path.join(process.cwd(), ".tmp-read-only-file-compile-"));
			try {
				const tool = createReadOnlyBashTool(root, ["file"]);
				for (const command of [
					"file -C / --compile",
					"file --compile /usr/share/file/magic",
					"file --comp /usr/share/file/magic",
				]) {
					await expect(tool.execute("tool-call", { command })).rejects.toThrow(
						"read-only bash does not allow file magic compilation",
					);
				}
				await expect(fs.access(path.join(root, "magic.mgc"))).rejects.toThrow();
			} finally {
				await fs.rm(root, { recursive: true, force: true });
			}
		},
	);

	it.skipIf(process.platform === "win32" || !Bun.which("file"))(
		"still allows a read-only file inspection",
		async () => {
			const root = await fs.mkdtemp(path.join(process.cwd(), ".tmp-read-only-file-ok-"));
			try {
				await fs.writeFile(path.join(root, "sample.txt"), "hello\n");
				const tool = createReadOnlyBashTool(root, ["file"]);
				const result = await tool.execute("tool-call", { command: "file sample.txt" });
				expect(result.content.find(part => part.type === "text")?.text).toContain("sample.txt");
				await expect(fs.access(path.join(root, "magic.mgc"))).rejects.toThrow();
			} finally {
				await fs.rm(root, { recursive: true, force: true });
			}
		},
	);

	it.skipIf(process.platform === "win32")("still allows a tree listing without an output file", async () => {
		const root = await fs.mkdtemp(path.join(process.cwd(), ".tmp-read-only-tree-ok-"));
		const stub = path.join(root, "tree");
		const originalWhich = Bun.which;
		try {
			await fs.writeFile(stub, "#!/bin/sh\nprintf 'tree-ok\\n'\n");
			await fs.chmod(stub, 0o755);
			Bun.which = ((command: string) => (command === "tree" ? stub : originalWhich(command))) as typeof Bun.which;
			const tool = createReadOnlyBashTool(root, ["tree"]);
			const result = await tool.execute("tool-call", { command: "tree --dirsfirst" });
			expect(result.content.find(part => part.type === "text")?.text).toContain("tree-ok");
		} finally {
			Bun.which = originalWhich;
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	it("rejects abbreviated git --output and ripgrep hostname flags", () => {
		for (const command of ["git diff --outp=out.diff", "git diff --output=out.diff"]) {
			const result = checkBashAllowedPrefixes(command, ["git diff"]);
			expect(result.allowed).toBe(false);
			expect(result.reason).toContain("git --output or --no-index");
		}
		const hostname = checkBashAllowedPrefixes("rg --host ./pwned hello", ["rg"], { profile: "read-only" });
		expect(hostname.allowed).toBe(false);
		expect(hostname.reason).toContain("ripgrep hostname commands");
	});

	it("still allows git diff --stat and a plain rg pattern", () => {
		expect(checkBashAllowedPrefixes("git diff --stat", ["git diff"])).toEqual({ allowed: true });
		expect(checkBashAllowedPrefixes("git diff --output-indicator-new=X", ["git diff"])).toEqual({
			allowed: true,
		});
		expect(checkBashAllowedPrefixes("rg --heading hello sample.txt", ["rg"], { profile: "read-only" })).toEqual({
			allowed: true,
		});
		expect(checkBashAllowedPrefixes("rg --pretty hello sample.txt", ["rg"], { profile: "read-only" })).toEqual({
			allowed: true,
		});
		expect(checkBashAllowedPrefixes("tree --opt-toggle --dirsfirst .", ["tree"], { profile: "read-only" })).toEqual({
			allowed: true,
		});
		expect(checkBashAllowedPrefixes("file --mime sample.txt", ["file"], { profile: "read-only" })).toEqual({
			allowed: true,
		});
	});
});
