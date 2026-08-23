import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createCoordinatorMcpServer } from "../../src/coordinator-mcp/server";
import { writeBrokerDiscovery } from "../../src/sdk/broker/discovery";
import type { SdkClient } from "../../src/sdk/client/client";
import {
	coordinatorFixtureRoot,
	fixtureBrokerRows,
	writeDurableCoordinatorSession,
} from "../helpers/coordinator-session-fixture";

const tempDirs: string[] = [];

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

const REGISTERED_ID = "11111111-1111-4111-8111-111111111111";
const BROKER_ONLY_ID = "22222222-2222-4222-8222-222222222222";

/**
 * A coordinator whose broker reports two sessions under the allowed root. Only
 * one of them has a durable projection, which is the split real controllers
 * hit: the broker index is workspace-wide while projections are not.
 */
async function createServer(root: string, options: { registerFirst?: boolean } = {}) {
	const agentDir = path.join(root, "agent-global");
	const env: NodeJS.ProcessEnv = {
		GJC_COORDINATOR_MCP_WORKDIR_ROOTS: root,
		GJC_COORDINATOR_MCP_STATE_ROOT: path.join(root, ".gjc", "coordinator-state"),
		GJC_COORDINATOR_MCP_MUTATIONS: "sessions",
		GJC_COORDINATOR_MCP_PROFILE: "local",
		GJC_COORDINATOR_MCP_REPO: "repo",
	};
	await writeBrokerDiscovery(agentDir, {
		version: 1,
		protocolVersion: 3,
		packageGeneration: "test",
		ownerId: "test",
		pid: process.pid,
		host: "127.0.0.1",
		port: 1,
		url: "ws://sdk.example.test",
		token: "test-token",
		startedAt: Date.now(),
		heartbeatAt: Date.now(),
	});
	const brokerSessions = [fixtureBrokerRows(root, REGISTERED_ID).live, fixtureBrokerRows(root, BROKER_ONLY_ID).live];
	const server = createCoordinatorMcpServer({
		env,
		services: {
			getAgentDir: () => agentDir,
			connectBroker: async () =>
				({
					global: async (operation: string, input: Record<string, unknown>) => {
						if (operation === "session.list") return { ok: true, result: { sessions: brokerSessions } };
						return { ok: true, result: { sessionId: input.sessionId } };
					},
					close: async () => {},
				}) as unknown as SdkClient,
		},
	});
	if (options.registerFirst !== false)
		await writeDurableCoordinatorSession({ sessionId: REGISTERED_ID, cwd: root, env });
	return server;
}

describe("gjc_coordinator_list_sessions registration marker", () => {
	it("reports registered for projected sessions and unregistered for broker-only ones", async () => {
		const root = await coordinatorFixtureRoot(tempDirs);
		const server = await createServer(root);

		const listed = (await server.callTool("gjc_coordinator_list_sessions", {})) as {
			ok: boolean;
			sessions: Array<{ session_id?: string; registered?: boolean }>;
		};

		expect(listed.ok).toBe(true);
		const byId = new Map(listed.sessions.map(session => [session.session_id, session]));
		expect(byId.get(REGISTERED_ID)?.registered).toBe(true);
		expect(byId.get(BROKER_ONLY_ID)?.registered).toBe(false);
	});

	it("predicts not_found: session-scoped tools reject exactly the unregistered entries", async () => {
		const root = await coordinatorFixtureRoot(tempDirs);
		const server = await createServer(root);

		// The marker is only useful if it is the same condition other tools
		// enforce, so assert it against real tool behavior rather than against
		// the projection file it is derived from.
		for (const tool of ["gjc_coordinator_read_status", "gjc_coordinator_read_tail"]) {
			expect(await server.callTool(tool, { session_id: BROKER_ONLY_ID })).toMatchObject({
				ok: false,
				error: { code: "not_found" },
			});
		}
	});

	it("marks every session unregistered when no projection exists", async () => {
		const root = await coordinatorFixtureRoot(tempDirs);
		const server = await createServer(root, { registerFirst: false });

		const listed = (await server.callTool("gjc_coordinator_list_sessions", {})) as {
			sessions: Array<{ registered?: boolean }>;
		};

		expect(listed.sessions).toHaveLength(2);
		expect(listed.sessions.every(session => session.registered === false)).toBe(true);
	});

	it("advertises the registered contract in the tool description", async () => {
		const root = await coordinatorFixtureRoot(tempDirs);
		const server = await createServer(root);

		const response = (await server.handleJsonRpc({ jsonrpc: "2.0", id: 1, method: "tools/list" })) as {
			result?: { tools?: Array<{ name: string; description: string }> };
		};
		const listSessions = response.result?.tools?.find(tool => tool.name === "gjc_coordinator_list_sessions");

		expect(listSessions?.description).toContain("registered");
		expect(listSessions?.description).toContain("not_found");
	});
});
