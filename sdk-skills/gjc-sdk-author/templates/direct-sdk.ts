#!/usr/bin/env bun

import { createHash, randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";

const CORE_QUERIES = ["session.metadata", "context.get", "goal.list/get", "todo.list", "workflow.gates.list", "session.stats"] as const;
const ALLOWED_CONTROLS: ReadonlySet<string> = new Set(["turn.prompt","turn.steer","turn.follow_up","ask.answer","workflow.gate_answer","todo.replace","session.switch","session.rename"]);
const SECRET_FIELD = /(?:secret|token|password|credential|authorization|api[_-]?key)/i;
const ALLOWED_ARGUMENTS = new Set(["--repo", "--session-id", "--mode", "--operation", "--input"]);

type Arguments = { repo: string; sessionId?: string; mode: "inspect" | "control"; operation?: string; input: Record<string, unknown> };

function parseArgs(argv: string[]): Arguments {
	const values = new Map<string, string>();
	for (let index = 0; index < argv.length; index++) {
		const token = argv[index];
		if (!ALLOWED_ARGUMENTS.has(token)) throw new Error("invalid_argument");
		const value = argv[++index];
		if (!value) throw new Error("missing_argument_value");
		values.set(token, value);
	}
	const repo = values.get("--repo");
	if (!repo) throw new Error("missing_repo");
	const mode = values.get("--mode") ?? "inspect";
	if (mode !== "inspect" && mode !== "control") throw new Error("invalid_mode");
	const rawInput = values.get("--input") ?? "{}";
	const input: unknown = JSON.parse(rawInput);
	if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_input");
	return { repo, sessionId: values.get("--session-id"), mode, operation: values.get("--operation"), input: input as Record<string, unknown> };
}

function redact(value: unknown): unknown {
	if (typeof value === "string") return value;
	if (Array.isArray(value)) return value.map(redact);
	if (!value || typeof value !== "object") return value;
	return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, SECRET_FIELD.test(key) ? "[REDACTED]" : redact(item)]));
}

async function requireApproval(sessionId: string, operation: string, input: Record<string, unknown>): Promise<void> {
	const digest = createHash("sha256").update(JSON.stringify({ sessionId, operation, input })).digest("hex").slice(0, 16);
	const challenge = `APPROVE ${sessionId} ${operation} ${digest} ${randomBytes(8).toString("hex")}`;
	const reader = createInterface({ input: process.stdin, output: process.stderr });
	try {
		if ((await reader.question(`Approval required: ${challenge}\nType the exact challenge: `)).trim() !== challenge)
			throw new Error("human_approval_required");
	} finally { reader.close(); }
}

async function raw(repo: string, args: string[]): Promise<unknown> {
	const process = Bun.spawn(["gjc", "sdk", "session", "raw", ...args, "--repo", repo], { stdout: "pipe", stderr: "pipe" });
	const output = await new Response(process.stdout).text();
	if ((await process.exited) !== 0) throw new Error("broker_dispatch_failed");
	return JSON.parse(output) as unknown;
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	if (!args.sessionId) throw new Error("session_id_required");
	let result: unknown;
	if (args.mode === "inspect") {
		result = Object.fromEntries(await Promise.all(CORE_QUERIES.map(async query => {
			try { return [query, { status: "confirmed", source: query, value: await raw(args.repo, ["query", args.sessionId!, "--query", query]) }]; }
			catch { return [query, { status: "unavailable", source: query }]; }
		})));
	} else {
		if (!args.operation || !ALLOWED_CONTROLS.has(args.operation)) throw new Error("operation_not_allowed");
		if (args.operation === "workflow.gate_answer") args.input.expectedSessionId = args.sessionId;
		await requireApproval(args.sessionId, args.operation, args.input);
		result = await raw(args.repo, ["control", args.sessionId, "--op", args.operation, "--json-input", JSON.stringify(args.input), "--confirm"]);
	}
	process.stdout.write(JSON.stringify(redact({ sessionId: args.sessionId, result }), null, 2) + "\n");
}

main().catch(() => { process.stderr.write("GJC SDK request failed safely.\n"); process.exitCode = 1; });
