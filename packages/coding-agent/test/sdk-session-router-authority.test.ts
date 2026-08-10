import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { logger } from "@gajae-code/utils";

import type { SessionIndex } from "../src/sdk/broker/session-index";
import {
	type SessionAttachment,
	SessionRouter,
	type SessionRouterClient,
	SessionRouterError,
	type SessionRouterFrame,
} from "../src/sdk/router";

const tempDirs: string[] = [];

afterEach(() => {
	for (const directory of tempDirs.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

async function routerFixture(
	options: {
		onAttachment?: (attachment: SessionAttachment) => void | Promise<void>;
		onAttachmentReady?: (attachment: SessionAttachment) => void | Promise<void>;
		onSessionRemoved?: (attachment: SessionAttachment) => void | Promise<void>;
		onFrame?: (attachment: SessionAttachment, frame: SessionRouterFrame) => void | Promise<void>;
		start?: boolean;
	} = {},
) {
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
		emit: (frame: Record<string, unknown>) => void;
	}> = [];
	const attachments: SessionAttachment[] = [];
	const router = new SessionRouter({
		agentDir,
		deps: {
			createIndex: () => index,
			createClient: async () => {
				const sent: Record<string, unknown>[] = [];
				const requests: Record<string, unknown>[] = [];
				let handler: ((frame: Record<string, unknown>) => void) | undefined;
				const client: SessionRouterClient = {
					onFrame: next => {
						handler = next;
						return () => {
							if (handler === next) handler = undefined;
						};
					},
					request: async operation => {
						requests.push(operation);
						return { events: [] };
					},
					close: async () => {},
					send: frame => sent.push(frame),
				};
				clients.push({ sent, requests, client, emit: frame => handler?.(frame) });
				return client;
			},
			onAttachment: attachment => {
				if (options.onAttachment) return options.onAttachment(attachment);
				attachments.push(attachment);
			},
			onAttachmentReady: options.onAttachmentReady,
			onFrame: options.onFrame,
			onSessionRemoved: options.onSessionRemoved,
			setInterval: (() => 0) as unknown as typeof setInterval,
			clearInterval: (() => {}) as unknown as typeof clearInterval,
		},
	});
	if (options.start !== false) await router.start();
	return {
		authority,
		attachments,
		clients,
		endpointFile,
		router,
		sessionId,
	};
}

describe("SessionRouter dispatch authority", () => {
	test("contains an unreachable indexed endpoint while attaching healthy sessions", async () => {
		const repo = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-router-reconcile-"));
		tempDirs.push(repo);
		const agentDir = path.join(repo, ".gjc", "agent");
		const stateRoot = path.join(repo, ".gjc", "state");
		const endpointDir = path.join(stateRoot, "sdk");
		fs.mkdirSync(endpointDir, { recursive: true });
		const indexed = [
			{
				sessionId: "router-unreachable",
				url: "ws://unreachable.test",
				token: "unreachable-secret",
			},
			{
				sessionId: "router-healthy",
				url: "ws://healthy.test",
				token: "healthy-secret",
			},
		] as const;
		const endpointMtimeMs = new Map<string, number>();
		for (const session of indexed) {
			const endpointFile = path.join(endpointDir, `${session.sessionId}.json`);
			fs.writeFileSync(endpointFile, `${JSON.stringify({ ...session, pid: 42 })}\n`);
			endpointMtimeMs.set(session.sessionId, fs.statSync(endpointFile).mtimeMs);
		}
		const index = {
			open: async () => {},
			refresh: async () => {},
			listSessions: () => ({
				indexSeq: 1,
				sessions: indexed.map(session => ({
					sessionId: session.sessionId,
					locator: { repo, stateRoot },
					endpointGeneration: 1,
					pid: 42,
					endpointMtimeMs: endpointMtimeMs.get(session.sessionId),
					live: true,
					indexSeq: 1,
				})),
				warnings: [],
			}),
		} as unknown as SessionIndex;
		const attachments: SessionAttachment[] = [];
		const warnings: string[] = [];
		const warnSpy = spyOn(logger, "warn").mockImplementation((message: string) => {
			warnings.push(message);
		});
		const router = new SessionRouter({
			agentDir,
			deps: {
				createIndex: () => index,
				createClient: async endpoint => {
					if (endpoint.url.includes("unreachable")) throw new Error(`connect failed with ${endpoint.token}`);
					return {
						onFrame: () => () => {},
						request: async () => ({ events: [] }),
						close: async () => {},
						send: () => {},
					};
				},
				onAttachment: attachment => {
					attachments.push(attachment);
				},
				setInterval: (() => 0) as unknown as typeof setInterval,
				clearInterval: (() => {}) as unknown as typeof clearInterval,
			},
		});
		try {
			await router.start();
			expect(router.isReady()).toBe(true);
			expect(attachments.map(attachment => attachment.sessionId)).toEqual(["router-healthy"]);
			expect(router.attachment("router-unreachable")).toBeNull();
			expect(router.attachment("router-healthy")).not.toBeNull();
			expect(warnings.some(message => message.includes("router-unreachable"))).toBe(true);
			expect(warnings.every(message => !message.includes("unreachable-secret"))).toBe(true);
		} finally {
			await router.stop();
			warnSpy.mockRestore();
		}
	});

	test("revokes attachment authority when provider publication rejects", async () => {
		let removed: SessionAttachment | undefined;
		const fixture = await routerFixture({
			onAttachment: () => {
				throw new Error("provider cleanup recovery failed");
			},
			onSessionRemoved: attachment => {
				removed = attachment;
			},
		});
		try {
			expect(fixture.router.attachment(fixture.sessionId)).toBeNull();
			expect(removed?.sessionId).toBe(fixture.sessionId);
			expect(removed?.isCurrent()).toBe(false);
		} finally {
			await fixture.router.stop();
		}
	});

	test("keeps a rejecting provider publication provisional", async () => {
		const entered = Promise.withResolvers<void>();
		const release = Promise.withResolvers<void>();
		const fixture = await routerFixture({
			start: false,
			onAttachment: async () => {
				entered.resolve();
				await release.promise;
				throw new Error("provider publication rejected");
			},
		});
		const starting = fixture.router.start();
		await entered.promise;
		expect(fixture.router.attachment(fixture.sessionId)).toBeNull();
		const request = fixture.router.request(fixture.sessionId, { type: "query_request" });
		await Bun.sleep(10);
		expect(fixture.clients[0]?.requests.filter(frame => frame.type === "query_request")).toEqual([]);
		release.resolve();
		await expect(request).rejects.toBeInstanceOf(SessionRouterError);
		await starting;
		expect(fixture.router.attachment(fixture.sessionId)).toBeNull();
		await fixture.router.stop();
	});

	test("holds live frames until provider publication succeeds", async () => {
		const entered = Promise.withResolvers<void>();
		const release = Promise.withResolvers<void>();
		const frames: SessionRouterFrame[] = [];
		const fixture = await routerFixture({
			start: false,
			onAttachment: async () => {
				entered.resolve();
				await release.promise;
			},
			onFrame: (_attachment, frame) => {
				frames.push(frame);
			},
		});
		const starting = fixture.router.start();
		await entered.promise;
		fixture.clients[0]?.emit({ type: "notification", sessionId: fixture.sessionId });
		await Bun.sleep(10);
		expect(frames).toEqual([]);
		release.resolve();
		await starting;
		await Bun.sleep(10);
		expect(frames).toHaveLength(1);
		await fixture.router.stop();
	});

	test("rejects a command carrying a different same-generation attachment", async () => {
		const fixture = await routerFixture();
		const impostor: SessionAttachment = Object.freeze({
			sessionId: fixture.sessionId,
			generation: 1,
			isCurrent: () => true,
			send: async () => {},
		});
		try {
			await expect(
				fixture.router.request(fixture.sessionId, { type: "query_request" }, 1, impostor),
			).rejects.toBeInstanceOf(SessionRouterError);
			expect(fixture.clients[0]?.requests.filter(frame => frame.type === "query_request")).toEqual([]);
		} finally {
			await fixture.router.stop();
		}
	});

	test("publishes readiness only after capability authority becomes current", async () => {
		const phases: string[] = [];
		const fixture = await routerFixture({
			onAttachment: attachment => {
				phases.push(`attachment:${attachment.isCurrent()}`);
			},
			onAttachmentReady: attachment => {
				phases.push(`ready:${attachment.isCurrent()}`);
			},
		});
		try {
			expect(phases).toEqual(["attachment:false", "ready:true"]);
		} finally {
			await fixture.router.stop();
		}
	});
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

	test("revokes an attachment when exact endpoint revalidation fails for a still-live index row", async () => {
		const fixture = await routerFixture();
		const attachment = fixture.attachments[0]!;
		fs.rmSync(fixture.endpointFile);

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
