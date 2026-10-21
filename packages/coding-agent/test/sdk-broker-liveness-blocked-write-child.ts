/**
 * Child for the blocked-write liveness regression. Spawned as a plain bun
 * process so the watchdog's SIGKILL cannot take down the test runner.
 *
 * Usage: bun sdk-broker-liveness-blocked-write-child.ts <agentDir> <graceMs> <blockMs>
 */
import * as fs from "node:fs";
import { Broker, setHeartbeatMainThreadBlockForTest, setLivenessGraceForTest } from "../src/sdk/broker/broker";

const agentDir = process.argv[2];
const graceMs = Number(process.argv[3]);
const blockMs = Number(process.argv[4]);
if (!agentDir || !Number.isFinite(graceMs) || graceMs <= 0 || !Number.isFinite(blockMs) || blockMs <= 0) {
	fs.writeSync(2, "usage: publication-liveness-blocked-write-child <agentDir> <graceMs> <blockMs>\n");
	process.exit(2);
}

const broker = new Broker({ agentDir, heartbeatTtlMs: 300 });
try {
	await broker.start();
} catch (error) {
	fs.writeSync(2, `start failed: ${error instanceof Error ? error.message : String(error)}\n`);
	process.exit(2);
}
setLivenessGraceForTest(broker, graceMs);
setHeartbeatMainThreadBlockForTest(broker, blockMs);
fs.writeSync(1, "hooks-installed\n");
await broker.completion;
fs.writeSync(1, "graceful\n");
process.exit(0);
