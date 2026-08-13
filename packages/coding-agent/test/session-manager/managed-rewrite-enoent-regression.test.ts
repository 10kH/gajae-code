import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { SessionManager } from "@gajae-code/coding-agent/session/session-manager";
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

	it("recovers from missing predecessor on managed #writeEntriesAtomicallySync via replaceSync", async () => {
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
