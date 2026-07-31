import { describe, expect, it, mock } from "bun:test";
import type { AgentSideConnection, ClientCapabilities, RequestPermissionRequest } from "@agentclientprotocol/sdk";
import { createAcpClientBridge } from "../src/modes/acp/acp-client-bridge";

function expectPermissionPrompt(clientCapabilities: ClientCapabilities | undefined, enabled: boolean): void {
	const bridge = createAcpClientBridge({} as AgentSideConnection, "session-1", clientCapabilities);
	expect(bridge.capabilities.requestPermission).toBe(enabled);
	expect(typeof bridge.requestPermission === "function").toBe(enabled);
}

describe("ACP client bridge permission requests", () => {
	it("forwards pending tool-call status to session/request_permission", async () => {
		let request: RequestPermissionRequest | undefined;
		const connection = {
			async requestPermission(params: RequestPermissionRequest) {
				request = params;
				return { outcome: { outcome: "selected" as const, optionId: "allow_once" } };
			},
		} as unknown as AgentSideConnection;

		const bridge = createAcpClientBridge(connection, "session-1", {
			_meta: { gjc: { permissionHandling: "prompt" } },
		});

		await bridge.requestPermission!(
			{
				toolCallId: "call-1",
				toolName: "bash",
				title: "echo hi",
				kind: "execute",
				status: "pending",
				rawInput: { command: "echo hi" },
				content: [{ type: "content", content: { type: "text", text: "$ echo hi" } }],
			},
			[{ optionId: "allow_once", name: "Allow once", kind: "allow_once" }],
		);

		expect(request?.toolCall).toMatchObject({
			toolCallId: "call-1",
			title: "echo hi",
			kind: "execute",
			status: "pending",
			rawInput: { command: "echo hi" },
			content: [{ type: "content", content: { type: "text", text: "$ echo hi" } }],
		});
	});

	it("only enables ACP permission requests in prompt mode", () => {
		expectPermissionPrompt({ _meta: { gjc: { permissionHandling: "prompt" } } }, true);
		expectPermissionPrompt({ _meta: { gjc: { permissionHandling: "auto" } } }, false);
		expectPermissionPrompt({ _meta: { gjc: { permissionHandling: "always-allow" } } }, false);
	});

	it("uses GJC_ACP_PERMISSION_MODE when client metadata is absent", () => {
		const previous = process.env.GJC_ACP_PERMISSION_MODE;
		try {
			process.env.GJC_ACP_PERMISSION_MODE = "auto";
			expectPermissionPrompt(undefined, false);
			process.env.GJC_ACP_PERMISSION_MODE = "always-allow";
			expectPermissionPrompt({}, false);
			process.env.GJC_ACP_PERMISSION_MODE = "prompt";
			expectPermissionPrompt({}, true);
			process.env.GJC_ACP_PERMISSION_MODE = "invalid";
			expectPermissionPrompt({}, true);
			process.env.GJC_ACP_PERMISSION_MODE = "AUTO";
			expectPermissionPrompt({}, true);
			process.env.GJC_ACP_PERMISSION_MODE = " always-allow ";
			expectPermissionPrompt({}, true);
		} finally {
			if (previous === undefined) delete process.env.GJC_ACP_PERMISSION_MODE;
			else process.env.GJC_ACP_PERMISSION_MODE = previous;
		}
	});

	it("prefers client metadata and fails safely for invalid explicit values", () => {
		const previous = process.env.GJC_ACP_PERMISSION_MODE;
		try {
			process.env.GJC_ACP_PERMISSION_MODE = "prompt";
			expectPermissionPrompt({ _meta: { gjc: { permissionHandling: "auto" } } }, false);
			expectPermissionPrompt({ _meta: { gjc: { permissionHandling: "always-allow" } } }, false);
			process.env.GJC_ACP_PERMISSION_MODE = "always-allow";
			expectPermissionPrompt({ _meta: { gjc: { permissionHandling: "prompt" } } }, true);
			expectPermissionPrompt({ _meta: { gjc: { permissionHandling: "invalid" } } }, true);
			expectPermissionPrompt({ _meta: { gjc: { permissionHandling: "AUTO" } } }, true);
			expectPermissionPrompt({ _meta: { gjc: { permissionHandling: " always-allow " } } }, true);
			expectPermissionPrompt({ _meta: { gjc: { permissionHandling: null } } }, true);
		} finally {
			if (previous === undefined) delete process.env.GJC_ACP_PERMISSION_MODE;
			else process.env.GJC_ACP_PERMISSION_MODE = previous;
		}
	});
});

describe("ACP client bridge terminal publication", () => {
	it("publishes terminal content before returning a releasable handle", async () => {
		const order: string[] = [];
		let notification: unknown;
		const handle = {
			id: "term-1",
			currentOutput: async () => ({ output: "", truncated: false }),
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			kill: mock(async () => {}),
			release: mock(async () => {
				order.push("release");
			}),
		};
		const connection = {
			createTerminal: async () => {
				order.push("create");
				return handle;
			},
			sessionUpdate: async (value: unknown) => {
				order.push("publish");
				notification = value;
			},
		} as unknown as AgentSideConnection;
		const bridge = createAcpClientBridge(connection, "session-1", { terminal: true });
		const terminal = await bridge.createTerminal!({ toolCallId: "call-1", command: "echo hi" });
		await terminal.release();
		expect(order).toEqual(["create", "publish", "release"]);
		expect(notification).toMatchObject({
			sessionId: "session-1",
			update: {
				sessionUpdate: "tool_call_update",
				toolCallId: "call-1",
				status: "in_progress",
				content: [{ type: "terminal", terminalId: "term-1" }],
			},
		});
	});

	it("kills and releases an unpublished terminal after rejection", async () => {
		const kill = mock(async () => {});
		const release = mock(async () => {});
		const createTerminal = mock(async () => ({
			id: "term-unpublished",
			currentOutput: async () => ({ output: "", truncated: false }),
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			kill,
			release,
		}));
		const connection = {
			createTerminal,
			sessionUpdate: async () => {
				throw new Error("publish failed");
			},
		} as unknown as AgentSideConnection;
		const bridge = createAcpClientBridge(connection, "session-1", { terminal: true });
		await expect(bridge.createTerminal!({ toolCallId: "call-2", command: "echo hi" })).rejects.toThrow(
			"publish failed",
		);
		expect(kill).toHaveBeenCalledTimes(1);
		expect(release).toHaveBeenCalledTimes(1);
		await expect(bridge.createTerminal!({ toolCallId: "call-retry", command: "echo retry" })).rejects.toThrow(
			"terminal provider quarantined after publication failure",
		);
		expect(createTerminal).toHaveBeenCalledTimes(1);
	});

	it("releases an unpublished terminal when kill throws synchronously", async () => {
		const kill = mock(() => {
			throw new Error("kill failed synchronously");
		});
		const release = mock(async () => {});
		const connection = {
			createTerminal: async () => ({
				id: "term-sync-kill-failure",
				currentOutput: async () => ({ output: "", truncated: false }),
				waitForExit: async () => ({ exitCode: 0, signal: null }),
				kill,
				release,
			}),
			sessionUpdate: async () => {
				throw new Error("publish failed");
			},
		} as unknown as AgentSideConnection;
		const bridge = createAcpClientBridge(connection, "session-1", { terminal: true });
		await expect(bridge.createTerminal!({ toolCallId: "call-sync-kill", command: "echo hi" })).rejects.toThrow(
			"publish failed",
		);
		expect(kill).toHaveBeenCalledTimes(1);
		expect(release).toHaveBeenCalledTimes(1);
	});

	it("rejects concurrent terminal admission after the first publication fails", async () => {
		const publication = Promise.withResolvers<void>();
		const createTerminal = mock(async () => ({
			id: "term-concurrent-failure",
			currentOutput: async () => ({ output: "", truncated: false }),
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			kill: async () => {},
			release: async () => {},
		}));
		const connection = {
			createTerminal,
			sessionUpdate: async () => {
				await publication.promise;
				throw new Error("publish failed");
			},
		} as unknown as AgentSideConnection;
		const bridge = createAcpClientBridge(connection, "session-1", { terminal: true });
		const first = bridge.createTerminal!({ toolCallId: "call-first", command: "echo first" });
		while (createTerminal.mock.calls.length === 0) await Bun.sleep(1);
		const second = bridge.createTerminal!({ toolCallId: "call-second", command: "echo second" }).catch(
			error => error as Error,
		);
		publication.resolve();
		await expect(first).rejects.toThrow("publish failed");
		const secondOutcome = await second;
		expect(secondOutcome).toBeInstanceOf(Error);
		if (secondOutcome instanceof Error) {
			expect(secondOutcome.message).toContain("terminal provider quarantined after publication failure");
		}
		expect(createTerminal).toHaveBeenCalledTimes(1);
	});

	it("does not quarantine the terminal provider after caller cancellation", async () => {
		const publicationStarted = Promise.withResolvers<void>();
		const firstPublication = Promise.withResolvers<void>();
		const kill = mock(async () => {});
		const release = mock(async () => {});
		let created = 0;
		let publications = 0;
		const connection = {
			createTerminal: async () => {
				created += 1;
				return {
					id: `term-cancel-${created}`,
					currentOutput: async () => ({ output: "", truncated: false }),
					waitForExit: async () => ({ exitCode: 0, signal: null }),
					kill,
					release,
				};
			},
			sessionUpdate: async () => {
				publications += 1;
				if (publications === 1) {
					publicationStarted.resolve();
					await firstPublication.promise;
				}
			},
		} as unknown as AgentSideConnection;
		const bridge = createAcpClientBridge(connection, "session-1", { terminal: true });
		const controller = new AbortController();
		const cancelled = bridge.createTerminal!({
			toolCallId: "call-cancelled",
			command: "echo cancelled",
			signal: controller.signal,
		});
		await publicationStarted.promise;
		controller.abort();
		await expect(cancelled).rejects.toThrow("terminal publication aborted");
		expect(kill).toHaveBeenCalledTimes(1);
		expect(release).toHaveBeenCalledTimes(1);

		const recovered = await bridge.createTerminal!({ toolCallId: "call-recovered", command: "echo recovered" });
		expect(recovered.terminalId).toBe("term-cancel-2");
		expect(created).toBe(2);
		firstPublication.resolve();
		await firstPublication.promise;
	});

	it("aborts stalled creation promptly and retires a late-created terminal", async () => {
		const creationStarted = Promise.withResolvers<void>();
		const kill = mock(async () => {});
		const release = mock(async () => {});
		const lateHandle = {
			id: "term-late-created",
			currentOutput: async () => ({ output: "", truncated: false }),
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			kill,
			release,
		};
		const creation = Promise.withResolvers<typeof lateHandle>();
		const createTerminal = mock(async () => {
			creationStarted.resolve();
			return creation.promise;
		});
		const connection = {
			createTerminal,
			sessionUpdate: async () => {},
		} as unknown as AgentSideConnection;
		const bridge = createAcpClientBridge(connection, "session-1", { terminal: true });
		const controller = new AbortController();
		const pending = bridge.createTerminal!({
			toolCallId: "call-stalled-create",
			command: "echo hi",
			signal: controller.signal,
		});
		await creationStarted.promise;
		controller.abort();
		await expect(pending).rejects.toThrow("terminal creation aborted");
		await expect(bridge.createTerminal!({ toolCallId: "call-blocked", command: "echo retry" })).rejects.toThrow(
			"terminal provider quarantined after publication failure",
		);
		expect(createTerminal).toHaveBeenCalledTimes(1);
		creation.resolve(lateHandle);
		while (release.mock.calls.length === 0) await Bun.sleep(1);
		expect(kill).toHaveBeenCalledTimes(1);
		expect(release).toHaveBeenCalledTimes(1);
	});

	it("times out stalled creation without a caller signal and releases admission", async () => {
		const kill = mock(async () => {});
		const release = mock(async () => {});
		const lateHandle = {
			id: "term-internal-timeout",
			currentOutput: async () => ({ output: "", truncated: false }),
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			kill,
			release,
		};
		const creation = Promise.withResolvers<typeof lateHandle>();
		const createTerminal = mock(async () => creation.promise);
		const connection = { createTerminal, sessionUpdate: async () => {} } as unknown as AgentSideConnection;
		const bridge = createAcpClientBridge(connection, "session-1", { terminal: true });
		await expect(bridge.createTerminal!({ toolCallId: "call-timeout", command: "echo hi" })).rejects.toThrow(
			"terminal creation aborted",
		);
		await expect(bridge.createTerminal!({ toolCallId: "call-after-timeout", command: "echo retry" })).rejects.toThrow(
			"terminal provider quarantined after publication failure",
		);
		expect(createTerminal).toHaveBeenCalledTimes(1);
		creation.resolve(lateHandle);
		while (release.mock.calls.length === 0) await Bun.sleep(1);
		expect(kill).toHaveBeenCalledTimes(1);
		expect(release).toHaveBeenCalledTimes(1);
	});

	it("bounds stalled publication and cleans up the created terminal", async () => {
		const publication = Promise.withResolvers<void>();
		const kill = mock(async () => {});
		const release = mock(async () => {});
		const connection = {
			createTerminal: async () => ({
				id: "term-stalled-publication",
				currentOutput: async () => ({ output: "", truncated: false }),
				waitForExit: async () => ({ exitCode: 0, signal: null }),
				kill,
				release,
			}),
			sessionUpdate: async () => publication.promise,
		} as unknown as AgentSideConnection;
		const bridge = createAcpClientBridge(connection, "session-1", { terminal: true });
		await expect(bridge.createTerminal!({ toolCallId: "call-stalled", command: "echo hi" })).rejects.toThrow(
			"terminal publication did not settle within 500ms",
		);
		expect(kill).toHaveBeenCalledTimes(1);
		expect(release).toHaveBeenCalledTimes(1);
		publication.resolve();
		await publication.promise;
	});

	it("quarantines after caller abort when terminal cleanup cannot be confirmed", async () => {
		const publicationStarted = Promise.withResolvers<void>();
		const cleanupNever = Promise.withResolvers<void>();
		const createTerminal = mock(async () => ({
			id: "term-abort-cleanup-stall",
			currentOutput: async () => ({ output: "", truncated: false }),
			waitForExit: async () => ({ exitCode: 0, signal: null }),
			kill: async () => cleanupNever.promise,
			release: async () => {},
		}));
		const connection = {
			createTerminal,
			sessionUpdate: async () => {
				publicationStarted.resolve();
				return await new Promise<never>(() => {});
			},
		} as unknown as AgentSideConnection;
		const bridge = createAcpClientBridge(connection, "session-1", { terminal: true });
		const controller = new AbortController();
		const pending = bridge.createTerminal!({
			toolCallId: "call-abort-cleanup-stall",
			command: "echo hi",
			signal: controller.signal,
		});
		await publicationStarted.promise;
		controller.abort();
		await expect(pending).rejects.toThrow("terminal publication aborted");
		await expect(
			bridge.createTerminal!({ toolCallId: "call-after-cleanup-stall", command: "echo retry" }),
		).rejects.toThrow("terminal provider quarantined after publication failure");
		expect(createTerminal).toHaveBeenCalledTimes(1);
		cleanupNever.resolve();
	});
});
