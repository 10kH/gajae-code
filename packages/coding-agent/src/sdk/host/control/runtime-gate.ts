/**
 * Private fields carried only on Broker-authorized endpoint controls.
 *
 * Their values are lifecycle effect markers bound to the serving process. They
 * are never published in endpoint discovery or lifecycle service results;
 * callers that do not hold the Broker's indexed lifecycle record cannot satisfy
 * either gate.
 */
export const BROKER_RUNTIME_CLOSE_CAPABILITY_FIELD = "__gjcBrokerCloseCapability";
/** Private field carried only on the Broker-authorized terminal-abort request. */
export const BROKER_RUNTIME_ABORT_CAPABILITY_FIELD = "__gjcBrokerAbortCapability";
const EXPECTED_BROKER_RUNTIME_CLOSE_CAPABILITY = process.env.GJC_LIFECYCLE_REQUEST_ID;
const EXPECTED_BROKER_RUNTIME_ABORT_CAPABILITY = process.env.GJC_LIFECYCLE_REQUEST_ID;
let brokerRuntimeAbortCapabilityOverrideForTest: string | undefined;

function record(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

export function brokerRuntimeCloseCapability(input: unknown): string | undefined {
	const value = record(input)?.[BROKER_RUNTIME_CLOSE_CAPABILITY_FIELD];
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function brokerRuntimeAbortCapability(input: unknown): string | undefined {
	const value = record(input)?.[BROKER_RUNTIME_ABORT_CAPABILITY_FIELD];
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Remove private Broker capabilities before a request is exposed to diagnostics. */
export function redactBrokerRuntimeCapabilities(frame: Record<string, unknown>): Record<string, unknown> {
	if (frame.type !== "control_request") return frame;
	const input = record(frame.input);
	if (!input) return frame;
	let redacted = false;
	const publicInput: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(input)) {
		if (key === BROKER_RUNTIME_CLOSE_CAPABILITY_FIELD || key === BROKER_RUNTIME_ABORT_CAPABILITY_FIELD) {
			redacted = true;
			continue;
		}
		publicInput[key] = value;
	}
	return redacted ? { ...frame, input: publicInput } : frame;
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

/** Test-only override for the abort gate; production authority remains process-local. */
export function setBrokerRuntimeAbortCapabilityForTest(capability: string | undefined): void {
	brokerRuntimeAbortCapabilityOverrideForTest = capability;
}

export function hasBrokerRuntimeAbortCapability(input: unknown): boolean {
	const expected = brokerRuntimeAbortCapabilityOverrideForTest ?? EXPECTED_BROKER_RUNTIME_ABORT_CAPABILITY;
	const actual = brokerRuntimeAbortCapability(input);
	return typeof expected === "string" && expected.length > 0 && actual === expected;
}
