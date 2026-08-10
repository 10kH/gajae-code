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
		initiallyIndexed?: boolean;
		onIndexRefresh?: () => void | Promise<void>;
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
	fs.writeFileSync(endpointFile, JSON.stringify({ sessionId, url: "ws://router.test", token: "secret", pid: 42 }));
	const endpointMtimeMs = fs.statSync(endpointFile).mtimeMs;

	const authority = {
		generation: 1,
		pid: 42,
		endpointMtimeMs,
		indexed: options.initiallyIndexed !== false,
		terminalUncertain: false,
		warnings: [] as string[],
	};
	const index = {
		open: async () => {},
		refresh: async () => {
			await options.onIndexRefresh?.();
		},
		listSessions: () => ({
			indexSeq: authority.generation,
			sessions: authority.indexed
				? [
						{
							sessionId,
							locator: { repo, stateRoot },
							endpointGeneration: authority.generation,
							pid: authority.pid,
							endpointMtimeMs: authority.endpointMtimeMs,
							live: true,
							indexSeq: authority.generation,
							terminalUncertain: authority.terminalUncertain || undefined,
						},
					]
				: [],
			warnings: authority.warnings,
		}),
	} as unknown as SessionIndex;
	const clients: Array<{
		sent: Record<string, unknown>[];
		requests: Record<string, unknown>[];
		client: SessionRouterClient;
		emit: (frame: Record<string, unknown>) => void;
		reconnect: () => void;
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
				let reconnectHandler: (() => void) | undefined;
				const client: SessionRouterClient = {
					onFrame: next => {
						handler = next;
						return () => {
							if (handler === next) handler = undefined;
						};
					},
					onReconnect: next => {
						reconnectHandler = next;
						return () => {
							if (reconnectHandler === next) reconnectHandler = undefined;
						};
					},
					request: async operation => {
						requests.push(operation);
						return { events: [] };
					},
					close: async () => {},
					send: frame => sent.push(frame),
				};
				clients.push({
					sent,
					requests,
					client,
					emit: frame => handler?.(frame),
					reconnect: () => reconnectHandler?.(),
				});
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
		repo,
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
				createClient: async authority => {
					if (authority.sessionId.includes("unreachable")) throw new Error("connect failed");
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

	test("allows an awaited attachment handshake to send before Router replay", async () => {
		const phases: string[] = [];
		const fixture = await routerFixture({
			onAttachmentReady: async attachment => {
				phases.push("ready");
				await attachment.send({ type: "hello" });
				await attachment.send({ type: "event_replay", id: "provider-replay" });
				phases.push("handshake-sent");
			},
		});
		try {
			expect(phases).toEqual(["ready", "handshake-sent"]);
			expect(fixture.clients[0]?.sent.map(frame => frame.type)).toEqual(["hello", "event_replay"]);
			expect(fixture.clients[0]?.requests.map(frame => frame.type)).toEqual(["event_replay"]);
		} finally {
			await fixture.router.stop();
		}
	});

	test("revalidates exact endpoint authority before publication handshake sends", async () => {
		let authority: { pid: number; endpointMtimeMs: number } | undefined;
		let endpointFile = "";
		let sessionId = "";
		const fixture = await routerFixture({
			start: false,
			onAttachmentReady: async attachment => {
				if (!authority) throw new Error("test authority unavailable");
				authority.pid = 43;
				fs.writeFileSync(
					endpointFile,
					JSON.stringify({ sessionId, url: "ws://router.test", token: "replacement", pid: 43 }),
				);
				authority.endpointMtimeMs = fs.statSync(endpointFile).mtimeMs;
				await attachment.send({ type: "hello" });
			},
		});
		authority = fixture.authority;
		endpointFile = fixture.endpointFile;
		sessionId = fixture.sessionId;
		await fixture.router.start();
		expect(fixture.clients[0]?.sent).toEqual([]);
		expect(fixture.router.attachment(fixture.sessionId)).toBeNull();
		await fixture.router.stop();
	});

	test("reruns the provider handshake before replay after reconnect", async () => {
		let readyCount = 0;
		const fixture = await routerFixture({
			onAttachmentReady: async attachment => {
				readyCount++;
				await attachment.send({ type: "hello", readyCount });
				await attachment.send({ type: "event_replay", id: `provider-replay-${readyCount}` });
			},
		});
		try {
			expect(readyCount).toBe(1);
			fixture.clients[0]?.reconnect();
			for (let attempt = 0; readyCount < 2 && attempt < 50; attempt++) await Bun.sleep(10);
			expect(readyCount).toBe(2);
			expect(fixture.clients[0]?.sent.map(frame => frame.type)).toEqual([
				"hello",
				"event_replay",
				"hello",
				"event_replay",
			]);
		} finally {
			await fixture.router.stop();
		}
	});

	test("delivers an unsequenced replay response ahead of a blocked sequenced event", async () => {
		const eventEntered = Promise.withResolvers<void>();
		const replayDelivered = Promise.withResolvers<void>();
		const releaseEvent = Promise.withResolvers<void>();
		const order: string[] = [];
		const fixture = await routerFixture({
			onFrame: async (_attachment, frame) => {
				if (frame.name === "event") {
					order.push("event-entered");
					eventEntered.resolve();
					await releaseEvent.promise;
					order.push("event-settled");
					return;
				}
				if (frame.name === "event_replay_result") {
					order.push("replay-response");
					replayDelivered.resolve();
					releaseEvent.resolve();
				}
			},
		});
		try {
			fixture.clients[0]?.emit({
				type: "event",
				sessionId: fixture.sessionId,
				generation: 1,
				seq: 1,
			});
			await eventEntered.promise;
			fixture.clients[0]?.emit({ type: "event_replay_result", id: "provider-replay", events: [] });
			const delivered = await Promise.race([
				replayDelivered.promise.then(() => true),
				Bun.sleep(250).then(() => false),
			]);
			expect(delivered).toBe(true);
			await Bun.sleep(10);
			expect(order).toEqual(["event-entered", "replay-response", "event-settled"]);
		} finally {
			releaseEvent.resolve();
			await fixture.router.stop();
		}
	});

	test("keeps lifecycle adoption provisional until a delayed index proves the exact authority", async () => {
		const fixture = await routerFixture({ initiallyIndexed: false });
		const endpoint = JSON.parse(fs.readFileSync(fixture.endpointFile, "utf8")) as Record<string, unknown>;
		const adopted = await fixture.router.adoptLifecycleResult(
			{
				ok: true,
				result: {
					sessionId: fixture.sessionId,
					endpointGeneration: fixture.authority.generation,
					pid: fixture.authority.pid,
					endpointMtimeMs: fixture.authority.endpointMtimeMs,
					endpoint,
				},
			},
			{ sessionId: fixture.sessionId, cwd: fixture.repo },
		);
		try {
			expect(adopted.isCurrent()).toBe(false);
			expect(fixture.router.attachment(fixture.sessionId)).toBeNull();
			fixture.authority.indexed = true;
			await fixture.router.reconcile();
			expect(adopted.isCurrent()).toBe(true);
			expect(fixture.router.attachment(fixture.sessionId)).toBe(adopted);
		} finally {
			await fixture.router.stop();
		}
	});

	test("revokes lifecycle adoption when the index remains missing or terminal", async () => {
		const fixture = await routerFixture({ initiallyIndexed: false });
		const endpoint = JSON.parse(fs.readFileSync(fixture.endpointFile, "utf8")) as Record<string, unknown>;
		const adopted = await fixture.router.adoptLifecycleResult(
			{
				ok: true,
				result: {
					sessionId: fixture.sessionId,
					endpointGeneration: fixture.authority.generation,
					pid: fixture.authority.pid,
					endpointMtimeMs: fixture.authority.endpointMtimeMs,
					endpoint,
				},
			},
			{ sessionId: fixture.sessionId, cwd: fixture.repo },
		);
		try {
			await fixture.router.reconcile();
			expect(adopted.isCurrent()).toBe(false);
			expect(fixture.router.attachment(fixture.sessionId)).toBeNull();
		} finally {
			await fixture.router.stop();
		}

		const terminal = await routerFixture();
		const terminalEndpoint = JSON.parse(fs.readFileSync(terminal.endpointFile, "utf8")) as Record<string, unknown>;
		const terminalAdopted = await terminal.router.adoptLifecycleResult(
			{
				ok: true,
				result: {
					sessionId: terminal.sessionId,
					endpointGeneration: terminal.authority.generation,
					pid: terminal.authority.pid,
					endpointMtimeMs: terminal.authority.endpointMtimeMs,
					endpoint: terminalEndpoint,
				},
			},
			{ sessionId: terminal.sessionId, cwd: terminal.repo },
		);
		try {
			terminal.authority.terminalUncertain = true;
			await terminal.router.reconcile();
			expect(terminalAdopted.isCurrent()).toBe(false);
			expect(terminal.router.attachment(terminal.sessionId)).toBeNull();
		} finally {
			await terminal.router.stop();
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
	test("revokes a same-generation predecessor when successor pid and mtime replace the endpoint", async () => {
		const fixture = await routerFixture();
		const predecessor = fixture.attachments[0]!;
		fs.writeFileSync(
			fixture.endpointFile,
			JSON.stringify({ sessionId: fixture.sessionId, url: "ws://router-successor", token: "successor", pid: 43 }),
		);
		fixture.authority.pid = 43;
		fixture.authority.endpointMtimeMs = fs.statSync(fixture.endpointFile).mtimeMs;

		await expect(predecessor.send({ type: "reply", id: "ask", answer: "yes" })).rejects.toBeInstanceOf(
			SessionRouterError,
		);
		expect(predecessor.isCurrent()).toBe(false);
		expect(fixture.router.attachment(fixture.sessionId)?.generation).toBe(1);
		expect(fixture.clients[0]?.sent).toEqual([]);
		await fixture.router.stop();
	});
	test("revokes an attachment when the endpoint pid disagrees with the indexed process", async () => {
		const fixture = await routerFixture();
		const attachment = fixture.attachments[0]!;
		fs.writeFileSync(
			fixture.endpointFile,
			JSON.stringify({ sessionId: fixture.sessionId, url: "ws://router.test", token: "secret", pid: 43 }),
		);

		await expect(attachment.send({ type: "reply", id: "ask", answer: "yes" })).rejects.toBeInstanceOf(
			SessionRouterError,
		);
		expect(attachment.isCurrent()).toBe(false);
		expect(fixture.router.attachment(fixture.sessionId)).toBeNull();
		await fixture.router.stop();
	});
	test("rejects an endpoint when the Broker index rotates during endpoint validation", async () => {
		let refreshCount = 0;
		let fixture!: Awaited<ReturnType<typeof routerFixture>>;
		fixture = await routerFixture({
			start: false,
			onIndexRefresh: () => {
				refreshCount += 1;
				if (refreshCount !== 2) return;
				fs.writeFileSync(
					fixture.endpointFile,
					JSON.stringify({ sessionId: fixture.sessionId, url: "ws://router-race", token: "race", pid: 43 }),
				);
				fixture.authority.pid = 43;
				fixture.authority.endpointMtimeMs = fs.statSync(fixture.endpointFile).mtimeMs;
			},
		});
		await fixture.router.start();
		try {
			expect(refreshCount).toBeGreaterThanOrEqual(2);
			expect(fixture.router.attachment(fixture.sessionId)).toBeNull();
		} finally {
			await fixture.router.stop();
		}
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
