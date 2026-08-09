import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { SessionIndex } from "../src/sdk/broker/session-index";
import { type SessionAttachment, SessionRouter, type SessionRouterClient, SessionRouterError } from "../src/sdk/router";

const tempDirs: string[] = [];

afterEach(() => {
	for (const directory of tempDirs.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

async function routerFixture() {
	const repo = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-router-authority-"));
	tempDirs.push(repo);
	const agentDir = path.join(repo, ".gjc", "agent");
	const stateRoot = path.join(repo, ".gjc", "state");
	const sessionId = "router-session";
	const endpointDir = path.join(stateRoot, "sdk");
	const endpointFile = path.join(endpointDir, `${sessionId}.json`);
	fs.mkdirSync(endpointDir, { recursive: true });
	fs.writeFileSync(endpointFile, JSON.stringify({ url: "ws://router.test", token: "secret", pid: 42 }));
	const endpointMtimeMs = fs.statSync(endpointFile).mtimeMs;

	const authority = { generation: 1, terminalUncertain: false, warnings: [] as string[] };
	const index = {
		open: async () => {},
		refresh: async () => {},
		listSessions: () => ({
			indexSeq: authority.generation,
			sessions: [
				{
					sessionId,
					locator: { repo, stateRoot },
					endpointGeneration: authority.generation,
					pid: 42,
					endpointMtimeMs,
					live: true,
					indexSeq: authority.generation,
					terminalUncertain: authority.terminalUncertain || undefined,
				},
			],
			warnings: authority.warnings,
		}),
	} as unknown as SessionIndex;
	const clients: Array<{
		sent: Record<string, unknown>[];
		requests: Record<string, unknown>[];
		client: SessionRouterClient;
	}> = [];
	const attachments: SessionAttachment[] = [];
	const router = new SessionRouter({
		agentDir,
		deps: {
			createIndex: () => index,
			createClient: async () => {
				const sent: Record<string, unknown>[] = [];
				const requests: Record<string, unknown>[] = [];
				const client: SessionRouterClient = {
					onFrame: () => () => {},
					request: async operation => {
						requests.push(operation);
						return { events: [] };
					},
					close: async () => {},
					send: frame => sent.push(frame),
				};
				clients.push({ sent, requests, client });
				return client;
			},
			onAttachment: attachment => {
				attachments.push(attachment);
			},
			setInterval: (() => 0) as unknown as typeof setInterval,
			clearInterval: (() => {}) as unknown as typeof clearInterval,
		},
	});
	await router.start();
	return { authority, attachments, clients, router, sessionId };
}

describe("SessionRouter dispatch authority", () => {
	test("revokes an old attachment at send time before the periodic reconciliation tick", async () => {
		const fixture = await routerFixture();
		const firstAttachment = fixture.attachments[0]!;
		expect(firstAttachment.generation).toBe(1);
		fixture.authority.generation = 2;

		await expect(firstAttachment.send({ type: "reply", id: "ask", answer: "yes" })).rejects.toBeInstanceOf(
			SessionRouterError,
		);
		expect(fixture.clients).toHaveLength(2);
		expect(fixture.clients[0]?.sent).toEqual([]);
		expect(fixture.router.attachment(fixture.sessionId)?.generation).toBe(2);
		await fixture.router.stop();
	});

	test("revokes attachments when Broker terminal authority is uncertain", async () => {
		const fixture = await routerFixture();
		const attachment = fixture.attachments[0]!;
		fixture.authority.terminalUncertain = true;

		await expect(attachment.send({ type: "reply", id: "ask", answer: "yes" })).rejects.toBeInstanceOf(
			SessionRouterError,
		);
		expect(fixture.router.attachment(fixture.sessionId)).toBeNull();
		expect(fixture.clients[0]?.sent).toEqual([]);
		await fixture.router.stop();
	});

	test("detaches and rejects requests while the Broker index has corruption warnings", async () => {
		const fixture = await routerFixture();
		fixture.authority.warnings = ["corrupt index suffix"];

		await expect(
			fixture.router.request(
				fixture.sessionId,
				{
					type: "control_request",
					id: "state",
					operation: "session.state",
					input: {},
				},
				1,
			),
		).rejects.toBeInstanceOf(SessionRouterError);
		expect(fixture.router.attachment(fixture.sessionId)).toBeNull();
		expect(fixture.clients[0]?.requests).toEqual([{ type: "event_replay", sinceSeq: 0, sinceGeneration: 1 }]);
		await fixture.router.stop();
	});
});
