/**
 * P1 storage contracts for bounded-RAM cold-session offloading: descriptor-validated
 * recorded-length range reads (sync + async, file/memory parity), staged streaming
 * writers for immutable one-shot destinations, and checked commit-marker
 * create/replace with `missing` vs physically `present` raw/hash expectations.
 */
import { afterEach, describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	createSessionCommitMarkerCheckedSync,
	FileSessionStorage,
	MemorySessionStorage,
	readSessionCommitMarkerSync,
	replaceSessionCommitMarkerCheckedSync,
	SESSION_RANGE_READ_MAX_BYTES,
	STAGED_WRITER_PATCH_LIMIT_BYTES,
} from "../../src/session/session-storage";

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories.splice(0).map(directory => fsp.rm(directory, { recursive: true, force: true })),
	);
});

async function makeTempDir(prefix: string): Promise<string> {
	const directory = await fsp.mkdtemp(path.join(os.tmpdir(), prefix));
	temporaryDirectories.push(directory);
	return directory;
}

const sampleLines = ["alpha", "beta", "gamma-delta", "epsilon"];
const sampleContent = `${sampleLines.join("\n")}\n`;

describe("descriptor-validated bounded range reads", () => {
	it("sync read returns exact bytes and a matching descriptor snapshot", async () => {
		const dir = await makeTempDir("gjc-range-sync-");
		const filePath = path.join(dir, "transcript.jsonl");
		const file = new FileSessionStorage();
		file.writeTextSync(filePath, sampleContent);

		const snapshot = file.readRangeSync(filePath, 0, sampleContent.length);
		expect(Buffer.from(snapshot.bytes).toString("utf8")).toBe(sampleContent);
		expect(snapshot.stat.isFile).toBe(true);
		expect(snapshot.stat.size).toBe(sampleContent.length);

		// Interior range: [start, start + length) exactly, not a prefix.
		const interiorStart = sampleLines[0].length + 1;
		const interior = file.readRangeSync(filePath, interiorStart, sampleLines[1].length);
		expect(Buffer.from(interior.bytes).toString("utf8")).toBe("beta");
	});

	it("sync and async reads agree with the memory backend (parity)", async () => {
		const dir = await makeTempDir("gjc-range-parity-");
		const filePath = path.join(dir, "transcript.jsonl");
		const file = new FileSessionStorage();
		file.writeTextSync(filePath, sampleContent);
		const memory = new MemorySessionStorage();
		memory.writeTextSync(filePath, sampleContent);

		const fileSync = file.readRangeSync(filePath, 0, sampleContent.length);
		const memorySync = memory.readRangeSync(filePath, 0, sampleContent.length);
		expect(Buffer.from(memorySync.bytes)).toEqual(Buffer.from(fileSync.bytes));
		expect(memorySync.stat.size).toBe(fileSync.stat.size);

		const fileAsync = await file.readRange!(filePath, 2, 8);
		const memoryAsync = await memory.readRange!(filePath, 2, 8);
		expect(Buffer.from(memoryAsync.bytes)).toEqual(Buffer.from(fileAsync.bytes));
	});

	it("rejects out-of-bounds ranges", async () => {
		const dir = await makeTempDir("gjc-range-bounds-");
		const filePath = path.join(dir, "transcript.jsonl");
		const file = new FileSessionStorage();
		file.writeTextSync(filePath, sampleContent);

		expect(() => file.readRangeSync(filePath, -1, 4)).toThrow(RangeError);
		expect(() => file.readRangeSync(filePath, 0, -1)).toThrow(RangeError);
		expect(() => file.readRangeSync(filePath, 0, SESSION_RANGE_READ_MAX_BYTES + 1)).toThrow(RangeError);
		// Present-empty range at EOF is legal; a single byte past EOF is not.
		expect(file.readRangeSync(filePath, sampleContent.length, 0).bytes.byteLength).toBe(0);
		expect(() => file.readRangeSync(filePath, sampleContent.length, 1)).toThrow("range_not_present");
		expect(() => file.readRangeSync(filePath, sampleContent.length - 1, 2)).toThrow("range_not_present");
	});

	it("rejects a swapped object: a second hard link (nlink > 1) is not a single-owned descriptor", async () => {
		const dir = await makeTempDir("gjc-range-nlink-");
		const filePath = path.join(dir, "transcript.jsonl");
		const linkPath = path.join(dir, "transcript.jsonl.hardlink");
		const file = new FileSessionStorage();
		file.writeTextSync(filePath, sampleContent);
		fs.linkSync(filePath, linkPath);

		expect(() => file.readRangeSync(filePath, 0, 4)).toThrow("source_changed");
		await expect(file.readRange!(filePath, 0, 4)).rejects.toThrow("source_changed");
	});

	it("never follows a symlink (no path-based Bun Blob reads for managed authority)", async () => {
		const dir = await makeTempDir("gjc-range-symlink-");
		const filePath = path.join(dir, "transcript.jsonl");
		const linkPath = path.join(dir, "transcript.jsonl.link");
		const file = new FileSessionStorage();
		file.writeTextSync(filePath, sampleContent);
		fs.symlinkSync(filePath, linkPath);

		expect(() => file.readRangeSync(linkPath, 0, 4)).toThrow();
		await expect(file.readRange!(linkPath, 0, 4)).rejects.toThrow();
	});
});

describe("staged streaming writers (immutable destinations)", () => {
	it("file backend: stream, patch same-length in place, publish no-replace", async () => {
		const dir = await makeTempDir("gjc-staged-file-");
		const destination = path.join(dir, "fork.jsonl");
		const file = new FileSessionStorage();

		const writer = file.openStagedWriter!(destination);
		for (const line of sampleLines) writer.writeLine(Buffer.from(line, "utf8"));
		// Same-length patch applied in place without an overlay pass.
		writer.patchLine(0, Buffer.from("ALPHA", "utf8"));
		writer.seekToLine(3);
		writer.flush();
		writer.fsync();
		writer.closeSync();
		writer.publishNoReplace();

		expect(file.readTextSync(destination)).toBe("ALPHA\nbeta\ngamma-delta\nepsilon\n");
	});

	it("file backend: patches high ordinals without retaining per-line offsets", async () => {
		const dir = await makeTempDir("gjc-staged-many-lines-");
		const destination = path.join(dir, "fork.jsonl");
		const file = new FileSessionStorage();
		const writer = file.openStagedWriter!(destination);
		for (let ordinal = 0; ordinal < 20_000; ordinal++) writer.writeLine(Buffer.from("value", "utf8"));
		writer.patchLine(19_999, Buffer.from("VALUE", "utf8"));
		writer.closeSync();
		writer.publishNoReplace();
		const lines = file.readTextSync(destination).trimEnd().split("\n");
		expect(lines).toHaveLength(20_000);
		expect(lines.at(-1)).toBe("VALUE");
	});

	it("file backend: different-length patches are applied by the bounded publish-time overlay pass", async () => {
		const dir = await makeTempDir("gjc-staged-overlay-");
		const destination = path.join(dir, "fork.jsonl");
		const file = new FileSessionStorage();

		const writer = file.openStagedWriter!(destination);
		for (const line of sampleLines) writer.writeLine(Buffer.from(line, "utf8"));
		writer.patchLine(0, Buffer.from("longer replacement", "utf8"));
		writer.patchLine(2, Buffer.from("x", "utf8"));
		writer.closeSync();
		writer.publishNoReplace();

		expect(file.readTextSync(destination)).toBe("longer replacement\nbeta\nx\nepsilon\n");
	});

	it("no-replace never overwrites an existing destination", async () => {
		const dir = await makeTempDir("gjc-staged-conflict-");
		const destination = path.join(dir, "fork.jsonl");
		const file = new FileSessionStorage();
		file.writeTextSync(destination, "existing\n");
		const writer = file.openStagedWriter!(destination);
		writer.writeLine(Buffer.from("new", "utf8"));
		writer.closeSync();
		expect(() => writer.publishNoReplace()).toThrow("staged_publish_rejected");
		expect(file.readTextSync(destination)).toBe("existing\n");
	});

	it("requires close before publish and rejects unknown ordinals", async () => {
		const dir = await makeTempDir("gjc-staged-close-");
		const destination = path.join(dir, "fork.jsonl");
		const file = new FileSessionStorage();
		const writer = file.openStagedWriter!(destination);
		writer.writeLine(Buffer.from("one", "utf8"));
		expect(() => writer.publishNoReplace()).toThrow("must be closed");
		expect(() => writer.patchLine(5, Buffer.from("x", "utf8"))).toThrow(RangeError);
		expect(() => writer.seekToLine(9)).toThrow(RangeError);
		writer.closeSync();
		writer.publishNoReplace();
		expect(file.readTextSync(destination)).toBe("one\n");
	});

	it("memory backend mirrors the file contract (parity)", async () => {
		const memory = new MemorySessionStorage();
		const destination = "/sessions/fork.jsonl";
		const writer = memory.openStagedWriter!(destination);
		for (const line of sampleLines) writer.writeLine(Buffer.from(line, "utf8"));
		writer.patchLine(0, Buffer.from("ALPHA", "utf8"));
		writer.patchLine(1, Buffer.from("very different length", "utf8"));
		writer.closeSync();
		writer.publishNoReplace();
		expect(memory.readTextSync(destination)).toBe("ALPHA\nvery different length\ngamma-delta\nepsilon\n");

		const conflict = memory.openStagedWriter!(destination);
		conflict.writeLine(Buffer.from("late", "utf8"));
		conflict.closeSync();
		expect(() => conflict.publishNoReplace()).toThrow("destination_conflict");
		expect(memory.readTextSync(destination)).toBe("ALPHA\nvery different length\ngamma-delta\nepsilon\n");
	});

	it("bounded overlay: aggregated different-length patches cannot exceed the limit", async () => {
		const memory = new MemorySessionStorage();
		const destination = "/sessions/overflow.jsonl";
		const writer = memory.openStagedWriter!(destination);
		writer.writeLine(Buffer.from("seed", "utf8"));
		const oversized = Buffer.alloc(STAGED_WRITER_PATCH_LIMIT_BYTES + 1, 0x61);
		expect(() => writer.patchLine(0, oversized)).toThrow("staged_overlay_capacity_exceeded");
	});
});

describe("commit-marker checked create/replace", () => {
	const markerBytes = (gen: number): Uint8Array => Buffer.from(`{"gen":${gen}}\n`, "utf8");
	const markerHash = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

	it("file backend: create only while missing; a second create aborts", async () => {
		const dir = await makeTempDir("gjc-marker-create-");
		const markerPath = path.join(dir, "session.jsonl.spill.commit");
		const file = new FileSessionStorage();

		expect(readSessionCommitMarkerSync(file, markerPath)).toEqual({ kind: "missing" });
		createSessionCommitMarkerCheckedSync(file, markerPath, markerBytes(0));
		const state = readSessionCommitMarkerSync(file, markerPath);
		expect(state.kind).toBe("present");
		if (state.kind === "present") expect(state.rawBytesSha256).toBe(markerHash(markerBytes(0)));

		expect(() => createSessionCommitMarkerCheckedSync(file, markerPath, markerBytes(1))).toThrow(
			"commit_marker_expected_missing",
		);
		// A failed create leaves the original marker untouched and no temp debris.
		const after = readSessionCommitMarkerSync(file, markerPath);
		expect(after.kind).toBe("present");
		if (after.kind === "present") expect(after.rawBytesSha256).toBe(markerHash(markerBytes(0)));
		expect(fs.readdirSync(dir).filter(name => name.endsWith(".tmp"))).toEqual([]);
	});

	it("file backend: replace only on exact present raw/hash + descriptor identity match", async () => {
		const dir = await makeTempDir("gjc-marker-replace-");
		const markerPath = path.join(dir, "session.jsonl.spill.commit");
		const file = new FileSessionStorage();
		createSessionCommitMarkerCheckedSync(file, markerPath, markerBytes(0));
		const state = readSessionCommitMarkerSync(file, markerPath);
		expect(state.kind).toBe("present");
		if (state.kind !== "present") throw new Error("Expected a present marker");

		replaceSessionCommitMarkerCheckedSync(file, markerPath, markerBytes(1), {
			rawBytesSha256: state.rawBytesSha256,
			descriptorIdentity: state.stat,
		});
		const replaced = readSessionCommitMarkerSync(file, markerPath);
		expect(replaced.kind).toBe("present");
		if (replaced.kind === "present") expect(replaced.rawBytesSha256).toBe(markerHash(markerBytes(1)));
	});

	it("file backend: wrong raw hash aborts and never touches the marker", async () => {
		const dir = await makeTempDir("gjc-marker-hash-");
		const markerPath = path.join(dir, "session.jsonl.spill.commit");
		const file = new FileSessionStorage();
		createSessionCommitMarkerCheckedSync(file, markerPath, markerBytes(0));
		const state = readSessionCommitMarkerSync(file, markerPath);
		if (state.kind !== "present") throw new Error("Expected a present marker");

		expect(() =>
			replaceSessionCommitMarkerCheckedSync(file, markerPath, markerBytes(1), {
				rawBytesSha256: markerHash(markerBytes(99)),
				descriptorIdentity: state.stat,
			}),
		).toThrow("commit_marker_raw_hash_mismatch");
		const after = readSessionCommitMarkerSync(file, markerPath);
		if (after.kind !== "present") throw new Error("Expected a present marker");
		expect(after.rawBytesSha256).toBe(state.rawBytesSha256);
	});

	it("file backend: stale descriptor identity aborts", async () => {
		const dir = await makeTempDir("gjc-marker-stale-");
		const markerPath = path.join(dir, "session.jsonl.spill.commit");
		const file = new FileSessionStorage();
		createSessionCommitMarkerCheckedSync(file, markerPath, markerBytes(0));
		const state = readSessionCommitMarkerSync(file, markerPath);
		if (state.kind !== "present") throw new Error("Expected a present marker");

		// Mutate the marker object after capture (longer payload so size must differ).
		file.writeTextSync(markerPath, `${Buffer.from(markerBytes(5)).toString("utf8")}trailing\n`);
		expect(() =>
			replaceSessionCommitMarkerCheckedSync(file, markerPath, markerBytes(1), {
				rawBytesSha256: state.rawBytesSha256,
				descriptorIdentity: state.stat,
			}),
		).toThrow("commit_marker_raw_hash_mismatch");
		expect(file.readTextSync(markerPath)).toBe(`${Buffer.from(markerBytes(5)).toString("utf8")}trailing\n`);
	});

	it("file backend: corrupt-present is present, never missing, and replaceable by exact raw bytes", async () => {
		const dir = await makeTempDir("gjc-marker-corrupt-");
		const markerPath = path.join(dir, "session.jsonl.spill.commit");
		const file = new FileSessionStorage();
		const corrupt = Buffer.from("not-json{{{{", "utf8");
		file.writeTextSync(markerPath, corrupt.toString("utf8"));

		const state = readSessionCommitMarkerSync(file, markerPath);
		expect(state.kind).toBe("present");
		if (state.kind !== "present") throw new Error("Expected a present marker");
		expect(state.rawBytesSha256).toBe(markerHash(corrupt));

		replaceSessionCommitMarkerCheckedSync(file, markerPath, markerBytes(1), {
			rawBytesSha256: state.rawBytesSha256,
			descriptorIdentity: state.stat,
		});
		const after = readSessionCommitMarkerSync(file, markerPath);
		if (after.kind !== "present") throw new Error("Expected a present marker");
		expect(after.rawBytesSha256).toBe(markerHash(markerBytes(1)));
	});

	it("file backend: replace when the marker is missing aborts", async () => {
		const dir = await makeTempDir("gjc-marker-missing-");
		const markerPath = path.join(dir, "session.jsonl.spill.commit");
		const file = new FileSessionStorage();
		expect(() =>
			replaceSessionCommitMarkerCheckedSync(file, markerPath, markerBytes(1), {
				rawBytesSha256: markerHash(markerBytes(1)),
				descriptorIdentity: file.statSync(dir),
			}),
		).toThrow("commit_marker_expected_present");
	});

	it("memory backend mirrors create/replace parity (missing/present/hash/identity aborts)", async () => {
		const memory = new MemorySessionStorage();
		const markerPath = "/sessions/session.jsonl.spill.commit";

		expect(readSessionCommitMarkerSync(memory, markerPath)).toEqual({ kind: "missing" });
		createSessionCommitMarkerCheckedSync(memory, markerPath, markerBytes(0));
		expect(() => createSessionCommitMarkerCheckedSync(memory, markerPath, markerBytes(1))).toThrow(
			"commit_marker_expected_missing",
		);

		const state = readSessionCommitMarkerSync(memory, markerPath);
		if (state.kind !== "present") throw new Error("Expected a present marker");
		expect(state.rawBytesSha256).toBe(markerHash(markerBytes(0)));

		expect(() =>
			replaceSessionCommitMarkerCheckedSync(memory, markerPath, markerBytes(1), {
				rawBytesSha256: markerHash(markerBytes(99)),
				descriptorIdentity: state.stat,
			}),
		).toThrow("commit_marker_raw_hash_mismatch");

		// Stale identity: overwrite with a longer payload after capture.
		memory.writeTextSync(markerPath, `${Buffer.from(markerBytes(5)).toString("utf8")}trailing\n`);
		expect(() =>
			replaceSessionCommitMarkerCheckedSync(memory, markerPath, markerBytes(1), {
				rawBytesSha256: state.rawBytesSha256,
				descriptorIdentity: state.stat,
			}),
		).toThrow("commit_marker_raw_hash_mismatch");

		// Exact present match replaces successfully.
		const current = readSessionCommitMarkerSync(memory, markerPath);
		if (current.kind !== "present") throw new Error("Expected a present marker");
		replaceSessionCommitMarkerCheckedSync(memory, markerPath, markerBytes(1), {
			rawBytesSha256: current.rawBytesSha256,
			descriptorIdentity: current.stat,
		});
		const replaced = readSessionCommitMarkerSync(memory, markerPath);
		if (replaced.kind !== "present") throw new Error("Expected a present marker");
		expect(replaced.rawBytesSha256).toBe(markerHash(markerBytes(1)));

		// Corrupt-present parity on the memory backend.
		const corruptPath = "/sessions/other.jsonl.spill.commit";
		memory.writeTextSync(corruptPath, "corrupt{{");
		const corruptState = readSessionCommitMarkerSync(memory, corruptPath);
		expect(corruptState.kind).toBe("present");
		if (corruptState.kind !== "present") throw new Error("Expected a present marker");
		expect(corruptState.rawBytesSha256).toBe(markerHash(Buffer.from("corrupt{{", "utf8")));
	});
});

describe("derived sidecar lifecycle cleanup", () => {
	it("removes derived siblings for file and memory storage", async () => {
		const dir = await makeTempDir("gjc-sidecar-delete-");
		const sessionPath = path.join(dir, "session.jsonl");
		const file = new FileSessionStorage();
		file.writeTextSync(sessionPath, "{}\n");
		file.writeTextSync(`${sessionPath}.spill.idx`, "index\n");
		file.writeTextSync(`${sessionPath}.spill.tail`, "tail\n");
		await file.deleteSessionWithArtifacts(sessionPath);
		expect(file.existsSync(sessionPath)).toBe(false);
		expect(file.existsSync(`${sessionPath}.spill.idx`)).toBe(false);
		expect(file.existsSync(`${sessionPath}.spill.tail`)).toBe(false);

		const memory = new MemorySessionStorage();
		memory.writeTextSync(sessionPath, "{}\n");
		memory.writeTextSync(`${sessionPath}.spill.idx`, "index\n");
		memory.writeTextSync(`${sessionPath}.spill.commit`, "commit\n");
		await memory.deleteSessionWithArtifacts(sessionPath);
		expect(memory.existsSync(sessionPath)).toBe(false);
		expect(memory.existsSync(`${sessionPath}.spill.idx`)).toBe(false);
		expect(memory.existsSync(`${sessionPath}.spill.commit`)).toBe(false);
	});

	it("leaves no spill debris across 100 create-delete cycles", async () => {
		const dir = await makeTempDir("gjc-sidecar-cycles-");
		const file = new FileSessionStorage();
		const memory = new MemorySessionStorage();
		for (let cycle = 0; cycle < 100; cycle++) {
			const fileSession = path.join(dir, `session-${cycle}.jsonl`);
			file.writeTextSync(fileSession, "{}\n");
			file.writeTextSync(`${fileSession}.spill.idx`, "index\n");
			file.writeTextSync(`${fileSession}.spill.buckets`, "buckets\n");
			await file.deleteSessionWithArtifacts(fileSession);

			const memorySession = `/sessions/session-${cycle}.jsonl`;
			memory.writeTextSync(memorySession, "{}\n");
			memory.writeTextSync(`${memorySession}.spill.tail`, "tail\n");
			memory.writeTextSync(`${memorySession}.spill.overlay-${cycle}.tmp`, "overlay\n");
			await memory.deleteSessionWithArtifacts(memorySession);
		}
		expect(file.listFilesSync(dir, "*.spill.*")).toEqual([]);
		expect(memory.listFilesSync("/sessions", "*.spill.*")).toEqual([]);
	});
});
