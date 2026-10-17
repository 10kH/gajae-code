import { gunzipSync, inflateRawSync } from "node:zlib";
import { ToolError } from "./tool-errors";

const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024;
const MAX_ARCHIVE_ENTRY_BYTES = 16 * 1024 * 1024;
const MAX_ARCHIVE_TOTAL_BYTES = 64 * 1024 * 1024;
const MAX_ARCHIVE_ENTRY_COUNT = 8192;
const MAX_ARCHIVE_PATH_DEPTH = 48;
const MAX_TAR_CONTAINER_BYTES = MAX_ARCHIVE_TOTAL_BYTES + MAX_ARCHIVE_ENTRY_COUNT * 512 + 1024;
const MAX_GZIP_LAYERS = 24;

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
	const text =
		kind === "count"
			? `Archive has too many entries (limit ${MAX_ARCHIVE_ENTRY_COUNT}). Extract a subset with a dedicated tool.`
			: kind === "total"
				? `Archive expands past the total limit (${MAX_ARCHIVE_TOTAL_BYTES} bytes). Extract a subset with a dedicated tool.`
				: kind === "depth"
					? `Archive entry '${detail}' is nested too deeply (limit ${MAX_ARCHIVE_PATH_DEPTH}). Extract a subset with a dedicated tool.`
					: `Archive entry '${detail}' expands past the per-entry limit (${MAX_ARCHIVE_ENTRY_BYTES} bytes). Extract a subset with a dedicated tool.`;
	return new ToolError(text);
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

function gunzipBounded(bytes: Uint8Array): Uint8Array {
	try {
		return gunzipSync(bytes, { maxOutputLength: MAX_TAR_CONTAINER_BYTES });
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
	let sawGzip = labeledGzip || isGzipBytes(payload);
	while (sawGzip) {
		layers += 1;
		if (layers > MAX_GZIP_LAYERS) throw archiveLimitError("total");
		payload = gunzipBounded(payload);
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

function paxOverrides(data: Uint8Array): { path?: string; size?: number } {
	const out: { path?: string; size?: number } = {};
	const raw = new TextDecoder("latin1").decode(data);
	for (let index = 0; index < raw.length; ) {
		const space = raw.indexOf(" ", index);
		const length = Number.parseInt(raw.slice(index, space), 10);
		if (space < index || !Number.isSafeInteger(length) || index + length > raw.length)
			throw new ToolError("Unsupported tar pax header");
		const eq = raw.indexOf("=", space);
		const key = raw.slice(space + 1, eq);
		const value = new TextDecoder().decode(data.subarray(eq + 1, index + length - 1));
		if (key === "path") out.path = value;
		else if (key === "size" && /^\d+$/.test(value) && Number.isSafeInteger(Number(value))) out.size = Number(value);
		else if (key === "size") throw new ToolError("Unsupported tar size encoding");
		index += length;
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
	let pendingPax: { path?: string; size?: number } | undefined;
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
			if (typeFlag === 103) Object.assign(globalPax, paxOverrides(data));
			else pendingPax = paxOverrides(data);
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

async function readZipEntries(bytes: Uint8Array): Promise<ArchiveIndexEntry[]> {
	const { Unzip, UnzipPassThrough } = await loadFflate();
	const outputBudget = () => Math.min(MAX_ARCHIVE_ENTRY_BYTES, MAX_ARCHIVE_TOTAL_BYTES - totalUncompressed);
	class CappedZipInflate {
		static compression = 8;
		ondata: (error: Error | null, data: Uint8Array, final: boolean) => void = () => {};
		#parts: Uint8Array[] = [];
		#length = 0;
		push(data: Uint8Array, final: boolean): void {
			if (data.byteLength > 0) {
				this.#parts.push(data);
				this.#length += data.byteLength;
			}
			if (!final) return;
			const remaining = Math.max(0, outputBudget());
			const tooBig = () => archiveLimitError(remaining >= MAX_ARCHIVE_ENTRY_BYTES ? "entry" : "total");
			try {
				const out = inflateRawSync(concatBytes(this.#parts, this.#length), {
					maxOutputLength: Math.max(1, remaining),
				});
				if (out.byteLength > remaining) {
					this.ondata(tooBig(), new Uint8Array(0), true);
					return;
				}
				this.ondata(null, out, true);
			} catch (error) {
				const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
				if (code === "ERR_BUFFER_TOO_LARGE") {
					this.ondata(tooBig(), new Uint8Array(0), true);
					return;
				}
				this.ondata(error instanceof Error ? error : new Error(String(error)), new Uint8Array(0), true);
			}
		}
	}
	const entries: ArchiveIndexEntry[] = [];
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
			entries.push({
				path: normalizedPath,
				isDirectory,
				size: isDirectory ? 0 : entryBytes,
				storage: isDirectory ? undefined : { type: "zip", bytes: concatBytes(chunks, entryBytes) },
			});
		};
		try {
			file.start();
		} catch (error) {
			if (!limitError) limitError = new ToolError(error instanceof Error ? error.message : String(error));
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
