import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { CrashSignatureView, CrashStatePaths } from "../src/crash/index-store";
import {
	CRASH_UPSTREAM_DSN_ENV,
	type CrashRelayConfig,
	isRelayDue,
	relayCrashSignatures,
	resolveRelayDsn,
} from "../src/crash/upstream/relay";

const DSN = "https://abc123@o1.ingest.sentry.io/4511929997721600";
const FINGERPRINT = "a".repeat(32);

function config(overrides: Partial<CrashRelayConfig> = {}): CrashRelayConfig {
	return { upstream: "sentry", dsn: DSN, ...overrides };
}

function signature(overrides: Partial<CrashSignatureView> = {}): CrashSignatureView {
	return {
		fingerprint: FINGERPRINT,
		fpv: 1,
		errorName: "TypeError",
		messageClass: "cannot read properties of <redacted>",
		lifetimeCount: 3,
		retainedCount: 3,
		firstSeen: 1_700_000_000_000,
		lastSeen: 1_700_000_900_000,
		lastRecordId: "rec-1",
		...overrides,
	};
}

describe("resolveRelayDsn", () => {
	test("refuses while upstream is off, before any destination is considered", () => {
		const result = resolveRelayDsn(config({ upstream: "off" }), { [CRASH_UPSTREAM_DSN_ENV]: DSN });
		expect(result).toEqual({ ok: false, reason: "disabled" });
	});

	test("reports no-dsn when neither config nor environment supplies one", () => {
		expect(resolveRelayDsn(config({ dsn: "  " }), {})).toEqual({ ok: false, reason: "no-dsn" });
	});

	test("falls back to the environment only when config is empty", () => {
		const result = resolveRelayDsn(config({ dsn: "" }), { [CRASH_UPSTREAM_DSN_ENV]: DSN });
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.dsn.projectId).toBe("4511929997721600");
	});

	test("configured dsn wins over a machine-wide environment export", () => {
		const result = resolveRelayDsn(config(), {
			[CRASH_UPSTREAM_DSN_ENV]: "https://zzz@other.example.com/999",
		});
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.dsn.projectId).toBe("4511929997721600");
	});

	test("rejects a malformed dsn rather than treating it as unset", () => {
		expect(resolveRelayDsn(config({ dsn: "ftp://k@h/1" }), {})).toEqual({ ok: false, reason: "invalid-dsn" });
	});
});

describe("isRelayDue", () => {
	test("a never-relayed signature is due", () => {
		expect(isRelayDue(signature())).toBe(true);
	});

	test("a signature relayed after its last occurrence is not due", () => {
		expect(isRelayDue(signature({ relayedAt: 1_700_000_900_001 }))).toBe(false);
	});

	test("new occurrences since the last relay make it due again", () => {
		expect(isRelayDue(signature({ relayedAt: 1_700_000_800_000 }))).toBe(true);
	});
});

describe("relayCrashSignatures", () => {
	let dir = "";
	let paths: CrashStatePaths;

	beforeEach(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-relay-"));
		paths = {
			index: path.join(dir, "gjc-crash-index.json"),
			events: path.join(dir, "gjc-crash-events.jsonl"),
			crashLog: path.join(dir, "gjc-crash.log"),
		};
	});

	afterEach(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	test("performs no network call and no state read while upstream is off", async () => {
		let called = 0;
		const outcome = await relayCrashSignatures({
			config: config({ upstream: "off" }),
			paths,
			env: {},
			fetchImpl: async () => {
				called++;
				return new Response("", { status: 200 });
			},
		});
		expect(outcome).toEqual({ status: "skipped", reason: "disabled" });
		expect(called).toBe(0);
		// The gate must precede compaction: no index file may have been created.
		expect(await Bun.file(paths.index).exists()).toBe(false);
	});

	test("does not reach the network when no dsn is configured", async () => {
		let called = 0;
		const outcome = await relayCrashSignatures({
			config: config({ dsn: "" }),
			paths,
			env: {},
			fetchImpl: async () => {
				called++;
				return new Response("", { status: 200 });
			},
		});
		expect(outcome).toEqual({ status: "skipped", reason: "no-dsn" });
		expect(called).toBe(0);
	});

	test("reports nothing-to-relay when there are no journaled signatures", async () => {
		const outcome = await relayCrashSignatures({
			config: config(),
			paths,
			env: {},
			fetchImpl: async () => new Response("", { status: 200 }),
		});
		expect(outcome).toEqual({ status: "skipped", reason: "nothing-to-relay" });
	});
});
