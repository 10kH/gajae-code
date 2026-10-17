import { afterEach, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Broker, setAbandonedGraceForTest } from "../src/sdk/broker/broker";
import { readBrokerDiscovery } from "../src/sdk/broker/discovery";
import { SessionIndex } from "../src/sdk/broker/session-index";
import { SdkClient } from "../src/sdk/client/client";

// A short TTL drives the maintenance cadence at `ttl/3`, so an abandonment grace
// expressed in cadences expires in tens of milliseconds.
const HEARTBEAT_TTL_MS = 300;
const CADENCE_MS = HEARTBEAT_TTL_MS / 3;
/** A pid no platform running this suite can have handed out. */
const ABSENT_PID = 999_999;

const brokers: Broker[] = [];
const roots: string[] = [];

async function startBroker(graceMs: number): Promise<Broker> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-abandoned-"));
	roots.push(root);
	const broker = new Broker({ agentDir: path.join(root, "agent"), heartbeatTtlMs: HEARTBEAT_TTL_MS });
	brokers.push(broker);
	setAbandonedGraceForTest(broker, graceMs);
	await broker.start();
	return broker;
}

/**
 * Registers a host exactly as a session host does, so the index derives liveness
 * from the row itself: a live pid plus the incarnation that pid currently carries.
 */
async function registerHost(broker: Broker, sessionId: string, pid: number, hostIncarnation?: string): Promise<void> {
	const agentDir = broker.settings.agentDir;
	await new SessionIndex(agentDir).append({
		type: "host_registered",
		sessionId,
		locator: { cwd: agentDir, worktreeRoot: null, stateRoot: path.join(agentDir, "state", sessionId) },
		endpointGeneration: 1,
		pid,
		...(hostIncarnation === undefined ? {} : { hostIncarnation }),
	});
	await broker.index.refresh();
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
		setAbandonedGraceForTest(broker, undefined);
		await broker.stop().catch(() => {});
	}
	brokers.length = 0;
	for (const root of roots) await fs.rm(root, { recursive: true, force: true });
	roots.length = 0;
});

test("a broker nobody is left to use exits on its own and drops its registration", async () => {
	const broker = await startBroker(CADENCE_MS * 4);
	if (!(await completedWithin(broker, 4_000))) throw new Error("Broker did not reap itself as abandoned.");
	expect(broker.terminalExit).toMatchObject({ mode: "owned-root", reason: "abandoned" });
	// The owned-root stop removes the publication it still owns, so the agent
	// directory is left without a registration pointing at an exited broker.
	expect(await readBrokerDiscovery(broker.settings.agentDir)).toBeNull();
}, 20_000);

test("a live session host keeps the broker running", async () => {
	const broker = await startBroker(CADENCE_MS * 2);
	await registerHost(broker, "held-open", process.pid);
	if (await completedWithin(broker, 1_500)) throw new Error("Broker abandoned a live session host.");
	expect(broker.terminalExit).toBeNull();
}, 20_000);

test("a host that died without closing lets the broker exit", async () => {
	const broker = await startBroker(CADENCE_MS * 3);
	// The registration outlives its process exactly as a killed client leaves it.
	await registerHost(broker, "killed-client", ABSENT_PID);
	if (!(await completedWithin(broker, 4_000))) throw new Error("Broker did not reap itself as abandoned.");
	expect(broker.terminalExit).toMatchObject({ reason: "abandoned" });
}, 20_000);

test("a connected client keeps the broker running, and losing it lets the broker exit", async () => {
	const broker = await startBroker(CADENCE_MS * 3);
	const discovery = broker.discovery;
	if (!discovery) throw new Error("Broker published no discovery record.");
	const client = await SdkClient.connect(discovery.url, discovery.token);
	try {
		if (await completedWithin(broker, 1_500)) throw new Error("Broker abandoned a connected client.");
		expect(broker.terminalExit).toBeNull();
	} finally {
		await client.close().catch(() => undefined);
	}
	if (!(await completedWithin(broker, 4_000))) throw new Error("Broker did not reap itself as abandoned.");
	expect(broker.terminalExit).toMatchObject({ reason: "abandoned" });
}, 30_000);

test("a restarted broker gets a full grace instead of the clock its last generation stopped with", async () => {
	const graceMs = CADENCE_MS * 8;
	const broker = await startBroker(graceMs);
	// One maintenance tick arms the clock on an empty broker, and the stop lands
	// well before that armed clock would have expired.
	await Bun.sleep(CADENCE_MS * 2);
	await broker.stop();
	// Wait past the grace the first generation stopped with: an instance that
	// carried its clock across the restart would complete on its first tick here.
	await Bun.sleep(graceMs);
	await broker.start();
	if (await completedWithin(broker, CADENCE_MS * 4))
		throw new Error("Restarted broker inherited the abandonment clock it stopped with.");
	// The new generation still owns a clock of its own: it reaps itself once its
	// own grace runs out, rather than never arming again.
	if (!(await completedWithin(broker, graceMs + CADENCE_MS * 10)))
		throw new Error("Restarted broker never armed its own abandonment clock.");
	expect(broker.terminalExit).toMatchObject({ reason: "abandoned" });
}, 30_000);

test("a host whose pid was reused lets the broker exit", async () => {
	const broker = await startBroker(CADENCE_MS * 3);
	await registerHost(broker, "held-then-reused", process.pid);
	if (await completedWithin(broker, 1_500)) throw new Error("Broker abandoned a live session host.");
	// The same session re-registers from a pid that now belongs to a different
	// process: the row survives, its incarnation no longer matches, and liveness
	// ends without anyone telling the broker to stop.
	await registerHost(broker, "held-then-reused", 1, "darwin:1:1");
	if (!(await completedWithin(broker, 4_000))) throw new Error("Broker did not reap itself as abandoned.");
	expect(broker.terminalExit).toMatchObject({ reason: "abandoned" });
}, 20_000);
