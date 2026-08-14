import { expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

const root = path.resolve(import.meta.dir, "..");
const bus = fs.readFileSync(path.join(root, "src/sdk/bus/index.ts"), "utf8");
const daemon = fs.readFileSync(path.join(root, "src/sdk/bus/telegram-daemon.ts"), "utf8");

test("production inbound gates emit explicit drop acknowledgements before returning", () => {
	const fencedStart = bus.indexOf('admission.outcome === "drop" && admission.reason === "inbound_fenced"');
	const suspendedStart = bus.indexOf('if (admission.outcome === "drop")', fencedStart + 1);
	expect(fencedStart).toBeGreaterThan(0);
	expect(bus.slice(fencedStart, suspendedStart)).toContain('sendInboundAck(inbound.connectionId, inbound, "dropped"');
	expect(bus.slice(fencedStart, suspendedStart)).toContain("return;");
	const suspendedGate = bus.slice(suspendedStart, suspendedStart + 1_600);
	expect(suspendedGate).toContain('sendInboundAck(authenticatedInbound.connectionId, authenticatedInbound, "dropped"');
	expect(suspendedGate).toContain("return;");
});

test("production daemon queues only on accepted and retracts rejected or dropped", () => {
	expect(daemon).toContain('if (state === "accepted") return "queued"');
	expect(daemon).toContain('if (state === "rejected" || state === "dropped") return "retract"');
	expect(daemon).not.toContain("setReaction(inbound.messageId, QUEUED_REACTION");
	expect(daemon).toMatch(/action === "retract"[\s\S]{0,300}this\.setReaction\(target\.messageId, ""/);
});
