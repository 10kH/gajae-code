import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import * as path from "node:path";
import { ModelRegistry } from "@gajae-code/coding-agent/config/model-registry";
import { AuthStorage } from "@gajae-code/coding-agent/session/auth-storage";
import { SessionManager } from "@gajae-code/coding-agent/session/session-manager";
import { Container } from "@gajae-code/tui";
import { TempDir } from "@gajae-code/utils";
import type { JobFoldEvent } from "../../../src/async/job-manager";
import type { ExtensionUIContext } from "../../../src/extensibility/extensions";
import { ExtensionRunner, loadExtensions } from "../../../src/extensibility/extensions";
import { ExtensionUiController } from "../../../src/modes/controllers/extension-ui-controller";
import type { InteractiveModeContext } from "../../../src/modes/types";
import type { AgentSessionEvent, AgentSessionEventListener } from "../../../src/session/agent-session";

/**
 * The SDK session host streams turn content (`message_update`, `tool_execution_*`)
 * and `bash_folded` frames from `ExtensionContext.onSessionEvent` / `onJobFold`.
 * A TUI-hosted session builds that context through `ExtensionUiController`, so
 * both must reach the live session there; otherwise a remote ACP submitter gets
 * an accepted, settled turn with no content.
 */
type SessionEmitter = {
	emit: (event: AgentSessionEvent) => void;
	fold: (event: JobFoldEvent) => void;
};

function createSession(runner: ExtensionRunner): { session: Record<string, unknown>; emitter: SessionEmitter } {
	const listeners = new Set<AgentSessionEventListener>();
	const foldListeners = new Set<(event: JobFoldEvent) => void>();
	const session = {
		extensionRunner: runner,
		isStreaming: false,
		subscribe: (listener: AgentSessionEventListener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		onJobFold: (listener: (event: JobFoldEvent) => void) => {
			foldListeners.add(listener);
			return () => foldListeners.delete(listener);
		},
		navigateTree: vi.fn(async () => ({ cancelled: false })),
		reload: vi.fn(async () => {}),
		notifySessionIdentityChanged: vi.fn(async () => undefined),
		sendCustomMessage: vi.fn(async () => undefined),
		sendUserMessage: vi.fn(async () => undefined),
	};
	return {
		session,
		emitter: {
			emit: event => {
				for (const listener of listeners) listener(event);
			},
			fold: event => {
				for (const listener of foldListeners) listener(event);
			},
		},
	};
}

function createController(session: Record<string, unknown>): ExtensionUiController {
	const ctx = {
		isBackgrounded: false,
		isStopped: () => false,
		session,
		sessionManager: {
			getSessionId: () => "session-a",
			getSessionName: () => "Session",
			getCwd: () => "/tmp/project",
		},
		hookWidgetContainerAbove: new Container(),
		hookWidgetContainerBelow: new Container(),
		ui: { requestRender: vi.fn() },
		editor: { setText: vi.fn(), handleInput: vi.fn(), getText: () => "" },
		setToolUIContext: vi.fn(),
		setWorkingMessage: vi.fn(),
		setEditorComponent: vi.fn(),
		toolOutputExpanded: false,
		setToolsExpanded: vi.fn(),
		rebuildInitialMessages: vi.fn(),
		rebuildChatFromMessages: vi.fn(),
		resetIrcSidebarSession: vi.fn(),
		reloadTodos: vi.fn(async () => undefined),
		refreshSlashCommandState: vi.fn(async () => undefined),
		showStatus: vi.fn(),
		showError: vi.fn(),
	} as unknown as InteractiveModeContext;
	return new ExtensionUiController(ctx);
}

function required<T>(binding: T | undefined, name: string): T {
	if (binding === undefined) throw new Error(`${name} is not bound on the extension context`);
	return binding;
}

const initializers: readonly [string, (controller: ExtensionUiController) => Promise<void> | void][] = [
	["initHooksAndCustomTools", async controller => await controller.initHooksAndCustomTools()],
	["initializeHookRunner", controller => controller.initializeHookRunner({} as ExtensionUIContext, false)],
];

describe("ExtensionUiController session stream binding", () => {
	let tempDir: TempDir;
	let runner: ExtensionRunner;

	beforeEach(async () => {
		tempDir = TempDir.createSync("@pi-session-stream-binding-");
		const authStorage = await AuthStorage.create(path.join(tempDir.path(), "testauth.db"));
		const modelRegistry = new ModelRegistry(authStorage);
		const sessionManager = SessionManager.create(tempDir.path(), tempDir.path());
		const loaded = await loadExtensions([], tempDir.path());
		runner = new ExtensionRunner(loaded.extensions, loaded.runtime, tempDir.path(), sessionManager, modelRegistry);
	});

	afterEach(() => {
		tempDir.remove();
	});

	for (const [name, initialize] of initializers) {
		it(`forwards live session events to the extension context in ${name}`, async () => {
			const { session, emitter } = createSession(runner);
			await initialize(createController(session));

			const received: AgentSessionEvent[] = [];
			const onSessionEvent = required(runner.createContext().onSessionEvent, "onSessionEvent");
			const dispose = onSessionEvent(event => received.push(event));
			const update = { type: "message_update" } as unknown as AgentSessionEvent;
			emitter.emit(update);
			expect(received).toEqual([update]);

			dispose();
			emitter.emit({ type: "message_end" } as unknown as AgentSessionEvent);
			expect(received).toEqual([update]);
		});

		it(`forwards job folds and advertises the binding in ${name}`, async () => {
			const { session, emitter } = createSession(runner);
			await initialize(createController(session));

			const context = runner.createContext();
			expect(context.sdkBindings?.()).toContain("onJobFold");
			const folds: JobFoldEvent[] = [];
			const dispose = required(context.onJobFold, "onJobFold")(event => folds.push(event));
			const fold: JobFoldEvent = { jobId: "job-1", generation: "g1", reason: "steer" };
			emitter.fold(fold);
			expect(folds).toEqual([fold]);

			dispose();
			emitter.fold({ jobId: "job-2", generation: "g2", reason: "timer" });
			expect(folds).toEqual([fold]);
		});
	}
});
