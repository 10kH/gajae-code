/**
 * Private field carried only on the Broker's endpoint close request.
 *
 * The value is the lifecycle effect marker bound to the serving process. It is
 * never published in endpoint discovery or lifecycle service results; callers
 * that do not hold the Broker's indexed lifecycle record cannot satisfy this
 * gate.
 */
export const BROKER_RUNTIME_CLOSE_CAPABILITY_FIELD = "__gjcBrokerCloseCapability";
const EXPECTED_BROKER_RUNTIME_CLOSE_CAPABILITY = process.env.GJC_LIFECYCLE_REQUEST_ID;

function record(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

export function brokerRuntimeCloseCapability(input: unknown): string | undefined {
	const value = record(input)?.[BROKER_RUNTIME_CLOSE_CAPABILITY_FIELD];
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Remove the private close capability before a request is exposed to diagnostics. */
export function redactBrokerRuntimeCloseCapability(frame: Record<string, unknown>): Record<string, unknown> {
	if (frame.type !== "control_request" || frame.operation !== "session.close") return frame;
	const input = record(frame.input);
	if (!input || !Object.hasOwn(input, BROKER_RUNTIME_CLOSE_CAPABILITY_FIELD)) return frame;
	const { [BROKER_RUNTIME_CLOSE_CAPABILITY_FIELD]: _capability, ...publicInput } = input;
	return { ...frame, input: publicInput };
}

/**
 * Frame-level keys an observer may see. `SdkFrame` is an open
 * `Record<string, unknown>` and `#observeRequest` runs BEFORE dispatch
 * validation, so an adversarial or malformed frame can carry content under any
 * top-level key. Only structural routing values survive. `idempotencyKey` is a
 * caller-chosen value and is deliberately absent; so are `cursor` (a signed
 * pagination token that can carry session/revision data) and `expectedRevision`
 * (no diagnostic consumer reads it).
 */
const OBSERVABLE_FRAME_FIELDS = new Set(["type", "id", "operation", "query", "confirm"]);

/**
 * Input fields an observer may see. This is an ALLOWLIST on purpose: a
 * denylist is fail-open, so every unlisted or newly added field would leak by
 * default. Only structural routing/correlation values are preserved; all other
 * values are caller content and are replaced with a shape marker.
 */
const OBSERVABLE_INPUT_FIELDS = new Set([
	"clientRef",
	"commandId",
	"turnId",
	"sessionId",
	"expectedSessionId",
	"mode",
	"scope",
	"kind",
	"level",
	"on",
	"confirm",
	"name",
	"op",
	"id",
]);

/** Replaces caller content with a shape-preserving marker for observers. */
function redactedContentMarker(value: unknown): string {
	if (typeof value === "string") return `[redacted ${value.length} chars]`;
	if (Array.isArray(value)) return `[redacted ${value.length} items]`;
	if (value !== null && typeof value === "object") return `[redacted ${Object.keys(value).length} fields]`;
	return "[redacted]";
}

/**
 * Strips caller content from a request frame before it reaches a diagnostic
 * observer. Operation, ids, and correlation fields survive so instrumentation
 * stays useful; everything else is redacted, including nested objects, so a
 * field this module has never heard of cannot leak.
 */
export function redactObservedRequestContent(frame: Record<string, unknown>): Record<string, unknown> {
	const observed: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(frame)) {
		if (value === undefined) continue;
		if (key === "input") {
			const input = record(value);
			// A non-record payload is content, not "nothing to redact". Returning
			// early here would hand a string or array `input` through verbatim.
			observed.input = input === undefined ? redactedContentMarker(value) : redactObservedInput(input);
			continue;
		}
		// Structural routing scalars survive; every other top-level key, including
		// one this module has never heard of, is redacted.
		observed[key] =
			OBSERVABLE_FRAME_FIELDS.has(key) && (value === null || typeof value !== "object")
				? value
				: redactedContentMarker(value);
	}
	return observed;
}

/** Redacts one input payload, preserving only structural scalar routing fields. */
function redactObservedInput(input: Record<string, unknown>): Record<string, unknown> {
	const redacted: Record<string, unknown> = {};
	for (const [field, value] of Object.entries(input)) {
		if (value === undefined) continue;
		// A scalar routing field is safe; an object or array under an allowlisted
		// name still gets redacted, because nesting is where content hides.
		redacted[field] =
			OBSERVABLE_INPUT_FIELDS.has(field) && (value === null || typeof value !== "object")
				? value
				: redactedContentMarker(value);
	}
	return redacted;
}

/**
 * Runtime-local authority check for the Broker-only graceful close executor.
 *
 * A lifecycle child receives GJC_LIFECYCLE_REQUEST_ID from the Broker launch
 * environment. Generic SDK requests never receive that private marker.
 */
export function hasBrokerRuntimeCloseCapability(input: unknown): boolean {
	const expected = EXPECTED_BROKER_RUNTIME_CLOSE_CAPABILITY;
	const actual = brokerRuntimeCloseCapability(input);
	return typeof expected === "string" && expected.length > 0 && actual === expected;
}
