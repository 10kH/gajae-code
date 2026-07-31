import { describe, expect, test } from "bun:test";
import {
	MAX_REVERSE_CLEANUP_OUTSTANDING,
	MAX_REVERSE_OUTSTANDING,
	MAX_REVERSE_TERMINAL_OUTPUT_BYTES,
	ReverseLeaseError,
	ReverseLeaseRuntime,
} from "../src/sdk/host";

describe("directed reverse RPC leases", () => {
	test("bootstraps atomically, conflicts, reclaims, and hands off", () => {
		let now = 0;
		const installed: string[] = [];
		const removed: string[] = [];
		const runtime = new ReverseLeaseRuntime({
			now: () => now,
			sendFrame: () => {},
			installDefinitions: capability => installed.push(capability),
			onDefinitionsRemoved: capability => removed.push(capability),
		});
		const first = runtime.registerProvider("a", "terminal", { commands: [] }, undefined, "key");
		expect(runtime.registerProvider("a", "terminal", { commands: [] }, undefined, "key").leaseId).toBe(first.leaseId);
		expect(() => runtime.registerProvider("a", "terminal", { ignored: true }, undefined, "key")).toThrow(
			"idempotency_conflict",
		);
		expect(() => runtime.registerProvider("a", "ui", { commands: [] }, undefined, "key")).toThrow(
			"idempotency_conflict",
		);
		expect(installed).toEqual(["terminal"]);
		expect(() => runtime.registerProvider("b", "terminal", {})).toThrow(ReverseLeaseError);
		runtime.disconnect("a");
		now = 1;
		expect(() => runtime.registerProvider("b", "terminal", {})).toThrow("provider_lease_conflict");
		expect(runtime.registerProvider("b", "terminal", {}, first.leaseId).leaseId).toBe(first.leaseId);
		const reclaimed = runtime.getLease("terminal")!;
		runtime.release("b", reclaimed.leaseId, "c");
		expect(runtime.getLease("terminal")).toBeUndefined();
		expect(() => runtime.request("terminal", "run", {})).toThrow("lease_unavailable");
		expect(removed).toEqual(["terminal", "terminal"]);
		expect(() => runtime.registerProvider("c", "terminal", {})).toThrow("provider_lease_conflict");
		const handedOff = runtime.registerProvider(
			"c",
			"terminal",
			{ commands: [{ name: "replacement" }] },
			reclaimed.leaseId,
		);
		expect(handedOff).toMatchObject({
			leaseId: reclaimed.leaseId,
			connectionId: "c",
			active: true,
			definitions: { commands: [{ name: "replacement" }] },
		});
		runtime.release("c", handedOff.leaseId, "d");
		now += 15_000;
		expect(() => runtime.request("terminal", "run", {})).toThrow("provider_required");
		expect(runtime.registerProvider("d", "terminal", {}).leaseId).not.toBe(handedOff.leaseId);
		expect(() => runtime.release("b", reclaimed.leaseId)).toThrow("not_lease_owner");
	});

	test("expires outstanding calls with their exact provider lease", async () => {
		let now = 0;
		const frames: Array<Record<string, unknown>> = [];
		const runtime = new ReverseLeaseRuntime({
			now: () => now,
			leaseTtlMs: 30,
			sendFrame: (_connectionId, frame) => {
				frames.push(frame);
			},
		});
		const lease = runtime.registerProvider("owner", "terminal", {});
		const pending = runtime.request("terminal", "terminal.output", {});
		now = 31;
		expect(runtime.getLease("terminal")).toBeUndefined();
		await expect(pending).rejects.toThrow("request_cancelled");
		expect(frames.at(-1)).toMatchObject({ type: "reverse_cancel", id: frames[0]?.id, leaseId: lease.leaseId });
		expect(() => runtime.respond("owner", String(frames[0]?.id), lease.leaseId, {})).toThrow("unknown_request");
		runtime.dispose();
	});

	test("retires expired outstanding calls before provider re-registration", async () => {
		let now = 0;
		const runtime = new ReverseLeaseRuntime({ now: () => now, leaseTtlMs: 30, sendFrame: () => {} });
		const expired = runtime.registerProvider("owner", "terminal", {});
		const pending = runtime.request("terminal", "terminal.output", {}, undefined, expired.leaseId);
		now = 31;
		const replacement = runtime.registerProvider("replacement", "terminal", {});
		expect(replacement.leaseId).not.toBe(expired.leaseId);
		await expect(pending).rejects.toThrow("request_cancelled");
		runtime.dispose();
	});

	test("retires expired outstanding calls when a late heartbeat is rejected", async () => {
		let now = 0;
		const runtime = new ReverseLeaseRuntime({ now: () => now, leaseTtlMs: 30, sendFrame: () => {} });
		const lease = runtime.registerProvider("owner", "terminal", {});
		const pending = runtime.request("terminal", "terminal.output", {}, undefined, lease.leaseId);
		now = 31;
		expect(() => runtime.heartbeat("owner", lease.leaseId)).toThrow("lease_expired");
		await expect(pending).rejects.toThrow("request_cancelled");
		runtime.dispose();
	});

	test("rejects and retires responses after the exact provider lease expires", async () => {
		let now = 0;
		const sent: Array<Record<string, unknown>> = [];
		const runtime = new ReverseLeaseRuntime({
			now: () => now,
			leaseTtlMs: 30,
			sendFrame: (_connectionId, frame) => {
				sent.push(frame);
			},
		});
		const lease = runtime.registerProvider("owner", "ui", {});
		const pending = runtime.request("ui", "select", {}, undefined, lease.leaseId);
		const requestId = String(sent[0]?.id);
		now = 31;
		expect(() => runtime.respond("owner", requestId, lease.leaseId, { selected: "yes" })).toThrow("lease_expired");
		await expect(pending).rejects.toThrow("lease_expired");
		expect(sent.at(-1)).toMatchObject({ type: "reverse_cancel", id: requestId, leaseId: lease.leaseId });
		expect(() => runtime.respond("owner", requestId, lease.leaseId, {})).toThrow("unknown_request");
		runtime.dispose();
	});

	test("directs responses to lease owner and cancels on disconnect", async () => {
		const sent: Array<{ connectionId: string; frame: Record<string, unknown> }> = [];
		const cancelled: string[] = [];
		const runtime = new ReverseLeaseRuntime({
			sendFrame: (connectionId, frame) => {
				sent.push({ connectionId, frame });
			},
			onCancel: requestId => cancelled.push(requestId),
		});
		runtime.registerProvider("owner", "ui", {});
		const pending = runtime.request("ui", "select", { options: ["yes"] });
		const requestId = String(sent[0].frame.id);
		const leaseId = runtime.getLease("ui")!.leaseId;
		expect(sent[0].connectionId).toBe("owner");
		expect(sent[0].frame).toMatchObject({
			type: "reverse_request",
			id: requestId,
			connectionId: "owner",
			leaseId,
			payload: { method: "select", payload: { options: ["yes"] } },
		});
		expect(() => runtime.respond("other", requestId, leaseId, {})).toThrow("not_lease_owner");
		runtime.respond("owner", requestId, leaseId, { selected: "yes" });
		await expect(pending).resolves.toEqual({ selected: "yes" });
		const cancelledRequest = runtime.request("ui", "select", {});
		runtime.disconnect("owner");
		await expect(cancelledRequest).rejects.toThrow("request_cancelled");
		expect(cancelled).toHaveLength(1);
	});

	test("rejects terminal handle requests after provider lease replacement", async () => {
		const runtime = new ReverseLeaseRuntime({ sendFrame: () => {} });
		const first = runtime.registerProvider("owner-a", "terminal", {});
		const pending = runtime.request("terminal", "terminal.output", {}, undefined, first.leaseId);
		runtime.release("owner-a", first.leaseId);
		await expect(pending).rejects.toThrow("request_cancelled");
		const second = runtime.registerProvider("owner-b", "terminal", {});
		expect(second.leaseId).not.toBe(first.leaseId);
		expect(() => runtime.request("terminal", "terminal.release", {}, undefined, first.leaseId)).toThrow(
			"lease_unavailable",
		);
		runtime.dispose();
	});

	test("release cancels only its exact lease and notifies the provider", async () => {
		const sent: Array<Record<string, unknown>> = [];
		const runtime = new ReverseLeaseRuntime({
			sendFrame: (_connectionId, frame) => {
				sent.push(frame);
			},
		});
		const terminalLease = runtime.registerProvider("owner", "terminal", {});
		const uiLease = runtime.registerProvider("owner", "ui", {});
		const terminal = runtime.request("terminal", "terminal.create", {}, undefined, terminalLease.leaseId);
		const terminalRequestId = String(sent.at(-1)?.id);
		const ui = runtime.request("ui", "ui.select", {}, undefined, uiLease.leaseId);
		const uiRequestId = String(sent.at(-1)?.id);
		runtime.release("owner", terminalLease.leaseId, "replacement");
		await expect(terminal).rejects.toThrow("request_cancelled");
		expect(sent).toContainEqual(
			expect.objectContaining({ type: "reverse_cancel", id: terminalRequestId, leaseId: terminalLease.leaseId }),
		);
		runtime.respond("owner", uiRequestId, uiLease.leaseId, { selected: "yes" });
		await expect(ui).resolves.toEqual({ selected: "yes" });
		runtime.dispose();
	});

	test("settles oversized generic responses and permits bounded terminal output", async () => {
		const sent: Array<Record<string, unknown>> = [];
		const runtime = new ReverseLeaseRuntime({
			sendFrame: (_connectionId, frame) => {
				sent.push(frame);
			},
		});
		const uiLease = runtime.registerProvider("owner", "ui", {});
		const oversized = runtime.request("ui", "select", {});
		const oversizedId = String(sent.at(-1)?.id);
		expect(() => runtime.respond("owner", oversizedId, uiLease.leaseId, { text: "x".repeat(300 * 1024) })).toThrow(
			"payload_too_large",
		);
		await expect(oversized).rejects.toThrow("payload_too_large");
		expect(() => runtime.respond("owner", oversizedId, uiLease.leaseId, {})).toThrow("unknown_request");
		const oversizedError = runtime.request("ui", "select", {});
		const oversizedErrorId = String(sent.at(-1)?.id);
		expect(() =>
			runtime.respond("owner", oversizedErrorId, uiLease.leaseId, undefined, {
				code: "provider_failed",
				message: "x".repeat(300 * 1024),
			}),
		).toThrow("payload_too_large");
		await expect(oversizedError).rejects.toThrow("payload_too_large");
		const padded = runtime.request("ui", "select", {});
		const paddedId = String(sent.at(-1)?.id);
		const paddedEnvelope = {
			type: "reverse_response",
			id: paddedId,
			connectionId: "owner",
			leaseId: uiLease.leaseId,
			ok: true,
			result: { selected: "yes" },
			padding: "x".repeat(300 * 1024),
		};
		expect(() =>
			runtime.respond("owner", paddedId, uiLease.leaseId, { selected: "yes" }, undefined, paddedEnvelope),
		).toThrow("payload_too_large");
		await expect(padded).rejects.toThrow("payload_too_large");
		expect(() =>
			runtime.respond("owner", "unknown-padded", uiLease.leaseId, {}, undefined, {
				...paddedEnvelope,
				id: "unknown-padded",
			}),
		).toThrow("unknown_request");
		const paddedError = runtime.request("ui", "select", {});
		const paddedErrorId = String(sent.at(-1)?.id);
		expect(() =>
			runtime.respond(
				"owner",
				paddedErrorId,
				uiLease.leaseId,
				undefined,
				{ code: "provider_failed", message: "small" },
				{
					type: "reverse_response",
					id: paddedErrorId,
					connectionId: "owner",
					leaseId: uiLease.leaseId,
					ok: false,
					error: { code: "provider_failed", message: "small" },
					padding: "x".repeat(300 * 1024),
				},
			),
		).toThrow("payload_too_large");
		await expect(paddedError).rejects.toThrow("payload_too_large");

		runtime.release("owner", uiLease.leaseId);
		const terminalLease = runtime.registerProvider("owner", "terminal", {});
		const output = "y".repeat(10 * 1024 * 1024);
		const terminal = runtime.request("terminal", "terminal.output", {});
		const terminalId = String(sent.at(-1)?.id);
		runtime.respond("owner", terminalId, terminalLease.leaseId, { output, truncated: false });
		await expect(terminal).resolves.toEqual({ output, truncated: false });

		const wrongOwner = runtime.request("terminal", "terminal.output", {});
		const wrongOwnerId = String(sent.at(-1)?.id);
		expect(() =>
			runtime.respond("other", wrongOwnerId, "wrong-lease", {
				output: "x".repeat(300 * 1024),
				truncated: false,
			}),
		).toThrow("not_lease_owner");
		runtime.respond("owner", wrongOwnerId, terminalLease.leaseId, { output: "ok", truncated: false });
		await expect(wrongOwner).resolves.toEqual({ output: "ok", truncated: false });

		const malformedStatus = runtime.request("terminal", "terminal.output", {});
		const malformedStatusId = String(sent.at(-1)?.id);
		expect(() =>
			runtime.respond("owner", malformedStatusId, terminalLease.leaseId, {
				output: "x".repeat(300 * 1024),
				truncated: false,
				exitStatus: "invalid",
			}),
		).toThrow("payload_too_large");
		await expect(malformedStatus).rejects.toThrow("payload_too_large");
		runtime.dispose();
	});

	test("rejects unknown responses before serializing their body", () => {
		const runtime = new ReverseLeaseRuntime({ sendFrame: () => {} });
		const lease = runtime.registerProvider("owner", "ui", {});
		const envelope = {
			toJSON() {
				throw new Error("unknown response body must not be serialized");
			},
		};
		expect(() => runtime.respond("owner", "missing", lease.leaseId, {}, undefined, envelope)).toThrow(
			"unknown_request",
		);
		runtime.dispose();
	});

	test("accepts exact-limit escape-heavy terminal output and rejects raw output above the source limit", async () => {
		const sent: Array<Record<string, unknown>> = [];
		const runtime = new ReverseLeaseRuntime({
			sendFrame: (_connectionId, frame) => {
				sent.push(frame);
			},
		});
		const lease = runtime.registerProvider("owner", "terminal", {});
		const exactOutput = "\0".repeat(MAX_REVERSE_TERMINAL_OUTPUT_BYTES);
		const exact = runtime.request("terminal", "terminal.output", {});
		runtime.respond("owner", String(sent.at(-1)?.id), lease.leaseId, { output: exactOutput, truncated: false });
		await expect(exact).resolves.toMatchObject({ output: expect.any(String), truncated: false });

		const oversized = runtime.request("terminal", "terminal.output", {});
		const oversizedId = String(sent.at(-1)?.id);
		expect(() =>
			runtime.respond("owner", oversizedId, lease.leaseId, {
				output: "x".repeat(MAX_REVERSE_TERMINAL_OUTPUT_BYTES + 1),
				truncated: false,
			}),
		).toThrow("payload_too_large");
		await expect(oversized).rejects.toThrow("payload_too_large");
		runtime.dispose();
	});

	test("reserves bounded reverse RPC admission for terminal cleanup", async () => {
		const sent: Array<Record<string, unknown>> = [];
		const runtime = new ReverseLeaseRuntime({
			sendFrame: (_connectionId, frame) => {
				sent.push(frame);
			},
		});
		const lease = runtime.registerProvider("owner", "terminal", {});
		const normal = Array.from({ length: MAX_REVERSE_OUTSTANDING }, () =>
			runtime.request("terminal", "terminal.output", {}, undefined, lease.leaseId),
		);
		expect(() => runtime.request("terminal", "terminal.output", {}, undefined, lease.leaseId)).toThrow(
			"too_many_outstanding",
		);
		const cleanup = Array.from({ length: MAX_REVERSE_CLEANUP_OUTSTANDING }, (_, index) =>
			runtime.request("terminal", `terminal.cleanup-${index}`, {}, undefined, lease.leaseId, true),
		);
		expect(() =>
			runtime.request("terminal", "terminal.cleanup-overflow", {}, undefined, lease.leaseId, true),
		).toThrow("too_many_outstanding");
		for (const frame of sent) runtime.respond("owner", String(frame.id), lease.leaseId, {});
		await Promise.all([...normal, ...cleanup]);
		runtime.dispose();
	});

	test("retires outstanding calls before synchronous reverse cancellation reentrancy", async () => {
		let runtime!: ReverseLeaseRuntime;
		let reentrantCode = "";
		const runtimeFrames: Array<Record<string, unknown>> = [];
		runtime = new ReverseLeaseRuntime({
			sendFrame: (_connectionId, frame) => {
				runtimeFrames.push(frame);
				if (frame.type !== "reverse_cancel") return;
				try {
					runtime.respond("owner", String(frame.id), String(frame.leaseId), {});
				} catch (error) {
					reentrantCode = error instanceof ReverseLeaseError ? error.code : String(error);
				}
			},
		});
		const lease = runtime.registerProvider("owner", "ui", {});
		const pending = runtime.request("ui", "select", {}, undefined, lease.leaseId);
		runtime.release("owner", lease.leaseId);
		await expect(pending).rejects.toThrow("request_cancelled");
		expect(reentrantCode).toBe("unknown_request");
		expect(runtimeFrames.at(-1)).toMatchObject({ type: "reverse_cancel", leaseId: lease.leaseId });
		runtime.dispose();
	});

	test("propagates caller aborts to the reverse provider", async () => {
		const sent: Array<Record<string, unknown>> = [];
		const runtime = new ReverseLeaseRuntime({
			sendFrame: (_connectionId, frame) => {
				sent.push(frame);
			},
		});
		runtime.registerProvider("owner", "ui", {});
		const controller = new AbortController();
		const pending = runtime.request("ui", "ui.elicit", {}, controller.signal);
		const requestId = String(sent[0]?.id);

		controller.abort();

		await expect(pending).rejects.toMatchObject({ name: "request_cancelled" });
		expect(sent[1]).toMatchObject({
			type: "reverse_cancel",
			id: requestId,
			connectionId: "owner",
		});
		expect(() => runtime.respond("owner", requestId, runtime.getLease("ui")!.leaseId, {})).toThrow("unknown_request");
		runtime.dispose();
	});

	test("swallows synchronous reverse cancellation send failures", async () => {
		let requestId = "";
		let reverseCancelCalls = 0;
		const runtime = new ReverseLeaseRuntime({
			sendFrame: (_connectionId, frame) => {
				requestId = String(frame.id);
				if (frame.type === "reverse_cancel") {
					reverseCancelCalls += 1;
					throw new Error("cancel send failed");
				}
			},
		});
		const lease = runtime.registerProvider("owner", "ui", {});
		const controller = new AbortController();
		const pending = runtime.request("ui", "ui.elicit", {}, controller.signal);
		let rejectionCount = 0;
		const observed = pending.catch(error => {
			rejectionCount += 1;
			throw error;
		});

		expect(() => controller.abort()).not.toThrow();
		await expect(observed).rejects.toMatchObject({ name: "request_cancelled" });
		expect(rejectionCount).toBe(1);
		expect(reverseCancelCalls).toBe(1);
		expect(() => runtime.respond("owner", requestId, lease.leaseId, {})).toThrow("unknown_request");
		runtime.dispose();
	});

	test("swallows asynchronous reverse cancellation send rejections", async () => {
		let requestId = "";
		let reverseCancelCalls = 0;
		const runtime = new ReverseLeaseRuntime({
			sendFrame: (_connectionId, frame) => {
				requestId = String(frame.id);
				if (frame.type === "reverse_cancel") {
					reverseCancelCalls += 1;
					return Promise.reject(new Error("cancel send failed"));
				}
			},
		});
		const lease = runtime.registerProvider("owner", "ui", {});
		const controller = new AbortController();
		const pending = runtime.request("ui", "ui.elicit", {}, controller.signal);
		let rejectionCount = 0;
		const observed = pending.catch(error => {
			rejectionCount += 1;
			throw error;
		});

		expect(() => controller.abort()).not.toThrow();
		await expect(observed).rejects.toMatchObject({ name: "request_cancelled" });
		expect(rejectionCount).toBe(1);
		expect(reverseCancelCalls).toBe(1);
		expect(() => runtime.respond("owner", requestId, lease.leaseId, {})).toThrow("unknown_request");
		runtime.dispose();
	});

	test("dispose rejects pending requests and clears reverse lease state", async () => {
		const sent: Array<Record<string, unknown>> = [];
		const removed: string[] = [];
		const cancelled: string[] = [];
		const runtime = new ReverseLeaseRuntime({
			sendFrame: (_connectionId, frame) => {
				sent.push(frame);
			},
			onDefinitionsRemoved: capability => {
				removed.push(capability);
			},
			onCancel: requestId => {
				cancelled.push(requestId);
			},
		});
		runtime.registerProvider("owner", "permission", [{ name: "request" }], undefined, "first");
		const pending = runtime.request("permission", "request", { toolCallId: "call-1" });
		const requestId = String(sent[0].id);
		runtime.dispose();
		await expect(pending).rejects.toThrow("request_cancelled");
		expect(cancelled).toEqual([requestId]);
		expect(removed).toEqual(["permission"]);
		expect(runtime.getLease("permission")).toBeUndefined();
		expect(runtime.getInstalledDefinitions("permission")).toBeUndefined();
		expect(() => runtime.request("permission", "request", {})).toThrow("provider_required");
		expect(runtime.registerProvider("next", "permission", [], undefined, "first").connectionId).toBe("next");
		runtime.dispose();
	});

	test("dispose remains atomic when external cleanup hooks throw", async () => {
		let requestId = "";
		const reentryErrors: string[] = [];
		let runtime!: ReverseLeaseRuntime;
		runtime = new ReverseLeaseRuntime({
			sendFrame: (_connectionId, frame) => {
				requestId = String(frame.id);
			},
			onDefinitionsRemoved: () => {
				try {
					runtime.registerProvider("reentrant", "permission", []);
				} catch (error) {
					reentryErrors.push(String(error));
				}
				throw new Error("definition cleanup failed");
			},
			onCancel: () => {
				try {
					runtime.request("permission", "request", {});
				} catch (error) {
					reentryErrors.push(String(error));
				}
				throw new Error("cancel hook failed");
			},
		});
		runtime.registerProvider("owner", "permission", [{ name: "request" }], undefined, "key");
		const pending = runtime.request("permission", "request", {});
		expect(() => runtime.dispose()).not.toThrow();
		await expect(pending).rejects.toThrow("request_cancelled");
		expect(runtime.getLease("permission")).toBeUndefined();
		expect(runtime.getInstalledDefinitions("permission")).toBeUndefined();
		expect(() => runtime.respond("owner", requestId, "missing", {})).toThrow("unknown_request");
		expect(reentryErrors).toHaveLength(2);
		expect(reentryErrors.every(error => error.includes("reverse runtime is disposing"))).toBe(true);
		expect(runtime.registerProvider("next", "permission", [], undefined, "key").connectionId).toBe("next");
		runtime.dispose();
	});

	test("synchronous reverse send failures remove the pending request", async () => {
		let requestId = "";
		const runtime = new ReverseLeaseRuntime({
			sendFrame: (_connectionId, frame) => {
				requestId = String(frame.id);
				throw new Error("send failed");
			},
		});
		const lease = runtime.registerProvider("owner", "ui", {});
		await expect(runtime.request("ui", "select", {})).rejects.toThrow("send failed");
		expect(() => runtime.respond("owner", requestId, lease.leaseId, {})).toThrow("unknown_request");
		runtime.dispose();
	});

	test("accepts structured error responses without a result payload", async () => {
		const sent: Array<Record<string, unknown>> = [];
		const runtime = new ReverseLeaseRuntime({
			sendFrame: (_connectionId, frame) => {
				sent.push(frame);
			},
		});
		runtime.registerProvider("owner", "ui", {});
		const pending = runtime.request("ui", "select", {});
		runtime.respond("owner", String(sent[0].id), String(sent[0].leaseId), undefined, {
			code: "lease_expired",
			message: "Lease expired.",
		});
		await expect(pending).rejects.toThrow("Lease expired.");
	});

	test("single winner wins a two-client bootstrap race", () => {
		const runtime = new ReverseLeaseRuntime({ sendFrame: () => {} });
		const winner = runtime.registerProvider("one", "filesystem", {});
		expect(winner.connectionId).toBe("one");
		expect(() => runtime.registerProvider("two", "filesystem", {})).toThrow("provider_lease_conflict");
	});

	test("expires installed definitions without a subsequent lease operation", async () => {
		const removed: string[] = [];
		const runtime = new ReverseLeaseRuntime({
			leaseTtlMs: 30,
			sendFrame: () => {},
			onDefinitionsRemoved: capability => removed.push(capability),
		});
		const lease = runtime.registerProvider("owner", "ui", [{ name: "select" }]);
		expect(runtime.getInstalledDefinitions("ui")).toEqual([{ name: "select" }]);
		await Bun.sleep(60);
		expect(runtime.getInstalledDefinitions("ui")).toBeUndefined();
		expect(removed).toEqual(["ui"]);
		// A post-expiry heartbeat must not revive the lease or its definitions.
		expect(() => runtime.heartbeat("owner", lease.leaseId)).toThrow("lease_expired");
		expect(runtime.getInstalledDefinitions("ui")).toBeUndefined();
		// A new provider can acquire the expired capability.
		const replacement = runtime.registerProvider("next", "ui", [{ name: "confirm" }]);
		expect(replacement.connectionId).toBe("next");
		expect(runtime.getInstalledDefinitions("ui")).toEqual([{ name: "confirm" }]);
		runtime.dispose();
	});
});
