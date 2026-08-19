import * as fs from "node:fs/promises";
import * as path from "node:path";
import { withFileLock } from "../config/file-lock";

/**
 * Opt-in webhook delivery of existing coordinator `watch_events` journal rows
 * (issue #4706). Delivery is a durable outbox keyed by the journal row's stable
 * `id`: each delivered row is recorded once, retried with bounded exponential
 * backoff, and never blocks or rewrites the journal append path.
 */

export interface EventWebhookConfig {
	url: string;
	tokenFile: string | null;
	sessionIds: Set<string> | null;
	timeoutMs: number;
	maxAttempts: number;
}

interface WebhookDeliveryRecord {
	schema_version: 1;
	event_id: string;
	status: "pending" | "delivered" | "failed";
	attempts: number;
	created_at: string;
	updated_at: string;
	last_error: string | null;
}

export interface WebhookDelivery {
	/** Called with the exact JSON body to POST and per-attempt request options. */
	post(
		body: string,
		options: { url: string; token: string | null; timeoutMs: number; signal: AbortSignal },
	): Promise<{ ok: boolean; status: number | null; error: string | null }>;
	/** Test seam: delay between retries; default is `Bun.sleep`. */
	sleep(ms: number): Promise<void>;
	/** Monotonic-ish clock for deadline math; default is `Date.now`. */
	now(): number;
}

/** Default `WebhookDelivery` over `fetch`: POST, 2xx = ok, no redirects, abort on timeout. */
export function createDefaultEventWebhookDelivery(): WebhookDelivery {
	return {
		async post(body, options) {
			const response = await fetch(options.url, {
				method: "POST",
				redirect: "error",
				signal: options.signal,
				headers: {
					"content-type": "application/json",
					...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
				},
				body,
			});
			// Drain the body so the socket is reusable, then treat non-2xx as failure.
			await response.text().catch(() => "");
			if (!response.ok) return { ok: false, status: response.status, error: `http_${response.status}` };
			return { ok: true, status: response.status, error: null };
		},
		sleep: async ms => {
			await Bun.sleep(ms);
		},
		now: () => Date.now(),
	};
}

export const DEFAULT_EVENT_WEBHOOK_TIMEOUT_MS = 5_000;
export const MAX_EVENT_WEBHOOK_TIMEOUT_MS = 30_000;
export const DEFAULT_EVENT_WEBHOOK_MAX_ATTEMPTS = 5;
export const MAX_EVENT_WEBHOOK_MAX_ATTEMPTS = 10;
const WEBHOOK_BACKOFF_BASE_MS = 500;
const WEBHOOK_BACKOFF_CAP_MS = 15_000;
const WEBHOOK_ERROR_CAP = 240;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

export function parseEventWebhookConfig(env: NodeJS.ProcessEnv): EventWebhookConfig | null {
	const rawUrl = env.GJC_COORDINATOR_MCP_EVENT_WEBHOOK_URL?.trim();
	if (!rawUrl) return null;
	let parsed: URL;
	try {
		parsed = new URL(rawUrl);
	} catch {
		throw new Error("coordinator_event_webhook_url_invalid");
	}
	const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
	if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && LOOPBACK_HOSTS.has(hostname)))
		throw new Error("coordinator_event_webhook_url_not_allowed");
	const rawSessions = env.GJC_COORDINATOR_MCP_EVENT_WEBHOOK_SESSION_IDS?.trim();
	const sessionIds = rawSessions
		? new Set(
				rawSessions
					.split(",")
					.map(value => value.trim())
					.filter(value => /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(value)),
			)
		: null;
	const tokenFile = env.GJC_COORDINATOR_MCP_EVENT_WEBHOOK_TOKEN_FILE?.trim() ?? "";
	if (tokenFile !== "" && !path.isAbsolute(tokenFile)) throw new Error("coordinator_event_webhook_token_file_invalid");
	const timeoutRaw = Number.parseInt(env.GJC_COORDINATOR_MCP_EVENT_WEBHOOK_TIMEOUT_MS ?? "", 10);
	const timeoutMs =
		Number.isFinite(timeoutRaw) && timeoutRaw > 0
			? Math.min(timeoutRaw, MAX_EVENT_WEBHOOK_TIMEOUT_MS)
			: DEFAULT_EVENT_WEBHOOK_TIMEOUT_MS;
	const attemptsRaw = Number.parseInt(env.GJC_COORDINATOR_MCP_EVENT_WEBHOOK_MAX_ATTEMPTS ?? "", 10);
	const maxAttempts =
		Number.isFinite(attemptsRaw) && attemptsRaw > 0
			? Math.min(attemptsRaw, MAX_EVENT_WEBHOOK_MAX_ATTEMPTS)
			: DEFAULT_EVENT_WEBHOOK_MAX_ATTEMPTS;
	return { url: rawUrl, tokenFile: tokenFile || null, sessionIds, timeoutMs, maxAttempts };
}

function eventWebhookScopeApplies(config: EventWebhookConfig, event: { session_id?: string }): boolean {
	return config.sessionIds === null || (event.session_id !== undefined && config.sessionIds.has(event.session_id));
}

function recordPath(namespaceDir: string, eventId: string): string {
	if (!/^event-\d{12,}$/.test(eventId)) throw new Error("coordinator_event_webhook_event_id_invalid");
	return path.join(namespaceDir, "webhook-outbox", `${eventId}.json`);
}

async function readRecord(file: string): Promise<WebhookDeliveryRecord | null> {
	try {
		return JSON.parse(await fs.readFile(file, "utf8")) as WebhookDeliveryRecord;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
		throw error;
	}
}

async function writeRecord(file: string, record: WebhookDeliveryRecord): Promise<void> {
	await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
	await fs.writeFile(file, JSON.stringify(record), { mode: 0o600 });
}

function webhookErrorSummary(error: string | null): string | null {
	if (error === null) return null;
	const normalized = error.replace(/[\r\n]+/g, " ").trim();
	return normalized.length > WEBHOOK_ERROR_CAP ? `${normalized.slice(0, WEBHOOK_ERROR_CAP - 3)}...` : normalized;
}

function backoffDelayMs(attempt: number): number {
	return Math.min(WEBHOOK_BACKOFF_BASE_MS * 2 ** (attempt - 1), WEBHOOK_BACKOFF_CAP_MS);
}

async function readWebhookToken(tokenFile: string | null): Promise<string | null> {
	if (tokenFile === null) return null;
	try {
		return (await fs.readFile(tokenFile, "utf8")).trim();
	} catch {
		throw new Error("coordinator_event_webhook_token_file_unreadable");
	}
}

/**
 * Records the row in the durable outbox and, unless the row is already
 * delivered or exhausted, performs one bounded delivery attempt series. The
 * returned promise settles only after bounded attempts/backoff, so a dead sink
 * can never wedge the caller's persistence; callers run it off the append path.
 */
export async function deliverEventWebhook(
	namespaceDir: string,
	config: EventWebhookConfig,
	event: { id: string; session_id?: string },
	renderBody: () => string,
	delivery: WebhookDelivery,
): Promise<void> {
	if (!eventWebhookScopeApplies(config, event)) return;
	const file = recordPath(namespaceDir, event.id);
	return await withFileLock(file, async () => {
		const now0 = delivery.now();
		let record = await readRecord(file);
		if (record === null) {
			record = {
				schema_version: 1,
				event_id: event.id,
				status: "pending",
				attempts: 0,
				created_at: new Date(now0).toISOString(),
				updated_at: new Date(now0).toISOString(),
				last_error: null,
			};
			await writeRecord(file, record);
		} else if (record.status !== "pending") {
			return;
		}
		const token = await readWebhookToken(config.tokenFile);
		const body = renderBody();
		while (record.attempts < config.maxAttempts) {
			record.attempts += 1;
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), config.timeoutMs);
			timer.unref?.();
			let outcome: Awaited<ReturnType<WebhookDelivery["post"]>>;
			try {
				outcome = await delivery.post(body, {
					url: config.url,
					token,
					timeoutMs: config.timeoutMs,
					signal: controller.signal,
				});
			} catch (error) {
				outcome = { ok: false, status: null, error: error instanceof Error ? error.message : String(error) };
			} finally {
				clearTimeout(timer);
			}
			const ts = new Date(delivery.now()).toISOString();
			record.updated_at = ts;
			record.last_error = outcome.ok ? null : webhookErrorSummary(outcome.error);
			if (outcome.ok) {
				record.status = "delivered";
				await writeRecord(file, record);
				return;
			}
			if (record.attempts >= config.maxAttempts) {
				record.status = "failed";
				await writeRecord(file, record);
				return;
			}
			await writeRecord(file, record);
			await delivery.sleep(backoffDelayMs(record.attempts));
		}
	});
}
