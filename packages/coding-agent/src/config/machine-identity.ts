import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { getConfigRootDir } from "@gajae-code/utils";

export interface MachineIdentityDeps {
	platform?: NodeJS.Platform;
	readFile?: (file: string) => Promise<string>;
	runCommand?: (command: string, args: readonly string[]) => { exitCode: number; stdout: Uint8Array };
	installationSecret?: string;
}

function normalizedMachineIdentity(value: string, pattern: RegExp): string | undefined {
	const normalized = value.trim().toLowerCase();
	if (!pattern.test(normalized) || /^0+$/.test(normalized.replace(/-/g, ""))) return undefined;
	return normalized;
}

/** @internal */
export function parseWindowsMachineGuid(output: string): string | undefined {
	const match = /^\s*MachineGuid\s+REG_\w+\s+(\S+)\s*$/im.exec(output);
	return match
		? normalizedMachineIdentity(match[1], /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
		: undefined;
}

/** @internal */
export function parseMacPlatformUuid(output: string): string | undefined {
	const match = /"IOPlatformUUID"\s*=\s*"([^"]+)"/.exec(output);
	return match
		? normalizedMachineIdentity(match[1], /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
		: undefined;
}

async function loadInstallationSecret(): Promise<string> {
	const directory = getConfigRootDir();
	const file = path.join(directory, "machine-identity.secret");
	await fs.mkdir(directory, { recursive: true, mode: 0o700 });
	for (;;) {
		try {
			const secret = (await fs.readFile(file, "utf8")).trim();
			if (/^[0-9a-f]{64}$/.test(secret)) return secret;
			throw new Error(`installation identity secret is malformed at ${file}`);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		}

		const secret = crypto.randomBytes(32).toString("hex");
		const temporary = path.join(directory, `.machine-identity.secret-${crypto.randomBytes(16).toString("hex")}`);
		try {
			await fs.writeFile(temporary, `${secret}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
			await fs.chmod(temporary, 0o600);
			try {
				await fs.link(temporary, file);
				return secret;
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
			}
		} finally {
			await fs.rm(temporary, { force: true });
		}
	}
}

function hashMachineIdentity(rawId: string, installationSecret: string): string {
	return crypto
		.createHmac("sha256", Buffer.from(installationSecret, "hex"))
		.update("gajae-code:machine-identity:v2\0")
		.update(rawId)
		.digest("hex");
}

/** Loads a verified machine-local identity without persisting the underlying machine ID. */
export async function loadInstallationHostId(deps: MachineIdentityDeps = {}): Promise<string> {
	const platform = deps.platform ?? process.platform;
	const readFile = deps.readFile ?? (async (file: string) => await fs.readFile(file, "utf8"));
	const runCommand =
		deps.runCommand ??
		((command: string, args: readonly string[]) =>
			Bun.spawnSync([command, ...args], { stdout: "pipe", stderr: "ignore" }));

	let rawId: string | undefined;
	if (platform === "linux") {
		for (const file of ["/etc/machine-id", "/var/lib/dbus/machine-id"]) {
			try {
				const value = normalizedMachineIdentity(await readFile(file), /^[0-9a-f]{32}$/);
				if (!value) continue;
				rawId = value;
				break;
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
			}
		}
	} else if (platform === "win32") {
		const result = runCommand("reg", ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"]);
		if (result.exitCode === 0) rawId = parseWindowsMachineGuid(new TextDecoder().decode(result.stdout));
	} else if (platform === "darwin") {
		const result = runCommand("ioreg", ["-rd1", "-c", "IOPlatformExpertDevice"]);
		if (result.exitCode === 0) rawId = parseMacPlatformUuid(new TextDecoder().decode(result.stdout));
	} else {
		throw new Error(`machine-local identity is unsupported on ${platform}`);
	}

	if (!rawId) throw new Error("machine-local identity is unavailable or malformed");
	const installationSecret = deps.installationSecret ?? (await loadInstallationSecret());
	if (!/^[0-9a-f]{64}$/.test(installationSecret)) throw new Error("installation identity secret is malformed");
	return hashMachineIdentity(rawId, installationSecret);
}
