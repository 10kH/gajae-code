/**
 * ClientBridge — abstraction over capabilities provided by an external client
 * (e.g. ACP editor host) that the agent can route through instead of operating
 * directly on the local filesystem / spawning local subprocesses.
 *
 * When `undefined`, tools fall back to local IO. When populated (currently
 * only by `AcpAgent`), tools route requests through the client so it can
 * surface unsaved buffer state, render terminals in the IDE, or gate
 * destructive operations behind user permission prompts.
 */

export interface ClientBridgeCapabilities {
	/** Client implements `fs/read_text_file`. */
	readTextFile?: boolean;
	/** Client implements `fs/write_text_file`. */
	writeTextFile?: boolean;
	/** Client implements the `terminal/*` family. */
	terminal?: boolean;
	/** Client implements `session/request_permission`. */
	requestPermission?: boolean;
}

export interface ClientBridgePermissionToolCall {
	toolCallId: string;
	toolName: string;
	title: string;
	kind?: string;
	status?: "pending" | "in_progress" | "completed" | "failed";
	rawInput?: unknown;
	content?: unknown[];
	locations?: { path: string; line?: number }[];
}

export type ClientBridgePermissionOptionKind = "allow_once" | "allow_always" | "reject_once" | "reject_always";

export interface ClientBridgePermissionOption {
	optionId: string;
	name: string;
	kind: ClientBridgePermissionOptionKind;
}

export type ClientBridgePermissionOutcome =
	| { outcome: "cancelled" }
	| { outcome: "selected"; optionId: string; kind?: ClientBridgePermissionOptionKind };

export interface ClientBridgeTerminalExitStatus {
	exitCode?: number | null;
	signal?: string | null;
}

export interface ClientBridgeTerminalOutput {
	output: string;
	truncated: boolean;
	exitStatus?: ClientBridgeTerminalExitStatus | null;
}

export interface ClientBridgeTerminalHandle {
	terminalId: string;
	/** Exact provider lease/session identity that owns this terminal. */
	providerLeaseId: string;
	waitForExit(): Promise<ClientBridgeTerminalExitStatus>;
	currentOutput(): Promise<ClientBridgeTerminalOutput>;
	kill(): Promise<void>;
	release(): Promise<void>;
	/** Full authenticated provider identity, when supplied by the transport. */
	providerLeaseIdentity?: ClientBridgeProviderLeaseIdentity;
}

export interface ClientBridgeProviderLeaseIdentity {
	leaseId: string;
	connectionId: string;
	connectionGeneration: number;
	fence: string;
}

export interface ClientBridgeCreateTerminalParams {
	toolCallId: string;
	command: string;
	args?: string[];
	env?: Array<{ name: string; value: string }>;
	cwd?: string;
	outputByteLimit?: number;
	signal?: AbortSignal;
}

export interface ClientBridge {
	readonly capabilities: ClientBridgeCapabilities;
	/** ACP v1 clients cannot show server-initiated turns as busy after prompt response. */
	readonly deferAgentInitiatedTurns?: boolean;
	readTextFile?(params: { path: string; line?: number; limit?: number }): Promise<string>;
	writeTextFile?(params: { path: string; content: string }): Promise<void>;
	createTerminal?(params: ClientBridgeCreateTerminalParams): Promise<ClientBridgeTerminalHandle>;
	/** Fence the exact provider identity after cleanup ownership becomes uncertain. */
	quarantineProviderLease?(providerLease: string | ClientBridgeProviderLeaseIdentity, reason: string): Promise<void>;
	requestPermission?(
		toolCall: ClientBridgePermissionToolCall,
		options: ClientBridgePermissionOption[],
		signal?: AbortSignal,
	): Promise<ClientBridgePermissionOutcome>;
}
