/**
 * C52 outcome red team.
 *
 * `bash.background` must distinguish a fold that just succeeded from a running
 * wait that was already folded for any reason, and from a session with no live
 * Bash wait. Exercise the public AgentSession outcome API against real
 * manager-owned Bash jobs rather than a FoldCoordinator double.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { createMockModel, type MockResponse, registerMockApi } from "@gajae-code/ai/providers/mock";
import { TempDir } from "@gajae-code/utils";
import { AsyncJobManager } from "../src/async";
import { Settings } from "../src/config/settings";
import { type CreateAgentSessionResult, createAgentSession } from "../src/sdk";
import { OPERATIONS } from "../src/sdk/protocol/operation-registry";
import { AuthStorage } from "../src/session/auth-storage";
import { bashBackgroundControlError } from "../src/session/fold-coordinator";
import { SessionManager } from "../src/session/session-manager";

interface LiveScenario {
	created: CreateAgentSessionResult;
	authStorage: AuthStorage;
	tempDir: TempDir;
}

async function waitFor(predicate: () => boolean, timeoutMs = 10_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (predicate()) return;
		await Bun.sleep(10);
	}
	throw new Error("Timed out waiting for C52 outcome state");
}

async function createScenario(options: { autoBackground?: boolean; thresholdMs?: number } = {}): Promise<LiveScenario> {
	const tempDir = TempDir.createSync("@gjc-steer-fold-c52-");
	registerMockApi();
	const authStorage = await AuthStorage.create(`${tempDir.path()}/auth.db`);
	const responses: MockResponse[] = [
		{
			content: [
				{
					type: "toolCall",
					name: "bash",
					arguments: { command: "sleep 2; printf 'c52 complete\n'", timeout: 30 },
				},
			],
		},
		{ content: ["background handoff acknowledged"] },
	];
	const mock = createMockModel({
		handler: () => responses.shift() ?? { content: ["background completion acknowledged"] },
	});
	authStorage.setRuntimeApiKey(mock.model.provider, "test-key");
	const created = await createAgentSession({
		cwd: tempDir.path(),
		agentDir: tempDir.path(),
		sessionManager: SessionManager.inMemory(tempDir.path()),
		authStorage,
		settings: Settings.isolated({
			"async.enabled": true,
			"bash.autoBackground.enabled": options.autoBackground ?? false,
			...(options.thresholdMs === undefined ? {} : { "bash.autoBackground.thresholdMs": options.thresholdMs }),
			"compaction.enabled": false,
			busyPromptMode: "steer",
		}),
		model: mock.model,
		toolNames: ["bash"],
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
	return { created, authStorage, tempDir };
}

describe("C52 bash.background outcomes after prior folds", () => {
	const scenarios: LiveScenario[] = [];

	afterEach(async () => {
		const retired = scenarios.splice(0);
		await Promise.all(
			retired.map(async scenario => {
				await scenario.created.session.dispose();
				scenario.authStorage.close();
				scenario.tempDir.removeSync();
			}),
		);
		AsyncJobManager.resetForTests();
	});

	test("reports already_backgrounded after chord, sdk_control, and timer folds; reports no_active_bash without a live wait", async () => {
		const chord = await createScenario();
		scenarios.push(chord);
		const chordRun = chord.created.session.prompt("start a command for chord folding");
		await waitFor(() => chord.created.session.hasForegroundBashBackgroundRequestHandler());
		const chordFold = await chord.created.session.requestForegroundBashBackgroundOutcome("chord");
		expect(chordFold.status).toBe("folded");
		await chordRun;
		expect(await chord.created.session.requestForegroundBashBackgroundOutcome("sdk_control")).toEqual({
			status: "already_backgrounded",
		});

		const sdkControl = await createScenario();
		scenarios.push(sdkControl);
		const sdkControlRun = sdkControl.created.session.prompt("start a command for SDK folding");
		await waitFor(() => sdkControl.created.session.hasForegroundBashBackgroundRequestHandler());
		const sdkControlFold = await sdkControl.created.session.requestForegroundBashBackgroundOutcome("sdk_control");
		expect(sdkControlFold.status).toBe("folded");
		await sdkControlRun;
		expect(await sdkControl.created.session.requestForegroundBashBackgroundOutcome("sdk_control")).toEqual({
			status: "already_backgrounded",
		});

		const timer = await createScenario({ autoBackground: true, thresholdMs: 25 });
		scenarios.push(timer);
		const timerRun = timer.created.session.prompt("start a command for timer folding");
		await waitFor(
			() =>
				timer.created.session
					.getAsyncJobSnapshot()
					?.running.some(job => job.metadata?.backgrounded === true && job.metadata?.foldReason === "timer") ??
				false,
		);
		await timerRun;
		expect(await timer.created.session.requestForegroundBashBackgroundOutcome("sdk_control")).toEqual({
			status: "already_backgrounded",
		});

		const idle = await createScenario();
		scenarios.push(idle);
		expect(await idle.created.session.requestForegroundBashBackgroundOutcome("sdk_control")).toEqual({
			status: "no_active_bash",
		});
		await Promise.all(
			[chord, sdkControl, timer].map(scenario =>
				waitFor(() => (scenario.created.session.getAsyncJobSnapshot()?.running.length ?? 0) === 0, 5_000),
			),
		);
	}, 30_000);

	test("the public C52 contract maps every non-folded outcome to its declared error code and both dispatchers share the mapper", async () => {
		expect(bashBackgroundControlError({ status: "already_backgrounded" })).toMatchObject({
			code: "already_backgrounded",
		});
		expect(bashBackgroundControlError({ status: "no_active_bash" })).toMatchObject({ code: "no_active_bash" });
		expect(bashBackgroundControlError({ status: "not_foldable", reason: "the wait settled" })).toMatchObject({
			code: "not_foldable",
			message: expect.stringContaining("the wait settled"),
		});
		// Every code the mapper can produce is a declared C52 error code, and vice versa.
		const declared = OPERATIONS.find(operation => operation.sdkId === "bash.background")?.errorCodes ?? [];
		expect(new Set(declared)).toEqual(new Set(["not_foldable", "already_backgrounded", "no_active_bash"]));

		// The two dispatchers are the only C52 entry points and both go through the typed outcome + shared mapper.
		for (const file of ["../src/modes/runtime-init.ts", "../src/modes/controllers/extension-ui-controller.ts"]) {
			const source = await Bun.file(new URL(file, import.meta.url)).text();
			const dispatcher = source.slice(source.indexOf('case "bash.background"'));
			const body = dispatcher.slice(0, dispatcher.indexOf("case ", 10));
			expect(body).toContain('requestForegroundBashBackgroundOutcome("sdk_control")');
			expect(body).toContain("bashBackgroundControlError(outcome)");
			expect(body).toContain("return { backgrounded: true, jobId: outcome.jobId }");
		}

		// End to end through the dispatcher-equivalent path: after a steer fold the
		// public control reports already_backgrounded, never not_foldable.
		const scenario = await createScenario();
		scenarios.push(scenario);
		const run = scenario.created.session.prompt("start a command for a control probe");
		await waitFor(() => scenario.created.session.hasForegroundBashBackgroundRequestHandler());
		const fresh = await scenario.created.session.requestForegroundBashBackgroundOutcome("sdk_control");
		expect(fresh).toEqual({ status: "folded", jobId: expect.stringMatching(/^bg_\d+$/) });
		await run;
		const repeat = await scenario.created.session.requestForegroundBashBackgroundOutcome("sdk_control");
		expect(repeat.status).toBe("already_backgrounded");
		if (repeat.status === "folded") throw new Error("unreachable");
		expect(bashBackgroundControlError(repeat)).toMatchObject({ code: "already_backgrounded" });
		await waitFor(() => (scenario.created.session.getAsyncJobSnapshot()?.running.length ?? 0) === 0, 5_000);
	}, 20_000);
});
