import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { computeCrashFingerprint, parseCrashRecordMarker } from "../src/crash-fingerprint";
import { parseCrashEventLine } from "../src/crash-journal";
import { recordFatalCrash, recordHandledError, resetHandledErrorDedupeForTest } from "../src/postmortem";

function handledStore(): { readonly log: string; readonly journal: string } {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gjc-handled-error-"));
	return {
		log: path.join(dir, "gjc-error.log"),
		journal: path.join(dir, "gjc-error-events.jsonl"),
	};
}

async function journalLines(journal: string): Promise<string[]> {
	return (await Bun.file(journal).text()).split("\n").filter(Boolean);
}

describe("recordHandledError", () => {
	it("writes a marked record and one sibling occurrence event", async () => {
		resetHandledErrorDedupeForTest();
		const store = handledStore();
		const error = new Error("tool execution failed");
		const written = recordHandledError("Tool functions.read", error, { path: store.log });

		expect(written).toBe(store.log);
		const record = await Bun.file(store.log).text();
		const markerLine = record.split("\n").find(line => line.startsWith("gjc-crash-record.v1 "));
		const marker = parseCrashRecordMarker(markerLine ?? "");
		const fingerprint = computeCrashFingerprint({
			name: error.name,
			message: error.message,
			stack: error.stack ?? "",
		});
		expect(marker?.fingerprint).toBe(fingerprint.fingerprint);

		const lines = await journalLines(store.journal);
		expect(lines).toHaveLength(1);
		const event = parseCrashEventLine(lines[0] ?? "");
		expect(event?.kind).toBe("occurrence");
		expect(event && "fingerprint" in event ? event.fingerprint : undefined).toBe(fingerprint.fingerprint);
	});

	it("ignores non-Error values and errors without stacks", async () => {
		resetHandledErrorDedupeForTest();
		const store = handledStore();
		const stackless = new Error("missing stack");
		stackless.stack = "";
		const stackAbsent = new Error("absent stack");
		Object.defineProperty(stackAbsent, "stack", { value: undefined });

		expect(recordHandledError("Tool functions.read", "failure", { path: store.log })).toBeUndefined();
		expect(recordHandledError("Tool functions.read", { message: "failure" }, { path: store.log })).toBeUndefined();
		expect(recordHandledError("Tool functions.read", undefined, { path: store.log })).toBeUndefined();
		expect(recordHandledError("Tool functions.read", stackless, { path: store.log })).toBeUndefined();
		expect(recordHandledError("Tool functions.read", stackAbsent, { path: store.log })).toBeUndefined();
		expect(await Bun.file(store.log).exists()).toBe(false);
		expect(await Bun.file(store.journal).exists()).toBe(false);
	});

	it("deduplicates a fingerprint without suppressing distinct errors", async () => {
		resetHandledErrorDedupeForTest();
		const store = handledStore();
		const repeated = new Error("repeated failure");

		expect(recordHandledError("Tool functions.read", repeated, { path: store.log })).toBe(store.log);
		expect(recordHandledError("Tool functions.read", repeated, { path: store.log })).toBeUndefined();
		expect(recordHandledError("Tool functions.read", new Error("different failure"), { path: store.log })).toBe(
			store.log,
		);
		expect((await Bun.file(store.log).text()).match(/gjc-crash-record\.v1 /g)).toHaveLength(2);
		expect(await journalLines(store.journal)).toHaveLength(2);
	});

	it("allows a fingerprint again after test dedupe reset", async () => {
		resetHandledErrorDedupeForTest();
		const store = handledStore();
		const error = new Error("retry after reset");

		recordHandledError("Tool functions.read", error, { path: store.log });
		resetHandledErrorDedupeForTest();
		expect(recordHandledError("Tool functions.read", error, { path: store.log })).toBe(store.log);
		expect((await Bun.file(store.log).text()).match(/gjc-crash-record\.v1 /g)).toHaveLength(2);
		expect(await journalLines(store.journal)).toHaveLength(2);
	});

	it("stops admitting new fingerprints once the per-process bound is reached", async () => {
		resetHandledErrorDedupeForTest();
		const store = handledStore();
		// The dedupe set is what keeps a tool failing in a loop from writing
		// thousands of records, so it must itself be bounded rather than growing
		// with the number of distinct failure classes a long session produces.
		for (let i = 0; i < 256; i++)
			recordHandledError("Tool functions.read", new Error(`bounded failure ${i}`), {
				path: store.log,
			});
		const admitted = await journalLines(store.journal);
		expect(recordHandledError("Tool functions.read", new Error("one too many"), { path: store.log })).toBeUndefined();
		expect(await journalLines(store.journal)).toHaveLength(admitted.length);
	});

	it("does not trip the fatal journal latch", async () => {
		resetHandledErrorDedupeForTest();
		const handled = handledStore();
		const fatal = handledStore();

		recordHandledError("Tool functions.read", new Error("handled failure"), { path: handled.log });
		expect(recordFatalCrash("Uncaught Exception", new Error("fatal failure"), { path: fatal.log })).toBe(fatal.log);
		expect(await journalLines(handled.journal)).toHaveLength(1);
		expect(await journalLines(path.join(path.dirname(fatal.log), "gjc-crash-events.jsonl"))).toHaveLength(1);
	});
});
