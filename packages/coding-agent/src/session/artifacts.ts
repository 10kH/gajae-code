/**
 * Session-scoped artifact storage for truncated tool outputs.
 *
 * Artifacts are stored in a directory alongside the session file,
 * accessible via artifact:// URLs.
 */

import { createHash, randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";

import * as path from "node:path";
import { isValidArtifactId } from "../utils/artifact-id";
import {
	ensureManagedDirectory,
	type ManagedFileSnapshot,
	type ManagedSessionDescendantStore,
	publishManagedFileNoReplace,
} from "./internal/managed-session-storage";
import { DEFAULT_ARTIFACT_MAX_BYTES, truncateHeadBytes } from "./streaming-output";

export interface ManagedOutputGeneration {
	outputFilename: string;
	metadataFilename: string;
	outputSizeBytes: number;
	outputSha256: string;
	metadataSizeBytes: number;
	metadataSha256: string;
}

function sha256(bytes: Uint8Array): string {
	return createHash("sha256").update(bytes).digest("hex");
}

function isSafeFilename(filename: string): boolean {
	return /^[a-zA-Z0-9_.-]+$/.test(filename);
}

const MANAGED_OUTPUT_GENERATION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function parseManagedOutputGeneration(value: Uint8Array, outputFilenamePrefix: string): ManagedOutputGeneration | null {
	try {
		const parsed = JSON.parse(Buffer.from(value).toString("utf8")) as Partial<ManagedOutputGeneration>;
		if (
			typeof parsed.outputFilename !== "string" ||
			typeof parsed.metadataFilename !== "string" ||
			typeof parsed.outputSizeBytes !== "number" ||
			typeof parsed.outputSha256 !== "string" ||
			typeof parsed.metadataSizeBytes !== "number" ||
			typeof parsed.metadataSha256 !== "string" ||
			!Number.isSafeInteger(parsed.outputSizeBytes) ||
			(parsed.outputSizeBytes ?? -1) < 0 ||
			!Number.isSafeInteger(parsed.metadataSizeBytes) ||
			(parsed.metadataSizeBytes ?? -1) < 0 ||
			!SHA256_PATTERN.test(parsed.outputSha256) ||
			!SHA256_PATTERN.test(parsed.metadataSha256) ||
			!isSafeFilename(parsed.outputFilename) ||
			!isSafeFilename(parsed.metadataFilename) ||
			!parsed.outputFilename.startsWith(`${outputFilenamePrefix}.`) ||
			!parsed.outputFilename.endsWith(".output") ||
			!MANAGED_OUTPUT_GENERATION_ID_PATTERN.test(
				parsed.outputFilename.slice(outputFilenamePrefix.length + 1, -".output".length),
			) ||
			parsed.metadataFilename !== `${parsed.outputFilename}.meta.json`
		)
			return null;
		return parsed as ManagedOutputGeneration;
	} catch {
		return null;
	}
}

function sameGeneration(left: ManagedOutputGeneration, right: ManagedOutputGeneration): boolean {
	return (
		left.outputFilename === right.outputFilename &&
		left.metadataFilename === right.metadataFilename &&
		left.outputSizeBytes === right.outputSizeBytes &&
		left.outputSha256 === right.outputSha256 &&
		left.metadataSizeBytes === right.metadataSizeBytes &&
		left.metadataSha256 === right.metadataSha256
	);
}

function referencesGeneration(value: Uint8Array, generation: ManagedOutputGeneration): boolean {
	try {
		const parsed = JSON.parse(Buffer.from(value).toString("utf8")) as Partial<ManagedOutputGeneration>;
		return (
			parsed.outputFilename === generation.outputFilename && parsed.metadataFilename === generation.metadataFilename
		);
	} catch {
		return false;
	}
}
export interface ArtifactSaveOptions {
	maxBytes?: number;
}

export interface ArtifactSaveReceipt {
	id: string;
	complete: boolean;
	omittedBytes?: number;
}

/**
 * Manages artifact storage for a session.
 *
 * Artifacts are stored with sequential IDs in the session's artifact directory.
 * The directory is created lazily on first write.
 *
 * Subagents do not own their own `ArtifactManager`. The parent's instance is
 * adopted via `SessionManager.adoptArtifactManager`, so the whole parent +
 * subagent tree shares one ID space and one directory.
 */
export class ArtifactManager {
	#nextId = 0;
	readonly #dir: string;
	readonly #store: ManagedSessionDescendantStore | undefined;
	#dirCreated = false;
	#initialized = false;
	#initializing: Promise<void> | undefined;

	/**
	 * @param dir Directory that will hold artifact files. Created lazily on first save.
	 */
	constructor(target: string | ManagedSessionDescendantStore) {
		this.#store = typeof target === "string" ? undefined : target;
		this.#dir = typeof target === "string" ? target : target.dir;
	}

	/**
	 * Artifact directory path.
	 * Directory may not exist until first artifact is saved.
	 */
	get dir(): string {
		return this.#dir;
	}

	getManagedRootAuthority() {
		return this.#store?.rootAuthority;
	}

	getManagedSubtreeRootAuthority() {
		return this.#store?.subtreeRootAuthority;
	}

	getManagedStore(): ManagedSessionDescendantStore | undefined {
		return this.#store;
	}

	assertManagedBinding(): void {
		this.#store?.assertBound();
	}

	async #ensureDir(): Promise<void> {
		if (this.#initialized) return;
		if (!this.#initializing) {
			this.#initializing = (async () => {
				if (!this.#dirCreated) {
					if (this.#store) this.#store.ensureDirectory();
					else ensureManagedDirectory(this.#dir);
					this.#dirCreated = true;
				}
				await this.#scanExistingIds();
				this.#initialized = true;
			})().finally(() => {
				this.#initializing = undefined;
			});
		}
		await this.#initializing;
	}

	#filename(id: string, toolType: string): string {
		if (!/^[a-zA-Z0-9_-]+$/.test(toolType)) throw new Error("Unsafe artifact tool type");
		return `${id}.${toolType}.log`;
	}

	async #publish(content: string, filename: string): Promise<void> {
		if (this.#store) await this.#store.publishNoReplace(filename, Buffer.from(content, "utf8"));
		else await publishManagedFileNoReplace(path.join(this.#dir, filename), Buffer.from(content, "utf8"));
	}

	async replaceNamed(filename: string, content: string): Promise<void> {
		if (!/^[a-zA-Z0-9_.-]+$/.test(filename)) throw new Error("Unsafe named artifact");
		await this.#ensureDir();
		if (this.#store) await this.#store.replace(filename, Buffer.from(content, "utf8"));
		else await Bun.write(path.join(this.#dir, filename), content);
	}

	async replaceNamedBytes(filename: string, bytes: Uint8Array): Promise<void> {
		if (!/^[a-zA-Z0-9_.-]+$/.test(filename)) throw new Error("Unsafe named artifact");
		await this.#ensureDir();
		if (this.#store) await this.#store.replace(filename, bytes);
		else await Bun.write(path.join(this.#dir, filename), bytes);
	}

	async publishManagedOutputGeneration(
		selectorFilename: string,
		outputFilenamePrefix: string,
		outputBytes: Uint8Array,
		metadataBytes: Uint8Array,
	): Promise<void> {
		if (!isSafeFilename(selectorFilename) || !isSafeFilename(outputFilenamePrefix)) {
			throw new Error("Unsafe managed output generation");
		}
		await this.#ensureDir();
		if (!this.#store) throw new Error("Managed output generation requires retained authority");
		const mutationFence = await this.#store.acquireMutationFence(`${selectorFilename}.publish`);
		try {
			const priorSelector = this.#store.readExpected(selectorFilename);
			const priorGeneration = priorSelector
				? parseManagedOutputGeneration(priorSelector.bytes, outputFilenamePrefix)
				: null;
			const generationId = randomUUID();
			const outputFilename = `${outputFilenamePrefix}.${generationId}.output`;
			const metadataFilename = `${outputFilename}.meta.json`;
			const generation: ManagedOutputGeneration = {
				outputFilename,
				metadataFilename,
				outputSizeBytes: outputBytes.byteLength,
				outputSha256: sha256(outputBytes),
				metadataSizeBytes: metadataBytes.byteLength,
				metadataSha256: sha256(metadataBytes),
			};

			// Immutable generations are not visible until the selector is replaced.
			let stagedOutput: ManagedFileSnapshot | undefined;
			let stagedMetadata: ManagedFileSnapshot | undefined;
			const removeStaged = () => {
				for (const [filename, snapshot] of [
					[metadataFilename, stagedMetadata],
					[outputFilename, stagedOutput],
				] as const) {
					if (!snapshot) continue;
					try {
						this.#store!.removeExpected(filename, snapshot);
					} catch {
						// An identity mismatch is not authority to remove a successor.
					}
				}
			};
			try {
				await this.#store.publishNoReplace(outputFilename, outputBytes);
				stagedOutput = this.#store.readExpected(outputFilename) ?? undefined;
				if (
					!stagedOutput ||
					stagedOutput.bytes.byteLength !== generation.outputSizeBytes ||
					sha256(stagedOutput.bytes) !== generation.outputSha256
				) {
					throw new Error("managed_output_generation_verification_failed");
				}
				await this.#store.publishNoReplace(metadataFilename, metadataBytes);
				stagedMetadata = this.#store.readExpected(metadataFilename) ?? undefined;
				if (
					!stagedMetadata ||
					stagedMetadata.bytes.byteLength !== generation.metadataSizeBytes ||
					sha256(stagedMetadata.bytes) !== generation.metadataSha256
				) {
					throw new Error("managed_output_generation_verification_failed");
				}
			} catch (error) {
				removeStaged();
				throw error;
			}

			const rollbackSelector = (observed: ManagedFileSnapshot | null): boolean => {
				if (!observed || !referencesGeneration(observed.bytes, generation)) return false;
				try {
					if (priorSelector) {
						this.#store!.replaceExpected(selectorFilename, priorSelector.bytes, observed);
					} else {
						this.#store!.removeExpected(selectorFilename, observed);
					}
					return true;
				} catch {
					return false;
				}
			};
			const selectorBytes = Buffer.from(JSON.stringify(generation), "utf8");
			try {
				if (priorSelector) this.#store.replaceExpected(selectorFilename, selectorBytes, priorSelector);
				else await this.#store.publishNoReplace(selectorFilename, selectorBytes);
			} catch (error) {
				let observed: ManagedFileSnapshot | null = null;
				let observedRead = false;
				try {
					observed = this.#store.readExpected(selectorFilename);
					observedRead = true;
				} catch {
					// Without an exact selector snapshot, staged files remain quarantined.
				}
				if (observedRead && (!observed || !referencesGeneration(observed.bytes, generation))) removeStaged();
				else if (rollbackSelector(observed)) removeStaged();
				throw error;
			}
			const publishedSelector = this.#store.readExpected(selectorFilename);
			const publishedGeneration = publishedSelector
				? parseManagedOutputGeneration(publishedSelector.bytes, outputFilenamePrefix)
				: null;
			if (!publishedGeneration || !sameGeneration(publishedGeneration, generation)) {
				if (rollbackSelector(publishedSelector)) removeStaged();
				throw new Error("managed_output_selector_verification_failed");
			}

			// Cleanup cannot affect the selected generation or publication outcome.
			if (priorGeneration && !sameGeneration(priorGeneration, generation)) {
				for (const filename of [priorGeneration.outputFilename, priorGeneration.metadataFilename]) {
					try {
						const previous = this.#store.readExpected(filename);
						if (previous) this.#store.removeExpected(filename, previous);
					} catch {
						// Retain unreachable generations for a later safe cleanup.
					}
				}
			}
		} finally {
			await mutationFence?.release();
		}
	}
	async publishNamedNoReplace(filename: string, bytes: Uint8Array): Promise<void> {
		if (!/^[a-zA-Z0-9_.-]+$/.test(filename)) throw new Error("Unsafe named artifact");
		await this.#ensureDir();
		if (this.#store) await this.#store.publishNoReplace(filename, bytes);
		else await publishManagedFileNoReplace(path.join(this.#dir, filename), bytes);
	}

	/**
	 * Best-effort removal of a previously published named artifact. Used to roll
	 * back staged publications when a transactional operation (e.g. gated
	 * maintenance pruning) is rejected after publication succeeded. Returns false
	 * when the artifact could not be removed so callers can log the failure
	 * instead of silently treating the rollback as complete.
	 */
	async removeNamedBestEffort(filename: string): Promise<boolean> {
		if (!/^[a-zA-Z0-9_.-]+$/.test(filename)) return false;
		try {
			if (this.#store) {
				const staged = this.#store.readExpected(filename);
				if (staged) this.#store.removeExpected(filename, staged);
			} else {
				await fs.unlink(path.join(this.#dir, filename));
			}
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Scan existing artifact files to find the next available ID.
	 * This ensures we don't overwrite artifacts when resuming a session.
	 */
	async #scanExistingIds(): Promise<void> {
		const files = await this.listFiles();
		let maxId = -1;
		for (const file of files) {
			// Files are named: {id}.{toolType}.log
			const match = file.match(/^(\d+)\..*\.log$/);
			if (match && isValidArtifactId(match[1])) {
				const id = Number(match[1]);
				if (id > maxId) maxId = id;
			}
		}
		this.#nextId = maxId + 1;
	}

	/**
	 * Atomically allocate next artifact ID.
	 * IDs are sequential within the session.
	 */
	allocateId(): number {
		if (!Number.isSafeInteger(this.#nextId) || this.#nextId < 0) {
			throw new Error("Artifact id space exhausted");
		}
		return this.#nextId++;
	}

	/**
	 * Reserve an artifact ID without exposing a writable managed pathname.
	 *
	 * Streaming callers that only understand bare paths fail closed; use `save`
	 * for terminally published artifact content.
	 */
	async allocatePath(toolType: string): Promise<{ id: string; path?: string }> {
		await this.#ensureDir();
		const id = String(this.allocateId());
		if (this.#store) return { id };
		return { id, path: path.join(this.#dir, this.#filename(id, toolType)) };
	}

	/** Save content and return the artifact ID plus exact storage completeness evidence. */
	async saveWithReceipt(
		content: string,
		toolType: string,
		options: ArtifactSaveOptions = {},
	): Promise<ArtifactSaveReceipt> {
		await this.#ensureDir();
		const id = String(this.allocateId());
		const maxBytes = Math.max(0, options.maxBytes ?? DEFAULT_ARTIFACT_MAX_BYTES);
		const contentBytes = Buffer.byteLength(content, "utf-8");
		const truncated = contentBytes > maxBytes ? truncateHeadBytes(content, maxBytes) : undefined;
		const omittedBytes = truncated ? contentBytes - truncated.bytes : undefined;
		const published = truncated
			? `${truncated.text}\n[artifact truncated after ${truncated.bytes} bytes; omitted at least ${omittedBytes} bytes]\n`
			: content;
		await this.#publish(published, this.#filename(id, toolType));
		return { id, complete: omittedBytes === undefined, omittedBytes };
	}

	/** Save content as an artifact and return the artifact ID. */
	async save(content: string, toolType: string, options: ArtifactSaveOptions = {}): Promise<string> {
		return (await this.saveWithReceipt(content, toolType, options)).id;
	}

	/**
	 * Check if an artifact exists.
	 * @param id Artifact ID (numeric string)
	 */
	async exists(id: string): Promise<boolean> {
		const files = await this.listFiles();
		return files.some(f => f.startsWith(`${id}.`));
	}

	/**
	 * List all artifact files in the directory.
	 * Returns empty array if directory doesn't exist.
	 */
	async listFiles(): Promise<string[]> {
		try {
			return await fs.readdir(this.#dir);
		} catch {
			return [];
		}
	}

	/**
	 * Get the full path to an artifact file.
	 * Returns null if artifact doesn't exist.
	 *
	 * @param id Artifact ID (numeric string)
	 */
	async getPath(id: string): Promise<string | null> {
		if (!isValidArtifactId(id)) return null;
		const files = await this.listFiles();
		const matches = files.filter(filename => new RegExp(`^${id}\\.[a-zA-Z0-9_-]+\\.log$`, "u").test(filename));
		if (matches.length !== 1) return null;
		const filename = matches[0]!;
		if (this.#store) {
			try {
				return this.#store.readExpected(filename) ? path.join(this.#dir, filename) : null;
			} catch {
				return null;
			}
		}
		try {
			const rootBefore = await fs.lstat(this.#dir, { bigint: true });
			if (!rootBefore.isDirectory() || rootBefore.isSymbolicLink()) return null;
			const artifactPath = path.join(this.#dir, filename);
			const leaf = await fs.lstat(artifactPath, { bigint: true });
			if (!leaf.isFile() || leaf.isSymbolicLink() || leaf.nlink !== 1n) return null;
			const rootAfter = await fs.lstat(this.#dir, { bigint: true });
			if (
				!rootAfter.isDirectory() ||
				rootAfter.isSymbolicLink() ||
				rootAfter.dev !== rootBefore.dev ||
				rootAfter.ino !== rootBefore.ino
			) {
				return null;
			}
			return artifactPath;
		} catch {
			return null;
		}
	}
}
