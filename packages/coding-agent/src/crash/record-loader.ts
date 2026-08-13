/**
 * Crash-log record recovery.
 *
 * The crash log is an append-only text file written by concurrent processes; it
 * is explicitly **not** a parseable database. The field corpus contains at least
 * one interleaved record (two headers merged onto one line), and throwable text
 * is arbitrary multiline content. Recovery therefore trusts only a complete
 * v1 record whose terminal identity line matches a fingerprint recomputed from
 * that record's own header and stack.
 *
 * Records written before that line existed are `unmatchable` and are never
 * offered for reporting — no retroactive mining is attempted or claimed.
 */
import {
	CRASH_FINGERPRINT_VERSION,
	CRASH_RECORD_MARKER,
	computeCrashFingerprint,
	parseCrashRecordMarker,
} from "@gajae-code/utils";

/** A record header: ISO timestamp, pid, label. Starts a new record boundary. */
const RECORD_HEADER = /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z) pid=\d+ \[[^\]]+\] (.+)$/;

export interface LoadedCrashRecord {
	readonly fingerprint: string;
	readonly fpv: number;
	readonly recordId: string;
	readonly at: number;
	readonly errorName: string;
	readonly messageClass: string;
	/** Record body without the header line and without the identity line. */
	readonly body: string;
	/** The `Name: message` part of the header line. */
	readonly headline: string;
}

interface ParsedCrashRecord {
	record: LoadedCrashRecord;
	complete: boolean;
	bound: boolean;
}

/**
 * Parse identity-bearing records out of raw crash-log text.
 *
 * Boundaries are re-established on every header line, so an interleaved or
 * truncated neighbour cannot smear its text into the record that follows.
 */
function parseCandidates(contents: string): ParsedCrashRecord[] {
	const records: ParsedCrashRecord[] = [];
	let headline = "";
	let at = 0;
	let buffer: string[] = [];
	let started = false;
	let pending: ParsedCrashRecord | undefined;
	for (const line of contents.split("\n")) {
		if (pending) {
			if (line === "") pending.complete = true;
			pending = undefined;
		}
		const header = RECORD_HEADER.exec(line);
		if (header) {
			const parsedAt = Date.parse(header[1] ?? "");
			if (!Number.isFinite(parsedAt)) {
				started = false;
				continue;
			}
			headline = header[2] ?? "";
			at = parsedAt;
			buffer = [];
			started = true;
			continue;
		}
		if (line.startsWith(`${CRASH_RECORD_MARKER} `)) {
			const marker = parseCrashRecordMarker(line);
			const separator = headline.indexOf(":");
			if (marker && started && separator > 0) {
				const errorName = headline.slice(0, separator).trim();
				const message = headline.slice(separator + 1).trim();
				const rawBody = buffer.join("\n").trimEnd();
				const bodyLines = rawBody.split("\n");
				let fingerprint = computeCrashFingerprint({ name: errorName, message, stack: rawBody });
				if (fingerprint.fingerprint !== marker.fingerprint) {
					// Object throwables append a one-line allowlisted JSON payload after the
					// stack, but v1 records carry no explicit stack/payload delimiter. Match
					// the longest body prefix that reproduces the writer's marker so payload
					// text cannot make an otherwise authentic record unbound.
					for (let end = bodyLines.length - 1; end >= 0; end--) {
						const candidate = computeCrashFingerprint({
							name: errorName,
							message,
							stack: bodyLines.slice(0, end).join("\n").trimEnd(),
						});
						if (candidate.fingerprint !== marker.fingerprint) continue;
						fingerprint = candidate;
						break;
					}
				}
				// A stack's first line repeats `Name: message`, which the header already
				// carries; dropping it keeps the rendered report free of a duplicate.
				const lines = buffer[0]?.trim() === headline.trim() ? buffer.slice(1) : buffer;
				pending = {
					record: {
						fingerprint: marker.fingerprint,
						fpv: marker.version,
						recordId: marker.recordId,
						at,
						errorName: fingerprint.errorName,
						messageClass: fingerprint.messageClass,
						body: lines.join("\n").trimEnd(),
						headline,
					},
					complete: false,
					bound: marker.version === CRASH_FINGERPRINT_VERSION && fingerprint.fingerprint === marker.fingerprint,
				};
				records.push(pending);
			}
			buffer = [];
			started = false;
			continue;
		}
		if (started) buffer.push(line);
	}
	return records;
}

export function parseCrashRecords(contents: string): LoadedCrashRecord[] {
	return parseCandidates(contents).map(candidate => candidate.record);
}

/** Complete v1 records whose marker fingerprint is recomputed from their diagnostic text. */
export function parseRecoverableCrashRecords(contents: string): LoadedCrashRecord[] {
	return parseCandidates(contents)
		.filter(candidate => candidate.complete && candidate.bound)
		.map(candidate => candidate.record);
}

/** Newest identity-bearing record for a fingerprint, or `undefined` when unmatchable. */
export function findLatestRecord(contents: string, fingerprint: string): LoadedCrashRecord | undefined {
	const matches = parseCrashRecords(contents).filter(record => record.fingerprint === fingerprint);
	return matches.at(-1);
}
