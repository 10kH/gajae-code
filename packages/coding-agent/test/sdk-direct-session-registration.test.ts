import { describe, expect, test, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { AuthStorage, getBundledModel } from "@gajae-code/ai";
import { FileLockAcquireError, withFileLock } from "../src/config/file-lock";
import { Settings } from "../src/config/settings";
import { registerDirectSession } from "../src/main";
import { createAgentSession } from "../src/sdk";
import { SessionIndex } from "../src/sdk/broker/session-index";
import { SessionManager } from "../src/session/session-manager";

async function makeTempRoot(prefix: string): Promise<string> {
	return await fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function removeTempRoot(root: string): Promise<void> {
	await fs.rm(root, { recursive: true, force: true });
}

describe("direct CLI session-index registration", () => {
	test("ephemeral child does not create a session-index lock", async () => {
		const root = await makeTempRoot("gjc-5438-ephemeral-");
		try {
			const sessionsDir = path.join(root, "sdk", "sessions");
			const logPath = path.join(sessionsDir, "index.jsonl");
			const lockPath = `${logPath}.lock`;

			const registration = await registerDirectSession(SessionManager.inMemory(root), root, undefined, {
				registerPostmortem: () => () => {},
			});
			await registration.syncIdentity();
			expect(await fs.stat(lockPath).catch(() => undefined)).toBeUndefined();
			expect(await fs.stat(logPath).catch(() => undefined)).toBeUndefined();
		} finally {
			await removeTempRoot(root);
		}
	});

	test("ephemeral child succeeds without touching a contended standalone index lock", async () => {
		const root = await makeTempRoot("gjc-5438-ephemeral-contended-");
		try {
			const sessionsDir = path.join(root, "sdk", "sessions");
			const logPath = path.join(sessionsDir, "index.jsonl");
			const lockPath = `${logPath}.lock`;
			await fs.mkdir(lockPath, { recursive: true });
			await Bun.write(
				path.join(lockPath, "info"),
				JSON.stringify({ pid: process.pid, start_time: "unknown", timestamp: Date.now() }),
			);

			const registration = await registerDirectSession(SessionManager.inMemory(root), root, undefined, {
				registerPostmortem: () => () => {},
			});
			await registration.syncIdentity();
			expect(await fs.stat(lockPath)).toBeDefined();
			expect(await fs.stat(logPath).catch(() => undefined)).toBeUndefined();
		} finally {
			await removeTempRoot(root);
		}
	});

	test("durable direct session still publishes a host registration", async () => {
		const root = await makeTempRoot("gjc-5438-durable-");
		try {
			const manager = SessionManager.create(root, SessionManager.explicitDestination(path.join(root, "sessions")));
			await registerDirectSession(manager, root, undefined, {
				processIncarnation: () => undefined,
				registerPostmortem: () => () => {},
			});

			const index = await new SessionIndex(root).open();
			expect(index.listSessions().sessions).toHaveLength(1);
			expect(index.listSessions().sessions[0]).toMatchObject({
				sessionId: manager.getSessionId(),
				pid: process.pid,
				endpointGeneration: 0,
			});
		} finally {
			await removeTempRoot(root);
		}
	});

	test("durable registration surfaces genuine index contention", async () => {
		const root = await makeTempRoot("gjc-5438-contention-");
		try {
			const sessionsDir = path.join(root, "sdk", "sessions");
			const logPath = path.join(sessionsDir, "index.jsonl");
			const lockPath = `${logPath}.lock`;
			await fs.mkdir(lockPath, { recursive: true });
			await Bun.write(
				path.join(lockPath, "info"),
				JSON.stringify({ pid: process.pid, start_time: "unknown", timestamp: Date.now() }),
			);

			const manager = SessionManager.create(root, SessionManager.explicitDestination(path.join(root, "sessions")));
			const index = new SessionIndex(root);
			const append = index.append.bind(index);
			index.append = input => withFileLock(logPath, () => append(input), { retries: 1, retryDelayMs: 1 });
			await expect(
				registerDirectSession(manager, root, undefined, {
					createIndex: () => index,
					registerPostmortem: () => () => {},
				}),
			).rejects.toBeInstanceOf(FileLockAcquireError);
			expect(await fs.stat(lockPath)).toBeDefined();
		} finally {
			await removeTempRoot(root);
		}
	});

	test("a /new identity change registers the successor and releases the predecessor", async () => {
		const root = await makeTempRoot("gjc-direct-identity-switch-");
		const manager = SessionManager.create(root, SessionManager.explicitDestination(path.join(root, "sessions")));
		try {
			manager.appendMessage({ role: "user", content: "first", timestamp: Date.now() });
			await manager.ensureOnDisk();
			const registration = await registerDirectSession(manager, root, undefined, {
				registerPostmortem: () => () => {},
			});
			const predecessorId = manager.getSessionId();
			await manager.newSession();
			const successorId = manager.getSessionId();
			expect(successorId).not.toBe(predecessorId);

			await registration.syncIdentity();

			const rows = (await new SessionIndex(root).open()).listSessions().sessions;
			const live = rows.filter(row => row.live).map(row => row.sessionId);
			expect(live).toEqual([successorId]);
			expect(rows.find(row => row.sessionId === predecessorId)?.live).not.toBe(true);

			// Re-syncing an unchanged identity must not append another registration.
			const before = (await new SessionIndex(root).open()).listSessions().indexSeq;
			await registration.syncIdentity();
			expect((await new SessionIndex(root).open()).listSessions().indexSeq).toBe(before);
		} finally {
			await manager.close();
			await removeTempRoot(root);
		}
	});

	test("AgentSession.newSession drives the identity sync through the session_switch event", async () => {
		const root = await makeTempRoot("gjc-direct-identity-e2e-");
		const authStorage = await AuthStorage.create(":memory:");
		const manager = SessionManager.create(root, SessionManager.explicitDestination(path.join(root, "sessions")));
		manager.appendMessage({ role: "user", content: "first", timestamp: Date.now() });
		await manager.ensureOnDisk();
		const registration = await registerDirectSession(manager, root, undefined, {
			registerPostmortem: () => () => {},
		});
		const { session } = await createAgentSession({
			cwd: root,
			agentDir: root,
			authStorage,
			model: getBundledModel("openai", "gpt-4o-mini"),
			settings: Settings.isolated({ "notifications.enabled": false }),
			sessionManager: manager,
			disableExtensionDiscovery: true,
			extensions: [
				pi => {
					pi.on("session_switch", async () => {
						await registration.syncIdentity();
					});
				},
			],
			skills: [],
			contextFiles: [],
			promptTemplates: [],
			slashCommands: [],
			enableMCP: false,
			enableLsp: false,
		});
		try {
			const predecessorId = manager.getSessionId();
			await session.newSession();
			const successorId = manager.getSessionId();
			expect(successorId).not.toBe(predecessorId);

			const rows = (await new SessionIndex(root).open()).listSessions().sessions;
			expect(rows.filter(row => row.live).map(row => row.sessionId)).toEqual([successorId]);
			expect(rows.find(row => row.sessionId === predecessorId)?.live).not.toBe(true);
		} finally {
			await session.dispose();
			await removeTempRoot(root);
		}
	});

	test("retains a predecessor release that failed and retries it on the next sync", async () => {
		const root = await makeTempRoot("gjc-direct-predecessor-retry-");
		const authStorage = await AuthStorage.create(":memory:");
		try {
			const manager = SessionManager.create(root, SessionManager.explicitDestination(path.join(root, "sessions")));
			manager.appendMessage({ role: "user", content: "first", timestamp: Date.now() });
			await manager.ensureOnDisk();
			const index = new SessionIndex(root);
			let failNextRelease = true;
			const appendEntry = index.append.bind(index);
			vi.spyOn(index, "append").mockImplementation(async entry => {
				if (entry.type === "host_unregistered" && failNextRelease) {
					failNextRelease = false;
					throw new Error("transient index append failure");
				}
				return await appendEntry(entry);
			});
			const registration = await registerDirectSession(manager, root, undefined, {
				createIndex: () => index,
				registerPostmortem: () => () => {},
			});
			const predecessorId = manager.getSessionId();
			const { session } = await createAgentSession({
				cwd: root,
				agentDir: root,
				authStorage,
				model: getBundledModel("openai", "gpt-4o-mini"),
				settings: Settings.isolated({ "notifications.enabled": false }),
				sessionManager: manager,
				disableExtensionDiscovery: true,
				extensions: [],
				skills: [],
				contextFiles: [],
				promptTemplates: [],
				slashCommands: [],
				enableMCP: false,
				enableLsp: false,
			});
			try {
				await session.newSession();
				const successorId = manager.getSessionId();
				expect(successorId).not.toBe(predecessorId);

				await registration.syncIdentity();
				const afterFailedRelease = (await new SessionIndex(root).open()).listSessions().sessions;
				// The successor is indexed and the predecessor stays live: its release failed
				// and is retained instead of being forgotten.
				expect(
					afterFailedRelease
						.filter(row => row.live)
						.map(row => row.sessionId)
						.sort(),
				).toEqual([predecessorId, successorId].sort());

				// An unchanged identity still drains the retained release.
				await registration.syncIdentity();
				const afterRetry = (await new SessionIndex(root).open()).listSessions().sessions;
				expect(afterRetry.filter(row => row.live).map(row => row.sessionId)).toEqual([successorId]);
			} finally {
				await session.dispose();
			}
		} finally {
			vi.restoreAllMocks();
			authStorage.close();
			await removeTempRoot(root);
		}
	});

	test("drains a retained predecessor release during teardown", async () => {
		const root = await makeTempRoot("gjc-direct-predecessor-teardown-");
		const authStorage = await AuthStorage.create(":memory:");
		try {
			const manager = SessionManager.create(root, SessionManager.explicitDestination(path.join(root, "sessions")));
			manager.appendMessage({ role: "user", content: "first", timestamp: Date.now() });
			await manager.ensureOnDisk();
			const index = new SessionIndex(root);
			let failNextRelease = true;
			const appendEntry = index.append.bind(index);
			vi.spyOn(index, "append").mockImplementation(async entry => {
				if (entry.type === "host_unregistered" && failNextRelease) {
					failNextRelease = false;
					throw new Error("transient index append failure");
				}
				return await appendEntry(entry);
			});
			let runTeardown: (() => Promise<void>) | undefined;
			const registration = await registerDirectSession(manager, root, undefined, {
				createIndex: () => index,
				registerPostmortem: (_id, callback) => {
					runTeardown = async () => {
						await callback("test-cleanup" as never);
					};
					return () => {};
				},
			});
			const { session } = await createAgentSession({
				cwd: root,
				agentDir: root,
				authStorage,
				model: getBundledModel("openai", "gpt-4o-mini"),
				settings: Settings.isolated({ "notifications.enabled": false }),
				sessionManager: manager,
				disableExtensionDiscovery: true,
				extensions: [],
				skills: [],
				contextFiles: [],
				promptTemplates: [],
				slashCommands: [],
				enableMCP: false,
				enableLsp: false,
			});
			try {
				await session.newSession();
				await registration.syncIdentity();
				// The index is healthy again, so teardown releases the current identity and
				// the predecessor retained from the failed attempt.
				failNextRelease = false;
				if (!runTeardown) throw new Error("Expected the registration to arm a teardown handler");
				await runTeardown();
				const rows = (await new SessionIndex(root).open()).listSessions().sessions;
				expect(rows.filter(row => row.live)).toHaveLength(0);
			} finally {
				await session.dispose();
			}
		} finally {
			vi.restoreAllMocks();
			authStorage.close();
			await removeTempRoot(root);
		}
	});

	test("does not replay a retained release against a reactivated session", async () => {
		const root = await makeTempRoot("gjc-direct-reactivated-");
		const authStorage = await AuthStorage.create(":memory:");
		try {
			const manager = SessionManager.create(root, SessionManager.explicitDestination(path.join(root, "sessions")));
			manager.appendMessage({ role: "user", content: "first", timestamp: Date.now() });
			await manager.ensureOnDisk();
			const index = new SessionIndex(root);
			let failNextRelease = true;
			const appendEntry = index.append.bind(index);
			vi.spyOn(index, "append").mockImplementation(async entry => {
				if (entry.type === "host_unregistered" && failNextRelease) {
					failNextRelease = false;
					throw new Error("transient index append failure");
				}
				return await appendEntry(entry);
			});
			const registration = await registerDirectSession(manager, root, undefined, {
				createIndex: () => index,
				registerPostmortem: () => () => {},
			});
			const firstId = manager.getSessionId();
			const firstFile = manager.getSessionFile();
			if (!firstFile) throw new Error("Expected the first session to be on disk");
			const { session } = await createAgentSession({
				cwd: root,
				agentDir: root,
				authStorage,
				model: getBundledModel("openai", "gpt-4o-mini"),
				settings: Settings.isolated({ "notifications.enabled": false }),
				sessionManager: manager,
				disableExtensionDiscovery: true,
				extensions: [],
				skills: [],
				contextFiles: [],
				promptTemplates: [],
				slashCommands: [],
				enableMCP: false,
				enableLsp: false,
			});
			try {
				await session.newSession();
				expect(manager.getSessionId()).not.toBe(firstId);
				// The successor registers and the first session's release fails once, so
				// its release stays queued.
				await registration.syncIdentity();

				// Resume the first session: the queued release is stale the moment that id
				// is current again.
				await session.switchSession(firstFile);
				expect(manager.getSessionId()).toBe(firstId);
				await registration.syncIdentity();

				const afterResume = (await new SessionIndex(root).open()).listSessions().sessions;
				expect(afterResume.filter(row => row.live).map(row => row.sessionId)).toEqual([firstId]);

				// A repeated unchanged-identity sync must not retire it either.
				await registration.syncIdentity();
				const afterRepeatedSync = (await new SessionIndex(root).open()).listSessions().sessions;
				expect(afterRepeatedSync.filter(row => row.live).map(row => row.sessionId)).toEqual([firstId]);
			} finally {
				await session.dispose();
			}
		} finally {
			vi.restoreAllMocks();
			authStorage.close();
			await removeTempRoot(root);
		}
	});

	test("adopts a registration whose append failed after its row was durable", async () => {
		const root = await makeTempRoot("gjc-direct-ambiguous-append-");
		const authStorage = await AuthStorage.create(":memory:");
		try {
			const manager = SessionManager.create(root, SessionManager.explicitDestination(path.join(root, "sessions")));
			manager.appendMessage({ role: "user", content: "first", timestamp: Date.now() });
			await manager.ensureOnDisk();
			const index = new SessionIndex(root);
			let failNextRegistration = true;
			const appendEntry = index.append.bind(index);
			vi.spyOn(index, "append").mockImplementation(async entry => {
				if (entry.type === "host_registered" && failNextRegistration) {
					failNextRegistration = false;
					// The row lands and then awaited post-append maintenance rejects, so the
					// rejection does not prove the registration is missing.
					await appendEntry(entry);
					throw new Error("post-append maintenance failure");
				}
				return await appendEntry(entry);
			});
			const registration = await registerDirectSession(manager, root, undefined, {
				createIndex: () => index,
				registerPostmortem: () => () => {},
			});
			const firstId = manager.getSessionId();
			const firstFile = manager.getSessionFile();
			if (!firstFile) throw new Error("Expected the first session to be on disk");
			const { session } = await createAgentSession({
				cwd: root,
				agentDir: root,
				authStorage,
				model: getBundledModel("openai", "gpt-4o-mini"),
				settings: Settings.isolated({ "notifications.enabled": false }),
				sessionManager: manager,
				disableExtensionDiscovery: true,
				extensions: [],
				skills: [],
				contextFiles: [],
				promptTemplates: [],
				slashCommands: [],
				enableMCP: false,
				enableLsp: false,
			});
			try {
				await session.newSession();
				const secondId = manager.getSessionId();
				expect(secondId).not.toBe(firstId);
				// The successor's registration is durable even though its append rejects.
				await registration.syncIdentity();

				await session.switchSession(firstFile);
				await registration.syncIdentity();

				const rows = (await new SessionIndex(root).open()).listSessions().sessions;
				expect(rows.filter(row => row.live).map(row => row.sessionId)).toEqual([firstId]);
			} finally {
				await session.dispose();
			}
		} finally {
			vi.restoreAllMocks();
			authStorage.close();
			await removeTempRoot(root);
		}
	});

	test("identity sync is a no-op for sessions that were never registered", async () => {
		const root = await makeTempRoot("gjc-direct-identity-noop-");
		try {
			const registration = await registerDirectSession(SessionManager.inMemory(root), root, undefined, {
				registerPostmortem: () => () => {},
			});
			await registration.syncIdentity();
			expect(
				await fs.stat(path.join(root, "sdk", "sessions", "index.jsonl")).catch(() => undefined),
			).toBeUndefined();
		} finally {
			await removeTempRoot(root);
		}
	});

	test("top-level in-memory SDK sessions retain SDK hosting", async () => {
		const root = await makeTempRoot("gjc-5438-sdk-host-");
		const authStorage = await AuthStorage.create(":memory:");
		const priorNotifications = process.env.GJC_NOTIFICATIONS;
		const priorSdkDisable = process.env.GJC_SDK_DISABLE;
		delete process.env.GJC_NOTIFICATIONS;
		delete process.env.GJC_SDK_DISABLE;
		try {
			const { session } = await createAgentSession({
				cwd: root,
				agentDir: root,
				authStorage,
				model: getBundledModel("openai", "gpt-4o-mini"),
				settings: Settings.isolated({ "notifications.enabled": false }),
				sessionManager: SessionManager.inMemory(root),
				disableExtensionDiscovery: true,
				extensions: [],
				skills: [],
				contextFiles: [],
				promptTemplates: [],
				slashCommands: [],
				enableMCP: false,
				enableLsp: false,
			});
			try {
				expect(session.extensionRunner?.getCommand("notify")).toBeDefined();
			} finally {
				await session.dispose();
			}
		} finally {
			if (priorNotifications === undefined) delete process.env.GJC_NOTIFICATIONS;
			else process.env.GJC_NOTIFICATIONS = priorNotifications;
			if (priorSdkDisable === undefined) delete process.env.GJC_SDK_DISABLE;
			else process.env.GJC_SDK_DISABLE = priorSdkDisable;
			authStorage.close();
			await removeTempRoot(root);
		}
	});
});
