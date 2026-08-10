import * as fs from "node:fs/promises";
import path from "node:path";
import type { Broker } from "./broker";

/** Wait for broker-local completion, then terminate only the current broker process. */
export async function completeBrokerProcess(
	broker: Broker,
	exit: (code: number) => never = code => process.exit(code),
): Promise<never> {
	await broker.completion;
	return exit(0);
}

/**
 * Durable, bounded record of why a detached broker exited without publishing
 * discovery (issue #3963). Written by the broker-internal process before any
 * clean exit without owned discovery; read by {@link ensureBroker} so the
 * caller sees a usable reason instead of a bare `code=0` with ignored stdio.
 * A single overwritten file keeps the artifact bounded by construction.
 */
export interface BrokerStartupFailureMarker {
	version: 1;
	reason: string;
	exitCode: number | null;
	signal: string | null;
	writtenAt: number;
}

const BROKER_STARTUP_FAILURE_FILE = "broker.startup-failure.json";
const MAX_BROKER_STARTUP_FAILURE_REASON = 512;

export function brokerStartupFailurePath(agentDir: string): string {
	return path.join(agentDir, "sdk", BROKER_STARTUP_FAILURE_FILE);
}

function boundedMarker(reason: string, exitCode: number | null, signal: string | null): BrokerStartupFailureMarker {
	return {
		version: 1,
		reason: reason.slice(0, MAX_BROKER_STARTUP_FAILURE_REASON),
		exitCode,
		signal,
		writtenAt: Date.now(),
	};
}

/** Best-effort durable marker write; never throws (diagnostics must not mask the exit itself). */
export async function writeBrokerStartupFailureMarker(
	agentDir: string,
	failure: { reason: string; exitCode: number | null; signal: string | null },
): Promise<void> {
	try {
		await fs.mkdir(path.dirname(brokerStartupFailurePath(agentDir)), { recursive: true, mode: 0o700 });
		await fs.writeFile(
			brokerStartupFailurePath(agentDir),
			JSON.stringify(boundedMarker(failure.reason, failure.exitCode, failure.signal)),
			{
				flag: "w",
				mode: 0o600,
			},
		);
	} catch {
		// Best-effort only.
	}
}

/** Reads a bounded startup-failure marker; `undefined` when absent or malformed. */
export async function readBrokerStartupFailureMarker(
	agentDir: string,
): Promise<BrokerStartupFailureMarker | undefined> {
	try {
		const raw = await fs.readFile(brokerStartupFailurePath(agentDir), "utf8");
		const value: unknown = JSON.parse(raw);
		if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
		const marker = value as Partial<BrokerStartupFailureMarker>;
		if (
			marker.version !== 1 ||
			typeof marker.reason !== "string" ||
			marker.reason.length === 0 ||
			(marker.exitCode !== null && typeof marker.exitCode !== "number") ||
			(marker.signal !== null && typeof marker.signal !== "string") ||
			typeof marker.writtenAt !== "number"
		)
			return undefined;
		return marker as BrokerStartupFailureMarker;
	} catch {
		return undefined;
	}
}

/** Best-effort marker removal; used at spawn so a stale marker never misattributes an older failure. */
export async function clearBrokerStartupFailureMarker(agentDir: string): Promise<void> {
	try {
		await fs.unlink(brokerStartupFailurePath(agentDir));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
			// Best-effort only.
		}
	}
}

/**
 * Typed error surfaced by the caller when a detached SDK broker exited before
 * publishing discovery. Carries the exit codes, a durable reason (from the
 * startup-failure marker when present), and a bounded stderr excerpt so
 * `stdio: "ignore"` never hides why the broker exited.
 */
export class BrokerStartupError extends Error {
	readonly code = "broker_startup_failed";
	readonly exitCode: number | null;
	readonly signal: string | null;
	readonly reason: string;
	readonly stderrExcerpt: string | undefined;

	constructor(fields: { exitCode: number | null; signal: string | null; reason: string; stderrExcerpt?: string }) {
		super(
			`Detached SDK broker exited before discovery (code=${fields.exitCode}, signal=${fields.signal}): ${fields.reason}`,
		);
		this.name = "BrokerStartupError";
		this.exitCode = fields.exitCode;
		this.signal = fields.signal;
		this.reason = fields.reason;
		this.stderrExcerpt = fields.stderrExcerpt;
	}
}
