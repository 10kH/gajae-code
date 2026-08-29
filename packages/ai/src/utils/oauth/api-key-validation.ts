import { sanitizeDisplayLine } from "@gajae-code/utils";

type OpenAICompatibleValidationOptions = {
	provider: string;
	apiKey: string;
	baseUrl: string;
	model: string;
	signal?: AbortSignal;
	fetch?: typeof globalThis.fetch;
};

type ModelListValidationOptions = {
	provider: string;
	apiKey: string;
	modelsUrl: string;
	signal?: AbortSignal;
	fetch?: typeof globalThis.fetch;
};

const VALIDATION_TIMEOUT_MS = 15_000;

/** Most characters of an upstream body echoed into a validation error. */
const VALIDATION_DETAILS_LIMIT = 200;
const VALIDATION_BODY_LIMIT = 64 * 1024;

function redactSecrets(text: string, apiKey: string): string {
	let safe = text;
	if (apiKey) {
		const escaped = [...apiKey].map(char => char.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&"));
		const interspersed = new RegExp(escaped.join("[\\s\\x00-\\x1f\\x7f-\\x9f]*"), "gu");
		safe = safe.replace(interspersed, "[REDACTED]");
	}
	safe = sanitizeDisplayLine(safe);
	safe = safe.replace(/[\x00-\x1f\x7f-\x9f]/gu, " ");
	if (apiKey) safe = safe.replaceAll(apiKey, "[REDACTED]");
	// Upstream errors sometimes echo credentials under a field name instead of
	// returning the exact bearer value. Redact those values before retaining any
	// bounded diagnostic snippet.
	safe = safe
		.replace(/(Bearer\s+)([^\s,}"']+)/giu, "$1[REDACTED]")
		.replace(
			/(["']?(?:authorization|proxy-authorization|api[-_ ]?key|access[-_ ]?token|refresh[-_ ]?token|token|secret|password)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,}\]]+)/giu,
			"$1[REDACTED]",
		);
	return safe;
}

function boundedDetails(text: string, apiKey: string): string {
	const trimmed = redactSecrets(text, apiKey).trim();
	return trimmed.length > VALIDATION_DETAILS_LIMIT ? `${trimmed.slice(0, VALIDATION_DETAILS_LIMIT)}…` : trimmed;
}

async function readBoundedBody(response: Response): Promise<string> {
	const contentLength = Number(response.headers.get("content-length"));
	if (Number.isFinite(contentLength) && contentLength > VALIDATION_BODY_LIMIT)
		return "[response body exceeded validation limit]";
	if (!response.body) return "";
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	try {
		while (total <= VALIDATION_BODY_LIMIT) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value) {
				chunks.push(value);
				total += value.byteLength;
			}
		}
	} finally {
		await reader.cancel().catch(() => {});
	}
	const bytes = new Uint8Array(Math.min(total, VALIDATION_BODY_LIMIT));
	let offset = 0;
	for (const chunk of chunks) {
		const take = Math.min(chunk.byteLength, bytes.length - offset);
		if (take <= 0) break;
		bytes.set(chunk.subarray(0, take), offset);
		offset += take;
	}
	return new TextDecoder().decode(bytes);
}

function errorDetails(error: unknown, apiKey: string): string {
	return boundedDetails(error instanceof Error ? error.message : String(error), apiKey);
}

function validationFailure(provider: string, apiKey: string, suffix: string): Error {
	const details = boundedDetails(suffix, apiKey);
	return new Error(
		details ? `${provider} API key validation failed: ${details}` : `${provider} API key validation failed`,
	);
}

/**
 * Validate an API key against an OpenAI-compatible chat completions endpoint.
 *
 * Performs a minimal request to verify credentials and endpoint access.
 */
export async function validateOpenAICompatibleApiKey(options: OpenAICompatibleValidationOptions): Promise<void> {
	const timeoutSignal = AbortSignal.timeout(VALIDATION_TIMEOUT_MS);
	const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
	const fetchImpl = options.fetch ?? globalThis.fetch;
	if (/[\x00-\x1f\x7f-\x9f]/u.test(options.apiKey))
		throw new Error(`${options.provider} API key contains unsupported control characters`);

	let response: Response;
	try {
		response = await fetchImpl(`${options.baseUrl}/chat/completions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${options.apiKey}`,
			},
			body: JSON.stringify({
				model: options.model,
				messages: [{ role: "user", content: "ping" }],
				max_tokens: 1,
				temperature: 0,
			}),
			signal,
		});
	} catch (error) {
		throw validationFailure(
			options.provider,
			options.apiKey,
			`request failed (${errorDetails(error, options.apiKey)})`,
		);
	}

	if (response.ok) {
		return;
	}

	let details = "";
	try {
		details = boundedDetails(await readBoundedBody(response), options.apiKey);
	} catch {
		// ignore body parse errors, status is enough
	}

	const message = details
		? `${options.provider} API key validation failed (${response.status}): ${details}`
		: `${options.provider} API key validation failed (${response.status})`;
	throw new Error(message);
}
/**
 * Whether a 200 body is a recognizable model list. OpenAI-compatible endpoints
 * return `{"object":"list","data":[...]}`; some gateways answer with a bare
 * array or `{"models":[...]}`. Anything else — including valid JSON without a
 * list — is not evidence that the credential reached a models endpoint.
 */
function isModelList(parsed: unknown): boolean {
	if (Array.isArray(parsed)) return true;
	if (typeof parsed !== "object" || parsed === null) return false;
	const record = parsed as { data?: unknown; models?: unknown };
	return Array.isArray(record.data) || Array.isArray(record.models);
}

/**
 * Validate a provider models endpoint's reachability and response shape.
 *
 * Useful for providers where access to specific models may vary by plan and
 * should not block login; an available model list is not proof that an
 * authenticated inference request will succeed for the supplied key.
 *
 * A 200 status alone is NOT accepted: a captive portal, misrouting proxy, or
 * broken gateway can answer 200 with an HTML page or an empty JSON object.
 * The body must parse as JSON and carry a recognizable model list before the
 * endpoint is considered reachable. This catalog check is not proof that
 * authenticated inference is entitled to use the supplied key.
 */
export async function validateApiKeyAgainstModelsEndpoint(options: ModelListValidationOptions): Promise<void> {
	const timeoutSignal = AbortSignal.timeout(VALIDATION_TIMEOUT_MS);
	const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
	const fetchImpl = options.fetch ?? globalThis.fetch;
	if (/[\x00-\x1f\x7f-\x9f]/u.test(options.apiKey))
		throw new Error(`${options.provider} API key contains unsupported control characters`);

	let response: Response;
	try {
		response = await fetchImpl(options.modelsUrl, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${options.apiKey}`,
			},
			signal,
		});
	} catch (error) {
		throw validationFailure(
			options.provider,
			options.apiKey,
			`request failed (${errorDetails(error, options.apiKey)})`,
		);
	}

	if (response.ok) {
		let body: string;
		try {
			body = await readBoundedBody(response);
		} catch (error) {
			throw validationFailure(
				options.provider,
				options.apiKey,
				`the models endpoint response body could not be read (${errorDetails(error, options.apiKey)})`,
			);
		}
		let parsed: unknown;
		try {
			parsed = JSON.parse(body);
		} catch {
			throw new Error(
				`${options.provider} API key validation failed: the models endpoint returned ${response.status} with a non-JSON body` +
					`${body.trim() ? ` (${boundedDetails(body, options.apiKey)})` : ""}. Refusing to accept the key on status alone.`,
			);
		}
		if (!isModelList(parsed)) {
			throw new Error(
				`${options.provider} API key validation failed: the models endpoint returned ${response.status} without a recognizable ` +
					`model list. Refusing to accept the key on status alone.`,
			);
		}
		return;
	}

	let details = "";
	try {
		details = boundedDetails(await readBoundedBody(response), options.apiKey);
	} catch {
		// ignore body parse errors, status is enough
	}

	const message = details
		? `${options.provider} API key validation failed (${response.status}): ${details}`
		: `${options.provider} API key validation failed (${response.status})`;
	throw new Error(message);
}
