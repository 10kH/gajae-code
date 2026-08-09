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

describe("SessionRouter dispatch authority", () => {
	test("revokes an old attachment at send time even before the periodic reconciliation tick", async () => {
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

		let generation = 1;
		const index = {
			open: async () => {},
			refresh: async () => {},
			listSessions: () => ({
				indexSeq: generation,
				sessions: [
					{
						sessionId,
						locator: { repo, stateRoot },
						endpointGeneration: generation,
						pid: 42,
						endpointMtimeMs,
						live: true,
						indexSeq: generation,
					},
				],
				warnings: [],
			}),
		} as unknown as SessionIndex;
		const clients: Array<{ sent: Record<string, unknown>[]; client: SessionRouterClient }> = [];
		let firstAttachment: SessionAttachment | undefined;
		const router = new SessionRouter({
			agentDir,
			deps: {
				createIndex: () => index,
				createClient: async () => {
					const sent: Record<string, unknown>[] = [];
					const client: SessionRouterClient = {
						onFrame: () => () => {},
						request: async () => ({ events: [] }),
						close: async () => {},
						send: frame => sent.push(frame),
					};
					clients.push({ sent, client });
					return client;
				},
				onAttachment: attachment => {
					firstAttachment ??= attachment;
				},
				setInterval: (() => 0) as unknown as typeof setInterval,
				clearInterval: (() => {}) as unknown as typeof clearInterval,
			},
		});

		await router.start();
		expect(firstAttachment?.generation).toBe(1);
		generation = 2;

		await expect(firstAttachment!.send({ type: "reply", id: "ask", answer: "yes" })).rejects.toBeInstanceOf(
			SessionRouterError,
		);
		expect(clients).toHaveLength(2);
		expect(clients[0]?.sent).toEqual([]);
		expect(router.attachment(sessionId)?.generation).toBe(2);
		await router.stop();
	});
});
