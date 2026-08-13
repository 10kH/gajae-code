/**
 * Read the global startup-auth configuration before Settings is initialized.
 *
 * The config file is canonical nested YAML only. Legacy literal dotted auth keys
 * are rejected with a manual rewrite diagnostic; no compatibility migration is
 * performed. Environment values are trusted credential sources and take
 * precedence over global config values.
 */
import * as path from "node:path";
import type { AuthCredentialSelector, CredentialRankingMode } from "@gajae-code/ai/core";
import { $credentialEnv, getAgentDir, getConfigRootDir, isEnoent, logger } from "@gajae-code/utils";
import { YAML } from "bun";

export interface AuthBrokerClientConfig {
	url: string;
	token: string;
}

export interface StartupAuthConfigSnapshot {
	broker: AuthBrokerClientConfig | null;
	credentialRankingMode: CredentialRankingMode;
	credentialPins: Readonly<Record<string, string>>;
}

const DEFAULT_CREDENTIAL_RANKING_MODE: CredentialRankingMode = "balanced";
const LEGACY_LITERAL_AUTH_KEYS = new Set([
	"auth.broker.url",
	"auth.broker.token",
	"auth.credentialRankingMode",
	"auth.credentialPins",
]);

/** Path to the local bearer token file. Created on the broker host by `gjc auth-broker token`. */
export function getAuthBrokerTokenFilePath(): string {
	return path.join(getConfigRootDir(), "auth-broker.token");
}

/** Validate the persisted selector grammar used by `auth.credentialPins`. */
export function parsePersistedCredentialSelector(value: string): AuthCredentialSelector | undefined {
	const trimmed = value.trim();
	if (/^id:[1-9]\d*$/.test(trimmed)) return { kind: "id", value: trimmed.slice(3) };
	if (/^email:[^@\s]+@[^@\s]+$/.test(trimmed)) return { kind: "email", value: trimmed.slice(6) };
	if (/^account:\S+$/.test(trimmed)) return { kind: "account", value: trimmed.slice(8) };
	return undefined;
}

export function isValidPersistedCredentialSelector(value: string): boolean {
	return parsePersistedCredentialSelector(value) !== undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function resolveRankingMode(value: unknown): CredentialRankingMode | undefined {
	return value === "balanced" || value === "earliest-reset" ? value : undefined;
}

function throwLegacyLiteralKeyError(keys: string[]): never {
	throw new Error(
		`Unsupported legacy dotted auth configuration key${keys.length === 1 ? "" : "s"}: ${keys.join(", ")}. ` +
			"Rewrite config.yml manually using canonical nested YAML (no automatic migration):\n" +
			"auth:\n" +
			"  broker:\n" +
			"    url: <broker-url>\n" +
			"    token: <broker-token>\n" +
			"  credentialRankingMode: balanced\n" +
			"  credentialPins:\n" +
			"    <provider>: id:<positive-id>\n" +
			"Do not copy secret values into command output; rewrite the file by hand.",
	);
}

function readCredentialPins(auth: Record<string, unknown> | undefined): Readonly<Record<string, string>> {
	const rawPins = auth?.credentialPins;
	if (rawPins === undefined) return {};
	const pins = asRecord(rawPins);
	if (!pins) throw new Error("Invalid auth.credentialPins: expected a record of selector strings.");

	const result: Record<string, string> = {};
	for (const [provider, rawSelector] of Object.entries(pins)) {
		const normalizedProvider = provider.trim();
		if (normalizedProvider.length === 0 || /[\u0000-\u001f\u007f]/u.test(normalizedProvider)) {
			throw new Error("Invalid auth.credentialPins provider key: expected a non-empty provider name.");
		}
		if (typeof rawSelector !== "string" || !isValidPersistedCredentialSelector(rawSelector)) {
			throw new Error(
				`Invalid auth.credentialPins entry for provider ${JSON.stringify(normalizedProvider)}: ` +
					"expected id:<positive-id>, email:<email>, or account:<account-id>.",
			);
		}
		result[normalizedProvider] = rawSelector.trim();
	}
	return result;
}

interface GlobalStartupAuthYaml {
	auth: Record<string, unknown> | undefined;
}

async function readGlobalStartupAuthYaml(agentDir: string): Promise<GlobalStartupAuthYaml> {
	const configPath = path.join(agentDir, "config.yml");
	let raw: string;
	try {
		raw = await Bun.file(configPath).text();
	} catch (error) {
		if (isEnoent(error)) return { auth: undefined };
		logger.warn("startup auth config.yml unreadable", { error: String(error) });
		return { auth: undefined };
	}
	if (raw.trim() === "") return { auth: undefined };

	let parsed: unknown;
	try {
		parsed = YAML.parse(raw);
	} catch (error) {
		logger.warn("startup auth config.yml has invalid YAML", { error: String(error) });
		return { auth: undefined };
	}
	const root = asRecord(parsed);
	if (!root) {
		logger.warn("startup auth config.yml root is not a mapping");
		return { auth: undefined };
	}
	const legacyKeys = Object.keys(root).filter(key => LEGACY_LITERAL_AUTH_KEYS.has(key));
	if (legacyKeys.length > 0) throwLegacyLiteralKeyError(legacyKeys);
	return { auth: asRecord(root.auth) };
}

async function readTokenFile(): Promise<string | undefined> {
	try {
		const raw = await Bun.file(getAuthBrokerTokenFilePath()).text();
		const trimmed = raw.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	} catch (error) {
		if (isEnoent(error)) return undefined;
		logger.warn("auth-broker token file unreadable", { error: String(error) });
		return undefined;
	}
}

/**
 * Resolve one typed startup-auth snapshot from trusted env and global config.
 * Project settings are intentionally not read here, so project-scoped pins
 * cannot influence credential selection.
 */
export async function resolveStartupAuthConfig(agentDir: string = getAgentDir()): Promise<StartupAuthConfigSnapshot> {
	const { auth } = await readGlobalStartupAuthYaml(agentDir);
	const broker = asRecord(auth?.broker);
	const envUrl = $credentialEnv("GJC_AUTH_BROKER_URL")?.trim();
	const envToken = $credentialEnv("GJC_AUTH_BROKER_TOKEN")?.trim();

	let url = envUrl || undefined;
	if (!url && typeof broker?.url === "string" && broker.url.trim()) url = broker.url.trim();

	const configToken = typeof broker?.token === "string" && broker.token.trim() ? broker.token.trim() : undefined;

	let resolvedBroker: AuthBrokerClientConfig | null = null;
	if (url) {
		const token = envToken || configToken || (await readTokenFile());
		if (!token) {
			throw new Error(
				`GJC_AUTH_BROKER_URL is set (${url}) but no bearer token is available. ` +
					`Set GJC_AUTH_BROKER_TOKEN, the nested \`auth.broker.token\` config entry, or place one at ${getAuthBrokerTokenFilePath()}.`,
			);
		}
		resolvedBroker = { url, token };
	}

	const rankingMode =
		resolveRankingMode($credentialEnv("GJC_CREDENTIAL_RANKING_MODE")) ??
		resolveRankingMode(auth?.credentialRankingMode) ??
		DEFAULT_CREDENTIAL_RANKING_MODE;
	return {
		broker: resolvedBroker,
		credentialRankingMode: rankingMode,
		credentialPins: readCredentialPins(auth),
	};
}
