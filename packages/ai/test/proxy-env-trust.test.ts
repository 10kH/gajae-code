import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/**
 * Bun autoloads cwd/.env into process.env before getProxyForUrl runs. A project
 * declaration of a proxy selector must not become the tunnel URL. A value
 * inherited from the launching shell, including one that differs from the
 * project declaration, stays in use.
 */

const PROBE = path.join(import.meta.dir, "fixtures", "proxy-env-trust-probe.ts");
const PROXY_KEYS = [
	"PI_PROXY",
	"PI_PROXY_ANTHROPIC",
	"PI_PROXY_CURSOR",
	"HTTP_PROXY",
	"http_proxy",
	"HTTPS_PROXY",
	"https_proxy",
	"ALL_PROXY",
	"all_proxy",
	"NO_PROXY",
	"no_proxy",
] as const;

const PROJECT = "http://project.proxy:8080";
const SHELL = "http://shell.proxy:8080";
const tempDirs: string[] = [];

function tempDir(dotenv?: string): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-proxy-env-trust-"));
	tempDirs.push(dir);
	if (dotenv !== undefined) fs.writeFileSync(path.join(dir, ".env"), dotenv);
	return dir;
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

async function selectedProxy(
	cwd: string,
	options: { inherited?: Record<string, string>; provider?: string; target?: string } = {},
): Promise<string | null> {
	const env: Record<string, string> = {};
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined && !key.startsWith("PI_PROXY")) env[key] = value;
	}
	for (const key of PROXY_KEYS) delete env[key];
	if (options.inherited) Object.assign(env, options.inherited);

	const proc = Bun.spawn(
		[process.execPath, PROBE, options.provider ?? "anthropic", options.target ?? "https://api.example.com/v1"],
		{
			cwd,
			env,
			stdout: "pipe",
			stderr: "pipe",
		},
	);
	const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
	const exitCode = await proc.exited;
	if (exitCode !== 0) throw new Error(`probe failed (${exitCode}): ${stderr}`);
	return (JSON.parse(stdout.trim()) as { proxy: string | null }).proxy;
}

describe("getProxyForUrl project dotenv", () => {
	it("ignores PI_PROXY when only the project dotenv sets it", async () => {
		expect(await selectedProxy(tempDir(`PI_PROXY=${PROJECT}\n`))).toBeNull();
	});

	it("ignores PI_PROXY_ANTHROPIC when only the project dotenv sets it", async () => {
		expect(await selectedProxy(tempDir(`PI_PROXY_ANTHROPIC=${PROJECT}\n`))).toBeNull();
	});

	it("ignores HTTPS_PROXY when only the project dotenv sets it", async () => {
		expect(await selectedProxy(tempDir(`HTTPS_PROXY=${PROJECT}\n`))).toBeNull();
	});

	it("ignores https_proxy when only the project dotenv sets it", async () => {
		expect(await selectedProxy(tempDir(`https_proxy=${PROJECT}\n`))).toBeNull();
	});

	it("ignores ALL_PROXY when only the project dotenv sets it", async () => {
		expect(await selectedProxy(tempDir(`ALL_PROXY=${PROJECT}\n`))).toBeNull();
	});

	it("ignores HTTP_PROXY when only the project dotenv sets it", async () => {
		expect(
			await selectedProxy(tempDir(`HTTP_PROXY=${PROJECT}\n`), {
				target: "http://api.example.com/v1",
			}),
		).toBeNull();
	});

	it("ignores a dynamic project dotenv PI_PROXY", async () => {
		expect(await selectedProxy(tempDir(`TARGET=${PROJECT}\nPI_PROXY=$TARGET\n`))).toBeNull();
	});

	it("ignores PI_PROXY when the shell value equals the project declaration", async () => {
		expect(await selectedProxy(tempDir(`PI_PROXY=${PROJECT}\n`), { inherited: { PI_PROXY: PROJECT } })).toBeNull();
	});

	it("keeps a PI_PROXY inherited from the launching shell", async () => {
		expect(await selectedProxy(tempDir(), { inherited: { PI_PROXY: SHELL } })).toBe(SHELL);
	});

	it("keeps an HTTPS_PROXY inherited from the launching shell", async () => {
		expect(await selectedProxy(tempDir(), { inherited: { HTTPS_PROXY: SHELL } })).toBe(SHELL);
	});

	it("keeps a shell PI_PROXY when the project dotenv declares a different comparable value", async () => {
		expect(await selectedProxy(tempDir(`PI_PROXY=${PROJECT}\n`), { inherited: { PI_PROXY: SHELL } })).toBe(SHELL);
	});

	it("ignores a different shell PI_PROXY when the project declaration is dynamic", async () => {
		expect(
			await selectedProxy(tempDir(`TARGET=${PROJECT}\nPI_PROXY=$TARGET\n`), { inherited: { PI_PROXY: SHELL } }),
		).toBeNull();
	});

	it("ignores a different shell PI_PROXY when the project declaration has quoted inner whitespace", async () => {
		expect(await selectedProxy(tempDir(`PI_PROXY=" ${PROJECT} "\n`), { inherited: { PI_PROXY: SHELL } })).toBeNull();
	});

	it("selects the shell HTTPS_PROXY when the project dotenv sets PI_PROXY", async () => {
		expect(await selectedProxy(tempDir(`PI_PROXY=${PROJECT}\n`), { inherited: { HTTPS_PROXY: SHELL } })).toBe(SHELL);
	});
});
