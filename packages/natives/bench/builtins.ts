// A/B adapter: commonly used vendored brush-core base builtins in one persistent Shell session.
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Shell } from "@gajae-code/natives";
import { runAbSuite } from "./ab-adapter";

const tempDir = join(tmpdir(), "gajae-native-builtins-ab");
// Keep B05's `pwd` output identical on both sides; mkdir is exclusive so an existing path is never touched.
await mkdir(tempDir);
const shell = new Shell();

function quoteShellString(value: string): string {
	return `'${value.replaceAll("'", "'\\''")}'`;
}

async function runBuiltin(command: string, expectedStdout: string): Promise<void> {
	let stdout = "";
	let callbackError: Error | undefined;
	const result = await shell.run({ command, timeoutMs: 5_000 }, (error, chunk) => {
		if (error) callbackError = error;
		else stdout += chunk;
	});
	if (callbackError) throw callbackError;
	if (result.exitCode !== 0 || result.cancelled || result.timedOut) {
		throw new Error(`Builtin command failed: ${JSON.stringify(result)}`);
	}
	if (stdout !== expectedStdout) {
		throw new Error(`Unexpected stdout: expected ${JSON.stringify(expectedStdout)}, received ${JSON.stringify(stdout)}`);
	}
}

const cases = [
	{
		id: "B01",
		warmup: 3,
		run: async () => await runBuiltin("echo -ne 'alpha\\tbeta'", "alpha\tbeta"),
	},
	{
		id: "B02",
		warmup: 3,
		run: async () => await runBuiltin("printf '%s=%04d %.2f\\n' label 7 3.5", "label=0007 3.50\n"),
	},
	{
		id: "B03",
		warmup: 3,
		run: async () =>
			await runBuiltin(
				`if test 7 -gt 3 && [ "alpha" = "alpha" ]; then printf 'pass\\n'; else printf 'fail\\n'; fi`,
				"pass\n",
			),
	},
	{
		id: "B04",
		warmup: 3,
		run: async () =>
			await runBuiltin(
				`IFS=: read -r BUILTINS_LEFT BUILTINS_RIGHT <<< 'alpha:beta'; printf '%s|%s\\n' "$BUILTINS_LEFT" "$BUILTINS_RIGHT"`,
				"alpha|beta\n",
			),
	},
	{
		id: "B05",
		warmup: 3,
		run: async () => await runBuiltin(`cd ${quoteShellString(tempDir)} && pwd`, `${tempDir}\n`),
	},
	{
		id: "B06",
		warmup: 3,
		run: async () =>
			await runBuiltin(
				`export BUILTINS_LABEL='alpha beta'; printf '<%s>\\n' "$BUILTINS_LABEL"`,
				"<alpha beta>\n",
			),
	},
	{
		id: "B07",
		warmup: 3,
		run: async () => await runBuiltin("type printf; command -v printf", "printf is a shell builtin\nprintf\n"),
	},
	{
		id: "B08",
		warmup: 3,
		run: async () =>
			await runBuiltin(
				`sum=0; for n in 1 2 3; do sum=$((sum + n)); done; printf '%s\\n' "$sum"`,
				"6\n",
			),
	},
];

try {
	await runAbSuite("builtins", cases, 10);
} finally {
	try {
		await shell.close();
	} finally {
		await rm(tempDir, { recursive: true });
	}
}
