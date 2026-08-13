import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { SessionManager } from "@gajae-code/coding-agent/session/session-manager";
import { ManagedSessionDescendantStore } from "../../src/session/internal/managed-session-storage";
import { makeAssistantMessage } from "./helpers";

function tempDir(prefix: string): string {
	return fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), prefix));
}

describe("managed rewrite ENOENT regression (P0)", () => {
	let root: string;
	let agentDir: string;
	let cwd: string;

	beforeEach(() => {
		root = tempDir("gjc-managed-enoent-");
		agentDir = path.join(root, "agent");
		cwd = path.join(root, "work");
		fs.mkdirSync(cwd, { recursive: true });
		fs.mkdirSync(agentDir, { recursive: true });
	});

	afterEach(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	it("recovers from missing predecessor on managed #writeEntriesAtomicallySync via replaceSync (darwin non-authority ENOENT)", async () => {
		// darwin: ManagedSessionDescendantStore has no retained authority, so missing
		// predecessor surfaces as ENOENT from fs.openSync. Baseline for gjc-crash.log.
		const destination = SessionManager.managedDestination(cwd, agentDir);
		const manager = SessionManager.create(cwd, destination);
		manager.appendMessage({ role: "user", content: "hello", timestamp: Date.now() });
		manager.appendMessage(makeAssistantMessage() as never);
		await manager.flush();

		const sessionFile = manager.getSessionFile();
		expect(sessionFile).toBeTruthy();
		expect(fs.existsSync(sessionFile!)).toBe(true);

		fs.rmSync(sessionFile!, { force: true });
		expect(fs.existsSync(sessionFile!)).toBe(false);

		expect(() =>
			manager.appendMessage({ role: "user", content: "after-delete", timestamp: Date.now() }),
		).not.toThrow();

		expect(fs.existsSync(sessionFile!)).toBe(true);
		expect(fs.readFileSync(sessionFile!, "utf8")).toContain("after-delete");

		await manager.close();
	});

	it("recovers from linux authority not_found via ENOENT normalization (regression for #writeEntriesAtomicallySync)", async () => {
		// linux retained RecoveryFsRoot reports missing as {ok:false, code:"not_found"} (not ENOENT).
		// Without widening, caller would throw unhandled instead of falling back to replaceSync.
		const destination = SessionManager.managedDestination(cwd, agentDir);
		const manager = SessionManager.create(cwd, destination);
		manager.appendMessage({ role: "user", content: "hello", timestamp: Date.now() });
		manager.appendMessage(makeAssistantMessage() as never);
		await manager.flush();

		const sessionFile = manager.getSessionFile()!;
		expect(fs.existsSync(sessionFile)).toBe(true);

		const origReplaceExpected = ManagedSessionDescendantStore.prototype.replaceExpectedIdentitySync;
		let threw = false;
		const spy = spyOn(ManagedSessionDescendantStore.prototype, "replaceExpectedIdentitySync").mockImplementation(
			function (this: unknown, ...args: unknown[]) {
				if (!threw) {
					threw = true;
					const err = new Error("not_found") as NodeJS.ErrnoException;
					(err as unknown as Record<string, unknown>)["code"] = "not_found";
					throw err;
				}
				return (origReplaceExpected as unknown as (...a: unknown[]) => unknown).apply(this, args);
			} as unknown as typeof origReplaceExpected,
		);

		try {
			expect(() =>
				manager.appendMessage({ role: "user", content: "after-not-found", timestamp: Date.now() }),
			).not.toThrow();
			expect(fs.existsSync(sessionFile)).toBe(true);
			expect(fs.readFileSync(sessionFile, "utf8")).toContain("after-not-found");
		} finally {
			spy.mockRestore();
			await manager.close();
		}
	});

	it("recovers from append not_found via normalization (covers #appendManagedRecordsSync)", async () => {
		const destination = SessionManager.managedDestination(cwd, agentDir);
		const manager = SessionManager.create(cwd, destination);
		manager.appendMessage({ role: "user", content: "hello", timestamp: Date.now() });
		manager.appendMessage(makeAssistantMessage() as never);
		await manager.flush();

		const sessionFile = manager.getSessionFile()!;
		const origAppendSync = ManagedSessionDescendantStore.prototype.appendSync;
		let threw2 = false;
		const spy2 = spyOn(ManagedSessionDescendantStore.prototype, "appendSync").mockImplementation(function (
			this: unknown,
			...args: unknown[]
		) {
			if (!threw2) {
				threw2 = true;
				const err = new Error("not_found") as NodeJS.ErrnoException;
				(err as unknown as Record<string, unknown>)["code"] = "not_found";
				throw err;
			}
			return (origAppendSync as unknown as (...a: unknown[]) => unknown).apply(this, args);
		} as unknown as typeof origAppendSync);

		try {
			manager.appendMessage({ role: "user", content: "after-append-not-found", timestamp: Date.now() });
			expect(fs.readFileSync(sessionFile, "utf8")).toContain("after-append-not-found");
		} finally {
			spy2.mockRestore();
			await manager.close();
		}
	});

	it("still fails closed on identity_mismatch (concurrent successor not overwritten)", async () => {
		const destination = SessionManager.managedDestination(cwd, agentDir);
		const manager = SessionManager.create(cwd, destination);
		manager.appendMessage({ role: "user", content: "hello", timestamp: Date.now() });
		manager.appendMessage(makeAssistantMessage() as never);
		await manager.flush();

		const sessionFile = manager.getSessionFile()!;
		fs.writeFileSync(
			sessionFile,
			`${JSON.stringify({ type: "session", id: "other", timestamp: new Date().toISOString(), cwd })}\n`,
		);

		let threw = false;
		try {
			manager.appendMessage({ role: "user", content: "should-fail-closed", timestamp: Date.now() });
		} catch (e) {
			threw = true;
			expect(String(e)).toMatch(/identity_mismatch|managed_replace_identity_mismatch/);
		}
		expect(threw).toBe(true);
		await manager.close().catch(() => {});
	});

	it("explicit destination still rewrites through temp file (no managed path)", async () => {
		const explicitDir = path.join(root, "explicit-sessions");
		fs.mkdirSync(explicitDir, { recursive: true });
		const manager = SessionManager.create(cwd, SessionManager.explicitDestination(explicitDir));
		manager.appendMessage({ role: "user", content: "hello", timestamp: Date.now() });
		manager.appendMessage(makeAssistantMessage() as never);
		await manager.flush();
		const file = manager.getSessionFile()!;
		expect(fs.existsSync(file)).toBe(true);
		manager.appendMessage({ role: "user", content: "x", timestamp: Date.now() });
		manager.appendMessage(makeAssistantMessage() as never);
		expect(fs.existsSync(file)).toBe(true);
		await manager.close();
	});
});
