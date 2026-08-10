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
