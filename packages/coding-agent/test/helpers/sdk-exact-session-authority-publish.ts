import { SessionIndex } from "../../src/sdk/broker/session-index";

const raw = process.env.GJC_EXACT_SESSION_AUTHORITY;
if (!raw) throw new Error("GJC_EXACT_SESSION_AUTHORITY is required");
const event = JSON.parse(raw) as {
	agentDir: string;
	sessionId: string;
	cwd: string;
	stateRoot: string;
	endpointGeneration: number;
	pid: number;
	endpointMtimeMs: number;
};
const index = await new SessionIndex(event.agentDir).open();
await index.append({
	type: "host_registered",
	sessionId: event.sessionId,
	locator: { repo: event.cwd, stateRoot: event.stateRoot },
	endpointGeneration: event.endpointGeneration,
	pid: event.pid,
	endpointMtimeMs: event.endpointMtimeMs,
});
