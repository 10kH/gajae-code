import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Settings } from "../src/config/settings";
import { daemonPaths } from "../src/sdk/bus/daemon-paths";
import type { NotificationOperatorRuntime } from "../src/sdk/bus/operator-runtime";
import {
	type BotApi,
	DAEMON_GENERATION,
	hasSafeDaemonStateShape,
	type TelegramDaemonFs,
	TelegramNotificationDaemon,
	TelegramUpdatePoller,
} from "../src/sdk/bus/telegram-daemon";
import type { AgentDirSessionLifecycleService } from "../src/sdk/lifecycle/client";

const BOT_TOKEN = "1234567890:ABCDEFghijkLmnOpQrsTuvWxYz012345678";

function tempAgentDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), "gjc-telegram-supervisor-test-"));
}

function settings(agentDir: string): Settings {
	const isolated = Settings.isolated({
		"notifications.enabled": true,
		"notifications.telegram.enabled": true,
		"notifications.telegram.botToken": BOT_TOKEN,
		"notifications.telegram.chatId": "42",
	}) as Settings;
	return new Proxy(isolated, {
		get(target, property) {
			if (property === "getAgentDir") return () => agentDir;
			const value = Reflect.get(target, property, target);
			return typeof value === "function" ? value.bind(target) : value;
		},
	}) as Settings;
}

function lifecycleSpy() {
	const calls: string[] = [];
	const service = {
		createExternal: async () => {
			calls.push("create");
			throw new Error("unexpected lifecycle create");
		},
		close: async () => {
			calls.push("close");
			throw new Error("unexpected lifecycle close");
		},
		resumeExternal: async () => {
			calls.push("resume");
			throw new Error("unexpected lifecycle resume");
		},
		listRecent: async () => ({ kind: "complete", entries: [], warnings: [] }),
	} as unknown as AgentDirSessionLifecycleService;
	return { calls, service };
}

describe("Telegram provider supervisor ownership", () => {
	test("provider owner state contains transport authority but no session roots or credentials", () => {
		const state = {
			pid: 42,
			incarnation: "linux:100",
			ownerId: "owner",
			acquisitionId: "acquisition",
			ownershipPhase: "ready",
			tokenFingerprint: "account-fingerprint",
			chatId: "42",
			startedAt: 1,
			heartbeatAt: 2,
			version: 1,
			generation: DAEMON_GENERATION,
		};
		expect(hasSafeDaemonStateShape(state)).toBe(true);
		expect(state).not.toHaveProperty("roots");
		expect(JSON.stringify(state)).not.toContain(BOT_TOKEN);
	});

	test("constructing or restarting provider transport cannot mutate session lifecycle without an intent", () => {
		const agentDir = tempAgentDir();
		const lifecycle = lifecycleSpy();
		try {
			new TelegramNotificationDaemon({
				settings: settings(agentDir),
				ownerId: "provider-owner",
				botToken: BOT_TOKEN,
				chatId: "42",
				createLifecycleService: () => lifecycle.service,
			});
			expect(lifecycle.calls).toEqual([]);
		} finally {
			fs.rmSync(agentDir, { recursive: true, force: true });
		}
	});

	test("durably suppresses ambiguous publication claims after provider restart", async () => {
		const agentDir = tempAgentDir();
		const makeHarness = () =>
			new TelegramNotificationDaemon({
				settings: settings(agentDir),
				ownerId: "provider-owner",
				botToken: BOT_TOKEN,
				chatId: "42",
			}).publicationReceiptHarnessForTest();
		try {
			const first = makeHarness();
			await first.claimPublication("session:60:1");
			expect(first.publicationShouldSuppress("session:60:1")).toBe(false);

			const restartedWithClaim = makeHarness();
			await restartedWithClaim.loadPresentationState();
			expect(restartedWithClaim.publicationShouldSuppress("session:60:1")).toBe(false);

			let attemptedSettlementResolved = false;
			const attemptedSettlement = first.publicationSettlement("session:60:1").promise.then(() => {
				attemptedSettlementResolved = true;
			});
			await first.markPublicationAttempted("session:60:1");
			await Bun.sleep(0);
			expect(attemptedSettlementResolved).toBe(false);
			first.settlePublication("session:60:1");
			await attemptedSettlement;
			const restartedAmbiguous = makeHarness();
			await restartedAmbiguous.loadPresentationState();
			expect(restartedAmbiguous.publicationShouldSuppress("session:60:1")).toBe(true);

			await first.markPublicationDelivered("session:60:1");
			const restartedDelivered = makeHarness();
			await restartedDelivered.loadPresentationState();
			expect(restartedDelivered.publicationShouldSuppress("session:60:1")).toBe(true);

			await first.claimPublication("session:60:2");
			await first.markPublicationRejected("session:60:2");
			const restartedRejected = makeHarness();
			await restartedRejected.loadPresentationState();
			expect(restartedRejected.publicationShouldSuppress("session:60:2")).toBe(true);

			fs.writeFileSync(
				path.join(daemonPaths(agentDir).dir, "telegram-presentation-state.json"),
				`${JSON.stringify({ version: 1, delivered: { "legacy:60:1": Date.now() } })}\n`,
			);
			const restartedLegacy = makeHarness();
			await restartedLegacy.loadPresentationState();
			expect(restartedLegacy.publicationShouldSuppress("legacy:60:1")).toBe(false);

			fs.writeFileSync(
				path.join(daemonPaths(agentDir).dir, "telegram-presentation-state.json"),
				`${JSON.stringify({ version: 3, delivered: { "legacy-v3:delivered": Date.now() }, claimed: {}, ambiguous: { "legacy-v3:ambiguous": Date.now() } })}\n`,
			);
			const restartedV3 = makeHarness();
			await restartedV3.loadPresentationState();
			expect(restartedV3.publicationShouldSuppress("legacy-v3:delivered")).toBe(true);
			expect(restartedV3.publicationShouldSuppress("legacy-v3:ambiguous")).toBe(true);

			const oversizedClaims = Object.fromEntries(
				Array.from({ length: 4_097 }, (_, index) => [`oversized:67:${index}`, Date.now() + index]),
			);
			fs.writeFileSync(
				path.join(daemonPaths(agentDir).dir, "telegram-presentation-state.json"),
				`${JSON.stringify({ version: 4, delivered: {}, claimed: oversizedClaims, ambiguous: {}, rejected: {} })}\n`,
			);
			const restartedOversized = makeHarness();
			await restartedOversized.loadPresentationState();
			expect(restartedOversized.publicationShouldSuppress("oversized:67:0")).toBe(false);
		} finally {
			fs.rmSync(agentDir, { recursive: true, force: true });
		}
	});

	test("replays an explicitly rejected publication after rejection persistence failure", async () => {
		const agentDir = tempAgentDir();
		let persistenceFailures = 0;
		const durableFs = {
			...fs.promises,
			writeFile: async (file: string, data: string, options?: fs.WriteFileOptions): Promise<void> => {
				if (persistenceFailures > 0 && file.includes("telegram-presentation-state.json.")) {
					persistenceFailures -= 1;
					throw new Error("injected presentation persistence failure");
				}
				await fs.promises.writeFile(file, data, options);
			},
		} as unknown as TelegramDaemonFs;
		type PublicationReceiptHarness = {
			claimPublication(publicationId: string): Promise<void>;
			markPublicationAttempted(publicationId: string): Promise<void>;
			markPublicationRejected(publicationId: string, definitiveProviderRejection?: boolean): Promise<void>;
			loadPresentationState(): Promise<void>;
			publicationShouldSuppress(publicationId: string): boolean;
		};
		const makeHarness = (): PublicationReceiptHarness =>
			new TelegramNotificationDaemon({
				settings: settings(agentDir),
				ownerId: "provider-owner",
				botToken: BOT_TOKEN,
				chatId: "42",
				fs: durableFs,
			}).publicationReceiptHarnessForTest();
		const publicationId = "session:61:1";
		let providerAttempts = 0;
		const attempt = async (daemon: PublicationReceiptHarness): Promise<void> => {
			providerAttempts += 1;
			await daemon.markPublicationAttempted(publicationId);
		};
		try {
			const first = makeHarness();
			await first.claimPublication(publicationId);
			await attempt(first);
			persistenceFailures = 1;
			await expect(first.markPublicationRejected(publicationId, true)).rejects.toThrow(
				"injected presentation persistence failure",
			);

			const persisted = JSON.parse(
				fs.readFileSync(path.join(daemonPaths(agentDir).dir, "telegram-presentation-state.json"), "utf8"),
			) as {
				claimed?: Record<string, number>;
				ambiguous?: Record<string, number>;
				rejected?: Record<string, number>;
			};
			expect(persisted.claimed?.[publicationId]).toBeDefined();
			expect(persisted.ambiguous?.[publicationId]).toBeUndefined();
			expect(persisted.rejected?.[publicationId]).toBeUndefined();
			expect(providerAttempts).toBe(1);

			const restarted = makeHarness();
			await restarted.loadPresentationState();
			expect(restarted.publicationShouldSuppress(publicationId)).toBe(false);
			await restarted.claimPublication(publicationId);
			expect(providerAttempts).toBe(1);
			await attempt(restarted);
			expect(providerAttempts).toBe(2);
		} finally {
			fs.rmSync(agentDir, { recursive: true, force: true });
		}
	});
	test("drops logical-session ownership when a router replacement retires its predecessor", async () => {
		const agentDir = tempAgentDir();
		try {
			const daemon = new TelegramNotificationDaemon({
				settings: settings(agentDir),
				ownerId: "provider-owner",
				botToken: BOT_TOKEN,
				chatId: "42",
			});
			const routing = daemon.attachmentRoutingHarnessForTest();
			const attachment = {
				sessionId: "session",
				generation: 1,
				isCurrent: () => true,
				send: () => {},
			};
			routing.attach(attachment);
			const session = daemon.sessions.get(attachment.sessionId);
			if (!session) throw new Error("Expected a routed Telegram attachment session.");
			await daemon.handleSessionMessage(session, {
				type: "event_replay_result",
				id: session.replayId,
				ok: true,
				generation: 1,
				lastSeq: 0,
				events: [],
			});
			expect(routing.ownsLogicalSession(attachment.sessionId)).toBe(true);

			await routing.remove(attachment, "replaced");

			expect(routing.ownsLogicalSession(attachment.sessionId)).toBe(false);
			expect(daemon.sessions.has(attachment.sessionId)).toBe(false);
		} finally {
			fs.rmSync(agentDir, { recursive: true, force: true });
		}
	});
});

test("advances past a malformed-only getUpdates batch", async () => {
	const offsets: number[] = [];
	let calls = 0;
	const botApi: BotApi = {
		call: async (_method, body) => {
			offsets.push((body as { offset: number }).offset);
			calls++;
			return calls === 1 ? { ok: true, result: [{}] } : { ok: true, result: [{ update_id: 1 }] };
		},
	};
	const poller = new TelegramUpdatePoller({
		botApi,
		runtime: { sleep: async () => {} } as unknown as NotificationOperatorRuntime,
		backoff: { next: () => 1, reset: () => {} },
		processUpdate: async () => "consumed",
	});
	expect((await poller.pollOnceResult()).kind).toBe("api_failure");
	expect((await poller.pollOnceResult()).kind).toBe("success");
	expect(offsets).toEqual([0, 1]);
});
