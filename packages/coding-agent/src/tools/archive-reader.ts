import { gunzipSync } from "node:zlib";
import { ToolError } from "./tool-errors";

const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024;
const MAX_ARCHIVE_ENTRY_BYTES = 16 * 1024 * 1024;
const MAX_ARCHIVE_TOTAL_BYTES = 64 * 1024 * 1024;
const MAX_ARCHIVE_ENTRY_COUNT = 8192;
const MAX_ARCHIVE_PATH_DEPTH = 48;
// Round each 512-byte header plus up to 511 bytes of data padding to 1 KiB per entry.
const MAX_TAR_CONTAINER_BYTES = MAX_ARCHIVE_TOTAL_BYTES + MAX_ARCHIVE_ENTRY_COUNT * 1024 + 1024;
const MAX_GZIP_LAYERS = 24;
const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const ZIP64_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06064b50;
const ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIGNATURE = 0x07064b50;
const ZIP_DATA_DESCRIPTOR_SIGNATURE = 0x08074b50;
const ZIP_CENTRAL_DIRECTORY_DIGITAL_SIGNATURE = 0x05054b50;
const ZIP_UINT16_MAX = 0xffff;
const ZIP_UINT32_MAX = 0xffff_ffff;
const MAX_ZIP_DIRECTORY_CANDIDATES = 16;
const EMPTY_ZIP_BYTES = new Uint8Array(0);

let fflateModulePromise: Promise<typeof import("fflate")> | undefined;
async function loadFflate(): Promise<typeof import("fflate")> {
	if (!fflateModulePromise) fflateModulePromise = import("fflate");
	return fflateModulePromise;
}

export type ArchiveFormat = "zip" | "tar" | "tar.gz";

export interface ArchivePathCandidate {
	archivePath: string;
	subPath: string;
}

export interface ArchiveNode {
	path: string;
	isDirectory: boolean;
	size: number;
	mtimeMs?: number;
}

export interface ArchiveDirectoryEntry extends ArchiveNode {
	name: string;
}

export interface ExtractedArchiveFile extends ArchiveNode {
	bytes: Uint8Array;
}

interface TarStorage {
	type: "tar";
	file: File;
}

interface ZipStorage {
	type: "zip";
	bytes: Uint8Array;
}

type EntryStorage = TarStorage | ZipStorage;

interface ArchiveIndexEntry extends ArchiveNode {
	storage?: EntryStorage;
}

function normalizeArchiveLookupPath(rawPath?: string): string | undefined {
	if (!rawPath) return "";

	const parts = rawPath.replace(/\\/g, "/").split("/");
	const normalizedParts: string[] = [];
	for (const part of parts) {
		if (!part || part === ".") continue;
		if (part === "..") return undefined;
		normalizedParts.push(part);
	}

	return normalizedParts.join("/");
}

function normalizeArchiveEntryPath(rawPath: string): string | undefined {
	const parts = rawPath.replace(/\\/g, "/").split("/");
	const normalizedParts: string[] = [];
	for (const part of parts) {
		if (!part || part === ".") continue;
		if (part === "..") return undefined;
		normalizedParts.push(part);
	}

	if (normalizedParts.length === 0) return undefined;
	return normalizedParts.join("/");
}

function isArchiveDirectoryName(rawPath: string): boolean {
	return rawPath.endsWith("/") || rawPath.endsWith("\\");
}

function archiveEntryDepth(rawPath: string): number {
	const normalized = normalizeArchiveEntryPath(rawPath);
	if (!normalized) return 0;
	return normalized.split("/").length;
}
function concatBytes(chunks: Uint8Array[], total: number): Uint8Array {
	const out = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		out.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return out;
}

function archiveLimitError(kind: "entry" | "total" | "count" | "depth", detail = ""): ToolError {
	const preview = detail.length > 120 ? `${detail.slice(0, 119)}…` : detail;
	switch (kind) {
		case "count":
			return new ToolError(
				`Archive has too many entries (limit ${MAX_ARCHIVE_ENTRY_COUNT}). Extract a subset with a dedicated tool.`,
			);
		case "total":
			return new ToolError(
				`Archive expands past the total limit (${MAX_ARCHIVE_TOTAL_BYTES} bytes). Extract a subset with a dedicated tool.`,
			);
		case "depth":
			return new ToolError(
				`Archive entry '${preview}' is nested too deeply (limit ${MAX_ARCHIVE_PATH_DEPTH}). Extract a subset with a dedicated tool.`,
			);
		case "entry":
			return new ToolError(
				`Archive entry '${preview}' expands past the per-entry limit (${MAX_ARCHIVE_ENTRY_BYTES} bytes). Extract a subset with a dedicated tool.`,
			);
	}
}

function upsertArchiveEntry(map: Map<string, ArchiveIndexEntry>, entry: ArchiveIndexEntry): void {
	const existing = map.get(entry.path);
	if (!existing) {
		map.set(entry.path, entry);
		return;
	}

	if (existing.isDirectory && !entry.isDirectory) {
		map.set(entry.path, entry);
		return;
	}

	if (!existing.isDirectory && entry.isDirectory) {
		return;
	}

	map.set(entry.path, {
		...existing,
		size: existing.size || entry.size,
		mtimeMs: existing.mtimeMs ?? entry.mtimeMs,
		storage: existing.storage ?? entry.storage,
	});
}

function ensureParentDirectories(map: Map<string, ArchiveIndexEntry>): void {
	for (const entry of [...map.values()]) {
		const parts = entry.path.split("/");
		const stop = parts.length - 1;
		for (let index = 1; index <= stop; index++) {
			const dirPath = parts.slice(0, index).join("/");
			if (!dirPath || map.has(dirPath)) continue;
			map.set(dirPath, {
				path: dirPath,
				isDirectory: true,
				size: 0,
			});
		}
	}
}

function getArchiveFormatFromPath(filePath: string): ArchiveFormat | undefined {
	const normalized = filePath.toLowerCase();
	if (normalized.endsWith(".tar.gz") || normalized.endsWith(".tgz")) return "tar.gz";
	if (normalized.endsWith(".tar")) return "tar";
	if (normalized.endsWith(".zip")) return "zip";
	return undefined;
}

function gunzipBounded(bytes: Uint8Array, maxOutputLength: number): Uint8Array {
	try {
		return gunzipSync(bytes, { maxOutputLength });
	} catch (error) {
		const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
		if (code === "ERR_BUFFER_TOO_LARGE") throw archiveLimitError("total");
		throw new ToolError(error instanceof Error ? error.message : String(error));
	}
}

function isGzipBytes(bytes: Uint8Array): boolean {
	return bytes.byteLength >= 3 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

function inflateToTar(bytes: Uint8Array, labeledGzip: boolean): Uint8Array {
	let payload = bytes;
	let layers = 0;
	let totalInflatedBytes = 0;
	let sawGzip = labeledGzip || isGzipBytes(payload);
	while (sawGzip) {
		layers += 1;
		if (layers > MAX_GZIP_LAYERS) throw archiveLimitError("total");
		const remaining = MAX_TAR_CONTAINER_BYTES - totalInflatedBytes;
		if (remaining <= 0) throw archiveLimitError("total");
		payload = gunzipBounded(payload, remaining);
		totalInflatedBytes += payload.byteLength;
		sawGzip = isGzipBytes(payload);
	}
	return payload;
}

function tarText(header: Uint8Array, start: number, length: number): string {
	let end = start;
	const stop = start + length;
	while (end < stop && header[end] !== 0) end += 1;
	return new TextDecoder().decode(header.subarray(start, end));
}

function tarOctal(header: Uint8Array, start: number, length: number): number {
	const text = tarText(header, start, length).trim();
	if (!text) return 0;
	if (!/^[0-7]+$/.test(text)) return Number.NaN;
	return Number.parseInt(text, 8);
}

function tarEntryName(header: Uint8Array): string {
	const name = tarText(header, 0, 100);
	const prefix = tarText(header, 257, 5) === "ustar" ? tarText(header, 345, 155) : "";
	return prefix ? `${prefix}/${name}` : name;
}

type PaxOverrides = { path?: string | null; size?: number | null };

function paxOverrides(data: Uint8Array, global = false): PaxOverrides {
	const out: PaxOverrides = {};
	const raw = Buffer.from(data).toString("latin1");
	for (let index = 0; index < raw.length; ) {
		const space = raw.indexOf(" ", index);
		const token = space < 0 ? "" : raw.slice(index, space);
		const length = /^\d+$/.test(token) ? Number(token) : 0;
		const end = index + length;
		const eq = space < 0 ? -1 : raw.indexOf("=", space);
		if (length < 1 || !Number.isSafeInteger(length) || end > raw.length)
			throw new ToolError("Unsupported tar pax header");
		if (space >= end || eq < 0 || eq >= end || raw[end - 1] !== "\n")
			throw new ToolError("Unsupported tar pax header");
		const key = raw.slice(space + 1, eq);
		const value = new TextDecoder().decode(data.subarray(eq + 1, end - 1));
		if (key === "path") out.path = global && value === "" ? null : value;
		else if (key === "size" && global && value === "") out.size = null;
		else if (key === "size" && /^\d+$/.test(value) && Number.isSafeInteger(Number(value))) out.size = Number(value);
		else if (key === "size") throw new ToolError("Unsupported tar size encoding");
		index = end;
	}
	return out;
}

async function readTarEntries(bytes: Uint8Array, labeledGzip: boolean): Promise<ArchiveIndexEntry[]> {
	const payload = inflateToTar(bytes, labeledGzip);
	if (payload.byteLength > MAX_TAR_CONTAINER_BYTES) throw archiveLimitError("total");
	const entries: ArchiveIndexEntry[] = [];
	let entryCount = 0;
	let memberBytes = 0;
	let offset = 0;
	let longName: string | undefined;
	let pendingPax: PaxOverrides | undefined;
	const globalPax: { path?: string; size?: number } = {};
	while (offset + 512 <= payload.byteLength) {
		const header = payload.subarray(offset, offset + 512);
		if (header.every(byte => byte === 0)) break;
		const headerSize = tarOctal(header, 124, 12);
		if (!Number.isSafeInteger(headerSize) || headerSize < 0) throw new ToolError("Unsupported tar size encoding");
		const typeFlag = header[156] ?? 0;
		const headerName = tarEntryName(header);
		let size = headerSize;
		let rawName = typeFlag === 76 ? headerName : (longName ?? headerName);
		if (typeFlag !== 120 && typeFlag !== 103 && typeFlag !== 76) {
			rawName = pendingPax?.path ?? globalPax.path ?? rawName;
			size = pendingPax?.size ?? globalPax.size ?? size;
			pendingPax = undefined;
		}
		entryCount += 1;
		if (entryCount > MAX_ARCHIVE_ENTRY_COUNT) throw archiveLimitError("count");
		if (typeFlag < 100 && archiveEntryDepth(rawName) > MAX_ARCHIVE_PATH_DEPTH)
			throw archiveLimitError("depth", rawName);
		if (size > MAX_ARCHIVE_TOTAL_BYTES) throw archiveLimitError("total");
		if (size > MAX_ARCHIVE_ENTRY_BYTES) throw archiveLimitError("entry", rawName);
		const isRegular = typeFlag === 0 || typeFlag === 48;
		if (isRegular) {
			memberBytes += size;
			if (memberBytes > MAX_ARCHIVE_TOTAL_BYTES) throw archiveLimitError("total");
		}
		const dataEnd = offset + 512 + size;
		if (dataEnd > payload.byteLength) throw new ToolError("Truncated tar entry");
		const data = payload.subarray(offset + 512, dataEnd);
		offset += 512 + Math.ceil(size / 512) * 512;
		if (typeFlag === 120 || typeFlag === 103) {
			if (typeFlag === 103) {
				const overrides = paxOverrides(data, true);
				if (overrides.path === null) delete globalPax.path;
				else if (overrides.path !== undefined) globalPax.path = overrides.path;
				if (overrides.size === null) delete globalPax.size;
				else if (overrides.size !== undefined) globalPax.size = overrides.size;
			} else pendingPax = paxOverrides(data);
			continue;
		}
		if (typeFlag === 76) {
			longName = new TextDecoder().decode(data).replace(/\0+$/, "");
			continue;
		}
		longName = undefined;
		const normalizedPath = normalizeArchiveEntryPath(rawName);
		if (!normalizedPath || !isRegular) continue;
		const mtime = tarOctal(header, 136, 12);
		const mtimeMs = Number.isFinite(mtime) && mtime > 0 ? mtime * 1000 : undefined;
		entries.push({
			path: normalizedPath,
			isDirectory: false,
			size,
			mtimeMs,
			storage: {
				type: "tar",
				file: new File([data], normalizedPath, { lastModified: mtimeMs ?? 0 }),
			},
		});
	}
	return entries;
}

interface ZipDirectoryEntry {
	name: string;
	nameBytes: Uint8Array;
	flags: number;
	compression: number;
	crc32: number;
	compressedSize: number;
	uncompressedSize: number;
	localOffset: number;
}

interface StreamedZipEntry {
	name: string;
	compression: number;
	compressedSize: number | undefined;
	declaredSize: number | undefined;
	actualSize: number | undefined;
}

interface Zip64ExtraNeeds {
	uncompressedSize: boolean;
	compressedSize: boolean;
	localOffset: boolean;
	diskNumber: boolean;
}

interface Zip64ExtraValues {
	uncompressedSize?: number;
	compressedSize?: number;
	localOffset?: number;
	diskNumber?: number;
}

function invalidZipArchive(): ToolError {
	return new ToolError("Invalid ZIP archive");
}

function requireZipRange(view: DataView, offset: number, length: number, end = view.byteLength): void {
	if (
		!Number.isSafeInteger(offset) ||
		!Number.isSafeInteger(length) ||
		offset < 0 ||
		length < 0 ||
		offset + length > end
	) {
		throw invalidZipArchive();
	}
}

function zipUint64(view: DataView, offset: number, end: number): number {
	requireZipRange(view, offset, 8, end);
	const value = view.getBigUint64(offset, true);
	if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw invalidZipArchive();
	return Number(value);
}

function parseZip64Extra(view: DataView, start: number, length: number, needs: Zip64ExtraNeeds): Zip64ExtraValues {
	const end = start + length;
	requireZipRange(view, start, length);
	let zip64Start: number | undefined;
	let zip64End = 0;
	for (let offset = start; offset < end; ) {
		requireZipRange(view, offset, 4, end);
		const id = view.getUint16(offset, true);
		const fieldLength = view.getUint16(offset + 2, true);
		const fieldStart = offset + 4;
		requireZipRange(view, fieldStart, fieldLength, end);
		if (id === 0x0001) {
			if (zip64Start !== undefined) throw invalidZipArchive();
			zip64Start = fieldStart;
			zip64End = fieldStart + fieldLength;
		}
		offset = fieldStart + fieldLength;
	}

	const needsZip64 = Object.values(needs).some(Boolean);
	if (zip64Start === undefined) {
		if (needsZip64) throw invalidZipArchive();
		return {};
	}

	const values: Zip64ExtraValues = {};
	let offset = zip64Start;
	if (needs.uncompressedSize) {
		values.uncompressedSize = zipUint64(view, offset, zip64End);
		offset += 8;
	}
	if (needs.compressedSize) {
		values.compressedSize = zipUint64(view, offset, zip64End);
		offset += 8;
	}
	if (needs.localOffset) {
		values.localOffset = zipUint64(view, offset, zip64End);
		offset += 8;
	}
	if (needs.diskNumber) {
		requireZipRange(view, offset, 4, zip64End);
		values.diskNumber = view.getUint32(offset, true);
	}
	return values;
}

function decodeZipName(bytes: Uint8Array, flags: number): string {
	if ((flags & 0x0800) !== 0) return new TextDecoder().decode(bytes);
	let name = "";
	for (let offset = 0; offset < bytes.byteLength; offset += 0x4000) {
		name += String.fromCharCode(...bytes.subarray(offset, offset + 0x4000));
	}
	return name;
}

function zipDescriptorEnd(
	view: DataView,
	start: number,
	end: number,
	entry: ZipDirectoryEntry,
	zip64Sizes: boolean,
): number {
	const matches = (hasSignature: boolean): number | undefined => {
		let offset = start;
		if (hasSignature) {
			if (offset + 4 > end || view.getUint32(offset, true) !== ZIP_DATA_DESCRIPTOR_SIGNATURE) return undefined;
			offset += 4;
		}
		const sizeLength = zip64Sizes ? 8 : 4;
		if (offset + 4 + sizeLength * 2 > end) return undefined;
		if (view.getUint32(offset, true) !== entry.crc32) return undefined;
		const compressedSize = zip64Sizes
			? view.getBigUint64(offset + 4, true)
			: BigInt(view.getUint32(offset + 4, true));
		const uncompressedSize = zip64Sizes
			? view.getBigUint64(offset + 4 + sizeLength, true)
			: BigInt(view.getUint32(offset + 4 + sizeLength, true));
		if (compressedSize !== BigInt(entry.compressedSize) || uncompressedSize !== BigInt(entry.uncompressedSize)) {
			return undefined;
		}
		return offset + 4 + sizeLength * 2;
	};

	const withSignature = matches(true);
	const withoutSignature = matches(false);
	const descriptorEnd = withSignature ?? withoutSignature;
	if (descriptorEnd === undefined) throw invalidZipArchive();
	return descriptorEnd;
}

function validateZipLocalEntry(
	view: DataView,
	bytes: Uint8Array,
	entry: ZipDirectoryEntry,
	offsetCorrection: number,
	centralDirectoryStart: number,
): { entry: ZipDirectoryEntry; endOffset: number } {
	const localOffset = entry.localOffset + offsetCorrection;
	requireZipRange(view, localOffset, 30, centralDirectoryStart);
	if (view.getUint32(localOffset, true) !== ZIP_LOCAL_FILE_HEADER_SIGNATURE) throw invalidZipArchive();
	const flags = view.getUint16(localOffset + 6, true);
	const compression = view.getUint16(localOffset + 8, true);
	const crc32 = view.getUint32(localOffset + 14, true);
	const compressedSize32 = view.getUint32(localOffset + 18, true);
	const uncompressedSize32 = view.getUint32(localOffset + 22, true);
	const nameLength = view.getUint16(localOffset + 26, true);
	const extraLength = view.getUint16(localOffset + 28, true);
	const nameStart = localOffset + 30;
	const extraStart = nameStart + nameLength;
	requireZipRange(view, nameStart, nameLength + extraLength, centralDirectoryStart);
	const localName = bytes.subarray(nameStart, extraStart);
	if (
		flags !== entry.flags ||
		compression !== entry.compression ||
		localName.byteLength !== entry.nameBytes.byteLength ||
		localName.some((byte, index) => byte !== entry.nameBytes[index])
	) {
		throw invalidZipArchive();
	}

	const zip64Sizes = compressedSize32 === ZIP_UINT32_MAX || uncompressedSize32 === ZIP_UINT32_MAX;
	const zip64 = parseZip64Extra(view, extraStart, extraLength, {
		uncompressedSize: uncompressedSize32 === ZIP_UINT32_MAX,
		compressedSize: compressedSize32 === ZIP_UINT32_MAX,
		localOffset: false,
		diskNumber: false,
	});
	const compressedSize = compressedSize32 === ZIP_UINT32_MAX ? zip64.compressedSize : compressedSize32;
	const uncompressedSize = uncompressedSize32 === ZIP_UINT32_MAX ? zip64.uncompressedSize : uncompressedSize32;
	if (compressedSize === undefined || uncompressedSize === undefined) throw invalidZipArchive();

	const hasDescriptor = (flags & 0x0008) !== 0;
	if (hasDescriptor) {
		if (crc32 !== 0 && crc32 !== entry.crc32) throw invalidZipArchive();
		if (compressedSize !== 0 && compressedSize !== entry.compressedSize) throw invalidZipArchive();
		if (uncompressedSize !== 0 && uncompressedSize !== entry.uncompressedSize) throw invalidZipArchive();
	} else if (
		crc32 !== entry.crc32 ||
		compressedSize !== entry.compressedSize ||
		uncompressedSize !== entry.uncompressedSize
	) {
		throw invalidZipArchive();
	}

	const dataStart = extraStart + extraLength;
	const dataEnd = dataStart + entry.compressedSize;
	if (dataEnd > centralDirectoryStart) throw invalidZipArchive();
	const endOffset = hasDescriptor
		? zipDescriptorEnd(view, dataEnd, centralDirectoryStart, entry, zip64Sizes)
		: dataEnd;
	return { entry: { ...entry, localOffset }, endOffset };
}

function zipEndRecordEntryCount(view: DataView, endOffset: number): number | undefined {
	const entryCount16 = view.getUint16(endOffset + 10, true);
	if (entryCount16 !== ZIP_UINT16_MAX) return entryCount16;
	const locatorOffset = endOffset - 20;
	if (locatorOffset < 0 || view.getUint32(locatorOffset, true) !== ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIGNATURE) {
		return undefined;
	}
	const zip64EndOffset = zipUint64(view, locatorOffset + 8, locatorOffset + 20);
	requireZipRange(view, zip64EndOffset, 56, locatorOffset);
	if (view.getUint32(zip64EndOffset, true) !== ZIP64_END_OF_CENTRAL_DIRECTORY_SIGNATURE) return undefined;
	return zipUint64(view, zip64EndOffset + 32, locatorOffset);
}

function readZipDirectories(bytes: Uint8Array, streamedEntryCount: number): ZipDirectoryEntry[][] {
	// fflate's streaming reader emits local records but does not require or validate the ZIP end records.
	// Cap full parses so a comment full of EOCD-like signatures cannot multiply archive work.
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const searchStart = Math.max(0, bytes.byteLength - 22 - ZIP_UINT16_MAX);
	const directories: ZipDirectoryEntry[][] = [];
	let lastError: unknown;
	for (let offset = bytes.byteLength - 22; offset >= searchStart; offset--) {
		if (view.getUint32(offset, true) !== ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE) continue;
		const commentLength = view.getUint16(offset + 20, true);
		if (offset + 22 + commentLength !== bytes.byteLength) continue;
		let candidateEntryCount: number | undefined;
		try {
			candidateEntryCount = zipEndRecordEntryCount(view, offset);
		} catch (error) {
			lastError = error;
			continue;
		}
		if (candidateEntryCount !== streamedEntryCount) continue;
		let directory: ZipDirectoryEntry[];
		try {
			directory = parseZipDirectoryAt(bytes, view, offset);
		} catch (error) {
			lastError = error;
			continue;
		}
		if (directories.some(existing => sameZipDirectory(existing, directory))) continue;
		if (directories.length >= MAX_ZIP_DIRECTORY_CANDIDATES) throw invalidZipArchive();
		directories.push(directory);
	}
	if (directories.length > 0) return directories;
	if (lastError instanceof Error) throw lastError;
	throw invalidZipArchive();
}

function sameZipDirectory(left: ZipDirectoryEntry[], right: ZipDirectoryEntry[]): boolean {
	if (left.length !== right.length) return false;
	return left.every((entry, index) => {
		const other = right[index];
		return (
			other !== undefined &&
			entry.name === other.name &&
			entry.flags === other.flags &&
			entry.compression === other.compression &&
			entry.crc32 === other.crc32 &&
			entry.compressedSize === other.compressedSize &&
			entry.uncompressedSize === other.uncompressedSize &&
			entry.localOffset === other.localOffset &&
			entry.nameBytes.byteLength === other.nameBytes.byteLength &&
			entry.nameBytes.every((byte, byteIndex) => byte === other.nameBytes[byteIndex])
		);
	});
}

function parseZipDirectoryAt(bytes: Uint8Array, view: DataView, endOffset: number): ZipDirectoryEntry[] {
	const diskNumber = view.getUint16(endOffset + 4, true);
	const centralDiskNumber = view.getUint16(endOffset + 6, true);
	const entriesOnDisk16 = view.getUint16(endOffset + 8, true);
	const entryCount16 = view.getUint16(endOffset + 10, true);
	const centralSize32 = view.getUint32(endOffset + 12, true);
	const centralOffset32 = view.getUint32(endOffset + 16, true);
	if (
		diskNumber !== 0 ||
		centralDiskNumber !== 0 ||
		(entriesOnDisk16 !== ZIP_UINT16_MAX && entriesOnDisk16 !== entryCount16)
	) {
		throw invalidZipArchive();
	}

	const needsZip64 =
		entriesOnDisk16 === ZIP_UINT16_MAX ||
		entryCount16 === ZIP_UINT16_MAX ||
		centralSize32 === ZIP_UINT32_MAX ||
		centralOffset32 === ZIP_UINT32_MAX;
	const locatorOffset = endOffset - 20;
	const hasZip64Locator =
		locatorOffset >= 0 && view.getUint32(locatorOffset, true) === ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIGNATURE;
	if (needsZip64 && !hasZip64Locator) throw invalidZipArchive();

	let entryCount: number;
	let centralSize: number;
	let centralOffset: number;
	let centralDirectoryEnd: number;
	if (hasZip64Locator) {
		const locatorDisk = view.getUint32(locatorOffset + 4, true);
		const zip64EndOffset = zipUint64(view, locatorOffset + 8, locatorOffset + 20);
		const totalDisks = view.getUint32(locatorOffset + 16, true);
		if (locatorDisk !== 0 || totalDisks !== 1) throw invalidZipArchive();
		requireZipRange(view, zip64EndOffset, 56, locatorOffset);
		if (view.getUint32(zip64EndOffset, true) !== ZIP64_END_OF_CENTRAL_DIRECTORY_SIGNATURE) throw invalidZipArchive();
		const zip64RecordSize = zipUint64(view, zip64EndOffset + 4, locatorOffset);
		if (zip64RecordSize < 44 || zip64EndOffset + 12 + zip64RecordSize !== locatorOffset) throw invalidZipArchive();
		if (view.getUint32(zip64EndOffset + 16, true) !== 0 || view.getUint32(zip64EndOffset + 20, true) !== 0) {
			throw invalidZipArchive();
		}
		const entriesOnDisk = zipUint64(view, zip64EndOffset + 24, locatorOffset);
		entryCount = zipUint64(view, zip64EndOffset + 32, locatorOffset);
		centralSize = zipUint64(view, zip64EndOffset + 40, locatorOffset);
		centralOffset = zipUint64(view, zip64EndOffset + 48, locatorOffset);
		if (entriesOnDisk !== entryCount) throw invalidZipArchive();
		if (
			(entriesOnDisk16 !== ZIP_UINT16_MAX && entriesOnDisk16 !== entriesOnDisk) ||
			(entryCount16 !== ZIP_UINT16_MAX && entryCount16 !== entryCount) ||
			(centralSize32 !== ZIP_UINT32_MAX && centralSize32 !== centralSize) ||
			(centralOffset32 !== ZIP_UINT32_MAX && centralOffset32 !== centralOffset)
		) {
			throw invalidZipArchive();
		}
		centralDirectoryEnd = zip64EndOffset;
	} else {
		entryCount = entryCount16;
		centralSize = centralSize32;
		centralOffset = centralOffset32;
		centralDirectoryEnd = endOffset;
	}
	if (entryCount > MAX_ARCHIVE_ENTRY_COUNT) throw archiveLimitError("count");
	if (centralSize > centralDirectoryEnd) throw invalidZipArchive();
	const centralDirectoryStart = centralDirectoryEnd - centralSize;
	const offsetCorrection = centralDirectoryStart - centralOffset;
	if (offsetCorrection < 0) throw invalidZipArchive();

	const directoryEntries: ZipDirectoryEntry[] = [];
	let totalUncompressed = 0;
	let offset = centralDirectoryStart;
	for (let index = 0; index < entryCount; index++) {
		requireZipRange(view, offset, 46, centralDirectoryEnd);
		if (view.getUint32(offset, true) !== ZIP_CENTRAL_DIRECTORY_SIGNATURE) throw invalidZipArchive();
		const flags = view.getUint16(offset + 8, true);
		const compression = view.getUint16(offset + 10, true);
		const crc32 = view.getUint32(offset + 16, true);
		const compressedSize32 = view.getUint32(offset + 20, true);
		const uncompressedSize32 = view.getUint32(offset + 24, true);
		const nameLength = view.getUint16(offset + 28, true);
		const extraLength = view.getUint16(offset + 30, true);
		const commentLength = view.getUint16(offset + 32, true);
		const diskStart16 = view.getUint16(offset + 34, true);
		const localOffset32 = view.getUint32(offset + 42, true);
		const nameStart = offset + 46;
		const extraStart = nameStart + nameLength;
		const recordLength = 46 + nameLength + extraLength + commentLength;
		requireZipRange(view, offset, recordLength, centralDirectoryEnd);
		const zip64 = parseZip64Extra(view, extraStart, extraLength, {
			uncompressedSize: uncompressedSize32 === ZIP_UINT32_MAX,
			compressedSize: compressedSize32 === ZIP_UINT32_MAX,
			localOffset: localOffset32 === ZIP_UINT32_MAX,
			diskNumber: diskStart16 === ZIP_UINT16_MAX,
		});
		const uncompressedSize = uncompressedSize32 === ZIP_UINT32_MAX ? zip64.uncompressedSize : uncompressedSize32;
		const compressedSize = compressedSize32 === ZIP_UINT32_MAX ? zip64.compressedSize : compressedSize32;
		const localOffset = localOffset32 === ZIP_UINT32_MAX ? zip64.localOffset : localOffset32;
		const diskStart = diskStart16 === ZIP_UINT16_MAX ? zip64.diskNumber : diskStart16;
		if (
			uncompressedSize === undefined ||
			compressedSize === undefined ||
			localOffset === undefined ||
			diskStart !== 0
		) {
			throw invalidZipArchive();
		}
		const nameBytes = bytes.subarray(nameStart, extraStart);
		const name = decodeZipName(nameBytes, flags);
		if (uncompressedSize > MAX_ARCHIVE_ENTRY_BYTES) throw archiveLimitError("entry", name);
		totalUncompressed += uncompressedSize;
		if (totalUncompressed > MAX_ARCHIVE_TOTAL_BYTES) throw archiveLimitError("total");
		directoryEntries.push({
			name,
			nameBytes,
			flags,
			compression,
			crc32,
			compressedSize,
			uncompressedSize,
			localOffset,
		});
		offset += recordLength;
	}
	if (offset < centralDirectoryEnd) {
		requireZipRange(view, offset, 6, centralDirectoryEnd);
		const signatureLength = view.getUint16(offset + 4, true);
		if (
			view.getUint32(offset, true) !== ZIP_CENTRAL_DIRECTORY_DIGITAL_SIGNATURE ||
			offset + 6 + signatureLength !== centralDirectoryEnd
		) {
			throw invalidZipArchive();
		}
		offset = centralDirectoryEnd;
	}
	if (offset !== centralDirectoryEnd) throw invalidZipArchive();

	const localEntries = directoryEntries
		.map(entry => validateZipLocalEntry(view, bytes, entry, offsetCorrection, centralDirectoryStart))
		.sort((left, right) => left.entry.localOffset - right.entry.localOffset);
	for (let index = 1; index < localEntries.length; index++) {
		const previous = localEntries[index - 1];
		const current = localEntries[index];
		if (previous && current && current.entry.localOffset < previous.endOffset) throw invalidZipArchive();
	}
	return localEntries.map(item => item.entry);
}

function zipDirectoryMatchesStream(directory: ZipDirectoryEntry[], streamed: StreamedZipEntry[]): boolean {
	if (directory.length !== streamed.length) return false;
	return directory.every((entry, index) => {
		const member = streamed[index];
		return (
			member !== undefined &&
			entry.name === member.name &&
			entry.compression === member.compression &&
			(member.compressedSize === undefined || entry.compressedSize === member.compressedSize) &&
			(member.declaredSize === undefined || entry.uncompressedSize === member.declaredSize) &&
			(member.actualSize === undefined || entry.uncompressedSize === member.actualSize)
		);
	});
}

async function readZipEntries(bytes: Uint8Array): Promise<ArchiveIndexEntry[]> {
	const { Inflate, Unzip, UnzipPassThrough } = await loadFflate();
	let streamedEntryCount = 0;
	let probeError: ToolError | undefined;
	const probe = new Unzip();
	class DiscardZipDecoder {
		static compression: number = 0;
		ondata: (error: Error | null, data: Uint8Array, final: boolean) => void = () => {};
		push(_data: Uint8Array, final: boolean): void {
			this.ondata(null, EMPTY_ZIP_BYTES, final);
		}
	}
	probe.onfile = file => {
		if (probeError) return file.terminate();
		streamedEntryCount += 1;
		if (streamedEntryCount > MAX_ARCHIVE_ENTRY_COUNT) {
			probeError = archiveLimitError("count");
			return file.terminate();
		}
		DiscardZipDecoder.compression = file.compression;
		probe.register(DiscardZipDecoder);
		file.ondata = error => {
			if (error) probeError = invalidZipArchive();
		};
		try {
			file.start();
		} catch {
			probeError = invalidZipArchive();
		}
	};
	try {
		if (bytes.byteLength === 0) probe.push(bytes, true);
		for (let offset = 0; offset < bytes.byteLength; offset += 512) {
			if (probeError) break;
			const end = Math.min(bytes.byteLength, offset + 512);
			probe.push(bytes.subarray(offset, end), end === bytes.byteLength);
		}
	} catch {
		if (!probeError) probeError = invalidZipArchive();
	}
	if (probeError) throw probeError;
	const directoryCandidates = readZipDirectories(bytes, streamedEntryCount);
	// Unzip constructs custom decoders synchronously in file.start; the decoder captures this entry's budget.
	let activeInflateBudget:
		| {
				entryBytes: number;
				fileName: string;
		  }
		| undefined;
	class CappedZipInflate {
		static compression = 8;
		ondata: (error: Error | null, data: Uint8Array, final: boolean) => void = () => {};
		#failed = false;
		#inflater: InstanceType<typeof Inflate>;
		constructor() {
			const budget = activeInflateBudget;
			if (!budget) throw new ToolError("Missing ZIP inflate budget");
			// Inflate consumes compressed chunks incrementally, avoiding a member-sized compressed copy.
			this.#inflater = new Inflate((data, final) => {
				const entryRemaining = MAX_ARCHIVE_ENTRY_BYTES - budget.entryBytes;
				const totalRemaining = MAX_ARCHIVE_TOTAL_BYTES - totalUncompressed;
				if (data.byteLength > Math.min(entryRemaining, totalRemaining)) {
					this.#failed = true;
					throw archiveLimitError(entryRemaining <= totalRemaining ? "entry" : "total", budget.fileName);
				}
				budget.entryBytes += data.byteLength;
				this.ondata(null, data, final);
			});
		}
		push(data: Uint8Array, final: boolean): void {
			if (this.#failed) return;
			try {
				this.#inflater.push(data, final);
			} catch (error) {
				this.#failed = true;
				this.ondata(error instanceof Error ? error : new Error(String(error)), new Uint8Array(0), true);
			}
		}
		terminate(): void {
			this.#failed = true;
		}
	}
	const entries: ArchiveIndexEntry[] = [];
	const streamedEntries: StreamedZipEntry[] = [];
	let totalUncompressed = 0;
	let entryCount = 0;
	let limitError: ToolError | undefined;
	const unzipper = new Unzip();
	unzipper.register(CappedZipInflate);
	unzipper.register(UnzipPassThrough);
	const halt = (file: { terminate: () => void }, error: ToolError) => {
		limitError = error;
		file.terminate();
	};
	unzipper.onfile = file => {
		if (limitError) return halt(file, limitError);
		entryCount += 1;
		const streamedEntry: StreamedZipEntry = {
			name: file.name,
			compression: file.compression,
			compressedSize: file.size,
			declaredSize: file.originalSize,
			actualSize: undefined,
		};
		streamedEntries.push(streamedEntry);
		const declared = file.originalSize;
		const normalizedPath = normalizeArchiveEntryPath(file.name);
		if (entryCount > MAX_ARCHIVE_ENTRY_COUNT) return halt(file, archiveLimitError("count"));
		if (archiveEntryDepth(file.name) > MAX_ARCHIVE_PATH_DEPTH)
			return halt(file, archiveLimitError("depth", file.name));
		if (typeof declared === "number" && declared > MAX_ARCHIVE_ENTRY_BYTES) {
			return halt(file, archiveLimitError("entry", file.name));
		}
		if (typeof declared === "number" && totalUncompressed + declared > MAX_ARCHIVE_TOTAL_BYTES) {
			return halt(file, archiveLimitError("total"));
		}
		if (!normalizedPath) return file.terminate();
		const isDirectory = isArchiveDirectoryName(file.name);
		const chunks: Uint8Array[] = [];
		let entryBytes = 0;
		file.ondata = (error, data, final) => {
			if (limitError) return;
			if (error) return halt(file, new ToolError(error.message));
			const size = data?.byteLength ?? 0;
			if (entryBytes + size > MAX_ARCHIVE_ENTRY_BYTES) return halt(file, archiveLimitError("entry", normalizedPath));
			if (totalUncompressed + size > MAX_ARCHIVE_TOTAL_BYTES) return halt(file, archiveLimitError("total"));
			entryBytes += size;
			totalUncompressed += size;
			if (size > 0 && !isDirectory && data) chunks.push(data);
			if (!final) return;
			streamedEntry.actualSize = entryBytes;
			entries.push({
				path: normalizedPath,
				isDirectory,
				size: isDirectory ? 0 : entryBytes,
				storage: isDirectory ? undefined : { type: "zip", bytes: concatBytes(chunks, entryBytes) },
			});
		};
		activeInflateBudget = {
			entryBytes: 0,
			fileName: normalizedPath,
		};
		try {
			file.start();
		} catch (error) {
			if (!limitError) limitError = new ToolError(error instanceof Error ? error.message : String(error));
		} finally {
			activeInflateBudget = undefined;
		}
	};

	try {
		if (bytes.byteLength === 0) unzipper.push(bytes, true);
		for (let offset = 0; offset < bytes.byteLength; offset += 512) {
			if (limitError) break;
			const end = Math.min(bytes.byteLength, offset + 512);
			unzipper.push(bytes.subarray(offset, end), end === bytes.byteLength);
		}
	} catch (error) {
		if (!limitError) limitError = new ToolError(error instanceof Error ? error.message : String(error));
	}
	if (limitError) throw limitError;
	if (!directoryCandidates.some(directory => zipDirectoryMatchesStream(directory, streamedEntries))) {
		throw invalidZipArchive();
	}
	return [
		...entries.reduce((map, entry) => map.set(entry.path, entry), new Map<string, ArchiveIndexEntry>()).values(),
	];
}

export function parseArchivePathCandidates(filePath: string): ArchivePathCandidate[] {
	const normalized = filePath.replace(/\\/g, "/");
	const pattern = /\.(?:tar\.gz|tgz|zip|tar)(?=(?::|$))/gi;
	const seen = new Set<string>();
	const candidates: ArchivePathCandidate[] = [];

	let match: RegExpExecArray | null;
	while (true) {
		match = pattern.exec(normalized);
		if (match === null) {
			break;
		}
		const end = match.index + match[0].length;
		const archivePath = filePath.slice(0, end);
		const subPath = normalized.slice(end).replace(/^:+/, "");
		const key = `${archivePath}\0${subPath}`;
		if (seen.has(key)) continue;
		seen.add(key);
		candidates.push({ archivePath, subPath });
	}

	return candidates.sort((left, right) => right.archivePath.length - left.archivePath.length);
}

export class ArchiveReader {
	readonly format: ArchiveFormat;
	#entries = new Map<string, ArchiveIndexEntry>();

	constructor(format: ArchiveFormat, entries: ArchiveIndexEntry[]) {
		this.format = format;
		for (const entry of entries) {
			upsertArchiveEntry(this.#entries, entry);
		}
		ensureParentDirectories(this.#entries);
	}

	getNode(subPath?: string): ArchiveNode | undefined {
		const normalizedPath = normalizeArchiveLookupPath(subPath);
		if (normalizedPath === undefined) return undefined;
		if (normalizedPath === "") {
			return { path: "", isDirectory: true, size: 0 };
		}

		const entry = this.#entries.get(normalizedPath);
		if (!entry) return undefined;
		return {
			path: entry.path,
			isDirectory: entry.isDirectory,
			size: entry.size,
			mtimeMs: entry.mtimeMs,
		};
	}

	listDirectory(subPath?: string): ArchiveDirectoryEntry[] {
		const normalizedPath = normalizeArchiveLookupPath(subPath);
		if (normalizedPath === undefined) {
			throw new ToolError("Archive path cannot contain '..'");
		}

		if (normalizedPath) {
			const entry = this.#entries.get(normalizedPath);
			if (!entry) {
				throw new ToolError(`Archive path '${normalizedPath}' not found`);
			}
			if (!entry.isDirectory) {
				throw new ToolError(`Archive path '${normalizedPath}' is not a directory`);
			}
		}

		const prefix = normalizedPath ? `${normalizedPath}/` : "";
		const children = new Map<string, ArchiveDirectoryEntry>();

		for (const entry of this.#entries.values()) {
			if (normalizedPath) {
				if (!entry.path.startsWith(prefix) || entry.path === normalizedPath) continue;
			}

			const relativePath = normalizedPath ? entry.path.slice(prefix.length) : entry.path;
			const nextSegment = relativePath.split("/")[0];
			if (!nextSegment) continue;

			const childPath = normalizedPath ? `${normalizedPath}/${nextSegment}` : nextSegment;
			if (children.has(childPath)) continue;

			const childEntry = this.#entries.get(childPath);
			const isDirectory = childEntry?.isDirectory ?? relativePath.includes("/");
			children.set(childPath, {
				name: nextSegment,
				path: childPath,
				isDirectory,
				size: isDirectory ? 0 : (childEntry?.size ?? entry.size),
				mtimeMs: childEntry?.mtimeMs ?? entry.mtimeMs,
			});
		}

		return [...children.values()].sort((left, right) =>
			left.name.toLowerCase().localeCompare(right.name.toLowerCase()),
		);
	}

	async readFile(subPath: string): Promise<ExtractedArchiveFile> {
		const normalizedPath = normalizeArchiveLookupPath(subPath);
		if (!normalizedPath) {
			throw new ToolError("Archive file path is required");
		}

		const entry = this.#entries.get(normalizedPath);
		if (!entry) {
			throw new ToolError(`Archive file '${normalizedPath}' not found`);
		}
		if (entry.isDirectory) {
			throw new ToolError(`Archive path '${normalizedPath}' is a directory`);
		}
		if (!entry.storage) {
			throw new ToolError(`Archive file '${normalizedPath}' has no readable storage`);
		}

		const bytes = entry.storage.type === "tar" ? await entry.storage.file.bytes() : entry.storage.bytes;

		return {
			path: entry.path,
			isDirectory: false,
			size: entry.size,
			mtimeMs: entry.mtimeMs,
			bytes,
		};
	}
}

export async function openArchive(filePath: string): Promise<ArchiveReader> {
	const format = getArchiveFormatFromPath(filePath);
	if (!format) {
		throw new ToolError(`Unsupported archive format: ${filePath}`);
	}

	// F20: cap the compressed archive read so opening a multi-GB archive cannot buffer it
	// whole into memory. Inflate stops at one entry, the total, the entry count, and path depth.
	const file = Bun.file(filePath);
	if (file.size > MAX_ARCHIVE_BYTES) {
		throw new ToolError(
			`Archive too large to open: ${filePath} is ${file.size} bytes (limit ${MAX_ARCHIVE_BYTES}). Extract a subset with a dedicated tool.`,
		);
	}
	const bytes = await file.bytes();
	const entries = format === "zip" ? await readZipEntries(bytes) : await readTarEntries(bytes, format === "tar.gz");
	return new ArchiveReader(format, entries);
}
