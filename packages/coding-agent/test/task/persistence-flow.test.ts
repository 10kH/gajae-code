import { afterEach, describe, expect, it, vi } from "bun:test";
import { AsyncJobManager } from "../../src/async";
import type { ModelRegistry } from "../../src/config/model-registry";
import { Settings } from "../../src/config/settings";
import * as repositoryBindingModule from "../../src/gjc-runtime/repository-binding";
import { InternalUrlRouter } from "../../src/internal-urls/router";
import { TaskTool } from "../../src/task";
import * as discoveryModule from "../../src/task/discovery";
import * as executorModule from "../../src/task/executor";
import type { AgentDefinition, SingleResult, TaskParams } from "../../src/task/types";
import type { IsolationHandle, WorktreeBaseline } from "../../src/task/worktree";
import * as worktreeModule from "../../src/task/worktree";
import type { ToolSession } from "../../src/tools";
import * as git from "../../src/utils/git";

const AGENT: AgentDefinition = {
	name: "executor",
	description: "test executor",
	systemPrompt: "test",
	source: "bundled",
};

const BASELINE: WorktreeBaseline = {
	root: {
		repoRoot: "/repo",
		headCommit: "HEAD",
		staged: "",
		unstaged: "",
		untracked: [],
		untrackedPatch: "",
	},
	nested: [],
};

const ISOLATION: IsolationHandle = {
	mergedDir: "/tmp/isolated-persistence-test",
	backend: worktreeModule.parseIsolationMode("rcopy")!,
	fellBack: false,
	fallbackReason: null,
};

function makeResult(id: string, exitCode: number): SingleResult {
	return {
		index: 0,
		id,
		agent: "executor",
		agentSource: "bundled",
		task: "test assignment",
		assignment: "test assignment",
		description: id,
		exitCode,
		output: exitCode === 0 ? "done" : "failed",
		stderr: exitCode === 0 ? "" : "intentional failure",
		truncated: false,
		durationMs: 1,
		tokens: 0,
		...(exitCode === 0 ? {} : { error: "intentional failure" }),
	};
}

function createSession(merge: "patch" | "branch" = "patch"): ToolSession {
	return {
		cwd: "/repo",
		hasUI: false,
		settings: Settings.isolated({
			"async.enabled": true,
			"task.isolation.mode": "auto",
			"task.isolation.merge": merge,
		}),
		getSessionFile: () => null,
		getSessionSpawns: () => "*",
		modelRegistry: {
			authStorage: undefined,
			refresh: async () => {},
			getAvailable: () => [],
			getApiKey: async () => null,
		} as unknown as ModelRegistry,
	} as unknown as ToolSession;
}

function mockIsolation(): void {
	vi.spyOn(discoveryModule, "discoverAgents").mockResolvedValue({ agents: [AGENT], projectAgentsDir: null });
	vi.spyOn(worktreeModule, "getRepoRoot").mockResolvedValue("/repo");
	vi.spyOn(worktreeModule, "captureBaseline").mockResolvedValue(BASELINE);
	vi.spyOn(worktreeModule, "ensureIsolation").mockResolvedValue(ISOLATION);
	vi.spyOn(worktreeModule, "cleanupIsolation").mockResolvedValue();
	vi.spyOn(repositoryBindingModule, "resolveTaskRepositoryBinding").mockResolvedValue({
		schema: "gjc.repository_binding.v1",
		worktreeRoot: "/repo",
		commonDir: null,
		displayPath: "/repo",
	});
	vi.spyOn(repositoryBindingModule, "assertExecutionRootMatchesRepositoryBinding").mockResolvedValue({
		schema: "gjc.repository_binding.v1",
		worktreeRoot: "/repo",
		commonDir: null,
		displayPath: "/repo",
	});
}

async function runTask(tool: TaskTool, tasks: TaskParams["tasks"]): Promise<string> {
	const manager = new AsyncJobManager({ onJobComplete: async () => {} });
	AsyncJobManager.setInstance(manager);
	const started = await tool.execute("tool-call", { agent: "executor", tasks, isolated: true });
	if (!started.details?.async?.jobId) throw new Error("Expected detached task job id");
	await manager.waitForAll();
	const resultText = tasks
		.map((item, index) => {
			const job = manager.getJob(`${index}-${item.id}`);
			return job?.resultText ?? job?.errorText ?? "";
		})
		.join("\n");
	await manager.dispose({ timeoutMs: 100 });
	return resultText;
}

function task(id: string): TaskParams["tasks"][number] {
	return { id, description: id, assignment: "Exercise persistence." };
}

describe("isolated task persistence recovery", () => {
	afterEach(() => {
		AsyncJobManager.resetForTests();
		InternalUrlRouter.resetForTests();
		vi.restoreAllMocks();
	});

	it("keeps failed branch-mode edits as receipt-bound recovery artifacts", async () => {
		mockIsolation();
		vi.spyOn(executorModule, "runSubprocess").mockResolvedValue(makeResult("BranchFailure", 1));
		vi.spyOn(worktreeModule, "captureDeltaPatch").mockResolvedValue({
			rootPatch: "branch failure patch",
			nestedPatches: [],
		});
		const mergeBranches = vi.spyOn(worktreeModule, "mergeTaskBranches");

		const resultText = await runTask(await TaskTool.create(createSession("branch")), [task("BranchFailure")]);

		expect(mergeBranches).not.toHaveBeenCalled();
		expect(resultText).toContain("changes were not persisted to the owner worktree");
		expect(resultText).toContain("local://subagents/");
	});

	it("applies only successful root patches and retains failed-task recovery", async () => {
		mockIsolation();
		vi.spyOn(executorModule, "runSubprocess")
			.mockResolvedValueOnce(makeResult("Success", 0))
			.mockResolvedValueOnce(makeResult("Failure", 1));
		vi.spyOn(worktreeModule, "captureDeltaPatch")
			.mockResolvedValueOnce({ rootPatch: "successful patch", nestedPatches: [] })
			.mockResolvedValueOnce({ rootPatch: "failed patch", nestedPatches: [] });
		vi.spyOn(git.patch, "canApplyText").mockResolvedValue(true);
		const applyText = vi.spyOn(git.patch, "applyText").mockResolvedValue();
		vi.spyOn(worktreeModule, "verifyRootPatchesApplied").mockResolvedValue(true);

		const resultText = await runTask(await TaskTool.create(createSession()), [task("Success"), task("Failure")]);

		expect(applyText).toHaveBeenCalledTimes(1);
		expect(applyText.mock.calls[0]?.[1]).toContain("successful patch");
		expect(applyText.mock.calls[0]?.[1]).not.toContain("failed patch");
		expect(resultText).toContain("local://subagents/");
	});

	it("emits durable identity for nested-only edits", async () => {
		mockIsolation();
		vi.spyOn(executorModule, "runSubprocess").mockResolvedValue(makeResult("NestedOnly", 0));
		vi.spyOn(worktreeModule, "captureDeltaPatch").mockResolvedValue({
			rootPatch: "",
			nestedPatches: [{ relativePath: "vendor/nested", patch: "nested patch" }],
		});
		vi.spyOn(worktreeModule, "applyNestedPatches").mockResolvedValue();

		const resultText = await runTask(await TaskTool.create(createSession()), [task("NestedOnly")]);

		expect(resultText).toContain("changes persisted to the owner worktree");
	});

	it("applies branch-mode nested-only edits before marking completion", async () => {
		mockIsolation();
		vi.spyOn(executorModule, "runSubprocess").mockResolvedValue(makeResult("BranchNested", 0));
		const nestedPatches = [{ relativePath: "vendor/nested", patch: "nested patch" }];
		vi.spyOn(worktreeModule, "commitToBranch").mockResolvedValue({ nestedPatches });
		vi.spyOn(worktreeModule, "captureDeltaPatch").mockResolvedValue({ rootPatch: "", nestedPatches });
		const applyNested = vi.spyOn(worktreeModule, "applyNestedPatches").mockResolvedValue();

		const resultText = await runTask(await TaskTool.create(createSession("branch")), [task("BranchNested")]);

		expect(applyNested).toHaveBeenCalledWith("/repo", nestedPatches, undefined);
		expect(resultText).toContain("changes persisted to the owner worktree");
		expect(resultText).not.toContain("merge failed");
	});

	it("downgrades completed tasks when nested patch application fails", async () => {
		mockIsolation();
		vi.spyOn(executorModule, "runSubprocess").mockResolvedValue(makeResult("NestedConflict", 0));
		vi.spyOn(worktreeModule, "captureDeltaPatch").mockResolvedValue({
			rootPatch: "",
			nestedPatches: [{ relativePath: "vendor/nested", patch: "nested patch" }],
		});
		vi.spyOn(worktreeModule, "applyNestedPatches").mockRejectedValue(new Error("nested conflict"));

		const resultText = await runTask(await TaskTool.create(createSession()), [task("NestedConflict")]);

		expect(resultText).toContain("merge failed");
		expect(resultText).toContain("changes were not persisted to the owner worktree");
		expect(resultText).toContain("local://subagents/");
	});
});
