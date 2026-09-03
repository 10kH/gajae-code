import { afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import * as path from "node:path";
import { createMockModel, registerMockApi } from "@gajae-code/ai/providers/mock";
import { TempDir } from "@gajae-code/utils";
import { AsyncJobManager } from "../src/async";
import { resetSettingsForTest, Settings } from "../src/config/settings";
import { InteractiveMode } from "../src/modes/interactive-mode";
import { initTheme } from "../src/modes/theme/theme";
import { type CreateAgentSessionResult, createAgentSession } from "../src/sdk";
import { AuthStorage } from "../src/session/auth-storage";
import { SessionManager } from "../src/session/session-manager";

async function waitFor(predicate: () => boolean, timeoutMs = 15_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (predicate()) return;
		await Bun.sleep(10);
	}
	throw new Error("timeout");
}

/**
 * Regression for the real dogfood failure: with `toolInterruptPolicy:
 * finish_tools` (the user's global config), a composer steer over a long
 * foreground bash was ABORTED instead of folded. `finish_tools` means "do not
 * kill the batch to deliver a steer"; a fold kills nothing, so it must apply
 * under both policies. This drives the real InteractiveMode composer, then the
 * empty second Enter the user pressed, and asserts nothing was aborted.
 */
describe("steer fold under toolInterruptPolicy=finish_tools", () => {
	let created: CreateAgentSessionResult | undefined;
	let authStorage: AuthStorage | undefined;
	let tempDir: TempDir | undefined;
	let mode: InteractiveMode | undefined;

	beforeAll(() => initTheme());
	beforeEach(() => resetSettingsForTest());
	afterEach(async () => {
		mode?.stop();
		await created?.session.dispose();
		authStorage?.close();
		tempDir?.removeSync();
		created = undefined;
		mode = undefined;
		AsyncJobManager.resetForTests();
		resetSettingsForTest();
	});

	test("a composer steer folds the foreground bash and a second empty Enter has nothing left to abort", async () => {
		tempDir = TempDir.createSync("@gjc-repro-abort-");
		await Settings.init({ inMemory: true, cwd: tempDir.path() });
		registerMockApi();
		authStorage = await AuthStorage.create(path.join(tempDir.path(), "auth.db"));
		const mock = createMockModel({
			responses: [
				{
					content: [
						"Adjusting long sleep timeout and output behavior",
						{
							type: "toolCall",
							name: "bash",
							arguments: {
								command:
									"printf 'foreground sleep started\\n'; sleep 120; printf 'foreground sleep finished\\n'",
								timeout: 180,
							},
						},
					],
				},
				{ content: ["reply after steer"] },
				{ content: ["wake"] },
			],
		});
		authStorage.setRuntimeApiKey(mock.model.provider, "test-key");
		// Defaults only: no busyPromptMode/toolInterruptPolicy overrides, like the user.
		created = await createAgentSession({
			cwd: tempDir.path(),
			agentDir: tempDir.path(),
			sessionManager: SessionManager.create(tempDir.path(), tempDir.path()),
			authStorage,
			settings: Settings.isolated({ "compaction.enabled": false, toolInterruptPolicy: "finish_tools" }),
			model: mock.model,
			toolNames: ["bash"],
			hasUI: true,
			disableExtensionDiscovery: true,
			extensions: [],
			skills: [],
			contextFiles: [],
			promptTemplates: [],
			slashCommands: [],
			enableMCP: false,
			enableLsp: false,
			sdkHostModeSupported: false,
			notificationHostModeSupported: false,
		});
		const { session } = created;
		mode = new InteractiveMode(session, "test");
		await mode.init();

		const results: string[] = [];
		const unsub = session.subscribe(e => {
			if (e.type === "tool_execution_end") results.push(JSON.stringify(e.result));
			if (e.type === "agent_end") results.push(`agent_end:${String((e as { stopReason?: unknown }).stopReason)}`);
		});

		const run = session.prompt("run it");
		await waitFor(() => session.hasForegroundBashBackgroundRequestHandler());
		await Bun.sleep(8_000);

		mode.editor.setText("hello");
		await mode.editor.onSubmit?.("hello");
		await Bun.sleep(2_000);
		// Second Enter on an empty composer (what the user did).
		mode.editor.setText("");
		await mode.editor.onSubmit?.("");
		await Bun.sleep(3_000);

		const folded = session.getAsyncJobSnapshot()?.running.find(j => j.metadata?.foldReason === "steer");
		unsub();
		expect(folded).toBeDefined();
		expect(folded?.status).toBe("running");
		expect(results.some(r => r.includes("Tool execution was aborted"))).toBe(false);
		expect(results.some(r => r.includes("Folded into background job"))).toBe(true);
		// The steer was consumed by the same run: nothing drainable remains for the
		// empty Enter to abort, and the run ended normally rather than by abort.
		expect(session.drainableQueuedMessageCount).toBe(0);
		expect(results.filter(r => r.startsWith("agent_end:")).every(r => r === "agent_end:completed")).toBe(true);
		await run.catch(() => undefined);
	}, 60_000);
});
