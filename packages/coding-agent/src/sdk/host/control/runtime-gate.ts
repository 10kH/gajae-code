import { findOperation } from "../../protocol/operation-registry";

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
 * top-level key. Only structural routing values survive. `idempotencyKey`,
 * `id`, and other correlation values are caller-chosen and are deliberately
 * absent; so are `cursor` (a signed pagination token that can carry
 * session/revision data) and `expectedRevision` (no diagnostic consumer reads
 * it). Even allowlisted routing names are checked against their protocol
 * values below: a field-name allowlist alone is fail-open for scalar secrets.
 */
const OBSERVABLE_FRAME_FIELDS = new Set(["type", "operation", "query"]);

/**
 * Frame keys whose value must match an exact expected type to survive.
 * `confirm` is a structural destructive-op gate, so only the boolean form is
 * routing information; a caller-authored string under that name is content.
 */
const OBSERVABLE_TYPED_FRAME_FIELDS: Readonly<Record<string, "boolean">> = { confirm: "boolean" };

const OBSERVABLE_FRAME_LITERAL_FIELDS: Readonly<Record<string, ReadonlySet<string>>> = {
	type: new Set(["control_request", "query_request"]),
};

const OBSERVER_MARKER_MAX_COUNT = 4096;

/**
 * Input fields an observer may see. This is an ALLOWLIST on purpose: a
 * denylist is fail-open, so every unlisted or newly added field would leak by
 * default. Only structural routing/correlation values are preserved; all other
 * values are caller content and are replaced with a shape marker.
 */
const OBSERVABLE_INPUT_FIELDS = new Set(["mode", "scope", "kind", "level", "on", "confirm"]);

/**
 * Input fields that carry a finite protocol value. Correlation identifiers,
 * names, and operation arguments remain redacted even when they look like
 * ordinary identifiers: callers are free to put arbitrary content in them.
 */
const OBSERVABLE_INPUT_LITERAL_FIELDS: Readonly<Record<string, ReadonlySet<string>>> = {
	mode: new Set([
		"turn",
		"terminal",
		"owned",
		"allow",
		"always-allow",
		"deny",
		"always-deny",
		"prompt",
		"all",
		"one-at-a-time",
		"immediate",
		"wait",
	]),
	scope: new Set(["turn", "owned"]),
	kind: new Set(["prompt", "skill"]),
	level: new Set(["inherit", "off", "minimal", "low", "medium", "high", "xhigh", "max"]),
};

const OBSERVABLE_INPUT_TYPED_FIELDS: Readonly<Record<string, "boolean">> = {
	on: "boolean",
	confirm: "boolean",
};

/** Replaces caller content with a shape-preserving marker for observers. */
function redactedContentMarker(value: unknown): string {
	if (typeof value === "string") {
		const count = Math.min(value.length, OBSERVER_MARKER_MAX_COUNT);
		return `[redacted ${count}${value.length > count ? "+" : ""} chars]`;
	}
	if (Array.isArray(value)) {
		const count = Math.min(value.length, OBSERVER_MARKER_MAX_COUNT);
		return `[redacted ${count}${value.length > count ? "+" : ""} items]`;
	}
	if (value !== null && typeof value === "object") {
		const fields = Object.keys(value).length;
		const count = Math.min(fields, OBSERVER_MARKER_MAX_COUNT);
		return `[redacted ${count}${fields > count ? "+" : ""} fields]`;
	}
	return "[redacted]";
}

function setObservedField(target: Record<string, unknown>, key: string, value: unknown): void {
	Object.defineProperty(target, key, { configurable: true, enumerable: true, writable: true, value });
}

function observableFrameValue(key: string, value: unknown): unknown {
	const requiredType = OBSERVABLE_TYPED_FRAME_FIELDS[key];
	if (requiredType !== undefined) return typeof value === requiredType ? value : redactedContentMarker(value);
	if (key === "operation" || key === "query") {
		const known =
			findOperation("control", String(value)) ??
			findOperation("global", String(value)) ??
			findOperation("query", String(value)) ??
			findOperation("reverse", String(value));
		return typeof value === "string" && value.length <= 128 && known !== undefined
			? value
			: redactedContentMarker(value);
	}
	const allowed = OBSERVABLE_FRAME_LITERAL_FIELDS[key];
	return allowed?.has(typeof value === "string" ? value : "") ? value : redactedContentMarker(value);
}

/**
 * Strips caller content from a request frame before it reaches a diagnostic
 * observer. Known protocol operation names and finite enum values survive so
 * instrumentation stays useful; caller-chosen ids and all other values are
 * redacted, including nested objects, so a field this module has never heard
 * of cannot leak.
 */
export function redactObservedRequestContent(frame: Record<string, unknown>): Record<string, unknown> {
	const observed: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(frame)) {
		if (value === undefined) continue;
		if (key === "input") {
			const input = record(value);
			// A non-record payload is content, not "nothing to redact". Returning
			// early here would hand a string or array `input` through verbatim.
			setObservedField(
				observed,
				key,
				input === undefined ? redactedContentMarker(value) : redactObservedInput(input),
			);
			continue;
		}
		// Structural routing scalars survive; every other top-level key, including
		// one this module has never heard of, is redacted.
		setObservedField(
			observed,
			key,
			OBSERVABLE_FRAME_FIELDS.has(key) || Object.hasOwn(OBSERVABLE_TYPED_FRAME_FIELDS, key)
				? observableFrameValue(key, value)
				: redactedContentMarker(value),
		);
	}
	return observed;
}

/** Redacts one input payload, preserving only structural scalar routing fields. */
function redactObservedInput(input: Record<string, unknown>): Record<string, unknown> {
	const redacted: Record<string, unknown> = {};
	for (const [field, value] of Object.entries(input)) {
		if (value === undefined) continue;
		const requiredType = OBSERVABLE_INPUT_TYPED_FIELDS[field];
		if (requiredType !== undefined) {
			setObservedField(redacted, field, typeof value === requiredType ? value : redactedContentMarker(value));
			continue;
		}
		const allowed = OBSERVABLE_INPUT_LITERAL_FIELDS[field];
		// A finite protocol value is safe; every caller-chosen scalar, including
		// an allowlisted field with a forged string, is content and is redacted.
		setObservedField(
			redacted,
			field,
			OBSERVABLE_INPUT_FIELDS.has(field) && allowed?.has(typeof value === "string" ? value : "")
				? value
				: redactedContentMarker(value),
		);
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
