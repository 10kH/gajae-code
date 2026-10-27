import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fsSync from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import * as net from "node:net";
import { tmpdir } from "node:os";
import * as path from "node:path";
import fc from "fast-check";
import { RuntimeOwner } from "../../src/harness-control-plane/owner";
import { acquireLease } from "../../src/harness-control-plane/session-lease";
import type { HarnessSessionTransport } from "../../src/harness-control-plane/session-transport";
import { controlSocketPath, sessionPaths, writeSessionState } from "../../src/harness-control-plane/storage";
import { SESSION_SCHEMA_VERSION, type SessionHandle, type SessionState } from "../../src/harness-control-plane/types";
import { createHarnessCliEnv, type HarnessCliEnv } from "./cli-workspace-env";

const repoRoot = path.resolve(import.meta.dir, "..", "..", "..", "..");
const cliEntry = path.join(repoRoot, "packages", "coding-agent", "src", "cli.ts");
const SID = "h-route";
const SECRET = "planted-prompt-secret";
const FORGED = "forged-owner-marker";
const ALLOWED = "canonical-owner-marker";

function symlinkSupported(): boolean {
	const windows = process.platform === "win32";
	if (windows) {
		return false;
	}
	const dir = fsSync.mkdtempSync(path.join(tmpdir(), "sy"));
	try {
		fsSync.symlinkSync(path.join(dir, "t"), path.join(dir, "l"));
		return true;
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code === "EPERM") {
			return false;
		}
		throw error;
	} finally {
		fsSync.rmSync(dir, { recursive: true, force: true });
	}
}

const canSymlink = symlinkSupported();

function privatePrefixAlias(canonical: string): string | null {
	if (process.platform !== "darwin") {
		return null;
	}
	if (canonical.startsWith("/private/")) {
		const rest = canonical.slice("/private".length);
		if (rest.startsWith("/var/") || rest.startsWith("/tmp/")) return rest;
		return null;
	}
	if (canonical.startsWith("/var/") || canonical.startsWith("/tmp/")) return `/private${canonical}`;
	return null;
}

const privatePrefixAliasAvailable = privatePrefixAlias(path.join(tmpdir(), "c.sock")) !== null;

let root: string;
let cliEnv: HarnessCliEnv;
const extraDirs: string[] = [];

function seed(): SessionState {
	const now = new Date().toISOString();
	return {
		schemaVersion: SESSION_SCHEMA_VERSION,
		sessionId: SID,
		lifecycle: "started",
		harness: "gajae-code",
		handle: { sessionId: SID, harness: "gajae-code", workspace: root, branch: "feat/x" } as SessionHandle,
		retries: {},
		blockers: [],
		createdAt: now,
		updatedAt: now,
	};
}

async function plantLease(endpointPath: string): Promise<void> {
	const now = Date.now();
	const lease = {
		ownerId: "owner-planted",
		sessionId: SID,
		pid: process.pid,
		leaseTokenHash: "ab".repeat(32),
		endpoint: { kind: "unix-socket", path: endpointPath },
		eventsPath: sessionPaths(root, SID).events,
		heartbeatAt: new Date(now).toISOString(),
		expiresAt: new Date(now + 60_000).toISOString(),
		leaseEpoch: 1,
		writer: { ownerId: "owner-planted", leaseEpoch: 1 },
	};
	await writeFile(sessionPaths(root, SID).lease, `${JSON.stringify(lease)}\n`, "utf8");
}

function listen(socketPath: string, marker: string): Promise<{ received: string[]; close: () => Promise<void> }> {
	const received: string[] = [];
	const sockets = new Set<net.Socket>();
	const server = net.createServer(socket => {
		sockets.add(socket);
		socket.on("close", () => sockets.delete(socket));
		let buf = "";
		socket.setEncoding("utf8");
		socket.on("data", (chunk: string) => {
			buf += chunk;
			const nl = buf.indexOf("\n");
			if (nl < 0) return;
			received.push(buf.slice(0, nl));
			socket.write(`${JSON.stringify({ ok: true, evidence: { marker } })}\n`);
		});
	});
	return new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(socketPath, () => {
			resolve({
				received,
				close: () =>
					new Promise(done => {
						for (const socket of sockets) socket.destroy();
						server.close(() => done());
					}),
			});
		});
	});
}

class IdleTransport implements HarnessSessionTransport {
	async getState() {
		return { isStreaming: false, steeringQueueDepth: 0, followupQueueDepth: 0 };
	}
	eventCursor(): number {
		return 0;
	}
	async sendPrompt() {
		return { commandId: "route", ack: true };
	}
	async waitForAgentStart() {
		return null;
	}
	async close(): Promise<void> {}
}

async function withSocketEnv(
	overrides: Record<string, string | undefined>,
	fn: (owner: RuntimeOwner) => Promise<void>,
): Promise<void> {
	const saved: Record<string, string | undefined> = {};
	for (const key of Object.keys(overrides)) {
		saved[key] = process.env[key];
		const value = overrides[key];
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
	let owner: RuntimeOwner | null = null;
	try {
		owner = new RuntimeOwner({
			root,
			sessionId: SID,
			transport: new IdleTransport(),
			heartbeatMs: 60_000,
		});
		await owner.start();
		await fn(owner);
	} finally {
		await owner?.stop();
		for (const [key, value] of Object.entries(saved)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	}
}

async function runHarness(
	args: string[],
	extra: Record<string, string> = {},
): Promise<{ code: number; raw: string; stderr: string }> {
	const env: Record<string, string> = {};
	for (const [name, value] of Object.entries(cliEnv.env)) {
		if (value !== undefined) env[name] = value;
	}
	env.GJC_HARNESS_STATE_ROOT = root;
	env.GJC_SESSION_ID = "route-test";
	Object.assign(env, extra);
	const proc = Bun.spawn([process.execPath, cliEntry, "harness", ...args], {
		cwd: root,
		env,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
	return { code: await proc.exited, raw: stdout, stderr };
}

beforeEach(async () => {
	root = await mkdtemp(path.join(tmpdir(), "hsr-"));
	cliEnv = createHarnessCliEnv(repoRoot);
	await writeSessionState(root, seed());
});

afterEach(async () => {
	cliEnv.cleanup();
	await rm(root, { recursive: true, force: true });
	await Promise.all(extraDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

describe("harness owner socket routing", () => {
	it.skipIf(process.platform === "win32")(
		"does not dial a workspace lease endpoint outside the private socket",
		async () => {
			const foreign = path.join(root, "attacker.sock");
			expect(Buffer.byteLength(foreign)).toBeLessThanOrEqual(100);
			const server = await listen(foreign, FORGED);
			try {
				await plantLease(foreign);
				const promptFile = path.join(root, "prompt.txt");
				await writeFile(promptFile, SECRET, "utf8");
				const res = await runHarness(["submit", "--session", SID, "--prompt-file", promptFile, "--input", "{}"]);
				expect(server.received.join("\n")).not.toContain(SECRET);
				expect(server.received).toHaveLength(0);
				expect(res.raw).not.toContain(FORGED);
			} finally {
				await server.close();
			}
		},
		20_000,
	);

	it.skipIf(process.platform === "win32")(
		"allows a private owner socket to receive observe",
		async () => {
			const canonical = controlSocketPath(root, SID);
			const server = await listen(canonical, ALLOWED);
			try {
				await plantLease(canonical);
				const res = await runHarness(["observe", "--session", SID]);
				expect(res.code).toBe(0);
				expect(res.raw).toContain(ALLOWED);
				expect(server.received.some(line => line.includes('"observe"'))).toBe(true);
			} finally {
				await server.close();
			}
		},
		20_000,
	);

	it.skipIf(process.platform === "win32")(
		"dials the private socket when the lease path uses dot segments",
		async () => {
			const canonical = controlSocketPath(root, SID);
			const dotted = `${canonical}${path.sep}..${path.sep}${path.basename(canonical)}`;
			const server = await listen(canonical, ALLOWED);
			try {
				await plantLease(dotted);
				const res = await runHarness(["observe", "--session", SID]);
				expect(res.code).toBe(0);
				expect(res.raw).toContain(ALLOWED);
				expect(server.received.some(line => line.includes('"observe"'))).toBe(true);
			} finally {
				await server.close();
			}
		},
		20_000,
	);

	it.skipIf(process.platform === "win32")(
		"allows a custom socket directory to receive observe",
		async () => {
			const socketDir = await mkdtemp(path.join(tmpdir(), "hsd-"));
			extraDirs.push(socketDir);
			const env = { GJC_HARNESS_SOCKET_DIR: socketDir };
			const canonical = controlSocketPath(root, SID, env);
			const server = await listen(canonical, ALLOWED);
			try {
				await plantLease(canonical);
				const res = await runHarness(["observe", "--session", SID], env);
				expect(res.code).toBe(0);
				expect(res.raw).toContain(ALLOWED);
				expect(server.received.some(line => line.includes('"observe"'))).toBe(true);
			} finally {
				await server.close();
			}
		},
		20_000,
	);

	it.skipIf(process.platform !== "darwin")(
		"allows a different letter case of the private socket name to receive observe",
		async () => {
			const canonical = controlSocketPath(root, SID);
			const cased = path.join(path.dirname(canonical), path.basename(canonical).toUpperCase());
			expect(cased).not.toBe(canonical);
			const server = await listen(canonical, ALLOWED);
			try {
				await plantLease(cased);
				const res = await runHarness(["observe", "--session", SID]);
				expect(res.code).toBe(0);
				expect(res.raw).toContain(ALLOWED);
			} finally {
				await server.close();
			}
		},
		20_000,
	);

	it.skipIf(process.platform !== "darwin" || !privatePrefixAliasAvailable)(
		"allows the private-var alias of the private socket to receive observe",
		async () => {
			const canonical = controlSocketPath(root, SID);
			const alias = privatePrefixAlias(canonical);
			expect(alias).toBeTruthy();
			expect(alias).not.toBe(canonical);
			const server = await listen(canonical, ALLOWED);
			try {
				await plantLease(alias!);
				const res = await runHarness(["observe", "--session", SID]);
				expect(res.code).toBe(0);
				expect(res.raw).toContain(ALLOWED);
			} finally {
				await server.close();
			}
		},
		20_000,
	);

	it.skipIf(process.platform === "win32" || !canSymlink)(
		"does not dial a symlink placed at the private socket",
		async () => {
			const foreign = path.join(root, "attacker.sock");
			const canonical = controlSocketPath(root, SID);
			const server = await listen(foreign, FORGED);
			try {
				await fsSync.promises.symlink(foreign, canonical);
				await plantLease(canonical);
				const promptFile = path.join(root, "prompt.txt");
				await writeFile(promptFile, SECRET, "utf8");
				const res = await runHarness(["submit", "--session", SID, "--prompt-file", promptFile, "--input", "{}"]);
				expect(server.received).toHaveLength(0);
				expect(res.raw).not.toContain(FORGED);
				expect(server.received.join("\n")).not.toContain(SECRET);
			} finally {
				await server.close();
			}
		},
		20_000,
	);

	it.skipIf(process.platform === "win32")(
		"routes observe to a live owner when the command omits the socket dir",
		async () => {
			const socketDir = await mkdtemp(path.join(tmpdir(), "hsd-"));
			extraDirs.push(socketDir);
			await withSocketEnv({ GJC_HARNESS_SOCKET_DIR: socketDir }, async () => {
				const res = await runHarness(["observe", "--session", SID], { GJC_HARNESS_SOCKET_DIR: "" });
				const body = JSON.parse(res.raw) as {
					evidence?: { ownerRouted?: boolean };
					state?: { ownerLive?: boolean };
				};
				expect(res.code).toBe(0);
				expect(body.evidence?.ownerRouted).toBe(true);
				expect(body.state?.ownerLive).toBe(true);
			});
		},
		20_000,
	);

	it.skipIf(process.platform === "win32")(
		"routes observe to a live owner when the command socket dir differs",
		async () => {
			const socketDir = await mkdtemp(path.join(tmpdir(), "hsd-"));
			const otherDir = await mkdtemp(path.join(tmpdir(), "hsd-"));
			extraDirs.push(socketDir, otherDir);
			await withSocketEnv({ GJC_HARNESS_SOCKET_DIR: socketDir }, async () => {
				const res = await runHarness(["observe", "--session", SID], { GJC_HARNESS_SOCKET_DIR: otherDir });
				const body = JSON.parse(res.raw) as { evidence?: { ownerRouted?: boolean } };
				expect(res.code).toBe(0);
				expect(body.evidence?.ownerRouted).toBe(true);
			});
		},
		20_000,
	);

	it.skipIf(process.platform === "win32")(
		"routes observe to a live owner when the command temp dir differs",
		async () => {
			const ownerTmp = await mkdtemp(path.join(tmpdir(), "hst-"));
			const commandTmp = await mkdtemp(path.join(tmpdir(), "hst-"));
			extraDirs.push(ownerTmp, commandTmp);
			await withSocketEnv({ TMPDIR: ownerTmp, GJC_HARNESS_SOCKET_DIR: undefined }, async () => {
				const res = await runHarness(["observe", "--session", SID], {
					TMPDIR: commandTmp,
					GJC_HARNESS_SOCKET_DIR: "",
				});
				const body = JSON.parse(res.raw) as { evidence?: { ownerRouted?: boolean } };
				expect(res.code).toBe(0);
				expect(body.evidence?.ownerRouted).toBe(true);
			});
		},
		20_000,
	);

	it.skipIf(process.platform === "win32")(
		"holds a live owner lease when a second acquire uses another socket dir",
		async () => {
			const socketDir = await mkdtemp(path.join(tmpdir(), "hsd-"));
			const otherDir = await mkdtemp(path.join(tmpdir(), "hsd-"));
			extraDirs.push(socketDir, otherDir);
			await withSocketEnv({ GJC_HARNESS_SOCKET_DIR: socketDir }, async () => {
				const previous = process.env.GJC_HARNESS_SOCKET_DIR;
				delete process.env.GJC_HARNESS_SOCKET_DIR;
				process.env.GJC_HARNESS_SOCKET_DIR = otherDir;
				try {
					await expect(
						acquireLease(root, SID, {
							ownerId: "owner-other",
							pid: process.pid,
							eventsPath: sessionPaths(root, SID).events,
							endpoint: { kind: "unix-socket", path: controlSocketPath(root, SID) },
							ttlMs: 10_000,
						}),
					).rejects.toThrow(/lease_held/);
				} finally {
					if (previous === undefined) delete process.env.GJC_HARNESS_SOCKET_DIR;
					else process.env.GJC_HARNESS_SOCKET_DIR = previous;
				}
			});
		},
		20_000,
	);

	it("property owner socket lexical identity", async () => {
		const mod = await import("../../src/harness-control-plane/session-lease");
		const classify = mod.classifyOwnerSocketLexical;
		expect(typeof classify).toBe("function");
		const segment = fc.string({ minLength: 1, maxLength: 12 }).filter(value => /^[A-Za-z0-9_-]+$/.test(value));
		fc.assert(
			fc.property(fc.array(segment, { minLength: 1, maxLength: 4 }), segment, (parts, name) => {
				const canonical = path.join(path.sep, ...parts, name);
				const dotted = `${canonical}${path.sep}.${path.sep}..${path.sep}${path.basename(canonical)}`;
				const trailed = `${canonical}${path.sep}`;
				expect(classify(canonical, canonical)).toBe("match");
				expect(classify(dotted, canonical)).toBe("match");
				expect(classify(trailed, canonical)).toBe("match");
				expect(classify(`${canonical}x`, canonical)).toBe("mismatch");
				expect(classify(` ${canonical}`, canonical)).toBe("mismatch");
				expect(classify(`${canonical} `, canonical)).toBe("mismatch");
				expect(classify("", canonical)).toBe("mismatch");
				expect(classify(`${canonical}\0`, canonical)).toBe("mismatch");
				expect(classify(`${canonical}\\extra`, canonical)).toBe("mismatch");
				expect(classify(dotted, canonical)).toBe(classify(path.resolve(dotted), canonical));
				return true;
			}),
			{ seed: 618, numRuns: 64 },
		);
	});
});
