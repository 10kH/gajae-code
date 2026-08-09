import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Settings } from "../src/config/settings";
import { daemonPaths } from "../src/sdk/bus/daemon-paths";
import { DAEMON_GENERATION, hasSafeDaemonStateShape, TelegramNotificationDaemon } from "../src/sdk/bus/telegram-daemon";
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
		type PublicationReceiptHarness = {
			claimPublication(publicationId: string): Promise<void>;
			markPublicationAttempted(publicationId: string): Promise<void>;
			markPublicationDelivered(publicationId: string): Promise<void>;
			markPublicationRejected(publicationId: string): Promise<void>;
			loadPresentationState(): Promise<void>;
			publicationShouldSuppress(publicationId: string): boolean;
			publicationSettlement(publicationId: string): { promise: Promise<void> };
			settlePublication(publicationId: string): void;
		};
		const makeHarness = (): PublicationReceiptHarness =>
			new TelegramNotificationDaemon({
				settings: settings(agentDir),
				ownerId: "provider-owner",
				botToken: BOT_TOKEN,
				chatId: "42",
			}) as unknown as PublicationReceiptHarness;
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
});
