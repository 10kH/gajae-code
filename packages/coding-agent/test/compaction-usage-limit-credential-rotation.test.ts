import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import * as path from "node:path";
import { scheduler } from "node:timers/promises";
import { Agent } from "@gajae-code/agent-core";
import * as compactionModule from "@gajae-code/agent-core/compaction";
import { getBundledModel } from "@gajae-code/ai";
import { ModelRegistry } from "@gajae-code/coding-agent/config/model-registry";
import { Settings } from "@gajae-code/coding-agent/config/settings";
import { AgentSession } from "@gajae-code/coding-agent/session/agent-session";
import { AuthStorage } from "@gajae-code/coding-agent/session/auth-storage";
import { SessionManager } from "@gajae-code/coding-agent/session/session-manager";
import { TempDir } from "@gajae-code/utils";
import { assistantMsg, userMsg } from "./utilities";

const USAGE_LIMIT =
	"Summarization failed: Codex error event: The usage limit has been reached (code=usage_limit_reached)";
const MAX_RETRIES = 2;

/**
 * Auto-compaction used to retry a usage-limited credential row until its retries ran
 * out, even with healthy rows stored for the same provider. Compaction gates the next
 * request, so the turn path's credential rotation was never reached and the session
 * stalled until it was restarted in a fresh process.
 */
describe("auto-compaction usage limit rotates the session credential", () => {
	let tempDir: TempDir;
	let authStorage: AuthStorage;
	let session: AgentSession | undefined;

	beforeEach(async () => {
		tempDir = TempDir.createSync("@compaction-usage-limit-rotation-");
		authStorage = await AuthStorage.create(path.join(tempDir.path(), "auth.db"));
		// Stored rows, deliberately NO runtime API key: a runtime override counts as a
		// pin and suppresses rotation.
		await authStorage.set("openai-codex", [
			{ type: "api_key", key: "codex-key-1" },
			{ type: "api_key", key: "codex-key-2" },
		]);
		vi.spyOn(scheduler, "wait").mockResolvedValue(undefined);
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await session?.dispose();
		session = undefined;
		authStorage.close();
		tempDir.removeSync();
	});

	function createSession(): AgentSession {
		const model = getBundledModel("openai-codex", "gpt-5.4-mini");
		if (!model) throw new Error("Expected bundled test model");
		const settings = Settings.isolated({
			"compaction.keepRecentTokens": 1,
			"retry.maxRetries": MAX_RETRIES,
			"retry.baseDelayMs": 1,
		});
		const agent = new Agent({ initialState: { model, systemPrompt: ["Test"], tools: [], messages: [] } });
		const created = new AgentSession({
			agent,
			sessionManager: SessionManager.inMemory(),
			settings,
			modelRegistry: new ModelRegistry(authStorage, path.join(tempDir.path(), "models.yml")),
		});
		for (const [userText, assistantText] of [
			["first question", "first answer"],
			["second question", "second answer"],
		] as const) {
			const user = userMsg(userText);
			const assistant = assistantMsg(assistantText);
			created.agent.appendMessage(user);
			created.sessionManager.appendMessage(user);
			created.agent.appendMessage(assistant);
			created.sessionManager.appendMessage(assistant);
		}
		return created;
	}

	function collectCompactionEnds(target: AgentSession): Array<{ errorMessage?: string; result?: unknown }> {
		const ends: Array<{ errorMessage?: string; result?: unknown }> = [];
		target.subscribe(event => {
			if (event.type === "auto_compaction_end") ends.push(event as (typeof ends)[number]);
		});
		return ends;
	}

	function stubCompact(usageLimited: (apiKey: string, firstKey: string) => boolean) {
		let firstKey: string | undefined;
		return vi.spyOn(compactionModule, "compact").mockImplementation(async (preparation, model, apiKey) => {
			firstKey ??= apiKey;
			if (usageLimited(apiKey, firstKey)) throw new Error(USAGE_LIMIT);
			return {
				summary: `summary via ${apiKey}`,
				shortSummary: "short",
				firstKeptEntryId: preparation.firstKeptEntryId,
				tokensBefore: 42,
				details: { provider: model.provider },
			};
		});
	}

	it("retries on another stored row instead of the exhausted one", async () => {
		session = createSession();
		const ends = collectCompactionEnds(session);
		const compactSpy = stubCompact((apiKey, firstKey) => apiKey === firstKey);
		const markUsageLimitReached = vi.spyOn(authStorage, "markUsageLimitReached");

		await session.runIdleCompaction();

		const keys = compactSpy.mock.calls.map(call => call[2]);
		expect(keys).toHaveLength(2);
		expect(keys[1]).not.toBe(keys[0]);
		expect(markUsageLimitReached).toHaveBeenCalledTimes(1);
		expect(ends).toHaveLength(1);
		expect(ends[0]?.errorMessage).toBeUndefined();
		expect(ends[0]?.result).toBeDefined();
	});

	it("marks the credential used when a sibling advances the session pointer during key resolution", async () => {
		session = createSession();
		const credentialIds = authStorage
			.exportSnapshot()
			.credentials.filter(entry => entry.provider === "openai-codex")
			.map(entry => entry.id);
		const resolveApiKey = authStorage.getApiKey.bind(authStorage);
		let selectedRowId: number | undefined;
		let siblingRowId: number | undefined;
		let pointerAtDispatch: number | undefined;
		let advancedDuringResolution = false;
		let calls = 0;
		const markUsageLimitReached = vi.spyOn(authStorage, "markUsageLimitReached");
		vi.spyOn(authStorage, "getApiKey").mockImplementation(async (provider, sessionId, options) => {
			const apiKey = await resolveApiKey(provider, sessionId, options);
			if (!advancedDuringResolution && provider === "openai-codex" && options?.credentialSelector === undefined) {
				advancedDuringResolution = true;
				selectedRowId = authStorage.getSessionCredentialRowId(provider, sessionId);
				siblingRowId = credentialIds.find(rowId => rowId !== selectedRowId);
				if (selectedRowId === undefined || siblingRowId === undefined) {
					throw new Error("expected two stored credentials and a selected compaction credential");
				}
				await resolveApiKey(provider, sessionId, {
					credentialSelector: { kind: "id", value: String(siblingRowId) },
				});
			}
			return apiKey;
		});
		const compactSpy = vi.spyOn(compactionModule, "compact").mockImplementation(async (preparation, model) => {
			if (calls++ === 0) {
				pointerAtDispatch = authStorage.getSessionCredentialRowId(model.provider, session?.credentialSessionId);
				throw new Error(USAGE_LIMIT);
			}
			return {
				summary: "summary via sibling",
				shortSummary: "short",
				firstKeptEntryId: preparation.firstKeptEntryId,
				tokensBefore: 42,
				details: { provider: model.provider },
			};
		});

		await session.runIdleCompaction();

		expect(advancedDuringResolution).toBe(true);
		expect(pointerAtDispatch).toBe(siblingRowId);
		expect(compactSpy.mock.calls).toHaveLength(2);
		expect(compactSpy.mock.calls[1]?.[2]).not.toBe(compactSpy.mock.calls[0]?.[2]);
		expect(markUsageLimitReached).toHaveBeenCalledTimes(1);
		expect(markUsageLimitReached.mock.calls[0]?.[2]?.rowId).toBe(selectedRowId);
	});

	it("tries each row once, then falls back to the retry policy and stops", async () => {
		session = createSession();
		const ends = collectCompactionEnds(session);
		const compactSpy = stubCompact(() => true);

		await session.runIdleCompaction();

		const keys = compactSpy.mock.calls.map(call => call[2]);
		expect(new Set(keys)).toEqual(new Set(["codex-key-1", "codex-key-2"]));
		expect(keys.length).toBeLessThanOrEqual(2 + MAX_RETRIES);
		expect(ends).toHaveLength(1);
		expect(ends[0]?.errorMessage).toContain("usage limit has been reached");
	});

	it("stops rotating when a row it already failed on comes back off backoff", async () => {
		session = createSession();
		const ends = collectCompactionEnds(session);
		// A zero backoff makes every failed row available again at once, which is what a
		// long compaction sees once the default backoff runs out mid-rotation.
		const markUsageLimitReached = authStorage.markUsageLimitReached.bind(authStorage);
		vi.spyOn(authStorage, "markUsageLimitReached").mockImplementation((provider, sessionId, options) =>
			markUsageLimitReached(provider, sessionId, { ...options, retryAfterMs: 0 }),
		);
		let calls = 0;
		const compactSpy = vi.spyOn(compactionModule, "compact").mockImplementation(async () => {
			calls++;
			// Bound a regression to a fast failure instead of an endless rotation.
			if (calls > 10) throw new Error("test bound: compaction kept rotating between failed rows");
			throw new Error(USAGE_LIMIT);
		});

		await session.runIdleCompaction();

		expect(compactSpy.mock.calls.length).toBeLessThanOrEqual(2 + MAX_RETRIES);
		expect(ends[0]?.errorMessage).toContain("usage limit has been reached");
	});

	it("leaves the session provider's rows alone when a fallback candidate on another provider hits the limit", async () => {
		await authStorage.set("anthropic", [
			{ type: "api_key", key: "anthropic-key-1" },
			{ type: "api_key", key: "anthropic-key-2" },
		]);
		session = createSession();
		session.settings.setModelRole("default", "anthropic/claude-sonnet-4-5");
		const ends = collectCompactionEnds(session);
		const compactSpy = vi.spyOn(compactionModule, "compact").mockImplementation(async (_preparation, model) => {
			if (model.provider === "openai-codex") {
				throw new Error("Summarization failed: 503 auth_unavailable: no auth available (providers=codex)");
			}
			throw new Error(USAGE_LIMIT);
		});
		const markUsageLimitReached = vi.spyOn(authStorage, "markUsageLimitReached");

		await session.runIdleCompaction();

		expect(compactSpy.mock.calls.some(call => call[1].provider === "anthropic")).toBe(true);
		expect(markUsageLimitReached.mock.calls.filter(call => call[0] === "openai-codex")).toHaveLength(0);
		expect(ends[0]?.errorMessage).toBeDefined();
	});

	it("never rotates a credential-pinned provider", async () => {
		const pinnedRow = authStorage.exportSnapshot().credentials.find(entry => entry.provider === "openai-codex");
		if (!pinnedRow) throw new Error("Expected a stored openai-codex credential to pin");
		authStorage.setRuntimeCredentialSelector("openai-codex", { kind: "id", value: String(pinnedRow.id) });
		session = createSession();
		const ends = collectCompactionEnds(session);
		const compactSpy = stubCompact(() => true);
		const markUsageLimitReached = vi.spyOn(authStorage, "markUsageLimitReached");

		await session.runIdleCompaction();

		const keys = compactSpy.mock.calls.map(call => call[2]);
		expect(keys).toHaveLength(1 + MAX_RETRIES);
		expect(new Set(keys).size).toBe(1);
		expect(markUsageLimitReached).not.toHaveBeenCalled();
		expect(ends[0]?.errorMessage).toContain("usage limit has been reached");
	});
});
