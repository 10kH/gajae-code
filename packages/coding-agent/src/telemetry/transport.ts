import { Settings } from "../config/settings";
import { getTelemetryStatus } from "./control";
import { getTelemetryInstallId, serializeTelemetryEvent, type TelemetryEvent, type TelemetryEventName } from "./events";

export const TELEMETRY_ENDPOINT = "https://telemetry.gajae.dev/v1/events" as const;
export const TELEMETRY_MAX_IN_FLIGHT = 2 as const;
export const TELEMETRY_TIMEOUT_MS = 1500 as const;

interface TelemetryTransportDependencies {
	fetchImpl?: (input: string | URL, init?: RequestInit) => Promise<Response>;
	endpoint?: string;
}

export type TelemetryDetails = Pick<TelemetryEvent, "channel" | "result" | "installMethod">;

let inFlight = 0;

/**
 * Best-effort transport. The caller only schedules work; disabled telemetry,
 * queue saturation, network errors, and non-2xx responses are all ignored.
 */
export function sendTelemetryEvent(
	settings: Parameters<typeof getTelemetryStatus>[0],
	event: TelemetryEvent,
	deps: TelemetryTransportDependencies = {},
): void {
	if (!getTelemetryStatus(settings).enabled || inFlight >= TELEMETRY_MAX_IN_FLIGHT) return;
	let body: string;
	try {
		body = serializeTelemetryEvent(event);
	} catch {
		return;
	}
	inFlight++;
	const fetchImpl = deps.fetchImpl ?? fetch;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TELEMETRY_TIMEOUT_MS);
	void fetchImpl(deps.endpoint ?? TELEMETRY_ENDPOINT, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body,
		signal: controller.signal,
		redirect: "error",
	})
		.catch(() => undefined)
		.then(() => undefined)
		.finally(() => {
			clearTimeout(timeout);
			inFlight--;
		});
}

export function resetTelemetryTransportForTest(): void {
	inFlight = 0;
}

/** Schedule an event without making telemetry part of the caller's lifecycle. */
export function recordTelemetryEvent(event: TelemetryEventName, details: TelemetryDetails): void {
	void (async () => {
		const settings = await Settings.init();
		if (!getTelemetryStatus(settings).enabled) return;
		const installId = await getTelemetryInstallId();
		sendTelemetryEvent(settings, {
			schemaVersion: 1,
			event,
			installId,
			occurredAt: new Date().toISOString(),
			...details,
		});
	})().catch(() => undefined);
}
