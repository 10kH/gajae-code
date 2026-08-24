/**
 * `gjc auth-gateway` command handlers.
 *
 * Boots a forward-proxy server that lets less-trusted clients (the macOS
 * usage widget and containerized deployments) make provider API calls without ever
 * seeing the access token. The gateway is itself a broker client and
 * resolves credentials through the configured broker (via the same
 * `GJC_AUTH_BROKER_URL` / `auth.broker.url` precedence used elsewhere).
 *
 * Sub-verbs:
 *   - `serve [--bind=…]` — boots the gateway against the configured broker.
 *   - `token` / `token --regenerate` — manages the gateway bearer token file.
 *   - `status` — prints the locally-stored gateway token and bind hint.
 */
import * as crypto from "node:crypto";
import * as path from "node:path";
import { cleanReason } from "@gajae-code/ai/auth-broker";
import { startAuthGateway } from "@gajae-code/ai/auth-gateway/server";
import {
	type Api,
	AuthBrokerClient,
	AuthStorage,
	DEFAULT_AUTH_GATEWAY_BIND,
	type GeneratedProvider,
	getBundledModels,
	getBundledProviders,
	type Model,
	RemoteAuthCredentialStore,
	type SnapshotResponse,
} from "@gajae-code/ai/core";
import { getConfigRootDir, VERSION } from "@gajae-code/utils";
import chalk from "chalk";
import {
	createSecureTokenFileExclusive,
	readSecureTokenFile,
	writeSecureTokenFile,
} from "../session/secure-token-file";
import { type AuthBrokerClientConfig, resolveStartupAuthConfig } from "../session/startup-auth-config";

export type AuthGatewayAction = "serve" | "token" | "status" | "check";

export interface AuthGatewayCommandArgs {
	action: AuthGatewayAction;
	flags: {
		json?: boolean;
		bind?: string;
		regenerate?: boolean;
		/**
		 * Disable bearer-token auth on inbound requests. Useful when the gateway
		 * is bound to loopback (the default `127.0.0.1:4000`) and you don't want
		 * to wire token-paste plumbing into every local client.
		 */
		noAuth?: boolean;
	};
}

const ACTIONS: readonly AuthGatewayAction[] = ["serve", "token", "status", "check"];

type AuthGatewayCliErrorCode =
	| "broker_not_configured"
	| "broker_unavailable"
	| "credential_check_failed"
	| "auth_gateway_command_failed";

function stableErrorForAction(action: AuthGatewayAction): { code: AuthGatewayCliErrorCode; message: string } {
	switch (action) {
		case "status":
			return { code: "broker_unavailable", message: "Auth broker is unavailable." };
		case "check":
			return { code: "credential_check_failed", message: "Credential check failed." };
		default:
			return { code: "auth_gateway_command_failed", message: "Auth gateway command failed." };
	}
}

function safeDiagnostic(value: unknown, fallback: string): string {
	return cleanReason(value) ?? fallback;
}

function writeCommandFailure(action: AuthGatewayAction, flags: AuthGatewayCommandArgs["flags"], error: unknown): void {
	const stable = stableErrorForAction(action);
	if (flags.json) {
		process.stdout.write(`${JSON.stringify({ ok: false, error: stable })}\n`);
	} else {
		process.stderr.write(`${chalk.red("FAILED")} ${safeDiagnostic(error, stable.message)}\n`);
	}
	process.exitCode = 1;
}

function getTokenFilePath(): string {
	return path.join(getConfigRootDir(), "auth-gateway.token");
}

async function readToken(): Promise<string | null> {
	return readSecureTokenFile(getTokenFilePath());
}

async function writeToken(token: string): Promise<void> {
	await writeSecureTokenFile(getTokenFilePath(), token);
}

async function createTokenExclusive(token: string): Promise<boolean> {
	return createSecureTokenFileExclusive(getTokenFilePath(), token);
}

function generateToken(): string {
	return crypto.randomBytes(32).toString("base64url");
}

async function ensureToken(): Promise<string> {
	const existing = await readToken();
	if (existing) return existing;
	const token = generateToken();
	if (await createTokenExclusive(token)) return token;
	// Another concurrent invocation won the create race. Its file may exist
	// briefly before the winner writes the token, so retry reads without ever
	// overwriting the winner's file.
	for (let attempt = 0; attempt < 5; attempt++) {
		const fromRace = await readToken();
		if (fromRace) return fromRace;
		if (attempt < 4) await Bun.sleep(10);
	}
	// If the file disappeared, make one final exclusive-create attempt. Never
	// fall back to an unconditional write after observing EEXIST.
	if (await createTokenExclusive(token)) return token;
	throw new Error("Unable to initialize auth-gateway token: another process owns an empty token file.");
}

function createBrokerClient(brokerConfig: AuthBrokerClientConfig): AuthBrokerClient {
	return new AuthBrokerClient({ url: brokerConfig.url, token: brokerConfig.token });
}

async function fetchBrokerSnapshot(client: AuthBrokerClient): Promise<SnapshotResponse> {
	const result = await client.fetchSnapshot();
	if (result.status !== 200) throw new Error("Auth broker returned no initial snapshot");
	return result.snapshot;
}

async function runServe(flags: AuthGatewayCommandArgs["flags"]): Promise<void> {
	const brokerConfig = (await resolveStartupAuthConfig()).broker;
	if (!brokerConfig) {
		throw new Error(
			"`gjc auth-gateway serve` requires GJC_AUTH_BROKER_URL (or `auth.broker.url`/`auth.broker.token` in config.yml). The gateway is itself a broker client.",
		);
	}
	const bind = flags.bind ?? DEFAULT_AUTH_GATEWAY_BIND;
	const gatewayToken = flags.noAuth ? null : await ensureToken();

	// Build a broker-backed AuthStorage — same pattern as discoverAuthStorage()
	// in sdk/session.ts. The gateway never touches local SQLite.
	const client = createBrokerClient(brokerConfig);
	const initialSnapshot = await fetchBrokerSnapshot(client);
	const store = new RemoteAuthCredentialStore({ client, initialSnapshot });
	// Refresh + usage both flow through the store's broker hooks automatically —
	// `RemoteAuthCredentialStore.refreshOAuthCredential` and `.fetchUsageReports`.
	// AuthStorage discovers them when no explicit option overrides them, so the
	// gateway only needs to construct the store and pass it in.
	const storage = new AuthStorage(store, {
		sourceLabel: `broker ${brokerConfig.url}`,
	});
	await storage.reload();

	// Build the model resolver + catalog from pi-ai's bundled metadata, scoped
	// to providers we hold credentials for. Format handlers ask `resolveModel`
	// to translate a client-requested `model` field into a pi-ai `Model<Api>`
	// before dispatch; `listModels` powers `/v1/models`.
	const snapshot = storage.exportSnapshot();
	const providersWithCreds = new Set<string>();
	for (const entry of snapshot.credentials) providersWithCreds.add(entry.provider);
	const modelById = new Map<string, Model<Api>>();
	for (const provider of getBundledProviders()) {
		if (!providersWithCreds.has(provider)) continue;
		for (const model of getBundledModels(provider as GeneratedProvider)) {
			// First-write-wins so a canonical model id collisions across providers
			// stick to the provider listed first by getBundledProviders.
			if (!modelById.has(model.id)) modelById.set(model.id, model);
		}
	}

	const handle = startAuthGateway({
		storage,
		bind,
		bearerTokens: gatewayToken ? [gatewayToken] : [],
		version: VERSION,
		resolveModel: (id: string) => modelById.get(id),
		listModels: () => modelById.values(),
	});
	process.stdout.write(`auth-gateway listening on ${handle.url}\n`);
	if (gatewayToken) {
		process.stdout.write(`bearer token: ${getTokenFilePath()} (chmod 0600)\n`);
	} else {
		process.stdout.write(`auth: disabled (--no-auth) — any client can call this gateway\n`);
	}
	process.stdout.write(`upstream broker: ${brokerConfig.url}\n`);

	const stopped = Promise.withResolvers<void>();
	let shutdownStarted = false;
	const stop = async (signal: NodeJS.Signals): Promise<void> => {
		if (shutdownStarted) return;
		shutdownStarted = true;
		process.stdout.write(`\nReceived ${signal}, shutting down...\n`);
		let closeError: unknown;
		try {
			await handle.close();
		} catch (error) {
			closeError = error;
		} finally {
			storage.close();
		}
		if (closeError) {
			stopped.reject(closeError);
		} else {
			stopped.resolve();
		}
	};
	const onSigint = (): void => {
		void stop("SIGINT");
	};
	const onSigterm = (): void => {
		void stop("SIGTERM");
	};
	process.once("SIGINT", onSigint);
	process.once("SIGTERM", onSigterm);

	try {
		await stopped.promise;
	} finally {
		process.off("SIGINT", onSigint);
		process.off("SIGTERM", onSigterm);
	}
}

async function runToken(flags: AuthGatewayCommandArgs["flags"]): Promise<void> {
	if (flags.regenerate) {
		const next = generateToken();
		await writeToken(next);
		if (flags.json) {
			process.stdout.write(`${JSON.stringify({ token: next, path: getTokenFilePath() })}\n`);
		} else {
			process.stdout.write(`${next}\n`);
		}
		return;
	}
	const token = await ensureToken();
	if (flags.json) {
		process.stdout.write(`${JSON.stringify({ token, path: getTokenFilePath() })}\n`);
	} else {
		process.stdout.write(`${token}\n`);
	}
}

async function runStatus(flags: AuthGatewayCommandArgs["flags"]): Promise<void> {
	const token = await readToken();
	const brokerConfig = (await resolveStartupAuthConfig()).broker;
	const tokenFile = getTokenFilePath();
	if (!brokerConfig) {
		const status = {
			ready: false,
			reason: "broker_not_configured",
			error: { code: "broker_not_configured", message: "Auth broker is not configured." },
			tokenFile,
			tokenPresent: token !== null,
			broker: null,
			brokerConfigured: false,
			brokerAuthenticated: false,
		};
		if (flags.json) {
			process.stdout.write(`${JSON.stringify(status)}\n`);
		} else {
			process.stdout.write(`${chalk.yellow("No broker configured.")} Set GJC_AUTH_BROKER_URL.\n`);
			process.stdout.write(
				`token: ${status.tokenPresent ? chalk.green("present") : chalk.red("missing")} at ${status.tokenFile}\n`,
			);
		}
		process.exitCode = 1;
		return;
	}

	try {
		const snapshot = await fetchBrokerSnapshot(createBrokerClient(brokerConfig));
		const tokenPresent = token !== null;
		const status = {
			ready: tokenPresent,
			reason: tokenPresent ? null : "token_missing",
			tokenFile,
			tokenPresent,
			broker: brokerConfig.url,
			brokerConfigured: true,
			brokerAuthenticated: true,
			credentialCount: snapshot.credentials.length,
		};
		if (flags.json) {
			process.stdout.write(`${JSON.stringify(status)}\n`);
		} else {
			const brokerLine = `upstream broker: ${brokerConfig.url} (${snapshot.credentials.length} credential${
				snapshot.credentials.length === 1 ? "" : "s"
			})`;
			process.stdout.write(`${tokenPresent ? chalk.green("ready") : chalk.yellow("not ready")} ${brokerLine}\n`);
			process.stdout.write(
				`token: ${tokenPresent ? chalk.green("present") : chalk.red("missing")} at ${status.tokenFile}\n`,
			);
			if (!tokenPresent) {
				process.stdout.write(
					"Run `gjc auth-gateway token` or `gjc auth-gateway serve` to create a bearer token.\n",
				);
			}
		}
		if (!tokenPresent) process.exitCode = 1;
	} catch (error) {
		const status = {
			ready: false,
			reason: "broker_unavailable",
			tokenFile,
			tokenPresent: token !== null,
			broker: brokerConfig.url,
			brokerConfigured: true,
			brokerAuthenticated: false,
			error: { code: "broker_unavailable", message: "Auth broker is unavailable." },
		};
		if (flags.json) {
			process.stdout.write(`${JSON.stringify(status)}\n`);
		} else {
			process.stdout.write(
				`${chalk.red("FAILED")} upstream broker: ${brokerConfig.url}: ${safeDiagnostic(error, "Auth broker is unavailable.")}\n`,
			);
			process.stdout.write(
				`token: ${status.tokenPresent ? chalk.green("present") : chalk.red("missing")} at ${status.tokenFile}\n`,
			);
		}
		process.exitCode = 1;
	}
}

export async function runAuthGatewayCommand(cmd: AuthGatewayCommandArgs): Promise<void> {
	try {
		switch (cmd.action) {
			case "serve":
				await runServe(cmd.flags);
				return;
			case "token":
				await runToken(cmd.flags);
				return;
			case "status":
				await runStatus(cmd.flags);
				return;
			case "check":
				await runCheck(cmd.flags);
				return;
			default: {
				const _exhaustive: never = cmd.action;
				throw new Error(`Unknown auth-gateway action: ${String(_exhaustive)}`);
			}
		}
	} catch (error) {
		if (cmd.action === "status" || cmd.action === "check") {
			writeCommandFailure(cmd.action, cmd.flags, error);
			return;
		}
		throw error;
	}
}

/**
 * `gjc auth-gateway check` — probe each broker-supplied credential and print
 * per-credential auth health. Use this when the gateway is returning 401s and
 * you need to find which row in a multi-account pool is the bad one. The
 * aggregate `/v1/usage` endpoint silently drops failed credentials, so a
 * dedicated diagnostic is the only way to see which credentials failed.
 */
async function runCheck(flags: AuthGatewayCommandArgs["flags"]): Promise<void> {
	const brokerConfig = (await resolveStartupAuthConfig()).broker;
	if (!brokerConfig) {
		throw new Error(
			"`gjc auth-gateway check` requires GJC_AUTH_BROKER_URL (or `auth.broker.url`/`auth.broker.token` in config.yml). It probes the same credentials the gateway would serve.",
		);
	}

	const client = createBrokerClient(brokerConfig);
	const initialSnapshot = await fetchBrokerSnapshot(client);
	const store = new RemoteAuthCredentialStore({ client, initialSnapshot });
	const storage = new AuthStorage(store, { sourceLabel: `broker ${brokerConfig.url}` });
	try {
		await storage.reload();
		const results = await storage.checkCredentials();

		if (flags.json) {
			const credentials = results.map(row => ({
				...row,
				...(row.reason ? { reason: safeDiagnostic(row.reason, "Credential check failed.") } : {}),
			}));
			process.stdout.write(`${JSON.stringify({ broker: brokerConfig.url, credentials }, null, 2)}\n`);
		} else {
			const grouped = new Map<string, typeof results>();
			for (const row of results) {
				const list = grouped.get(row.provider) ?? [];
				list.push(row);
				grouped.set(row.provider, list);
			}
			const providers = [...grouped.keys()].sort();
			process.stdout.write(`broker: ${brokerConfig.url}\n`);
			for (const provider of providers) {
				const rows = grouped.get(provider) ?? [];
				process.stdout.write(`\n${chalk.bold(provider)} (${rows.length})\n`);
				for (const row of rows) {
					const status =
						row.ok === true
							? chalk.green("ok      ")
							: row.ok === false
								? chalk.red("FAIL    ")
								: chalk.yellow("unknown ");
					const identity =
						row.email ?? row.accountId ?? (row.type === "api_key" ? "(api key)" : "(no identity on credential)");
					const remote = row.remoteRefresh ? chalk.dim(" [remote-refresh]") : "";
					const reason = row.reason
						? chalk.dim(` — ${safeDiagnostic(row.reason, "Credential check failed.")}`)
						: "";
					process.stdout.write(
						`  ${status} id=${row.id.toString().padStart(3)} ${row.type.padEnd(7)} ${identity}${remote}${reason}\n`,
					);
				}
			}
			const failed = results.filter(row => row.ok === false).length;
			const unverifiable = results.filter(row => row.ok === null).length;
			const passing = results.filter(row => row.ok === true).length;
			process.stdout.write(
				`\n${chalk.green(`${passing} ok`)}, ${chalk.red(`${failed} failed`)}, ${chalk.yellow(`${unverifiable} unverifiable`)}, ${results.length} total\n`,
			);
			if (failed > 0) process.exitCode = 1;
		}
	} finally {
		storage.close();
	}
}

export { ACTIONS as AUTH_GATEWAY_ACTIONS };
