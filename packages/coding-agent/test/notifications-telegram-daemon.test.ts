import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Settings } from "../src/config/settings";
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
});
