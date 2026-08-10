import * as path from "node:path";

const codingAgentDir = path.resolve(import.meta.dir, "../packages/coding-agent");
const child = Bun.spawn(
	[
		process.execPath,
		"test",
		"test/sdk-chat-daemon-worker.test.ts",
		"test/sdk-prompt-terminal-diagnostics.test.ts",
		"-t",
		"routes Slack safe queries through the production Session SDK host|SDK host",
	],
	{
		cwd: codingAgentDir,
		env: { ...process.env, GJC_CI_SDK_HOST_ISOLATED: "1" },
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	},
);

process.exitCode = await child.exited;
