import { expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { SessionManager } from "../src/session/session-manager";

it("exits cleanly when a real print-mode resume loses its transcript identity", async () => {
	const root = await fs.mkdtemp(path.join(import.meta.dirname, ".tmp-parallel-resume-"));
	const agentDir = path.join(root, "agent");
	const cwd = path.join(root, "workspace");
	await fs.mkdir(cwd);
	let requests = 0;
	const server = Bun.serve({
		hostname: "127.0.0.1",
		port: 0,
		fetch() {
			requests++;
			const chunks = [
				{ choices: [{ index: 0, delta: { role: "assistant", content: "WINNER" }, finish_reason: null }] },
				{ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] },
			];
			return new Response(`${chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n\n`).join("")}data: [DONE]\n\n`, {
				headers: { "Content-Type": "text/event-stream" },
			});
		},
	});
	try {
		await Bun.write(
			path.join(agentDir, "models.yml"),
			`providers:\n  fixture:\n    baseUrl: http://127.0.0.1:${server.port}/v1\n    apiKey: fixture-key\n    api: openai-completions\n    models:\n      - id: fixture-model\n        name: Fixture Model\n        contextWindow: 32768\n        maxTokens: 4096\n`,
		);
		await Bun.write(path.join(agentDir, "settings.json"), JSON.stringify({ compaction: { enabled: false } }));
		const manager = SessionManager.create(cwd, SessionManager.managedDestination(cwd, agentDir));
		manager.appendMessage({ role: "user", content: "original", timestamp: 1 });
		await manager.ensureOnDisk();
		const file = manager.getSessionFile();
		const sid = manager.getSessionId();
		if (!file) throw new Error("Missing transcript");
		expect(await manager.closeStrict()).toEqual({ kind: "closed" });
		const env: Record<string, string | undefined> = {};
		for (const [key, value] of Object.entries(process.env)) {
			if (!key.startsWith("GJC_") && !key.startsWith("PI_")) env[key] = value;
		}
		Object.assign(env, { GJC_CODING_AGENT_DIR: agentDir, GJC_SDK_DISABLE: "1", NO_COLOR: "1" });
		const cli = path.resolve(import.meta.dirname, "../src/cli.ts");
		const run = async (rotate: boolean) => {
			const child = Bun.spawn(
				[
					process.execPath,
					...(rotate
						? ["--preload", path.join(import.meta.dirname, "fixtures/parallel-resume-rotate-preload.ts")]
						: []),
					cli,
					"-p",
					"--model",
					"fixture/fixture-model",
					"-r",
					sid,
					rotate ? "LOSER" : "WINNER",
				],
				{ cwd, env, stdout: "pipe", stderr: "pipe", stdin: "ignore" },
			);
			const timer = setTimeout(() => child.kill(), 20_000);
			try {
				const [code, stdout, stderr] = await Promise.all([
					child.exited,
					new Response(child.stdout).text(),
					new Response(child.stderr).text(),
				]);
				return { code, stdout, stderr };
			} finally {
				clearTimeout(timer);
			}
		};
		const winner = await run(false);
		expect(winner, JSON.stringify(winner)).toMatchObject({ code: 0 });
		expect(winner.stdout).toContain("WINNER");
		const transcript = await Bun.file(file).text();
		const crashFile = Bun.file(path.join(agentDir, "gjc-crash.log"));
		const crashes = (await crashFile.exists()) ? await crashFile.text() : "";
		const requestsBeforeLoser = requests;
		const loser = await run(true);
		expect(loser, JSON.stringify(loser)).toEqual({
			code: 1,
			stdout: "",
			stderr:
				"Session was resumed by another process; this resume did not run. Retry, or resume a different session.\n",
		});
		expect(requests).toBe(requestsBeforeLoser);
		expect((await crashFile.exists()) ? await crashFile.text() : "").toBe(crashes);
		const finalTranscript = await Bun.file(file).text();
		expect(finalTranscript).toBe(await Bun.file(`${file}.before-rejection`).text());
		expect(finalTranscript.startsWith(transcript)).toBe(true);
		const entries = Bun.JSONL.parse(finalTranscript) as { id?: string; type: string }[];
		expect(entries.filter(entry => entry.type === "message")).toEqual(
			(Bun.JSONL.parse(transcript) as { type: string }[]).filter(entry => entry.type === "message"),
		);
		const ids = entries.flatMap(entry => (entry.id ? [entry.id] : []));
		expect(new Set(ids).size).toBe(ids.length);
	} finally {
		server.stop(true);
		await fs.rm(root, { recursive: true, force: true });
	}
}, 60_000);
