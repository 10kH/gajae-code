import { describe, expect, it, spyOn } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as brokerEnsure from "../src/sdk/broker/ensure";
import { SdkClient } from "../src/sdk/client/client";
import * as sdkDiscovery from "../src/sdk/client/discovery";
import {
	AgentDirSessionLifecycleClient,
	AgentDirSessionLifecycleService,
	deriveSessionLifecycleIdempotencyKey,
	type SessionLifecycleClient,
	type SessionLifecycleClientRequestOptions,
	type SessionLifecycleOperation,
	SessionLifecycleService,
} from "../src/sdk/lifecycle";

type Call = {
	operation: SessionLifecycleOperation;
	input: Record<string, unknown>;
	options: SessionLifecycleClientRequestOptions;
};

class FakeLifecycleClient implements SessionLifecycleClient {
	readonly calls: Call[] = [];
	response: unknown = { ok: true, result: { sessionId: "session-1" } };
	failure: Error | undefined;

	async global(
		operation: SessionLifecycleOperation,
		input: Record<string, unknown>,
		options: SessionLifecycleClientRequestOptions,
	): Promise<unknown> {
		this.calls.push({ operation, input, options });
		if (this.failure) throw this.failure;
		return this.response;
	}
}

const actor = { id: "operator-1", namespace: "telegram:account-1" } as const;
const target = { cwd: "/repo" } as const;

function serviceWith(response: unknown = { ok: true, result: { sessionId: "session-1" } }): {
	service: SessionLifecycleService;
	client: FakeLifecycleClient;
} {
	const client = new FakeLifecycleClient();
	client.response = response;
	return { service: new SessionLifecycleService(client), client };
}

describe("SessionLifecycleService", () => {
	it("rejects an unauthorized capability without calling the client", async () => {
		const { service, client } = serviceWith();
		const result = await service.execute({
			operation: "session.create",
			actor,
			capability: "session.close",
			requestKey: "request-1",
			target,
		} as never);
		expect(result).toMatchObject({ ok: false, certainty: "terminal", error: { code: "capability_denied" } });
		expect(client.calls).toHaveLength(0);
	});

	it("derives deterministic keys while separating actor, request, and target identity", async () => {
		const first = serviceWith();
		const second = serviceWith();
		await first.service.create({ actor, capability: "session.create", requestKey: "request-1", target });
		await second.service.create({ actor, capability: "session.create", requestKey: "request-1", target });
		expect(first.client.calls[0]?.options.idempotencyKey).toBe(second.client.calls[0]?.options.idempotencyKey);
		expect(first.client.calls[0]?.options.idempotencyKey).toBe(
			deriveSessionLifecycleIdempotencyKey(actor, "request-1", "session.create", target),
		);

		const actorKey = deriveSessionLifecycleIdempotencyKey(
			{ ...actor, id: "operator-2" },
			"request-1",
			"session.create",
			target,
		);
		const requestKey = deriveSessionLifecycleIdempotencyKey(actor, "request-2", "session.create", target);
		const targetKey = deriveSessionLifecycleIdempotencyKey(actor, "request-1", "session.create", { cwd: "/other" });
		expect(new Set([first.client.calls[0]?.options.idempotencyKey, actorKey, requestKey, targetKey]).size).toBe(4);
	});

	it("maps every lifecycle operation to its Broker operation and input", async () => {
		const { service, client } = serviceWith();
		await service.create({ actor, capability: "session.create", requestKey: "create", target: { cwd: "/create" } });
		await service.fork({
			actor,
			capability: "session.fork",
			requestKey: "fork",
			target: { cwd: "/fork", sourceSessionId: "source" },
		});
		await service.resume({
			actor,
			capability: "session.resume",
			requestKey: "resume",
			target: { sessionId: "resume-session" },
		});
		await service.close({
			actor,
			capability: "session.close",
			requestKey: "close",
			target: { sessionId: "close-session" },
		});
		await service.delete({
			actor,
			capability: "session.delete",
			requestKey: "delete",
			target: { sessionId: "delete-session" },
		});
		client.response = { ok: true, result: { indexSeq: 7, sessions: [], warnings: [] } };
		await service.list({ actor, capability: "session.list" });
		expect(client.calls.map(call => call.operation)).toEqual([
			"session.create",
			"session.fork",
			"session.resume",
			"session.close",
			"session.delete",
			"session.list",
		]);
		expect(client.calls.map(call => call.input)).toEqual([
			{ cwd: "/create" },
			{ cwd: "/fork", sourceSessionId: "source" },
			{ sessionId: "resume-session" },
			{ sessionId: "close-session" },
			{ sessionId: "delete-session" },
			{},
		]);
		expect(client.calls.at(-1)?.options).not.toHaveProperty("idempotencyKey");
	});

	it("redacts endpoint credentials from create and resume results", async () => {
		const { service } = serviceWith({
			ok: true,
			result: {
				sessionId: "created",
				cwd: "/repo",
				endpoint: { url: "ws://127.0.0.1:9999", token: "secret" },
				token: "top-level-secret",
			},
		});
		const created = await service.create({ actor, capability: "session.create", requestKey: "create", target });
		expect(created).toEqual({
			ok: true,
			operation: "session.create",
			result: { sessionId: "created", cwd: "/repo" },
		});

		const resumed = await service.resume({
			actor,
			capability: "session.resume",
			requestKey: "resume",
			target: { sessionId: "resumed" },
		});
		expect(resumed).toEqual({
			ok: true,
			operation: "session.resume",
			result: { sessionId: "created", cwd: "/repo" },
		});
	});

	it("maps Broker certainty codes and treats malformed responses as uncertain", async () => {
		for (const [code, certainty] of [
			["terminal_uncertain", "uncertain"],
			["cleanup_pending", "cleanup_pending"],
			["unavailable", "retryable"],
			["broker_restarting", "retryable"],
			["readiness_timeout", "retryable"],
			["startup_admission_timeout", "retryable"],
			["invalid_input", "terminal"],
		] as const) {
			const { service } = serviceWith({ ok: false, error: { code, message: "broker failure" } });
			const result = await service.close({
				actor,
				capability: "session.close",
				requestKey: code,
				target: { sessionId: "session-1" },
			});
			expect(result).toMatchObject({ ok: false, certainty, error: { code, message: "broker failure" } });
		}

		const thrown = serviceWith();
		thrown.client.failure = Object.assign(new Error("terminal uncertainty"), {
			code: "terminal_uncertain",
			details: { code: "terminal_uncertain", message: "terminal uncertainty" },
		});
		const thrownResult = await thrown.service.close({
			actor,
			capability: "session.close",
			requestKey: "thrown",
			target: { sessionId: "session-1" },
		});
		expect(thrownResult).toMatchObject({ ok: false, certainty: "uncertain", error: { code: "terminal_uncertain" } });

		for (const [details, certainty] of [
			[{ requestSent: true, requestId: "sent-timeout" }, "uncertain"],
			[{ requestSent: false, requestId: "pre-send-timeout" }, "retryable"],
		] as const) {
			const transport = serviceWith();
			transport.client.failure = Object.assign(new Error("SDK request timed out"), {
				code: "timeout",
				details,
			});
			const outcome = await transport.service.create({
				actor,
				capability: "session.create",
				requestKey: details.requestId,
				target,
			});
			expect(outcome).toMatchObject({ ok: false, certainty, error: { code: "timeout" } });
		}

		const closed = serviceWith();
		closed.client.failure = Object.assign(new Error("SDK connection closed"), { code: "connection_closed" });
		const closedOutcome = await closed.service.create({
			actor,
			capability: "session.create",
			requestKey: "ambiguous-connection",
			target,
		});
		expect(closedOutcome).toMatchObject({ ok: false, certainty: "uncertain", error: { code: "connection_closed" } });

		const malformed = serviceWith("not-a-broker-response");
		const result = await malformed.service.list({ actor, capability: "session.list" });
		expect(result).toMatchObject({ ok: false, certainty: "uncertain", error: { code: "malformed_response" } });
	});

	it("preserves a successful lifecycle result when SDK cleanup fails", async () => {
		const ensureSpy = spyOn(brokerEnsure, "ensureBroker").mockResolvedValue({} as never);
		const discoverySpy = spyOn(sdkDiscovery, "readSdkBrokerDiscovery").mockResolvedValue({
			url: "ws://127.0.0.1:1",
			token: "broker-token",
		} as never);
		const closeError = new Error("cleanup timed out");
		const response = { ok: true, result: { sessionId: "session-1" } };
		const fakeClient = {
			global: async () => response,
			close: async () => {
				throw closeError;
			},
		} as unknown as SdkClient;
		const connectSpy = spyOn(SdkClient, "connect").mockResolvedValue(fakeClient);
		try {
			const client = new AgentDirSessionLifecycleClient("/agent");
			await expect(client.global("session.create", target, { idempotencyKey: "request-1" })).resolves.toEqual(
				response,
			);
		} finally {
			connectSpy.mockRestore();
			discoverySpy.mockRestore();
			ensureSpy.mockRestore();
		}
	});
	it("does not create a plain_dir before lifecycle authority validation", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "gjc-sdk-lifecycle-"));
		const requested = path.join(root, "unauthorized");
		try {
			const service = new AgentDirSessionLifecycleService(root);
			const outcome = await service.createExternal({
				actor: { id: "", namespace: actor.namespace },
				capability: "session.create",
				requestKey: "unauthorized-request",
				target: { kind: "plain_dir", path: requested },
			});
			expect(outcome).toMatchObject({ ok: false, certainty: "terminal", error: { code: "unauthorized" } });
			await expect(fs.stat(requested)).rejects.toMatchObject({ code: "ENOENT" });
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	it("rejects invalid resume authority before enumerating saved histories", async () => {
		const service = new AgentDirSessionLifecycleService("/agent");
		const listSpy = spyOn(service, "listRecent").mockResolvedValue({ kind: "complete", entries: [], warnings: [] });
		try {
			const unauthorized = await service.resumeExternal({
				actor: { id: "", namespace: actor.namespace },
				capability: "session.resume",
				requestKey: "resume-unauthorized",
				target: { sessionIdOrPrefix: "session" },
			});
			expect(unauthorized).toMatchObject({ kind: "unavailable", message: "authenticated actor is required" });
			const emptyPrefix = await service.resumeExternal({
				actor,
				capability: "session.resume",
				requestKey: "resume-empty-prefix",
				target: { sessionIdOrPrefix: "" },
			});
			expect(emptyPrefix).toMatchObject({ kind: "unavailable" });
			expect(listSpy).not.toHaveBeenCalled();
		} finally {
			listSpy.mockRestore();
		}
	});
});
