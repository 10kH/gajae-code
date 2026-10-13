import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { AuthStorage, type OAuthCredential, SqliteAuthCredentialStore } from "../src/auth-storage";
import { claudeUsageProvider } from "../src/usage/claude";

const EMAIL = "user@example.com";
const ACCOUNT = "account-uuid";
const TEAM = { uuid: "org-team", name: "Acme Team" };
const PERSONAL = { uuid: "org-personal", name: "Personal Max" };

const originalFetch = global.fetch;

function tokenResponse(organization: { uuid: string; name: string } | undefined, suffix: string): Response {
	return new Response(
		JSON.stringify({
			access_token: `access-${suffix}`,
			refresh_token: `refresh-${suffix}`,
			expires_in: 3600,
			account: { uuid: ACCOUNT, email_address: EMAIL },
			...(organization ? { organization } : {}),
		}),
		{ status: 200, headers: { "Content-Type": "application/json" } },
	);
}

function readRows(dbPath: string): Array<{ id: number; identity_key: string | null; disabled_cause: string | null }> {
	const db = new Database(dbPath, { readonly: true });
	try {
		return db
			.prepare(
				"SELECT id, identity_key, disabled_cause FROM auth_credentials WHERE provider = 'anthropic' ORDER BY id",
			)
			.all() as Array<{ id: number; identity_key: string | null; disabled_cause: string | null }>;
	} finally {
		db.close();
	}
}

describe("AuthStorage anthropic organizations", () => {
	let tempDir = "";
	let dbPath = "";
	let store: SqliteAuthCredentialStore;
	let authStorage: AuthStorage;

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-anthropic-orgs-"));
		dbPath = path.join(tempDir, "agent.db");
		store = await SqliteAuthCredentialStore.open(dbPath);
		authStorage = new AuthStorage(store, {
			usageProviderResolver: provider => (provider === "anthropic" ? claudeUsageProvider : undefined),
			// Resolve per call: each test swaps `global.fetch` after construction.
			usageFetch: ((input: string | URL | Request, init?: RequestInit) => global.fetch(input, init)) as typeof fetch,
		});
	});

	afterEach(async () => {
		global.fetch = originalFetch;
		vi.restoreAllMocks();
		store.close();
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	async function login(organization: { uuid: string; name: string } | undefined, suffix: string): Promise<void> {
		global.fetch = vi.fn(async () => tokenResponse(organization, suffix)) as unknown as typeof fetch;
		await authStorage.login(
			"anthropic",
			{
				onAuth: () => {},
				onPrompt: async () => "",
				onManualCodeInput: async () => `code-${suffix}`,
			},
			{ manualCode: true },
		);
	}

	function activeOrganizations(): Array<string | undefined> {
		return store
			.listAuthCredentials("anthropic")
			.map(entry => (entry.credential.type === "oauth" ? entry.credential.organizationId : undefined));
	}

	it("keeps one credential per organization for the same account", async () => {
		await login(TEAM, "team");
		await login(PERSONAL, "personal");

		expect(activeOrganizations()).toEqual([TEAM.uuid, PERSONAL.uuid]);
		expect(readRows(dbPath).map(row => row.identity_key)).toEqual([
			`email:${EMAIL}|org:${TEAM.uuid}`,
			`email:${EMAIL}|org:${PERSONAL.uuid}`,
		]);
		const names = store
			.listAuthCredentials("anthropic")
			.map(entry => (entry.credential.type === "oauth" ? entry.credential.organizationName : undefined));
		expect(names).toEqual([TEAM.name, PERSONAL.name]);
	});

	it("replaces the credential when the same organization logs in again", async () => {
		await login(TEAM, "team-1");
		await login(PERSONAL, "personal");
		await login(TEAM, "team-2");

		const active = store.listAuthCredentials("anthropic");
		expect(active).toHaveLength(2);
		const team = active.find(
			entry => entry.credential.type === "oauth" && entry.credential.organizationId === TEAM.uuid,
		);
		expect(team?.credential.type === "oauth" ? team.credential.access : undefined).toBe("access-team-2");
		expect(readRows(dbPath)[0]?.disabled_cause).toBeNull();
	});

	describe("a row stored before organizations were tracked", () => {
		const legacy: OAuthCredential = {
			type: "oauth",
			access: "access-legacy",
			refresh: "refresh-legacy",
			expires: Date.now() + 60_000,
			accountId: ACCOUNT,
			email: EMAIL,
		};

		async function seedLegacyThenLogin(organization: { uuid: string; name: string }): Promise<number> {
			const [stored] = store.upsertAuthCredentialForProvider("anthropic", legacy);
			await authStorage.reload();
			await login(organization, "login");
			expect(readRows(dbPath).map(row => row.identity_key)).toEqual([
				`email:${EMAIL}`,
				`email:${EMAIL}|org:${organization.uuid}`,
			]);
			return stored?.id ?? -1;
		}

		it("survives another organization's login and keeps it once its refresh names its organization", async () => {
			const legacyId = await seedLegacyThenLogin(TEAM);

			store.updateAuthCredential(legacyId, {
				...legacy,
				organizationId: PERSONAL.uuid,
				organizationName: PERSONAL.name,
			});
			await authStorage.reload();

			expect(activeOrganizations()).toEqual([PERSONAL.uuid, TEAM.uuid]);
		});

		it("is deduplicated once its refresh names the organization that logged in again", async () => {
			const legacyId = await seedLegacyThenLogin(TEAM);

			store.updateAuthCredential(legacyId, { ...legacy, organizationId: TEAM.uuid, organizationName: TEAM.name });
			await authStorage.reload();

			const active = store.listAuthCredentials("anthropic");
			expect(active.map(entry => entry.id)).not.toContain(legacyId);
			expect(activeOrganizations()).toEqual([TEAM.uuid]);
		});
	});

	it("still replaces by account when the token response carries no organization", async () => {
		await login(undefined, "first");
		await login(undefined, "second");

		const active = store.listAuthCredentials("anthropic");
		expect(active).toHaveLength(1);
		expect(active[0]?.credential.type === "oauth" ? active[0].credential.access : undefined).toBe("access-second");
	});

	it("switches a session by organization id or name", async () => {
		await login(TEAM, "team");
		await login(PERSONAL, "personal");
		const [teamRow, personalRow] = store.listAuthCredentials("anthropic");

		authStorage.switchSessionCredential("anthropic", "session-1", { kind: "org", value: "personal max" });
		expect(authStorage.getSessionCredentialRowId("anthropic", "session-1")).toBe(personalRow?.id);

		authStorage.switchSessionCredential("anthropic", "session-1", { kind: "org", value: TEAM.uuid });
		expect(authStorage.getSessionCredentialRowId("anthropic", "session-1")).toBe(teamRow?.id);

		expect(() =>
			authStorage.switchSessionCredential("anthropic", "session-1", { kind: "org", value: "unknown" }),
		).toThrow(/matching org:unknown/);
	});

	it("pins by organization while an email selector is ambiguous", async () => {
		await login(TEAM, "team");
		await login(PERSONAL, "personal");
		const personalRow = store.listAuthCredentials("anthropic")[1];

		expect(authStorage.resolveOAuthPinTarget("anthropic", { kind: "org", value: PERSONAL.name })).toEqual({
			credentialId: personalRow?.id,
			canonicalSelector: { kind: "id", value: String(personalRow?.id) },
		});
		expect(() => authStorage.resolveOAuthPinTarget("anthropic", { kind: "email", value: EMAIL })).toThrow(
			/matches multiple OAuth credentials/,
		);
	});

	it("labels each organization's credential in the inventory", async () => {
		await login(TEAM, "team");
		await login(PERSONAL, "personal");

		expect(authStorage.listCredentialInventory("anthropic").map(row => row.identityLabel)).toEqual([
			`${EMAIL} (${TEAM.name})`,
			`${EMAIL} (${PERSONAL.name})`,
		]);
	});

	it("reports usage per organization instead of merging the shared account", async () => {
		await login(TEAM, "team");
		await login(PERSONAL, "personal");
		const utilizationByToken: Record<string, number> = { "Bearer access-team": 80, "Bearer access-personal": 5 };
		global.fetch = vi.fn(async (_input: string | URL, init?: RequestInit) => {
			const authorization = new Headers(init?.headers).get("authorization") ?? "";
			const utilization = utilizationByToken[authorization];
			if (utilization === undefined) return new Response("unauthorized", { status: 401 });
			return new Response(
				JSON.stringify({
					five_hour: { utilization, resets_at: new Date(Date.now() + 3_600_000).toISOString() },
					seven_day: { utilization: 1, resets_at: new Date(Date.now() + 86_400_000).toISOString() },
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		}) as unknown as typeof fetch;

		const reports = (await authStorage.fetchUsageReports())?.filter(report => report.provider === "anthropic") ?? [];
		const byOrganization = Object.fromEntries(
			reports.map(report => [
				report.metadata?.orgId,
				report.limits.find(limit => limit.id === "anthropic:5h")?.amount.used,
			]),
		);
		expect(byOrganization).toEqual({ [TEAM.uuid]: 80, [PERSONAL.uuid]: 5 });
	});
});
