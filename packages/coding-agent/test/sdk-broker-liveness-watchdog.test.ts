import { afterEach, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Broker, setHeartbeatStallForTest, setLivenessGraceForTest } from "../src/sdk/broker/broker";

// A short TTL drives the publication watchdog at `ttl/3`, so a liveness deadline
// expressed in cadences expires in tens of milliseconds.
const HEARTBEAT_TTL_MS = 300;
const WATCHDOG_CADENCE_MS = HEARTBEAT_TTL_MS / 3;

const brokers: Broker[] = [];
const roots: string[] = [];

async function startBroker(): Promise<Broker> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-liveness-"));
	roots.push(root);
	const broker = new Broker({ agentDir: path.join(root, "agent"), heartbeatTtlMs: HEARTBEAT_TTL_MS });
	brokers.push(broker);
	await broker.start();
	return broker;
}

/** Resolves to true when the broker self-terminated inside the window. */
function completedWithin(broker: Broker, ms: number): Promise<boolean> {
	return Promise.race([
		broker.completion.then(
			() => true,
			() => true,
		),
		Bun.sleep(ms).then(() => false),
	]);
}

afterEach(async () => {
	for (const broker of brokers) {
		setHeartbeatStallForTest(broker, false);
		setLivenessGraceForTest(broker, undefined);
		await broker.stop().catch(() => {});
	}
	brokers.length = 0;
	for (const root of roots) await fs.rm(root, { recursive: true, force: true });
	roots.length = 0;
});

test("a broker whose heartbeat write never settles self-terminates", async () => {
	const broker = await startBroker();
	setLivenessGraceForTest(broker, WATCHDOG_CADENCE_MS * 4);
	// The observation keeps reporting "owned" and nothing throws, so no fence is
	// ever armed. This is the state that survived 13.6 hours in #4704: alive,
	// holding its port and its lock, while peers read a heartbeat long past its TTL
	// and refused to reclaim a lock whose owner pid was still alive.
	setHeartbeatStallForTest(broker, true);

	expect(await completedWithin(broker, WATCHDOG_CADENCE_MS * 40)).toBe(true);
});

test("a broker that keeps publishing is never terminated by the liveness deadline", async () => {
	const broker = await startBroker();
	// Far shorter than production and still several cadences wide, so a healthy
	// broker republishes many times inside the window it is watched for.
	setLivenessGraceForTest(broker, WATCHDOG_CADENCE_MS * 8);

	expect(await completedWithin(broker, WATCHDOG_CADENCE_MS * 24)).toBe(false);
});

test("a heartbeat that resumes before the deadline clears the accrued stall", async () => {
	const broker = await startBroker();
	setLivenessGraceForTest(broker, WATCHDOG_CADENCE_MS * 12);
	setHeartbeatStallForTest(broker, true);
	await Bun.sleep(WATCHDOG_CADENCE_MS * 6);

	// Recovered IO releases the stalled tick, which publishes and resets the clock,
	// so the broker outlives the point where the uninterrupted stall would have
	// expired. Termination must follow lost liveness, not a transient slow write.
	setHeartbeatStallForTest(broker, false);

	expect(await completedWithin(broker, WATCHDOG_CADENCE_MS * 10)).toBe(false);
});
