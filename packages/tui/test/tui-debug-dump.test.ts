import { afterEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { performance } from "node:perf_hooks";
import type { Component } from "@gajae-code/tui";
import { TUI } from "@gajae-code/tui";
import { getDebugLogPath, resetAgentDirFromEnvironment, setAgentDir } from "@gajae-code/utils";
import { VirtualTerminal } from "./virtual-terminal";

const SECRET = "Bearer zzzzzzzzzzzzzzzz";

class Lines implements Component {
	#lines: string[];

	constructor(lines: string[]) {
		this.#lines = lines;
	}

	setLines(lines: string[]): void {
		this.#lines = lines;
	}

	invalidate(): void {}

	render(width: number): string[] {
		return this.#lines.map(line => line.slice(0, width));
	}
}

function restoreEnv(name: string, value: string | undefined): void {
	if (value === undefined) delete Bun.env[name];
	else Bun.env[name] = value;
}

function isUnderTmpTui(filePath: string): boolean {
	const resolved = path.resolve(filePath);
	return ["/tmp/tui", "/private/tmp/tui"].some(
		prefix => resolved === prefix || resolved.startsWith(`${prefix}${path.sep}`),
	);
}

async function settle(term: VirtualTerminal): Promise<void> {
	await new Promise<void>(resolve => process.nextTick(resolve));
	await Bun.sleep(1);
	await term.flush();
}

describe("TUI render debug dump", () => {
	let root = "";
	let monotonicNow = 0;
	let previousAgent: string | undefined;
	let previousPiAgent: string | undefined;
	let previousDebug: string | undefined;
	let previousPiDebug: string | undefined;
	let previousTmux: string | undefined;

	afterEach(() => {
		vi.restoreAllMocks();
		restoreEnv("GJC_TUI_DEBUG", previousDebug);
		restoreEnv("PI_TUI_DEBUG", previousPiDebug);
		restoreEnv("TMUX", previousTmux);
		restoreEnv("GJC_CODING_AGENT_DIR", previousAgent);
		restoreEnv("PI_CODING_AGENT_DIR", previousPiAgent);
		resetAgentDirFromEnvironment();
		if (root) fs.rmSync(root, { recursive: true, force: true });
		root = "";
	});

	it("redacts a bearer token and writes the frame owner-only beside the debug log", async () => {
		previousAgent = Bun.env.GJC_CODING_AGENT_DIR;
		previousPiAgent = Bun.env.PI_CODING_AGENT_DIR;
		previousDebug = Bun.env.GJC_TUI_DEBUG;
		previousPiDebug = Bun.env.PI_TUI_DEBUG;
		previousTmux = Bun.env.TMUX;
		root = fs.mkdtempSync(path.join(os.tmpdir(), "tui-debug-dump-"));
		const agentDir = path.join(root, "agent");
		setAgentDir(agentDir);
		Bun.env.GJC_TUI_DEBUG = "1";
		delete Bun.env.PI_TUI_DEBUG;
		delete Bun.env.TMUX;

		monotonicNow = 0;
		vi.spyOn(performance, "now").mockImplementation(() => {
			monotonicNow += 20;
			return monotonicNow;
		});

		const term = new VirtualTerminal(80, 12);
		const tui = new TUI(term, false, { widthSettleMs: 0 });
		tui.start();
		const lines = new Lines(["hello"]);
		tui.addChild(lines);
		tui.requestRender(false, "tui-debug.first");
		await settle(term);

		lines.setLines([SECRET]);
		tui.requestRender(false, "tui-debug.second");
		await settle(term);
		tui.stop();

		const debugDir = path.dirname(getDebugLogPath());
		expect(fs.existsSync(debugDir)).toBe(true);
		expect(fs.statSync(debugDir).isDirectory()).toBe(true);
		expect(fs.statSync(debugDir).mode & 0o777).toBe(0o700);
		const dumps = fs.readdirSync(debugDir).filter(name => name.startsWith("render-") && name.endsWith(".log"));
		expect(dumps.length).toBeGreaterThan(0);
		for (const name of dumps) {
			const dumpPath = path.join(debugDir, name);
			expect(path.dirname(dumpPath)).toBe(debugDir);
			expect(isUnderTmpTui(dumpPath)).toBe(false);
			expect(fs.statSync(dumpPath).mode & 0o777).toBe(0o600);
			const body = fs.readFileSync(dumpPath, "utf8");
			expect(body.includes(SECRET)).toBe(false);
			expect(body.includes("«redacted-auth»")).toBe(true);
		}
	});
});
