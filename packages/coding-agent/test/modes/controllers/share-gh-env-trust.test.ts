import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

/**
 * Default `/share` spawns `gh auth status` and `gh gist create` with an
 * explicit environment copy. The project dotenv is already in that environment.
 * These probes use the public `handleShareCommand` entry.
 */

const PROBE = path.join(import.meta.dir, "../../fixtures/share-gh-env-probe.ts");
const TRUST_KEYS = [
	"GH_HOST",
	"GH_CONFIG_DIR",
	"GH_TOKEN",
	"GITHUB_TOKEN",
	"GH_ENTERPRISE_TOKEN",
	"GITHUB_ENTERPRISE_TOKEN",
	"XDG_CONFIG_HOME",
	"HOME",
	"USERPROFILE",
	"APPDATA",
	"PATH",
	"HTTP_PROXY",
	"HTTPS_PROXY",
	"ALL_PROXY",
	"NO_PROXY",
	"http_proxy",
	"https_proxy",
	"all_proxy",
	"no_proxy",
	"SSL_CERT_FILE",
	"SSL_CERT_DIR",
	"LD_PRELOAD",
	"LD_LIBRARY_PATH",
	"LD_AUDIT",
	"DYLD_INSERT_LIBRARIES",
	"DYLD_LIBRARY_PATH",
	"DYLD_FRAMEWORK_PATH",
	"DYLD_FALLBACK_LIBRARY_PATH",
	"DYLD_FALLBACK_FRAMEWORK_PATH",
	"DYLD_ROOT_PATH",
	"GH_HOST_PLANTED",
	"GH_CONFIG_PLANTED",
] as const;

interface GhSpawn {
	args: string[];
	source: string;
	cwd: string;
	PATH: string;
	GH_HOST: string | null;
	GH_CONFIG_DIR: string | null;
	GH_TOKEN: string | null;
	GITHUB_TOKEN: string | null;
	GH_ENTERPRISE_TOKEN: string | null;
	GITHUB_ENTERPRISE_TOKEN: string | null;
	XDG_CONFIG_HOME: string | null;
	HOME: string | null;
	USERPROFILE: string | null;
	APPDATA: string | null;
	HTTP_PROXY: string | null;
	HTTPS_PROXY: string | null;
	ALL_PROXY: string | null;
	NO_PROXY: string | null;
	http_proxy: string | null;
	https_proxy: string | null;
	all_proxy: string | null;
	no_proxy: string | null;
	SSL_CERT_FILE: string | null;
	SSL_CERT_DIR: string | null;
	LD_PRELOAD: string | null;
	LD_LIBRARY_PATH: string | null;
	LD_AUDIT: string | null;
	DYLD_INSERT_LIBRARIES: string | null;
	DYLD_LIBRARY_PATH: string | null;
	DYLD_FRAMEWORK_PATH: string | null;
	DYLD_FALLBACK_LIBRARY_PATH: string | null;
	DYLD_FALLBACK_FRAMEWORK_PATH: string | null;
	DYLD_ROOT_PATH: string | null;
}

const tempDirs: string[] = [];

async function tempDir(prefix: string): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
	tempDirs.push(dir);
	return dir;
}

afterEach(async () => {
	for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true });
});

async function writeGh(binDir: string, source: string): Promise<void> {
	await fs.mkdir(binDir, { recursive: true });
	const gh = path.join(binDir, "gh");
	await Bun.write(
		gh,
		`#!/usr/bin/env -S ${process.execPath} --no-env-file
import * as fsPromises from "node:fs/promises";
const record = process.env.GJC_SHARE_GH_RECORD;
if (!record) {
	process.stderr.write("missing share record\\n");
	process.exit(2);
}
await fsPromises.appendFile(
	record,
	JSON.stringify({
		args: process.argv.slice(2),
		source: ${JSON.stringify(source)},
		cwd: process.cwd(),
		PATH: process.env.PATH ?? "",
		GH_HOST: process.env.GH_HOST ?? null,
		GH_CONFIG_DIR: process.env.GH_CONFIG_DIR ?? null,
		GH_TOKEN: process.env.GH_TOKEN ?? null,
		GITHUB_TOKEN: process.env.GITHUB_TOKEN ?? null,
		GH_ENTERPRISE_TOKEN: process.env.GH_ENTERPRISE_TOKEN ?? null,
		GITHUB_ENTERPRISE_TOKEN: process.env.GITHUB_ENTERPRISE_TOKEN ?? null,
		XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME ?? null,
		HOME: process.env.HOME ?? null,
		USERPROFILE: process.env.USERPROFILE ?? null,
		APPDATA: process.env.APPDATA ?? null,
		HTTP_PROXY: process.env.HTTP_PROXY ?? null,
		HTTPS_PROXY: process.env.HTTPS_PROXY ?? null,
		ALL_PROXY: process.env.ALL_PROXY ?? null,
		NO_PROXY: process.env.NO_PROXY ?? null,
		http_proxy: process.env.http_proxy ?? null,
		https_proxy: process.env.https_proxy ?? null,
		all_proxy: process.env.all_proxy ?? null,
		no_proxy: process.env.no_proxy ?? null,
		SSL_CERT_FILE: process.env.SSL_CERT_FILE ?? null,
		SSL_CERT_DIR: process.env.SSL_CERT_DIR ?? null,
		LD_PRELOAD: process.env.LD_PRELOAD ?? null,
		LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH ?? null,
		LD_AUDIT: process.env.LD_AUDIT ?? null,
		DYLD_INSERT_LIBRARIES: process.env.DYLD_INSERT_LIBRARIES ?? null,
		DYLD_LIBRARY_PATH: process.env.DYLD_LIBRARY_PATH ?? null,
		DYLD_FRAMEWORK_PATH: process.env.DYLD_FRAMEWORK_PATH ?? null,
		DYLD_FALLBACK_LIBRARY_PATH: process.env.DYLD_FALLBACK_LIBRARY_PATH ?? null,
		DYLD_FALLBACK_FRAMEWORK_PATH: process.env.DYLD_FALLBACK_FRAMEWORK_PATH ?? null,
		DYLD_ROOT_PATH: process.env.DYLD_ROOT_PATH ?? null,
	}) + "\\n",
);
if (process.argv[2] === "auth") process.exit(0);
process.stdout.write("https://gist.github.com/example/abc123\\n");
`,
	);
	await fs.chmod(gh, 0o755);
	const open = path.join(binDir, "open");
	await Bun.write(open, "#!/bin/sh\nexit 0\n");
	await fs.chmod(open, 0o755);
}

async function share(options: {
	dotenv?: string;
	env?: Record<string, string>;
	moveAway?: boolean;
	launchFromFilesystemRoot?: boolean;
	autoload?: boolean;
	noSpawnError?: string;
	ghPathMode?:
		| "trusted"
		| "operator-only"
		| "checkout-relative"
		| "checkout-absolute"
		| "checkout-directory-symlink"
		| "checkout-executable-symlink"
		| "checkout-executable-symlink-fallback"
		| "moved-checkout";
}): Promise<GhSpawn[]> {
	const cwd = await tempDir("gjc-share-gh-env-");
	const binDir = path.join(cwd, "bin");
	const operatorBinDir = await tempDir("gjc-share-gh-operator-bin-");
	const record = path.join(cwd, "spawns.ndjson");
	await writeGh(binDir, "checkout");
	await writeGh(operatorBinDir, "operator");
	const ghPathMode = options.ghPathMode ?? "trusted";
	if (ghPathMode === "checkout-directory-symlink") {
		await fs.rm(operatorBinDir, { recursive: true, force: true });
		await fs.symlink(binDir, operatorBinDir);
	} else if (ghPathMode === "checkout-executable-symlink" || ghPathMode === "checkout-executable-symlink-fallback") {
		await fs.rm(path.join(operatorBinDir, "gh"));
		await fs.symlink(path.join(binDir, "gh"), path.join(operatorBinDir, "gh"));
	}
	const fallbackBinDir =
		ghPathMode === "checkout-executable-symlink-fallback" ? await tempDir("gjc-share-gh-fallback-bin-") : undefined;
	if (fallbackBinDir) await writeGh(fallbackBinDir, "operator");
	const moveTo = options.moveAway ? await tempDir("gjc-share-gh-move-") : undefined;
	if (ghPathMode === "moved-checkout") {
		if (!moveTo) throw new Error("Moved-checkout PATH fixture was not created.");
		await writeGh(path.join(moveTo, "bin"), "checkout");
	}

	const env: Record<string, string> = {};
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined) env[key] = value;
	}
	for (const key of TRUST_KEYS) delete env[key];
	delete env.GJC_SHARE_EXPECT_HOST;
	delete env.GJC_SHARE_EXPECT_CONFIG;
	delete env.GJC_SHARE_MOVE_TO;
	env.GJC_SHARE_GH_RECORD = record;
	switch (ghPathMode) {
		case "checkout-relative":
			env.PATH = "bin";
			break;
		case "checkout-absolute":
			env.PATH = binDir;
			break;
		case "checkout-directory-symlink":
		case "checkout-executable-symlink":
			env.PATH = operatorBinDir;
			break;
		case "checkout-executable-symlink-fallback":
			if (!fallbackBinDir) throw new Error("Trusted fallback PATH fixture was not created.");
			env.PATH = `${operatorBinDir}${path.delimiter}${fallbackBinDir}${path.delimiter}${process.env.PATH ?? ""}`;
			break;
		case "moved-checkout":
			if (!moveTo) throw new Error("Moved-checkout PATH fixture was not created.");
			env.PATH = path.join(moveTo, "bin");
			break;
		case "operator-only":
			env.PATH = operatorBinDir;
			break;
		default:
			env.PATH = `${binDir}${path.delimiter}${operatorBinDir}${path.delimiter}${process.env.PATH ?? ""}`;
	}
	if (moveTo) env.GJC_SHARE_MOVE_TO = moveTo;
	env.GJC_SHARE_AGENT_DIR = path.join(cwd, "agent-dir");
	Object.assign(env, options.env);
	if (options.dotenv !== undefined) {
		await Bun.write(path.join(cwd, ".env"), options.dotenv);
	}

	const args = options.autoload ? [PROBE] : ["--no-env-file", PROBE];
	const proc = Bun.spawn([process.execPath, ...args], {
		cwd: options.launchFromFilesystemRoot ? path.parse(cwd).root : cwd,
		env,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
	const exitCode = await proc.exited;
	if (exitCode !== 0) throw new Error(`probe failed (${exitCode}): ${stderr || stdout}`);
	const recordFile = Bun.file(record);
	if (!(await recordFile.exists())) {
		if (options.noSpawnError && stderr.includes(options.noSpawnError)) return [];
		throw new Error(`probe produced no gh spawns: ${stderr || stdout}`);
	}
	const spawns = (await recordFile.text())
		.trim()
		.split("\n")
		.filter(line => line.length > 0)
		.map(line => JSON.parse(line) as GhSpawn);
	if (spawns.length !== 2) throw new Error(`expected auth and gist spawns, got ${JSON.stringify(spawns)} ${stderr}`);
	return spawns;
}

function expectDestination(
	spawns: GhSpawn[],
	expected: Partial<
		Pick<
			GhSpawn,
			| "GH_HOST"
			| "GH_CONFIG_DIR"
			| "GH_TOKEN"
			| "GITHUB_TOKEN"
			| "GH_ENTERPRISE_TOKEN"
			| "GITHUB_ENTERPRISE_TOKEN"
			| "XDG_CONFIG_HOME"
			| "HOME"
			| "USERPROFILE"
			| "APPDATA"
			| "HTTP_PROXY"
			| "HTTPS_PROXY"
			| "ALL_PROXY"
			| "NO_PROXY"
			| "http_proxy"
			| "https_proxy"
			| "all_proxy"
			| "no_proxy"
			| "SSL_CERT_FILE"
			| "SSL_CERT_DIR"
			| "LD_PRELOAD"
			| "LD_LIBRARY_PATH"
			| "LD_AUDIT"
			| "DYLD_INSERT_LIBRARIES"
			| "DYLD_LIBRARY_PATH"
			| "DYLD_FRAMEWORK_PATH"
			| "DYLD_FALLBACK_LIBRARY_PATH"
			| "DYLD_FALLBACK_FRAMEWORK_PATH"
			| "DYLD_ROOT_PATH"
		>
	>,
): void {
	expect(spawns[0]?.args).toEqual(["auth", "status"]);
	expect(spawns[1]?.args.slice(0, 3)).toEqual(["gist", "create", "--public=false"]);
	for (const spawn of spawns) {
		expect(spawn.source).toBe("operator");
		for (const directory of spawn.PATH.split(path.delimiter)) {
			const relative = path.relative(spawn.cwd, directory);
			expect(
				relative === "" ||
					(relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)),
			).toBe(false);
		}
		expect(spawn.GH_HOST).toBe(expected.GH_HOST ?? null);
		expect(spawn.GH_CONFIG_DIR).toBe(expected.GH_CONFIG_DIR ?? null);
		expect(spawn.GH_TOKEN).toBe(expected.GH_TOKEN ?? null);
		expect(spawn.GITHUB_TOKEN).toBe(expected.GITHUB_TOKEN ?? null);
		expect(spawn.GH_ENTERPRISE_TOKEN).toBe(expected.GH_ENTERPRISE_TOKEN ?? null);
		expect(spawn.GITHUB_ENTERPRISE_TOKEN).toBe(expected.GITHUB_ENTERPRISE_TOKEN ?? null);
		expect(spawn.XDG_CONFIG_HOME).toBe(expected.XDG_CONFIG_HOME ?? null);
		expect(spawn.HOME).toBe(expected.HOME ?? null);
		expect(spawn.USERPROFILE).toBe(expected.USERPROFILE ?? null);
		expect(spawn.APPDATA).toBe(expected.APPDATA ?? null);
		expect(spawn.HTTP_PROXY).toBe(expected.HTTP_PROXY ?? null);
		expect(spawn.HTTPS_PROXY).toBe(expected.HTTPS_PROXY ?? null);
		expect(spawn.ALL_PROXY).toBe(expected.ALL_PROXY ?? null);
		expect(spawn.NO_PROXY).toBe(expected.NO_PROXY ?? null);
		expect(spawn.http_proxy).toBe(expected.http_proxy ?? null);
		expect(spawn.https_proxy).toBe(expected.https_proxy ?? null);
		expect(spawn.all_proxy).toBe(expected.all_proxy ?? null);
		expect(spawn.no_proxy).toBe(expected.no_proxy ?? null);
		expect(spawn.SSL_CERT_FILE).toBe(expected.SSL_CERT_FILE ?? null);
		expect(spawn.SSL_CERT_DIR).toBe(expected.SSL_CERT_DIR ?? null);
		expect(spawn.LD_PRELOAD).toBe(expected.LD_PRELOAD ?? null);
		expect(spawn.LD_LIBRARY_PATH).toBe(expected.LD_LIBRARY_PATH ?? null);
		expect(spawn.LD_AUDIT).toBe(expected.LD_AUDIT ?? null);
		expect(spawn.DYLD_INSERT_LIBRARIES).toBe(expected.DYLD_INSERT_LIBRARIES ?? null);
		expect(spawn.DYLD_LIBRARY_PATH).toBe(expected.DYLD_LIBRARY_PATH ?? null);
		expect(spawn.DYLD_FRAMEWORK_PATH).toBe(expected.DYLD_FRAMEWORK_PATH ?? null);
		expect(spawn.DYLD_FALLBACK_LIBRARY_PATH).toBe(expected.DYLD_FALLBACK_LIBRARY_PATH ?? null);
		expect(spawn.DYLD_FALLBACK_FRAMEWORK_PATH).toBe(expected.DYLD_FALLBACK_FRAMEWORK_PATH ?? null);
		expect(spawn.DYLD_ROOT_PATH).toBe(expected.DYLD_ROOT_PATH ?? null);
	}
}

// The recorder is a POSIX `env -S bun --no-env-file` script so it reports the
// environment `/share` passed in, instead of loading the project dotenv itself.
describe.skipIf(process.platform === "win32")("share gh destination trust", () => {
	it("omits a project dotenv host and config directory from both gh spawns", async () => {
		const spawns = await share({
			autoload: true,
			dotenv: "export GH_HOST=attacker-egress.example # note\nGH_CONFIG_DIR=attacker-config\n",
			env: {
				GH_TOKEN: "operator-token",
				GITHUB_TOKEN: "operator-github-token",
				GH_ENTERPRISE_TOKEN: "operator-enterprise-token",
				GITHUB_ENTERPRISE_TOKEN: "operator-enterprise-github-token",
				GJC_SHARE_EXPECT_HOST: "attacker-egress.example",
				GJC_SHARE_EXPECT_CONFIG: "attacker-config",
			},
		});
		expectDestination(spawns, {
			GH_HOST: null,
			GH_CONFIG_DIR: null,
			GH_TOKEN: "operator-token",
			GITHUB_TOKEN: "operator-github-token",
			GH_ENTERPRISE_TOKEN: "operator-enterprise-token",
			GITHUB_ENTERPRISE_TOKEN: "operator-enterprise-github-token",
		});
	});

	it("omits project dotenv GitHub CLI tokens from both gh spawns", async () => {
		const spawns = await share({
			autoload: true,
			dotenv: `GH_TOKEN=project-gh-token
GITHUB_TOKEN=project-github-token
GH_ENTERPRISE_TOKEN=project-enterprise-token
GITHUB_ENTERPRISE_TOKEN=project-enterprise-github-token
XDG_CONFIG_HOME=project-config
HOME=project-home
USERPROFILE=project-profile
APPDATA=project-appdata
`,
		});
		expectDestination(spawns, {});
	});

	it("omits project dotenv proxy and CA overrides from both gh spawns", async () => {
		const spawns = await share({
			autoload: true,
			dotenv: `HTTPS_PROXY=https://project-proxy.example
https_proxy=http://project-lower-proxy.example
SSL_CERT_FILE=project-ca.pem
SSL_CERT_DIR=project-ca-dir
`,
		});
		expectDestination(spawns, {});
	});

	it("omits project dotenv native-loader overrides from both gh spawns", async () => {
		const spawns = await share({
			autoload: true,
			dotenv: `LD_PRELOAD=/project/preload.so
LD_LIBRARY_PATH=/project/lib
LD_AUDIT=/project/audit.so
DYLD_INSERT_LIBRARIES=/project/injected.dylib
DYLD_LIBRARY_PATH=/project/dyld
DYLD_FRAMEWORK_PATH=/project/frameworks
DYLD_FALLBACK_LIBRARY_PATH=/project/fallback
DYLD_FALLBACK_FRAMEWORK_PATH=/project/fallback-frameworks
DYLD_ROOT_PATH=/project/root
`,
		});
		expectDestination(spawns, {});
	});

	it("refuses a project-only PATH instead of resolving gh from the checkout", async () => {
		const spawns = await share({
			autoload: true,
			dotenv: "PATH=/project/bin\n",
			env: { PATH: "/project/bin" },
			noSpawnError: "GitHub CLI (gh) is not installed on the trusted operator PATH",
		});
		expect(spawns).toEqual([]);
	});

	it("refuses a checkout-relative operator PATH instead of resolving gh from the checkout", async () => {
		const spawns = await share({
			autoload: true,
			dotenv: "OTHER=1\n",
			ghPathMode: "checkout-relative",
			noSpawnError: "GitHub CLI (gh) is not installed on the trusted operator PATH",
		});
		expect(spawns).toEqual([]);
	});

	it("uses an operator gh instead of an absolute checkout PATH entry", async () => {
		const spawns = await share({
			autoload: true,
			dotenv: "OTHER=1\n",
			ghPathMode: "trusted",
		});
		expectDestination(spawns, {});
	});

	it("refuses a checkout-only absolute operator PATH", async () => {
		const spawns = await share({
			autoload: true,
			dotenv: "OTHER=1\n",
			ghPathMode: "checkout-absolute",
			noSpawnError: "GitHub CLI (gh) is not installed on the trusted operator PATH",
		});
		expect(spawns).toEqual([]);
	});

	it("keeps operator PATH entries when launched from the filesystem root", async () => {
		const spawns = await share({
			moveAway: true,
			launchFromFilesystemRoot: true,
			ghPathMode: "operator-only",
		});
		expectDestination(spawns, {});
	});

	it("refuses a PATH directory symlink that resolves into the checkout", async () => {
		const spawns = await share({
			autoload: true,
			dotenv: "OTHER=1\n",
			ghPathMode: "checkout-directory-symlink",
			noSpawnError: "GitHub CLI (gh) is not installed on the trusted operator PATH",
		});
		expect(spawns).toEqual([]);
	});

	it("refuses an operator-path gh symlink that resolves into the checkout", async () => {
		const spawns = await share({
			autoload: true,
			dotenv: "OTHER=1\n",
			ghPathMode: "checkout-executable-symlink",
			noSpawnError: "GitHub CLI (gh) is not installed on the trusted operator PATH",
		});
		expect(spawns).toEqual([]);
	});

	it("skips a checkout-targeting gh symlink and selects a trusted fallback", async () => {
		const spawns = await share({
			autoload: true,
			dotenv: "OTHER=1\n",
			ghPathMode: "checkout-executable-symlink-fallback",
		});
		expectDestination(spawns, {});
	});

	it("keeps an operator host and config directory the project does not declare", async () => {
		const spawns = await share({
			dotenv: "OTHER=1\n",
			env: {
				GH_HOST: "ghe.example.com",
				GH_CONFIG_DIR: "operator-config",
				GH_TOKEN: "operator-token",
				GJC_SHARE_EXPECT_HOST: "ghe.example.com",
				GJC_SHARE_EXPECT_CONFIG: "operator-config",
				XDG_CONFIG_HOME: "operator-xdg-config",
				HOME: "operator-home",
				USERPROFILE: "operator-profile",
			},
		});
		expectDestination(spawns, {
			GH_HOST: "ghe.example.com",
			GH_CONFIG_DIR: "operator-config",
			GH_TOKEN: "operator-token",
			XDG_CONFIG_HOME: "operator-xdg-config",
			HOME: "operator-home",
			USERPROFILE: "operator-profile",
		});
	});

	it("keeps operator proxy and CA values that differ from project declarations", async () => {
		const spawns = await share({
			dotenv: `HTTPS_PROXY=https://project-proxy.example
SSL_CERT_FILE=project-ca.pem
`,
			env: {
				HTTPS_PROXY: "https://operator-proxy.example",
				SSL_CERT_FILE: "/operator/ca.pem",
			},
		});
		expectDestination(spawns, {
			HTTPS_PROXY: "https://operator-proxy.example",
			SSL_CERT_FILE: "/operator/ca.pem",
		});
	});

	it("keeps an operator host that differs from the project declaration", async () => {
		const spawns = await share({
			dotenv: "GH_HOST=attacker-egress.example\nGH_CONFIG_DIR=attacker-config\n",
			env: {
				GH_HOST: "ghe.example.com",
				GH_CONFIG_DIR: "operator-config",
				GH_TOKEN: "operator-token",
				GJC_SHARE_EXPECT_HOST: "ghe.example.com",
				GJC_SHARE_EXPECT_CONFIG: "operator-config",
			},
		});
		expectDestination(spawns, {
			GH_HOST: "ghe.example.com",
			GH_CONFIG_DIR: "operator-config",
			GH_TOKEN: "operator-token",
		});
	});

	it("still omits the launch project host after the session cwd moves", async () => {
		const spawns = await share({
			dotenv: "GH_HOST=attacker-egress.example\nGH_CONFIG_DIR=attacker-config\n",
			moveAway: true,
			env: {
				GH_TOKEN: "operator-token",
				GJC_SHARE_EXPECT_HOST: "attacker-egress.example",
				GJC_SHARE_EXPECT_CONFIG: "attacker-config",
			},
		});
		expectDestination(spawns, { GH_HOST: null, GH_CONFIG_DIR: null, GH_TOKEN: "operator-token" });
	});

	it("refuses a PATH executable owned by the checkout after the session moves", async () => {
		const spawns = await share({
			autoload: true,
			moveAway: true,
			ghPathMode: "moved-checkout",
			dotenv: "OTHER=1\n",
			noSpawnError: "GitHub CLI (gh) is not installed on the trusted operator PATH",
		});
		expect(spawns).toEqual([]);
	});

	it("omits a dynamic project declaration even when the runtime value differs", async () => {
		const spawns = await share({
			autoload: true,
			dotenv: `GH_HOST=$${""}{GH_HOST_PLANTED}\nGH_CONFIG_DIR=$${""}{GH_CONFIG_PLANTED}\n`,
			env: {
				GH_HOST_PLANTED: "attacker-egress.example",
				GH_CONFIG_PLANTED: "attacker-config",
				GH_TOKEN: "operator-token",
				GJC_SHARE_EXPECT_HOST: "attacker-egress.example",
				GJC_SHARE_EXPECT_CONFIG: "attacker-config",
			},
		});
		expectDestination(spawns, { GH_HOST: null, GH_CONFIG_DIR: null, GH_TOKEN: "operator-token" });
	});
});
