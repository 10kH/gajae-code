import { describe, expect, it, spyOn } from "bun:test";
import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import path from "node:path";
import { Broker } from "../src/sdk/broker/broker";
import { deriveIdempotencyIdentity, deriveLegacyIdentity } from "../src/sdk/broker/identity";
import { setLifecycleCommandResolverForTest } from "../src/sdk/broker/lifecycle";
import { LifecycleLedger } from "../src/sdk/broker/lifecycle-ledger";

function lifecycleFingerprint(operation: string, input: Record<string, unknown>): string {
	return createHash("sha256").update(JSON.stringify({ operation, input })).digest("hex");
}

function canonicalJson(value: unknown): string {
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
	const record = value as Record<string, unknown>;
	return `{${Object.keys(record)
		.filter(key => record[key] !== undefined)
		.sort()
		.map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
		.join(",")}}`;
}

describe("SDK lifecycle ledger", () => {
	it("migrates a terminal v3 identity before replaying it after a broker restart", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-v3-replay-"));
		const operation = "session.close";
		const requestKey = "sdk:session-cli:session.close:legacy-session:1:legacy-incarnation";
		const input = {
			sessionId: "legacy-session",
			endpointGeneration: 1,
			endpointIncarnation: "a".repeat(64),
		};
		const fingerprint = lifecycleFingerprint(operation, input);
		const requestHash = createHash("sha256").update(canonicalJson({ operation, input })).digest("hex");
		const targetHash = createHash("sha256").update(canonicalJson(input)).digest("hex");
		const operationKey = `${operation}\0${requestKey}`;
		const legacyIdentity = await deriveLegacyIdentity(dir, operation, requestKey);
		const currentIdentity = await deriveIdempotencyIdentity(dir, operation, requestKey, targetHash);
		const response = { ok: true as const, operation, result: { sessionId: input.sessionId } };
		const first = new Broker({ agentDir: dir });
		const second = new Broker({ agentDir: dir });
		try {
			await first.start();
			await first.ledger.begin(legacyIdentity, requestHash, { operationKey, fingerprint });
			await first.ledger.transition(legacyIdentity, "terminal_ok", { response });
			await first.stop();

			await second.start();
			await expect(second.handleRequest(operation, input, requestKey)).resolves.toEqual(response);
			await expect(second.handleRequest(operation, input, requestKey)).resolves.toEqual(response);
			await second.stop();

			const reopened = await new LifecycleLedger(dir).open();
			expect(reopened.get(currentIdentity)).toMatchObject({
				state: "terminal_ok",
				operationKey,
				fingerprint,
			});
		} finally {
			await first.stop().catch(() => {});
			await second.stop().catch(() => {});
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	it("replays terminal responses and rejects conflicts across restarts", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-"));
		const ledger = await new LifecycleLedger(dir).open();
		const begun = await ledger.begin("i", "a");
		if (begun.kind !== "new") throw new Error("expected new");
		await ledger.transition("i", "terminal_ok", { response: { sessionId: "s" } });
		const resumed = await new LifecycleLedger(dir).open();
		expect((await resumed.begin("i", "a")).kind).toBe("replay");
		expect((await resumed.begin("i", "b")).kind).toBe("idempotency_conflict");
	});
	it("recognizes pre-index legacy rows as ambiguous without making them migration authority", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-legacy-"));
		const ledger = await new LifecycleLedger(dir).open();
		await ledger.begin("legacy-target-a", "request-a");
		expect(ledger.hasLegacyIdentity()).toBe(true);
		expect(ledger.findByOperationKey("session.create\0caller-key")).toBeUndefined();
	});
	it("does not fence on marked spawn anchors, including orphaned ones, across restarts", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-orphan-anchor-"));
		try {
			const ledger = await new LifecycleLedger(dir).open();
			// A spawn-claim anchor whose claim later left the spawn-authority journal,
			// written both before and after any operation-keyed row.
			await ledger.begin("early-spawn-anchor", "binding-mac-1", { spawnAnchor: true });
			await ledger.begin("keyed-create", "request-k", { operationKey: "session.create\0k", fingerprint: "f" });
			await ledger.transition("keyed-create", "terminal_ok", { response: { sessionId: "s" } });
			await ledger.begin("orphan-spawn-anchor", "binding-mac-2", { spawnAnchor: true });
			expect(ledger.hasLegacyIdentity()).toBe(false);
			const reopened = await new LifecycleLedger(dir).open();
			expect(reopened.get("orphan-spawn-anchor")).toMatchObject({ state: "accepted", spawnAnchor: true });
			expect(reopened.hasLegacyIdentity()).toBe(false);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});
	it("keeps fencing pre-index legacy rows once keyed rows and anchors follow", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-preindex-mixed-"));
		try {
			const ledger = await new LifecycleLedger(dir).open();
			await ledger.begin("legacy-target-a", "request-a");
			await ledger.begin("keyed-create", "request-k", { operationKey: "session.create\0k", fingerprint: "f" });
			await ledger.begin("later-spawn-anchor", "binding-mac", { spawnAnchor: true });
			// An unmarked unkeyed row written after the index is still not proven to be an anchor.
			await ledger.begin("later-unmarked", "request-u");
			const reopened = await new LifecycleLedger(dir).open();
			expect(reopened.hasLegacyIdentity(new Set(), { ignoreFinalRows: true })).toBe(true);
			expect(reopened.hasLegacyIdentity(new Set(["legacy-target-a"]), { ignoreFinalRows: true })).toBe(true);
			expect(
				reopened.hasLegacyIdentity(new Set(["legacy-target-a", "later-unmarked"]), { ignoreFinalRows: true }),
			).toBe(false);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});
	it("keeps fencing other pre-index legacy rows after one is migrated and the broker restarts", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-preindex-migrated-"));
		try {
			const ledger = await new LifecycleLedger(dir).open();
			await ledger.begin("legacy-a", "request-a", { intendedSessionId: "session-a" });
			await ledger.transition("legacy-a", "terminal_ok", { response: { sessionId: "session-a" } });
			// B is still live: it cannot prove which target it was for.
			await ledger.begin("legacy-b", "request-b", { intendedSessionId: "session-b" });
			// Migration rewrites A's latest row with operation metadata ahead of B's anchor.
			await ledger.migrateIdentity("legacy-a", "keyed-a", { operationKey: "session.close\0a", fingerprint: "f" });
			const anchorsRecord = path.join(dir, "sdk", "lifecycle-ledger.spawn-anchors.json");
			// Also re-derive the unmarked-anchor record from the migrated ledger.
			for (const reset of [async () => {}, async () => fs.rm(anchorsRecord)]) {
				await reset();
				const reopened = await new LifecycleLedger(dir).open();
				expect(reopened.get("legacy-a")?.operationKey).toBe("session.close\0a");
				expect(reopened.hasLegacyIdentity()).toBe(true);
				expect(reopened.hasLegacyIdentity(new Set(["legacy-b"]))).toBe(false);
			}

			const broker = new Broker({ agentDir: dir });
			setLifecycleCommandResolverForTest(broker, () => ({ file: path.join(dir, "missing-gjc"), args: [] }));
			try {
				await broker.start();
				await expect(
					broker.handleRequest("session.close", { sessionId: "session-c" }, "fresh-close-c"),
				).resolves.toEqual({
					ok: false,
					error: {
						code: "legacy_lifecycle_ambiguous",
						message: "legacy lifecycle request has an ambiguous target",
					},
				});
			} finally {
				setLifecycleCommandResolverForTest(broker, undefined);
				await broker.stop();
			}
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});
	it("does not promote a spawn anchor to legacy when eviction removes the keyed row before it", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-anchor-eviction-"));
		try {
			const limits = { maxRows: 4 };
			const ledger = await new LifecycleLedger(dir, limits).open();
			await ledger.begin("keyed-k", "request-k", { operationKey: "session.create\0k", fingerprint: "fk" });
			await ledger.transition("keyed-k", "terminal_ok", { response: { sessionId: "k" } });
			await ledger.begin("spawn-anchor-s", "binding-mac", { spawnAnchor: true });
			await ledger.begin("keyed-j", "request-j", { operationKey: "session.create\0j", fingerprint: "fj" });
			await ledger.transition("keyed-j", "terminal_ok", { response: { sessionId: "j" } });
			const reopened = await new LifecycleLedger(dir, limits).open();
			// K was evicted; S is now the first row in the file.
			expect(reopened.get("keyed-k")).toBeUndefined();
			expect(reopened.get("spawn-anchor-s")?.state).toBe("accepted");
			expect(reopened.hasLegacyIdentity(new Set(), { ignoreFinalRows: true })).toBe(false);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});
	it("derives the unmarked-anchor record once for a ledger written before the marker", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-unmarked-anchors-"));
		try {
			const ledgerPath = path.join(dir, "sdk", "lifecycle-ledger.jsonl");
			const record = path.join(dir, "sdk", "lifecycle-ledger.spawn-anchors.json");
			await fs.mkdir(path.dirname(ledgerPath), { recursive: true, mode: 0o700 });
			const keyed = { operationKey: "session.create\0k", fingerprint: "f" };
			// An older writer: legacy L, then keyed K, then unmarked anchors, one sharing K's ts.
			await fs.writeFile(
				ledgerPath,
				[
					lifecycleRow("legacy-l", "request-l", "accepted", 10),
					lifecycleRow("keyed-k", "request-k", "accepted", 20, keyed),
					lifecycleRow("same-ms-unmarked", "binding-mac-0", "accepted", 20),
					lifecycleRow("old-anchor-s", "binding-mac", "accepted", 30),
				]
					.map(row => `${JSON.stringify(row)}\n`)
					.join(""),
			);
			const expected = { version: 1, identities: ["old-anchor-s"] };
			for (const damage of [
				async () => {},
				async () => fs.writeFile(record, "{not json"),
				async () => fs.writeFile(record, "null\n"),
				async () => fs.rm(record),
			]) {
				await damage();
				const reopened = await new LifecycleLedger(dir).open();
				expect(JSON.parse(await fs.readFile(record, "utf8"))).toEqual(expected);
				expect(reopened.hasLegacyIdentity(new Set(["legacy-l", "same-ms-unmarked"]))).toBe(false);
				expect(reopened.hasLegacyIdentity(new Set(["same-ms-unmarked"]))).toBe(true);
				expect(reopened.hasLegacyIdentity(new Set(["legacy-l"]))).toBe(true);
			}
			// The record is derived once: rows appended later are not reclassified by it.
			const ledger = await new LifecycleLedger(dir).open();
			await ledger.begin("late-unmarked", "request-late");
			const reopened = await new LifecycleLedger(dir).open();
			expect(JSON.parse(await fs.readFile(record, "utf8"))).toEqual(expected);
			expect(reopened.hasLegacyIdentity(new Set(["legacy-l", "same-ms-unmarked"]))).toBe(true);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});
	it("keeps fencing a pre-index legacy row whose anchor was lost", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-legacy-unanchored-"));
		try {
			const ledgerPath = path.join(dir, "sdk", "lifecycle-ledger.jsonl");
			await fs.mkdir(path.dirname(ledgerPath), { recursive: true, mode: 0o700 });
			// No unmarked-anchor record yet. L's accepted anchor is gone, leaving an
			// effect_started row that names session S; it sits after the keyed row.
			await fs.writeFile(
				ledgerPath,
				[
					lifecycleRow("keyed-k", "request-k", "accepted", 1, {
						operationKey: "session.create\0k",
						fingerprint: "f",
					}),
					lifecycleRow("legacy-l", "request-l", "effect_started", 2, { intendedSessionId: "session-s" }),
				]
					.map(row => `${JSON.stringify(row)}\n`)
					.join(""),
			);
			for (let open = 0; open < 2; open += 1) {
				const reopened = await new LifecycleLedger(dir).open();
				expect(reopened.get("legacy-l")?.state).toBe("terminal_uncertain");
				expect(reopened.hasLegacyIdentity()).toBe(true);
			}
			const broker = new Broker({ agentDir: dir });
			setLifecycleCommandResolverForTest(broker, () => ({ file: path.join(dir, "missing-gjc"), args: [] }));
			try {
				await broker.start();
				await expect(
					broker.handleRequest("session.close", { sessionId: "session-s" }, "fresh-close-s"),
				).resolves.toEqual({
					ok: false,
					error: {
						code: "legacy_lifecycle_ambiguous",
						message: "legacy lifecycle request has an ambiguous target",
					},
				});
			} finally {
				setLifecycleCommandResolverForTest(broker, undefined);
				await broker.stop();
			}
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});
	it.each([
		["older", -5],
		["same-millisecond", 0],
		["newer", 5],
	])("does not let another ledger's anchor record unfence a restored %s legacy ledger", async (_name, offset) => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-legacy-restored-"));
		try {
			const ledgerPath = path.join(dir, "sdk", "lifecycle-ledger.jsonl");
			// A ledger whose record lists its own unmarked anchor.
			await fs.mkdir(path.dirname(ledgerPath), { recursive: true, mode: 0o700 });
			const now = Date.now();
			await fs.writeFile(
				ledgerPath,
				[
					lifecycleRow("keyed-k", "request-k", "accepted", now, {
						operationKey: "session.create\0k",
						fingerprint: "f",
					}),
					lifecycleRow("old-anchor-s", "binding-mac", "accepted", now + 1),
				]
					.map(row => `${JSON.stringify(row)}\n`)
					.join(""),
			);
			const ledger = await new LifecycleLedger(dir).open();
			expect(ledger.hasLegacyIdentity()).toBe(false);
			// While stopped, the ledger alone is replaced by an independent legacy-only ledger.
			await fs.writeFile(
				ledgerPath,
				`${JSON.stringify(lifecycleRow("legacy-l", "request-l", "accepted", now + offset, { intendedSessionId: "session-l" }))}\n`,
			);
			const restored = await new LifecycleLedger(dir).open();
			expect(restored.get("legacy-l")?.state).toBe("accepted");
			expect(restored.hasLegacyIdentity()).toBe(true);
			expect(restored.hasLegacyIdentity(new Set(["legacy-l"]))).toBe(false);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});
	it("keeps fencing a pre-index legacy row after migration, compaction and eviction re-derive the record", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-preindex-evicted-"));
		try {
			const limits = { maxRows: 6 };
			const record = path.join(dir, "sdk", "lifecycle-ledger.spawn-anchors.json");
			const ledger = await new LifecycleLedger(dir, limits).open();
			await ledger.begin("legacy-a", "request-a", { intendedSessionId: "session-a" });
			await ledger.transition("legacy-a", "terminal_ok", { response: { sessionId: "session-a" } });
			await ledger.begin("legacy-b", "request-b", { intendedSessionId: "session-b" });
			// Migration rewrites A in place, ahead of B, as a keyed row stamped now.
			await ledger.migrateIdentity("legacy-a", "keyed-a", { operationKey: "session.create\0a", fingerprint: "fa" });
			// Keyed traffic then forces compactions that evict the oldest keyed terminal rows.
			for (const name of ["k1", "k2", "k3"]) {
				await ledger.begin(`keyed-${name}`, `request-${name}`, {
					operationKey: `session.create\0${name}`,
					fingerprint: `f${name}`,
				});
				await ledger.transition(`keyed-${name}`, "terminal_ok", { response: { sessionId: name } });
			}
			const rows = (await fs.readFile(path.join(dir, "sdk", "lifecycle-ledger.jsonl"), "utf8"))
				.split("\n")
				.filter(Boolean)
				.map(line => JSON.parse(line) as { identity: string });
			expect(rows.length).toBeLessThanOrEqual(limits.maxRows);
			expect(rows.some(row => row.identity === "legacy-a")).toBe(false);
			expect(rows[0]?.identity).toBe("legacy-b");
			for (const reset of [async () => {}, async () => fs.rm(record)]) {
				await reset();
				const reopened = await new LifecycleLedger(dir, limits).open();
				expect(JSON.parse(await fs.readFile(record, "utf8"))).toEqual({ version: 1, identities: [] });
				expect(reopened.get("legacy-b")?.state).toBe("accepted");
				expect(reopened.hasLegacyIdentity(new Set(), { ignoreFinalRows: true })).toBe(true);
				expect(reopened.hasLegacyIdentity(new Set(["legacy-b"]), { ignoreFinalRows: true })).toBe(false);
			}
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});
	it.each([
		[
			"a quarantined history row",
			[
				lifecycleRow("unmarked-q", "request-substituted", "terminal_ok", 30, {
					response: { sessionId: "session-q" },
				}),
			],
		],
		["a corrupt row that leaves it uncertain", ["{not json"]],
	])("keeps fencing an unmarked row after the keyed row when it has %s", async (_name, damage) => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-unmarked-quarantined-"));
		try {
			const ledgerPath = path.join(dir, "sdk", "lifecycle-ledger.jsonl");
			const record = path.join(dir, "sdk", "lifecycle-ledger.spawn-anchors.json");
			await fs.mkdir(path.dirname(ledgerPath), { recursive: true, mode: 0o700 });
			// U follows the keyed row on both signals, but part of its history is unreadable.
			const rows: (Record<string, unknown> | string)[] = [
				lifecycleRow("keyed-k", "request-k", "accepted", 10, {
					operationKey: "session.create\0k",
					fingerprint: "f",
				}),
				lifecycleRow("unmarked-q", "request-q", "accepted", 20, { intendedSessionId: "session-q" }),
				...damage,
			];
			await fs.writeFile(
				ledgerPath,
				rows.map(row => `${typeof row === "string" ? row : JSON.stringify(row)}\n`).join(""),
			);
			for (let open = 0; open < 2; open += 1) {
				const reopened = await new LifecycleLedger(dir).open();
				expect(JSON.parse(await fs.readFile(record, "utf8"))).toEqual({ version: 1, identities: [] });
				expect(reopened.get("unmarked-q")?.state).toBe("terminal_uncertain");
				expect(reopened.hasLegacyIdentity()).toBe(true);
			}
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});
	it("keeps fencing a pre-index legacy row once an earlier live legacy row is migrated ahead of it", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-preindex-live-migrated-"));
		try {
			const record = path.join(dir, "sdk", "lifecycle-ledger.spawn-anchors.json");
			const ledger = await new LifecycleLedger(dir).open();
			await ledger.begin("legacy-a", "request-a", { intendedSessionId: "session-a" });
			await ledger.begin("legacy-b", "request-b", { intendedSessionId: "session-b" });
			// A is still accepted, so migration rewrites its accepted row in place: the first
			// keyed accepted row now precedes B in the file, but carries the migration time.
			await ledger.migrateIdentity("legacy-a", "keyed-a", { operationKey: "session.create\0a", fingerprint: "fa" });
			const rows = (await fs.readFile(path.join(dir, "sdk", "lifecycle-ledger.jsonl"), "utf8"))
				.split("\n")
				.filter(Boolean)
				.map(line => JSON.parse(line) as { identity: string; operationKey?: string });
			expect(rows[0]).toMatchObject({ identity: "legacy-a", operationKey: "session.create\0a" });
			expect(rows[1]?.identity).toBe("legacy-b");
			await fs.rm(record);
			const reopened = await new LifecycleLedger(dir).open();
			expect(JSON.parse(await fs.readFile(record, "utf8"))).toEqual({ version: 1, identities: [] });
			expect(reopened.hasLegacyIdentity()).toBe(true);
			expect(reopened.hasLegacyIdentity(new Set(["legacy-b"]))).toBe(false);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});
	it("keeps fencing a pre-index legacy row when the clock steps back after an earlier row's migration", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-preindex-migrated-rollback-"));
		const now = spyOn(Date, "now");
		try {
			const record = path.join(dir, "sdk", "lifecycle-ledger.spawn-anchors.json");
			const ledger = await new LifecycleLedger(dir).open();
			now.mockReturnValue(1_000);
			await ledger.begin("legacy-a", "request-a", { intendedSessionId: "session-a" });
			now.mockReturnValue(2_000);
			await ledger.begin("legacy-b", "request-b", { intendedSessionId: "session-b" });
			// A's accepted row is rewritten in place ahead of B with the migration time.
			now.mockReturnValue(3_000);
			await ledger.migrateIdentity("legacy-a", "keyed-a", { operationKey: "session.create\0a", fingerprint: "fa" });
			// The clock then steps back before B's timestamp and a later keyed row is appended.
			now.mockReturnValue(500);
			await ledger.begin("keyed-k", "request-k", { operationKey: "session.create\0k", fingerprint: "fk" });
			now.mockRestore();
			await fs.rm(record);
			for (let open = 0; open < 2; open += 1) {
				const reopened = await new LifecycleLedger(dir).open();
				expect(JSON.parse(await fs.readFile(record, "utf8"))).toEqual({ version: 1, identities: [] });
				expect(reopened.get("legacy-b")?.state).toBe("accepted");
				expect(reopened.hasLegacyIdentity()).toBe(true);
				expect(reopened.hasLegacyIdentity(new Set(["legacy-b"]))).toBe(false);
			}
			const broker = new Broker({ agentDir: dir });
			setLifecycleCommandResolverForTest(broker, () => ({ file: path.join(dir, "missing-gjc"), args: [] }));
			try {
				await broker.start();
				await expect(
					broker.handleRequest("session.close", { sessionId: "session-z" }, "fresh-close-z"),
				).resolves.toEqual({
					ok: false,
					error: {
						code: "legacy_lifecycle_ambiguous",
						message: "legacy lifecycle request has an ambiguous target",
					},
				});
			} finally {
				setLifecycleCommandResolverForTest(broker, undefined);
				await broker.stop();
			}
		} finally {
			now.mockRestore();
			await fs.rm(dir, { recursive: true, force: true });
		}
	});
	it("keeps fencing a pre-index legacy row stamped after the keyed row by a wall-clock step", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-preindex-skewed-"));
		try {
			const ledgerPath = path.join(dir, "sdk", "lifecycle-ledger.jsonl");
			await fs.mkdir(path.dirname(ledgerPath), { recursive: true, mode: 0o700 });
			const rows = [
				lifecycleRow("skewed-legacy", "request-x", "accepted", 40, { intendedSessionId: "session-x" }),
				lifecycleRow("keyed-k", "request-k", "accepted", 10, {
					operationKey: "session.create\0k",
					fingerprint: "f",
				}),
			];
			await fs.writeFile(ledgerPath, rows.map(row => `${JSON.stringify(row)}\n`).join(""));
			const reopened = await new LifecycleLedger(dir).open();
			expect(
				JSON.parse(await fs.readFile(path.join(dir, "sdk", "lifecycle-ledger.spawn-anchors.json"), "utf8")),
			).toEqual({ version: 1, identities: [] });
			expect(reopened.hasLegacyIdentity()).toBe(true);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});
	it("derives each agent directory's anchor record from that directory's ledger only", async () => {
		const root = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-anchor-per-dir-"));
		try {
			const keyed = { operationKey: "session.create\0k", fingerprint: "f" };
			const seed = async (agentDir: string, rows: Record<string, unknown>[]): Promise<void> => {
				const ledgerPath = path.join(agentDir, "sdk", "lifecycle-ledger.jsonl");
				await fs.mkdir(path.dirname(ledgerPath), { recursive: true, mode: 0o700 });
				await fs.writeFile(ledgerPath, rows.map(row => `${JSON.stringify(row)}\n`).join(""));
			};
			const recordPath = (agentDir: string): string =>
				path.join(agentDir, "sdk", "lifecycle-ledger.spawn-anchors.json");
			const anchorDir = path.join(root, "anchor-agent");
			const legacyDir = path.join(root, "legacy-agent");
			// One identity: an unmarked anchor in one directory, a pre-index legacy row in the other.
			await seed(anchorDir, [
				lifecycleRow("keyed-k", "request-k", "accepted", 10, keyed),
				lifecycleRow("shared-u", "binding-mac", "accepted", 20),
			]);
			await seed(legacyDir, [
				lifecycleRow("shared-u", "request-u", "accepted", 5, { intendedSessionId: "session-u" }),
				lifecycleRow("keyed-k", "request-k", "accepted", 10, keyed),
			]);
			const anchorLedger = await new LifecycleLedger(anchorDir).open();
			const legacyLedger = await new LifecycleLedger(legacyDir).open();
			expect(JSON.parse(await fs.readFile(recordPath(anchorDir), "utf8"))).toEqual({
				version: 1,
				identities: ["shared-u"],
			});
			expect(JSON.parse(await fs.readFile(recordPath(legacyDir), "utf8"))).toEqual({ version: 1, identities: [] });
			expect((await fs.stat(recordPath(anchorDir))).mode & 0o777).toBe(0o600);
			expect(anchorLedger.hasLegacyIdentity()).toBe(false);
			expect(legacyLedger.hasLegacyIdentity()).toBe(true);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});
	it("re-admits a durably accepted row after restart before any effect starts", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-accepted-"));
		const ledger = await new LifecycleLedger(dir).open();
		await ledger.begin("i", "a");

		const resumed = await new LifecycleLedger(dir).open();
		expect((await resumed.begin("i", "a")).kind).toBe("new");
		expect((await resumed.begin("i", "b")).kind).toBe("idempotency_conflict");
		await resumed.transition("i", "terminal_ok", { response: { sessionId: "s" } });
		expect((await new LifecycleLedger(dir).open()).get("i")?.state).toBe("terminal_ok");
	});
	it("keeps effect_started as the retry lockout boundary", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-effect-started-"));
		const ledger = await new LifecycleLedger(dir).open();
		await ledger.begin("i", "a");
		await ledger.transition("i", "effect_started");

		const resumed = await new LifecycleLedger(dir).open();
		expect((await resumed.begin("i", "a")).kind).toBe("terminal_uncertain");
	});
	it("seals a valid accepted row missing its final newline and re-admits it", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-unsealed-"));
		const ledgerPath = path.join(dir, "sdk", "lifecycle-ledger.jsonl");
		const ledger = await new LifecycleLedger(dir).open();
		await ledger.begin("i", "a");
		const source = await fs.readFile(ledgerPath, "utf8");
		await fs.writeFile(ledgerPath, source.slice(0, -1));

		const resumed = await new LifecycleLedger(dir).open();
		expect((await resumed.begin("i", "a")).kind).toBe("new");
		await resumed.transition("i", "terminal_ok", { response: { sessionId: "s" } });
		const lines = (await fs.readFile(ledgerPath, "utf8")).trimEnd().split("\n");
		expect(lines.map(line => JSON.parse(line))).toHaveLength(2);
	});
	it("quarantines corrupt middle rows and replays later valid rows", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-"));
		const ledger = await new LifecycleLedger(dir).open();
		await ledger.begin("first", "a");
		await fs.appendFile(path.join(dir, "sdk", "lifecycle-ledger.jsonl"), "not json\n");
		const resumed = await new LifecycleLedger(dir).open();
		expect((await resumed.begin("first", "a")).kind).toBe("terminal_uncertain");
		await resumed.begin("later", "b");
		expect(resumed.get("first")).toBeDefined();
		expect(resumed.get("later")).toBeDefined();
		expect(resumed.warnings).not.toHaveLength(0);
		expect(await fs.readFile(path.join(dir, "sdk", "lifecycle-ledger.jsonl.corrupt"), "utf8")).toContain("not json");
	});
	it("fails closed when a torn row may hide side-effect authority", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-torn-"));
		const ledgerPath = path.join(dir, "sdk", "lifecycle-ledger.jsonl");
		const ledger = await new LifecycleLedger(dir).open();
		await ledger.begin("i", "a");
		await fs.appendFile(
			ledgerPath,
			`${JSON.stringify({ version: 1, identity: "i", requestHash: "a", state: "effect_started" }).slice(0, -1)}`,
		);

		const resumed = await new LifecycleLedger(dir).open();
		expect((await resumed.begin("i", "a")).kind).toBe("terminal_uncertain");
		expect(resumed.get("i")?.state).toBe("terminal_uncertain");
		const recoveredLines = (await fs.readFile(ledgerPath, "utf8")).trimEnd().split("\n");
		expect(() => JSON.parse(recoveredLines.at(-2)!)).toThrow();
		expect(JSON.parse(recoveredLines.at(-1)!)).toMatchObject({ identity: "i", state: "terminal_uncertain" });
		expect((await new LifecycleLedger(dir).open()).get("i")?.state).toBe("terminal_uncertain");
	});
	it("does not let a later terminal row clear uncertainty from corrupt middle history", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-corrupt-"));
		const ledgerPath = path.join(dir, "sdk", "lifecycle-ledger.jsonl");
		const ledger = await new LifecycleLedger(dir).open();
		await ledger.begin("i", "a");
		await fs.appendFile(ledgerPath, "not json\n");
		await fs.appendFile(
			ledgerPath,
			`${JSON.stringify({
				version: 1,
				identity: "i",
				requestHash: "a",
				state: "terminal_ok",
				response: { sessionId: "s" },
				responseDigest: createHash("sha256").update('{"sessionId":"s"}').digest("hex"),
				ts: Date.now(),
			})}\n`,
		);

		const resumed = await new LifecycleLedger(dir).open();
		expect((await resumed.begin("i", "a")).kind).toBe("terminal_uncertain");
		expect(resumed.get("i")?.state).toBe("terminal_uncertain");
		const quarantined = await fs.readFile(`${ledgerPath}.corrupt`, "utf8");
		expect(quarantined).toContain('"state":"terminal_ok"');
	});
	it("persists complete multibyte rows through durable appends", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-large-"));
		const ledgerPath = path.join(dir, "sdk", "lifecycle-ledger.jsonl");
		const response = { payload: "界".repeat(128 * 1024) };
		const ledger = await new LifecycleLedger(dir).open();
		await ledger.begin("i", "a");
		await ledger.transition("i", "terminal_ok", { response });

		const lines = (await fs.readFile(ledgerPath, "utf8")).trimEnd().split("\n");
		expect(lines.map(line => JSON.parse(line))).toHaveLength(2);
		expect((await new LifecycleLedger(dir).open()).get("i")?.response).toEqual(response);
	});
	it("reads concurrent terminal proof without mutating an unrelated torn append", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-read-terminal-"));
		const ledgerPath = path.join(dir, "sdk", "lifecycle-ledger.jsonl");
		const ledger = await new LifecycleLedger(dir).open();
		await Promise.all([ledger.begin("first", "first-request"), ledger.begin("second", "second-request")]);
		await Promise.all([
			ledger.transition("first", "terminal_ok", { response: { sessionId: "first" } }),
			ledger.transition("second", "terminal_ok", { response: { sessionId: "second" } }),
		]);
		await fs.appendFile(
			ledgerPath,
			JSON.stringify(lifecycleRow("unrelated", "unrelated-request", "effect_started", Date.now())).slice(0, -1),
		);
		const before = await fs.readFile(ledgerPath, "utf8");
		const verifier = new LifecycleLedger(dir);

		await expect(verifier.readTerminal("first", "first-request")).resolves.toMatchObject({
			kind: "terminal",
			entry: { state: "terminal_ok", response: { sessionId: "first" } },
		});
		await expect(verifier.readTerminal("second", "second-request")).resolves.toMatchObject({
			kind: "terminal",
			entry: { state: "terminal_ok", response: { sessionId: "second" } },
		});
		expect(await fs.readFile(ledgerPath, "utf8")).toBe(before);
		expect(await fs.stat(`${ledgerPath}.corrupt`).catch(() => undefined)).toBeUndefined();
	});

	it("withholds terminal proof for incomplete or conflicting target history", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-read-terminal-target-"));
		const ledgerPath = path.join(dir, "sdk", "lifecycle-ledger.jsonl");
		const ledger = await new LifecycleLedger(dir).open();
		await ledger.begin("target", "request");
		await ledger.transition("target", "terminal_ok", { response: { sessionId: "target" } });
		const terminalSource = await fs.readFile(ledgerPath, "utf8");
		await fs.writeFile(ledgerPath, terminalSource.slice(0, -1));
		// A truncated final row for this identity is a *rejected* read-back, not absence:
		// something is recorded for the request and the ledger refused it.
		await expect(new LifecycleLedger(dir).readTerminal("target", "request")).resolves.toEqual({
			kind: "rejected",
			reason: "partial-row",
		});

		const conflictingDir = await fs.mkdtemp(
			path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-read-terminal-conflict-"),
		);
		const conflictingPath = path.join(conflictingDir, "sdk", "lifecycle-ledger.jsonl");
		await fs.mkdir(path.dirname(conflictingPath), { recursive: true });
		await fs.writeFile(
			conflictingPath,
			[
				lifecycleRow("target", "request", "accepted", 1),
				lifecycleRow("target", "request", "terminal_ok", 2, {
					response: { sessionId: "target" },
					responseDigest: "invalid",
				}),
			]
				.map(row => `${JSON.stringify(row)}\n`)
				.join(""),
		);
		// A row whose digest does not attribute it to this request is likewise rejected.
		await expect(new LifecycleLedger(conflictingDir).readTerminal("target", "request")).resolves.toEqual({
			kind: "rejected",
			reason: "row-not-attributable",
		});
	});

	it("returns absent for a missing or empty regular ledger", async () => {
		const absentDir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-read-source-absent-"));
		const emptyDir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-read-source-empty-"));
		try {
			await expect(new LifecycleLedger(absentDir).readTerminal("target", "request")).resolves.toEqual({
				kind: "absent",
			});

			const emptyPath = path.join(emptyDir, "sdk", "lifecycle-ledger.jsonl");
			await fs.mkdir(path.dirname(emptyPath), { recursive: true });
			await fs.writeFile(emptyPath, "");
			await expect(new LifecycleLedger(emptyDir).readTerminal("target", "request")).resolves.toEqual({
				kind: "absent",
			});
		} finally {
			await fs.rm(absentDir, { recursive: true, force: true });
			await fs.rm(emptyDir, { recursive: true, force: true });
		}
	});

	it("rejects a non-regular ledger path with a named source reason", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-read-source-nonregular-"));
		try {
			await fs.mkdir(path.join(dir, "sdk", "lifecycle-ledger.jsonl"), { recursive: true });
			await expect(new LifecycleLedger(dir).readTerminal("target", "request")).resolves.toEqual({
				kind: "rejected",
				reason: "not-regular-file",
			});
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	it("rejects a writerless FIFO without blocking the terminal read", async () => {
		if (process.platform === "win32") return;
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-read-source-fifo-"));
		const fifoPath = path.join(dir, "sdk", "lifecycle-ledger.jsonl");
		try {
			await fs.mkdir(path.dirname(fifoPath), { recursive: true });
			const mkfifo = Bun.spawn(["mkfifo", fifoPath]);
			expect(await mkfifo.exited).toBe(0);

			const result = await Promise.race([
				new LifecycleLedger(dir).readTerminal("target", "request"),
				Bun.sleep(1_000).then(() => "timeout" as const),
			]);
			if (result === "timeout") throw new Error("FIFO terminal read blocked past the bounded timeout");
			expect(result).toEqual({
				kind: "rejected",
				reason: "not-regular-file",
			});
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	it("rejects a stat-oversized ledger with oversized-by-stat", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-read-source-stat-"));
		try {
			const ledgerPath = path.join(dir, "sdk", "lifecycle-ledger.jsonl");
			await fs.mkdir(path.dirname(ledgerPath), { recursive: true });
			await fs.writeFile(ledgerPath, "12");
			await expect(new LifecycleLedger(dir, { maxBytes: 1 }).readTerminal("target", "request")).resolves.toEqual({
				kind: "rejected",
				reason: "oversized-by-stat",
			});
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	it("rejects a read-oversized ledger with oversized-by-read", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-read-source-read-"));
		const ledgerPath = path.join(dir, "sdk", "lifecycle-ledger.jsonl");
		await fs.mkdir(path.dirname(ledgerPath), { recursive: true });
		await fs.writeFile(ledgerPath, "1");
		const originalOpen = fs.open;
		const restoreReads: Array<() => void> = [];
		const openSpy = spyOn(fs, "open").mockImplementation(async (filePath, flags, mode) => {
			const handle = await originalOpen(filePath, flags, mode);
			if (filePath === ledgerPath) {
				const readSpy = spyOn(handle, "read").mockResolvedValue({ buffer: Buffer.alloc(2), bytesRead: 2 });
				restoreReads.push(() => readSpy.mockRestore());
			}
			return handle;
		});
		try {
			await expect(new LifecycleLedger(dir, { maxBytes: 1 }).readTerminal("target", "request")).resolves.toEqual({
				kind: "rejected",
				reason: "oversized-by-read",
			});
		} finally {
			openSpy.mockRestore();
			for (const restore of restoreReads) restore();
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	it("rejects a non-ENOENT ledger read failure with read-error", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-read-source-error-"));
		try {
			await fs.writeFile(path.join(dir, "sdk"), "not a directory");
			await expect(new LifecycleLedger(dir).readTerminal("target", "request")).resolves.toEqual({
				kind: "rejected",
				reason: "read-error",
			});
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});
});

function lifecycleRow(
	identity: string,
	requestHash: string,
	state: "accepted" | "effect_started" | "awaiting_ready" | "terminal_ok" | "terminal_error",
	ts: number,
	fields: Record<string, unknown> = {},
): Record<string, unknown> {
	return { version: 1, identity, requestHash, state, ts, ...fields };
}

describe("SDK lifecycle ledger history validation", () => {
	it("quarantines a request hash substitution without exposing its effect intent", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-history-"));
		const ledgerPath = path.join(dir, "sdk", "lifecycle-ledger.jsonl");
		await fs.mkdir(path.dirname(ledgerPath), { recursive: true });
		await fs.writeFile(
			ledgerPath,
			[
				lifecycleRow("i", "original", "accepted", 1),
				lifecycleRow("i", "substituted", "effect_started", 2, {
					effectIntent: { sessionId: "untrusted", stateRoot: "/untrusted" },
				}),
			]
				.map(row => `${JSON.stringify(row)}\n`)
				.join(""),
		);

		const ledger = await new LifecycleLedger(dir).open();
		expect(await ledger.begin("i", "original")).toMatchObject({ kind: "terminal_uncertain" });
		expect(ledger.get("i")).toMatchObject({ state: "terminal_uncertain", requestHash: "original" });
		expect(ledger.get("i")?.effectIntent).toBeUndefined();
		expect(await fs.readFile(`${ledgerPath}.corrupt`, "utf8")).toContain("substituted");
	});

	it("quarantines every row after a terminal entry for the same identity", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-history-"));
		const ledgerPath = path.join(dir, "sdk", "lifecycle-ledger.jsonl");
		const response = { sessionId: "s" };
		const responseDigest = createHash("sha256").update(JSON.stringify(response)).digest("hex");
		await fs.mkdir(path.dirname(ledgerPath), { recursive: true });
		await fs.writeFile(
			ledgerPath,
			[
				lifecycleRow("i", "request", "accepted", 1),
				lifecycleRow("i", "request", "terminal_ok", 2, { response, responseDigest }),
				lifecycleRow("i", "request", "accepted", 3),
				lifecycleRow("i", "request", "terminal_error", 4, { response, responseDigest }),
			]
				.map(row => `${JSON.stringify(row)}\n`)
				.join(""),
		);

		const ledger = await new LifecycleLedger(dir).open();
		expect(await ledger.begin("i", "request")).toMatchObject({ kind: "terminal_uncertain" });
		expect(ledger.get("i")?.response).toEqual(response);
		const quarantined = await fs.readFile(`${ledgerPath}.corrupt`, "utf8");
		expect(quarantined).toContain('"state":"accepted"');
		expect(quarantined).toContain('"state":"terminal_error"');
	});

	it("accepts repeated and interleaved durable effect markers before a terminal entry", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-history-"));
		const ledgerPath = path.join(dir, "sdk", "lifecycle-ledger.jsonl");
		const response = { sessionId: "s" };
		await fs.mkdir(path.dirname(ledgerPath), { recursive: true });
		await fs.writeFile(
			ledgerPath,
			[
				lifecycleRow("i", "request", "accepted", 1),
				lifecycleRow("i", "request", "accepted", 2),
				lifecycleRow("i", "request", "effect_started", 3),
				lifecycleRow("i", "request", "awaiting_ready", 4),
				lifecycleRow("i", "request", "effect_started", 5),
				lifecycleRow("i", "request", "awaiting_ready", 6),
				lifecycleRow("i", "request", "terminal_ok", 7, {
					response,
					responseDigest: createHash("sha256").update(JSON.stringify(response)).digest("hex"),
				}),
			]
				.map(row => `${JSON.stringify(row)}\n`)
				.join(""),
		);

		const ledger = await new LifecycleLedger(dir).open();
		expect(await ledger.begin("i", "request")).toMatchObject({ kind: "replay", entry: { response } });
		expect(await fs.stat(`${ledgerPath}.corrupt`).catch(() => undefined)).toBeUndefined();
	});

	it("quarantines standalone cleanup authority without appending lifecycle authority", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-unanchored-cleanup-"));
		const ledgerPath = path.join(dir, "sdk", "lifecycle-ledger.jsonl");
		await fs.mkdir(path.dirname(ledgerPath), { recursive: true });
		const cleanupOnly = lifecycleRow("cleanup", "request", "effect_started", 1, {
			response: { ok: false, error: { code: "cleanup_pending", cleanup: { target: "outside" } } },
		});
		const terminalOnly = lifecycleRow("terminal", "request", "terminal_ok", 2, {
			response: { sessionId: "untrusted" },
			responseDigest: createHash("sha256").update('{"sessionId":"untrusted"}').digest("hex"),
		});
		const source = [cleanupOnly, terminalOnly].map(row => `${JSON.stringify(row)}\n`).join("");
		await fs.writeFile(ledgerPath, source);

		const ledger = await new LifecycleLedger(dir).open();
		expect(await ledger.begin("cleanup", "request")).toMatchObject({ kind: "terminal_uncertain" });
		expect(await ledger.begin("terminal", "request")).toMatchObject({ kind: "terminal_uncertain" });
		// Quarantined standalone cleanup authority fails history continuation, so both
		// identities read back as rejected rather than absent. That is the distinction
		// this change exists to keep: the fence stays raised for a damaged ledger.
		await expect(new LifecycleLedger(dir).readTerminal("cleanup", "request")).resolves.toEqual({
			kind: "rejected",
			reason: "row-not-attributable",
		});
		await expect(new LifecycleLedger(dir).readTerminal("terminal", "request")).resolves.toEqual({
			kind: "rejected",
			reason: "row-not-attributable",
		});
		expect(await fs.readFile(ledgerPath, "utf8")).toBe(source);
		expect(await fs.readFile(`${ledgerPath}.corrupt`, "utf8")).toContain('"effect_started"');
	});

	it("rejects ledger and corrupt-sidecar symlink swaps without modifying their targets", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-symlink-write-"));
		const sdkDir = path.join(dir, "sdk");
		const ledgerPath = path.join(sdkDir, "lifecycle-ledger.jsonl");
		const outside = path.join(dir, "outside");
		await new LifecycleLedger(dir).open();
		await fs.writeFile(outside, "outside-ledger");
		await fs.symlink(outside, ledgerPath);
		await expect(new LifecycleLedger(dir).begin("swap", "request")).rejects.toThrow();
		expect(await fs.readFile(outside, "utf8")).toBe("outside-ledger");

		await fs.unlink(ledgerPath);
		await fs.writeFile(ledgerPath, "not json\n");
		const corruptOutside = path.join(dir, "outside-corrupt");
		await fs.writeFile(corruptOutside, "outside-corrupt");
		await fs.symlink(corruptOutside, `${ledgerPath}.corrupt`);
		await expect(new LifecycleLedger(dir).open()).rejects.toThrow();
		expect(await fs.readFile(corruptOutside, "utf8")).toBe("outside-corrupt");
	});
});

describe("SDK lifecycle ledger bounded writer", () => {
	it("compacts before a writer-generated row threshold and reopens the terminal authority", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-compact-"));
		const ledger = await new LifecycleLedger(dir, { maxRows: 2 }).open();
		await ledger.begin("i", "request");
		await ledger.transition("i", "effect_started");
		const response = { sessionId: "survives-compaction" };
		await ledger.transition("i", "terminal_ok", { response });

		const resumed = await new LifecycleLedger(dir, { maxRows: 2 }).open();
		expect(await resumed.begin("i", "request")).toMatchObject({ kind: "replay", entry: { response } });
		const rows = (await fs.readFile(path.join(dir, "sdk", "lifecycle-ledger.jsonl"), "utf8"))
			.trimEnd()
			.split("\n")
			.map(line => JSON.parse(line));
		expect(rows).toHaveLength(2);
		expect(rows.at(-1)).toMatchObject({ state: "terminal_ok", response });
		expect(rows.at(0)).toMatchObject({ identity: "i", requestHash: "request", state: "accepted" });
	});

	it("compacts an accepted anchor with its latest nonterminal authority", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-compact-effect-"));
		const ledgerPath = path.join(dir, "sdk", "lifecycle-ledger.jsonl");
		const ledger = await new LifecycleLedger(dir, { maxRows: 3 }).open();
		await ledger.begin("first", "request");
		await ledger.transition("first", "accepted");
		await ledger.transition("first", "effect_started");
		await ledger.begin("second", "request");

		const rows = (await fs.readFile(ledgerPath, "utf8"))
			.trimEnd()
			.split("\n")
			.map(line => JSON.parse(line));
		expect(rows).toMatchObject([
			{ identity: "first", requestHash: "request", state: "accepted" },
			{ identity: "first", requestHash: "request", state: "effect_started" },
			{ identity: "second", requestHash: "request", state: "accepted" },
		]);
		expect((await new LifecycleLedger(dir, { maxRows: 3 }).open()).get("first")?.state).toBe("terminal_uncertain");
	});

	it("rejects before writing when compaction cannot make room for the next identity transition", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-compact-full-"));
		const ledgerPath = path.join(dir, "sdk", "lifecycle-ledger.jsonl");
		const ledger = await new LifecycleLedger(dir, { maxRows: 2 }).open();
		await ledger.begin("first", "a");
		await ledger.begin("second", "b");
		const before = await fs.readFile(ledgerPath, "utf8");

		await expect(ledger.transition("first", "terminal_ok", { response: { sessionId: "first" } })).rejects.toThrow(
			"Lifecycle ledger compaction exceeds configured bounds.",
		);
		expect(await fs.readFile(ledgerPath, "utf8")).toBe(before);
	});

	it("leaves the prior ledger authoritative when a torn compaction temporary file exists", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-compact-temp-"));
		const ledger = await new LifecycleLedger(dir).open();
		await ledger.begin("i", "request");
		await ledger.transition("i", "terminal_ok", { response: { sessionId: "stable" } });
		const sdkDir = path.join(dir, "sdk");
		await fs.writeFile(path.join(sdkDir, ".lifecycle-ledger.crash.tmp"), "{torn");

		const resumed = await new LifecycleLedger(dir).open();
		expect(await resumed.begin("i", "request")).toMatchObject({
			kind: "replay",
			entry: { response: { sessionId: "stable" } },
		});
	});
});

it("serializes concurrent distinct-identity compactions and reopens both terminal responses", async () => {
	const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-compact-fifo-"));
	const ledger = await new LifecycleLedger(dir, { maxRows: 4 }).open();
	await Promise.all([ledger.begin("first", "first-request"), ledger.begin("second", "second-request")]);
	await Promise.all([ledger.transition("first", "effect_started"), ledger.transition("second", "effect_started")]);
	await Promise.all([
		ledger.transition("first", "terminal_ok", { response: { sessionId: "first" } }),
		ledger.transition("second", "terminal_ok", { response: { sessionId: "second" } }),
	]);

	const reopened = await new LifecycleLedger(dir, { maxRows: 4 }).open();
	expect(await reopened.begin("first", "first-request")).toMatchObject({
		kind: "replay",
		entry: { response: { sessionId: "first" } },
	});
	expect(await reopened.begin("second", "second-request")).toMatchObject({
		kind: "replay",
		entry: { response: { sessionId: "second" } },
	});
});
it("quarantines terminal-uncertain replay rows with corrupt response or durable-effect digests", async () => {
	const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-uncertain-digest-"));
	const ledger = await new LifecycleLedger(dir).open();
	const response = { ok: false, error: { code: "terminal_uncertain" } };
	await ledger.begin("response", "request-response");
	await ledger.transition("response", "terminal_uncertain", { response, responseDigest: "corrupt" });
	await ledger.begin("effects", "request-effects");
	await ledger.transition("effects", "terminal_uncertain", {
		response,
		responseDigest: createHash("sha256").update(JSON.stringify(response)).digest("hex"),
		durableEffects: {
			worktree: { cwdDigest: "worktree", created: true, reused: false, createdBranch: true },
			digest: "corrupt",
		},
	});

	const reopened = await new LifecycleLedger(dir).open();
	expect((await reopened.begin("response", "request-response")).kind).toBe("terminal_uncertain");
	expect((await reopened.begin("effects", "request-effects")).kind).toBe("terminal_uncertain");
	expect(await fs.readFile(path.join(dir, "sdk", "lifecycle-ledger.jsonl.corrupt"), "utf8")).toContain("corrupt");
});

describe("SDK lifecycle reconciliation lookup (broker.lookup_lifecycle)", () => {
	it("replays the original terminal_ok BrokerResponse instead of a lookup envelope", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-lookup-ok-"));
		const ledger = await new LifecycleLedger(dir).open();
		const originalResponse = { ok: true, result: { sessionId: "session-123" } };
		await ledger.begin("id-1", "hash-1", {
			operationKey: "session.create\0key-1",
			fingerprint: lifecycleFingerprint("session.create", {}),
		});
		await ledger.transition("id-1", "terminal_ok", { response: originalResponse });

		const entry = ledger.get("id-1");
		expect(entry).toBeDefined();
		expect(entry?.state).toBe("terminal_ok");
		// The broker returns entry.response (the original BrokerResponse) on terminal_ok,
		// NOT a lookup-shaped {ok:true, result:{operation,state,...}} envelope.
		expect(entry?.response).toEqual(originalResponse);
	});

	it("replays the original terminal_error BrokerResponse instead of a lookup envelope", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-lookup-err-"));
		const ledger = await new LifecycleLedger(dir).open();
		const errorResponse = { ok: false, error: { code: "workspace_deleted", message: "nope" } };
		await ledger.begin("id-2", "hash-2", {
			operationKey: "session.close\0key-2",
			fingerprint: lifecycleFingerprint("session.close", {}),
		});
		await ledger.transition("id-2", "terminal_error", { response: errorResponse });

		const entry = ledger.get("id-2");
		expect(entry?.state).toBe("terminal_error");
		expect(entry?.response).toEqual(errorResponse);
	});

	it("returns terminal_uncertain as a BrokerResponse error, not as a lookup envelope", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-lookup-uncertain-"));
		const ledger = await new LifecycleLedger(dir).open();
		await ledger.begin("id-3", "hash-3", {
			operationKey: "session.create\0key-3",
			fingerprint: lifecycleFingerprint("session.create", {}),
		});
		await ledger.transition("id-3", "terminal_uncertain");

		const entry = ledger.get("id-3");
		expect(entry?.state).toBe("terminal_uncertain");
		// The broker endpoint returns {ok:false, error:{code:"terminal_uncertain"}} for
		// terminal_uncertain state — callers throw this rather than silently returning it.
		expect(entry?.response).toBeUndefined();
	});
});

describe("SDK lifecycle legacy identity retirement", () => {
	it("retires a legacy identity after migration so unrelated requests are not globally blocked", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-legacy-retire-"));
		const ledger = await new LifecycleLedger(dir).open();
		// Simulate a pre-index legacy row (no operationKey/fingerprint metadata).
		await ledger.begin("legacy-target-a", "request-a");
		expect(ledger.hasLegacyIdentity()).toBe(true);

		// Migrate the legacy identity to the new operation/key-based identity.
		const migrated = await ledger.migrateIdentity("legacy-target-a", "new-identity-a", {
			operationKey: "session.create\0caller-key-a",
			fingerprint: lifecycleFingerprint("session.create", {}),
		});
		expect(migrated).toBeDefined();
		expect(migrated?.identity).toBe("new-identity-a");
		expect(migrated?.operationKey).toBe("session.create\0caller-key-a");

		// The legacy identity is now retired: hasLegacyIdentity() must be false.
		expect(ledger.hasLegacyIdentity()).toBe(false);

		// A fresh unrelated lifecycle request (different operation, different key)
		// must succeed without hitting idempotency_conflict from the legacy row.
		const fresh = await ledger.begin("new-identity-b", "request-b", {
			operationKey: "session.close\0caller-key-b",
			fingerprint: lifecycleFingerprint("session.close", {}),
		});
		expect(fresh.kind).toBe("new");
	});

	it("is idempotent: repeated migration of the same legacy identity is a no-op", async () => {
		const dir = await fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-ledger-legacy-idempotent-"));
		const ledger = await new LifecycleLedger(dir).open();
		await ledger.begin("legacy-target-c", "request-c");

		const metadata = {
			operationKey: "session.create\0caller-key-c",
			fingerprint: lifecycleFingerprint("session.create", {}),
		};
		const first = await ledger.migrateIdentity("legacy-target-c", "new-identity-c", metadata);
		expect(first).toBeDefined();

		// Second migration: the new identity already exists, so it returns early.
		const second = await ledger.migrateIdentity("legacy-target-c", "new-identity-c", metadata);
		expect(second?.identity).toBe("new-identity-c");
		expect(ledger.hasLegacyIdentity()).toBe(false);
	});
});
