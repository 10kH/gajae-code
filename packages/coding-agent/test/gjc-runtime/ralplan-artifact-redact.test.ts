import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { runRalplanCliCommand } from "../../src/commands/ralplan";

const SESSION = "ralplan-redact-session";
const SECRET = "sk-ant-api03-ralplanartifactsecret";
const TOKEN = "ralplan-bearer-token-value";
let previousSession: string | undefined;

beforeAll(() => {
	previousSession = process.env.GJC_SESSION_ID;
	process.env.GJC_SESSION_ID = SESSION;
});

afterAll(() => {
	if (previousSession === undefined) delete process.env.GJC_SESSION_ID;
	else process.env.GJC_SESSION_ID = previousSession;
});

async function tempDir(): Promise<string> {
	return await fs.mkdtemp(path.join(os.tmpdir(), "ralplan-redact-"));
}

describe("gjc ralplan --write artifact scrub", () => {
	it("drops credential shapes from planner and pending-approval bodies", async () => {
		const root = await tempDir();
		try {
			const body = `# Plan\nUse ${SECRET} and Bearer ${TOKEN}.\nKeep src/app.ts.\n`;
			const planner = await runRalplanCliCommand(
				["--write", "--stage", "planner", "--stage_n", "1", "--artifact", body, "--run-id", "redact-run", "--json"],
				root,
			);
			expect(planner.status).toBe(0);
			const plannerPayload = JSON.parse(planner.stdout ?? "{}") as { sha256: string; path: string };
			const stored = await fs.readFile(plannerPayload.path, "utf8");
			expect(stored).not.toContain(SECRET);
			expect(stored).not.toContain(TOKEN);
			expect(stored).toContain("src/app.ts");
			expect(createHash("sha256").update(stored).digest("hex")).toBe(plannerPayload.sha256);

			const finalWrite = await runRalplanCliCommand(
				[
					"--write",
					"--stage",
					"final",
					"--stage_n",
					"2",
					"--artifact",
					`# Final\n${SECRET}\n`,
					"--run-id",
					"redact-run",
					"--json",
				],
				root,
			);
			expect(finalWrite.status).toBe(0);
			const finalPayload = JSON.parse(finalWrite.stdout ?? "{}") as {
				path: string;
				sha256: string;
				pending_approval_path: string;
			};
			const stage = await fs.readFile(finalPayload.path, "utf8");
			const pending = await fs.readFile(finalPayload.pending_approval_path, "utf8");
			expect(pending).toBe(stage);
			expect(pending).not.toContain(SECRET);
			expect(createHash("sha256").update(stage).digest("hex")).toBe(finalPayload.sha256);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	it("keeps an ordinary plan and dedupes an identical rewrite", async () => {
		const root = await tempDir();
		try {
			const body = "# Plan\nKeep src/app.ts and the ordinary review note.\n";
			const args = [
				"--write",
				"--stage",
				"planner",
				"--stage_n",
				"1",
				"--artifact",
				body,
				"--run-id",
				"plain-run",
				"--json",
			];
			const first = await runRalplanCliCommand(args, root);
			expect(first.status).toBe(0);
			const payload = JSON.parse(first.stdout ?? "{}") as { path: string; sha256: string };
			expect(await fs.readFile(payload.path, "utf8")).toBe(body);
			const second = await runRalplanCliCommand(args, root);
			expect(second.status).toBe(0);
			const again = JSON.parse(second.stdout ?? "{}") as { deduplicated?: boolean; sha256: string };
			expect(again.deduplicated).toBe(true);
			expect(again.sha256).toBe(payload.sha256);
			expect(await fs.readFile(payload.path, "utf8")).toBe(body);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	it("removes credential text from disposition evidence and leaves receipt digests", async () => {
		const root = await tempDir();
		try {
			const architect = await runRalplanCliCommand(
				[
					"--write",
					"--stage",
					"architect",
					"--stage_n",
					"1",
					"--artifact",
					"# architect\n",
					"--run-id",
					"disp-redact",
					"--json",
				],
				root,
			);
			const critic = await runRalplanCliCommand(
				[
					"--write",
					"--stage",
					"critic",
					"--stage_n",
					"1",
					"--artifact",
					"# critic\n",
					"--run-id",
					"disp-redact",
					"--json",
				],
				root,
			);
			expect(architect.status).toBe(0);
			expect(critic.status).toBe(0);
			const arch = JSON.parse(architect.stdout ?? "{}") as { path: string; sha256: string };
			const crit = JSON.parse(critic.stdout ?? "{}") as { path: string; sha256: string };
			const artifactPath = path.join(root, "disposition.json");
			await fs.writeFile(
				artifactPath,
				JSON.stringify({
					schema: "ralplan.review_conflicts.v1",
					plannerStageN: 1,
					findings: [
						{
							findingId: "arch-1",
							targetId: "contract.field",
							action: "remove",
							severity: "block",
							evidence: `drop ${SECRET}`,
							sourceRole: "architect",
							sourceReceipt: { stage: "architect", stageN: 1, path: arch.path, sha256: arch.sha256 },
						},
						{
							findingId: "crit-1",
							targetId: "contract.field",
							action: "add",
							severity: "watch",
							evidence: "keep the field",
							sourceRole: "critic",
							sourceReceipt: { stage: "critic", stageN: 1, path: crit.path, sha256: crit.sha256 },
						},
					],
					dispositions: [
						{
							conflictId: "conflict:contract.field:arch-1:crit-1",
							choice: "accept_architect",
							rationale: "ordinary rationale",
							decisionOwner: "ralplan-leader",
							affectedSections: ["## Contracts"],
						},
					],
				}),
			);
			const written = await runRalplanCliCommand(
				[
					"--write",
					"--stage",
					"disposition",
					"--stage_n",
					"1",
					"--artifact",
					artifactPath,
					"--run-id",
					"disp-redact",
					"--json",
				],
				root,
			);
			expect(written.status).toBe(0);
			const payload = JSON.parse(written.stdout ?? "{}") as { path: string };
			const stored = await fs.readFile(payload.path, "utf8");
			expect(stored).not.toContain(SECRET);
			expect(stored).toContain(arch.sha256);
			expect(stored).toContain(crit.sha256);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});
});

const PROPERTY_SEED = 5472026;

function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

describe("scrubRalplanPersistedBody property", () => {
	it("property: scrub idempotence and safe-text agreement, seed 5472026, 64 inputs", async () => {
		const { scrubRalplanPersistedBody } = await import("../../src/gjc-runtime/ralplan-runtime");
		const rand = mulberry32(PROPERTY_SEED);
		const digest = "ab".repeat(32);
		for (let index = 0; index < 64; index++) {
			const note = `note${Math.floor(rand() * 1000)}`;
			const safe = `# Plan\nKeep src/file${index}.ts ${note}.\n`;
			expect(scrubRalplanPersistedBody("planner", safe)).toBe(safe);
			expect(scrubRalplanPersistedBody("planner", safe)).toBe(
				scrubRalplanPersistedBody("planner", scrubRalplanPersistedBody("planner", safe)),
			);
			const planted = `# Plan\n${SECRET} ${note}\n`;
			const redacted = scrubRalplanPersistedBody("planner", planted);
			expect(redacted).not.toContain(SECRET);
			expect(redacted).toContain(note);
			expect(scrubRalplanPersistedBody("planner", redacted)).toBe(redacted);
			const doc = `${JSON.stringify({ evidence: `see ${SECRET} ${note}`, sha256: digest, path: `src/file${index}.ts` }, null, 2)}\n`;
			const disposition = scrubRalplanPersistedBody("disposition", doc);
			const parsed = JSON.parse(disposition) as { evidence: string; sha256: string; path: string };
			expect(parsed.sha256).toBe(digest);
			expect(parsed.path).toBe(`src/file${index}.ts`);
			expect(parsed.evidence).not.toContain(SECRET);
			expect(parsed.evidence).toContain(note);
			expect(scrubRalplanPersistedBody("disposition", disposition)).toBe(disposition);
		}
	});
});
