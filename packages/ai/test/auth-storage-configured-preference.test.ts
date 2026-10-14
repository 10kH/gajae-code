import { afterEach, describe, expect, test } from "bun:test";
import {
	AuthStorage,
	type ConfiguredCredentialPreference,
	type OAuthCredential,
	SqliteAuthCredentialStore,
} from "../src/auth-storage";
import type { UsageLimit, UsageProvider, UsageReport } from "../src/usage";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const openStores: SqliteAuthCredentialStore[] = [];
const usageByEmail = new Map<string, UsageReport>();

const usageProvider: UsageProvider = {
	id: "anthropic",
	async fetchUsage(params) {
		const email = params.credential.email;
		return email ? (usageByEmail.get(email) ?? null) : null;
	},
};

function limit(id: "anthropic:5h" | "anthropic:7d", usedFraction: number): UsageLimit {
	const durationMs = id === "anthropic:5h" ? 5 * HOUR_MS : 7 * DAY_MS;
	const windowId = id === "anthropic:5h" ? "5h" : "7d";
	return {
		id,
		label: windowId,
		scope: { provider: "anthropic", windowId, shared: true },
		window: { id: windowId, label: windowId, durationMs, resetsAt: Date.now() + durationMs / 2 },
		amount: {
			unit: "percent",
			used: usedFraction * 100,
			limit: 100,
			remaining: (1 - usedFraction) * 100,
			usedFraction,
			remainingFraction: 1 - usedFraction,
		},
		status: usedFraction >= 1 ? "exhausted" : "ok",
	};
}

function report(email: string, fiveHourUsed: number, sevenDayUsed: number): UsageReport {
	return {
		provider: "anthropic",
		fetchedAt: Date.now(),
		limits: [limit("anthropic:5h", fiveHourUsed), limit("anthropic:7d", sevenDayUsed)],
		metadata: { email },
	};
}

function oauth(access: string, email: string): OAuthCredential {
	return { type: "oauth", access, refresh: `refresh-${access}`, expires: Date.now() + HOUR_MS, email };
}

async function createStorage(preference?: ConfiguredCredentialPreference): Promise<AuthStorage> {
	const store = await SqliteAuthCredentialStore.open(":memory:");
	openStores.push(store);
	const storage = new AuthStorage(store, {
		usageProviderResolver: provider => (provider === "anthropic" ? usageProvider : undefined),
		...(preference ? { credentialPreferences: { anthropic: preference } } : {}),
	});
	await storage.set("anthropic", [
		oauth("token-personal", "personal@example.test"),
		oauth("token-cheap", "cheap@example.test"),
	]);
	return storage;
}

afterEach(() => {
	usageByEmail.clear();
	for (const store of openStores.splice(0)) store.close();
});

describe("configured credential preference", () => {
	test("balanced ranking picks the less-used account without a preference", async () => {
		usageByEmail.set("personal@example.test", report("personal@example.test", 0.1, 0.1));
		usageByEmail.set("cheap@example.test", report("cheap@example.test", 0.5, 0.5));
		const storage = await createStorage();

		expect(await storage.getApiKey("anthropic", "no-preference")).toBe("token-personal");
	});

	test("the preferred account is used ahead of the balanced ranking", async () => {
		usageByEmail.set("personal@example.test", report("personal@example.test", 0.1, 0.1));
		usageByEmail.set("cheap@example.test", report("cheap@example.test", 0.5, 0.5));
		const storage = await createStorage({ selector: { kind: "email", value: "cheap@example.test" } });

		expect(await storage.getApiKey("anthropic", "preferred")).toBe("token-cheap");
	});

	test("the preference yields to balanced ranking once any window reaches maxUsedFraction", async () => {
		usageByEmail.set("personal@example.test", report("personal@example.test", 0.1, 0.1));
		usageByEmail.set("cheap@example.test", report("cheap@example.test", 0.9, 0.2));
		const storage = await createStorage({
			selector: { kind: "email", value: "cheap@example.test" },
			maxUsedFraction: 0.9,
		});

		expect(await storage.getApiKey("anthropic", "over-threshold")).toBe("token-personal");
	});

	test("the preference still applies just below maxUsedFraction", async () => {
		usageByEmail.set("personal@example.test", report("personal@example.test", 0.1, 0.1));
		usageByEmail.set("cheap@example.test", report("cheap@example.test", 0.89, 0.2));
		const storage = await createStorage({
			selector: { kind: "email", value: "cheap@example.test" },
			maxUsedFraction: 0.9,
		});

		expect(await storage.getApiKey("anthropic", "under-threshold")).toBe("token-cheap");
	});

	test("unknown usage does not count as over the threshold", async () => {
		const storage = await createStorage({
			selector: { kind: "email", value: "cheap@example.test" },
			maxUsedFraction: 0.5,
		});

		expect(await storage.getApiKey("anthropic", "unknown-usage")).toBe("token-cheap");
	});

	test("a quota failure on the preferred account rotates away for the rest of the session", async () => {
		const storage = await createStorage({ selector: { kind: "email", value: "cheap@example.test" } });

		expect(await storage.getApiKey("anthropic", "quota")).toBe("token-cheap");
		expect(await storage.markUsageLimitReached("anthropic", "quota", { retryAfterMs: 60_000 })).toMatchObject({
			state: "marked",
		});
		expect(await storage.getApiKey("anthropic", "quota")).toBe("token-personal");
		expect(await storage.getApiKey("anthropic", "quota-next-session")).toBe("token-personal");
	});

	test("a preference that matches no stored account leaves ranking untouched", async () => {
		usageByEmail.set("personal@example.test", report("personal@example.test", 0.5, 0.5));
		usageByEmail.set("cheap@example.test", report("cheap@example.test", 0.1, 0.1));
		const storage = await createStorage({ selector: { kind: "email", value: "removed@example.test" } });

		expect(await storage.getApiKey("anthropic", "missing")).toBe("token-cheap");
	});

	test("a runtime --prefer-credential selector outranks the configured preference", async () => {
		const storage = await createStorage({ selector: { kind: "email", value: "cheap@example.test" } });
		storage.setRuntimePreferredCredentialSelector("anthropic", { kind: "email", value: "personal@example.test" });

		expect(await storage.getApiKey("anthropic", "runtime-wins")).toBe("token-personal");
	});
});
