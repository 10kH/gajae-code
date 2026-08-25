import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { SdkSearchResultV1 } from "../src/sdk/broker/session-scope";
import { renderSdkSearchTable, runSdkSearch } from "../src/sdk/cli/session-cli";
import { type SessionLifecycleClient, SessionLifecycleService } from "../src/sdk/lifecycle/service";

const temp = () => fs.mkdtemp(path.join(process.env.TMPDIR ?? "/tmp", "gjc-sdk-search-"));

function envelope(
	root: string,
	status: SdkSearchResultV1["status"],
	rows: SdkSearchResultV1["rows"] = [],
): SdkSearchResultV1 {
	return {
		version: 1,
		scope: {
			version: 1,
			requested: "repo",
			requestAnchor: { cwd: root, worktreeRoot: root },
			resolved: { kind: "repo", worktreeRoot: root },
			resolution: "resolved",
		},
		status,
		observedAt: "2026-08-23T12:00:00.000Z",
		rows,
		warnings: [],
		...(status === "unavailable" ? { error: { code: "unavailable", message: "broker search is unavailable" } } : {}),
	};
}

class Client implements SessionLifecycleClient {
	response: unknown;
	constructor(response: unknown) {
		this.response = response;
	}
	async global(): Promise<unknown> {
		return this.response;
	}
}

test("search renders populated and empty envelopes with a preamble and no endpoint credential", async () => {
	const root = await temp();
	try {
		const row = { id: "session-1", locator: { cwd: root, worktreeRoot: root, stateRoot: "/state" }, live: true };
		const populated = envelope(root, "populated", [row]);
		const output = renderSdkSearchTable({ ...populated, rows: [{ ...row, probe: "reachable" }] });
		expect(output).toStartWith("Scope requested: repo\nScope resolved:");
		expect(output).toContain("Status: populated");
		expect(output).toContain("reachable");
		expect(output).not.toContain("fixture-endpoint-token");
		expect(renderSdkSearchTable(envelope(root, "empty"))).toContain("Status: empty");
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
});

test("search returns exactly the scoped envelope and probes only populated filtered rows", async () => {
	const root = await temp();
	const git = Bun.spawn(["git", "init", "-q", root]);
	await git.exited;
	try {
		const row = { id: "filtered", locator: { cwd: root, worktreeRoot: root, stateRoot: "/state" }, live: true };
		const result = envelope(root, "populated", [row]);
		let probes = 0;
		const search = await runSdkSearch(
			{ repo: root },
			() => {
				const service = new SessionLifecycleService(new Client({ ok: true, result: {} }));
				return Object.assign(service, {
					scopedList: async () => ({ ok: true as const, operation: "session.list" as const, result }),
				});
			},
			async (_agentDir, value) => {
				probes++;
				return { ...value, rows: value.rows.map(candidate => ({ ...candidate, probe: "reachable" })) };
			},
		);
		expect(search.exitCode).toBe(0);
		expect(search.result).toEqual({ ...result, rows: [{ ...row, probe: "reachable" }] });
		expect(probes).toBe(1);
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
});

test("non-Git repo is successful and makes zero probes", async () => {
	const root = await temp();
	try {
		let probes = 0;
		const search = await runSdkSearch(
			{ repo: root },
			() => {
				const result: SdkSearchResultV1 = {
					version: 1,
					scope: {
						version: 1,
						requested: "repo",
						requestAnchor: { cwd: root, worktreeRoot: null },
						resolved: null,
						resolution: "not-in-git-worktree",
					},
					status: "not-in-git-worktree",
					observedAt: "2026-08-23T12:00:00.000Z",
					rows: [],
					warnings: [],
				};
				const service = new SessionLifecycleService(new Client({ ok: true, result: {} }));
				return Object.assign(service, {
					scopedList: async () => ({ ok: true as const, operation: "session.list" as const, result }),
				});
			},
			async (_agentDir, value) => {
				probes++;
				return value;
			},
		);
		expect(search.exitCode).toBe(0);
		expect(search.result.status).toBe("not-in-git-worktree");
		expect(search.result.rows).toEqual([]);
		expect(probes).toBe(0);
		expect(renderSdkSearchTable(search.result)).toContain("Scope resolved: not-in-git-worktree");
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
});

test("unavailable search prints a scoped redacted envelope and exits nonzero without probes", async () => {
	const root = await temp();
	const git = Bun.spawn(["git", "init", "-q", root]);
	await git.exited;
	try {
		let probes = 0;
		const search = await runSdkSearch(
			{ repo: root },
			() =>
				new SessionLifecycleService(
					new Client({ ok: false, error: { code: "unavailable", message: "fixture-endpoint-token" } }),
				),
			async (_agentDir, value) => {
				probes++;
				return value;
			},
		);
		expect(search.exitCode).toBe(1);
		expect(search.result).toMatchObject({
			version: 1,
			status: "unavailable",
			rows: [],
			error: { code: "unavailable" },
		});
		expect(probes).toBe(0);
		expect(JSON.stringify(search.result)).not.toContain("fixture-endpoint-token");
		expect(renderSdkSearchTable(search.result)).toContain("Status: unavailable");
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
});
