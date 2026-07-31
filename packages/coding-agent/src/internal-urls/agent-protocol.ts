/**
 * Protocol handler for agent:// URLs.
 *
 * Resolves agent output IDs only against artifacts directories explicitly
 * authorized by the caller's ResolveContext. Parents and subagents can share
 * outputs by passing their tree's artifacts dir at that API boundary.
 *
 * URL forms:
 * - agent://<id> - Full output content
 * - agent://<id>/<path> - JSON extraction via path form
 * - agent://<id>?q=<query> - JSON extraction via query form
 */
import { createHash } from "node:crypto";
import * as path from "node:path";
import { isEnoent } from "@gajae-code/utils";
import { applyQuery, pathToQuery } from "./json-query";
import {
	type AuthorizedArtifactsRoot,
	authorizedArtifactsDirsFromContext,
	closeAuthorizedArtifactsRoot,
	openAuthorizedArtifactsRoot,
	readAuthorizedArtifactFile,
} from "./registry-helpers";
import type { InternalResource, InternalUrl, ProtocolHandler, ResolveContext } from "./types";

interface AgentOutputMetadata {
	id: string;
	kind: "agent-output";
	sizeBytes: number;
	lineCount: number;
	sha256: string;
	createdAt: string;
}

interface ManagedOutputSelector {
	outputFilename: string;
	metadataFilename: string;
	outputSizeBytes: number;
	outputSha256: string;
	metadataSizeBytes: number;
	metadataSha256: string;
}

const MAX_AGENT_SELECTOR_BYTES = 64 * 1024;
const MAX_AGENT_METADATA_BYTES = 1024 * 1024;
const MAX_AGENT_OUTPUT_BYTES = 16 * 1024 * 1024;

function readRetainedAgentFile(
	outputId: string,
	root: AuthorizedArtifactsRoot,
	filename: string,
	maxBytes: number,
): Buffer | null {
	const captured = readAuthorizedArtifactFile(root, filename, maxBytes);
	if (!captured) return null;
	if (captured.size !== captured.bytes.byteLength) {
		throw new Error(`agent://${outputId} retained file exceeds read capacity`);
	}
	return captured.bytes;
}

function isSafeGenerationFilename(filename: unknown): filename is string {
	return typeof filename === "string" && /^[a-zA-Z0-9_.-]+$/.test(filename);
}

function isManagedOutputSelector(value: unknown, outputId: string): value is ManagedOutputSelector {
	if (!value || typeof value !== "object") return false;
	const selector = value as Record<string, unknown>;
	return (
		isSafeGenerationFilename(selector.outputFilename) &&
		isSafeGenerationFilename(selector.metadataFilename) &&
		selector.outputFilename.startsWith(`${outputId}.md.`) &&
		selector.outputFilename.endsWith(".output") &&
		selector.metadataFilename === `${selector.outputFilename}.meta.json` &&
		typeof selector.outputSizeBytes === "number" &&
		typeof selector.outputSha256 === "string" &&
		typeof selector.metadataSizeBytes === "number" &&
		typeof selector.metadataSha256 === "string"
	);
}

function readManagedOutputSelector(
	outputId: string,
	root: AuthorizedArtifactsRoot,
	selectorFilename: string,
): ManagedOutputSelector | null {
	const bytes = readRetainedAgentFile(outputId, root, selectorFilename, MAX_AGENT_SELECTOR_BYTES);
	if (!bytes) return null;
	const raw = bytes.toString("utf8");
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error(`agent://${outputId} malformed output selector`);
	}
	if (!isManagedOutputSelector(parsed, outputId)) throw new Error(`agent://${outputId} malformed output selector`);
	return parsed;
}
function sameManagedOutputSelector(left: ManagedOutputSelector, right: ManagedOutputSelector): boolean {
	return (
		left.outputFilename === right.outputFilename &&
		left.metadataFilename === right.metadataFilename &&
		left.outputSizeBytes === right.outputSizeBytes &&
		left.outputSha256 === right.outputSha256 &&
		left.metadataSizeBytes === right.metadataSizeBytes &&
		left.metadataSha256 === right.metadataSha256
	);
}

const MANAGED_SELECTOR_READ_ATTEMPTS = 8;

function isAgentOutputMetadata(value: unknown, outputId: string): value is AgentOutputMetadata {
	if (!value || typeof value !== "object") return false;
	const meta = value as Record<string, unknown>;
	return (
		meta.id === outputId &&
		meta.kind === "agent-output" &&
		typeof meta.sizeBytes === "number" &&
		typeof meta.lineCount === "number" &&
		typeof meta.sha256 === "string" &&
		typeof meta.createdAt === "string"
	);
}

async function verifyAgentOutputMetadata(
	outputId: string,
	metadataBytes: Buffer,
	bytes: Buffer,
	selector?: ManagedOutputSelector,
): Promise<void> {
	const metaRaw = metadataBytes.toString("utf8");
	let parsed: unknown;
	try {
		parsed = JSON.parse(metaRaw);
	} catch {
		throw new Error(`agent://${outputId} malformed metadata`);
	}
	if (!isAgentOutputMetadata(parsed, outputId)) {
		throw new Error(`agent://${outputId} malformed metadata`);
	}
	if (bytes.byteLength !== parsed.sizeBytes) {
		throw new Error(`agent://${outputId} size mismatch`);
	}
	const sha256 = createHash("sha256").update(bytes).digest("hex");
	if (sha256 !== parsed.sha256) {
		throw new Error(`agent://${outputId} hash mismatch`);
	}
	if (
		selector &&
		(selector.outputSizeBytes !== bytes.byteLength ||
			selector.outputSha256 !== sha256 ||
			selector.metadataSizeBytes !== metadataBytes.byteLength ||
			selector.metadataSha256 !== createHash("sha256").update(metadataBytes).digest("hex"))
	) {
		throw new Error(`agent://${outputId} selected generation mismatch`);
	}
}
/**
 * Handler for agent:// URLs.
 *
 * Resolves output IDs like "reviewer_0" to their artifact files,
 * with optional JSON extraction.
 */
export class AgentProtocolHandler implements ProtocolHandler {
	readonly scheme = "agent";
	readonly immutable = true;

	async resolve(url: InternalUrl, context?: ResolveContext): Promise<InternalResource> {
		const outputId = url.rawHost || url.hostname;
		if (!outputId) {
			throw new Error("agent:// URL requires an output ID: agent://<id>");
		}
		// Output IDs address a single file inside a session artifacts dir. Reject
		// path separators / traversal so a crafted id cannot escape the dir via
		// path.join(dir, `${outputId}.md`).
		if (outputId.includes("/") || outputId.includes("\\") || outputId.includes("..")) {
			throw new Error(`agent://${outputId} invalid id: path separators are not allowed`);
		}

		const urlPath = url.pathname;
		const queryParam = url.searchParams.get("q");
		const hasPathExtraction = urlPath && urlPath !== "/" && urlPath !== "";
		const hasQueryExtraction = queryParam !== null && queryParam !== "";

		if (hasPathExtraction && hasQueryExtraction) {
			throw new Error("agent:// URL cannot combine path extraction with ?q=");
		}

		const dirs = authorizedArtifactsDirsFromContext(context);

		if (dirs.length === 0) {
			throw new Error("No session - agent outputs unavailable");
		}

		let foundPath: string | undefined;
		let foundMetadataPath: string | undefined;
		let foundSelector: ManagedOutputSelector | undefined;
		let foundBytes: Buffer | undefined;
		let foundMetadataBytes: Buffer | undefined;
		let anyDirExists = false;

		for (const dir of dirs) {
			let root: AuthorizedArtifactsRoot;
			try {
				root = openAuthorizedArtifactsRoot(dir);
				anyDirExists = true;
			} catch (err) {
				if (isEnoent(err)) continue;
				throw err;
			}
			try {
				const selectorFilename = `${outputId}.md.selector.json`;
				let selector = readManagedOutputSelector(outputId, root, selectorFilename);
				for (let attempt = 0; attempt < MANAGED_SELECTOR_READ_ATTEMPTS; attempt++) {
					const candidateFilename = selector ? selector.outputFilename : `${outputId}.md`;
					const metadataFilename = selector ? selector.metadataFilename : `${candidateFilename}.meta.json`;
					const rawBuffer = readRetainedAgentFile(outputId, root, candidateFilename, MAX_AGENT_OUTPUT_BYTES);
					const metadataBuffer = readRetainedAgentFile(outputId, root, metadataFilename, MAX_AGENT_METADATA_BYTES);
					if (rawBuffer && metadataBuffer) {
						if (selector) {
							const refreshed = readManagedOutputSelector(outputId, root, selectorFilename);
							if (!refreshed || !sameManagedOutputSelector(selector, refreshed)) {
								if (attempt + 1 >= MANAGED_SELECTOR_READ_ATTEMPTS) {
									throw new Error(`agent://${outputId} generation changed during read`);
								}
								if (!refreshed) throw new Error(`agent://${outputId} generation changed during read`);
								selector = refreshed;
								continue;
							}
						}
						if (foundPath) throw new Error(`agent://${outputId} ambiguous id in authorized artifacts`);
						foundPath = path.join(dir, candidateFilename);
						foundMetadataPath = path.join(dir, metadataFilename);
						foundSelector = selector ?? undefined;
						foundBytes = rawBuffer;
						foundMetadataBytes = metadataBuffer;
						break;
					}
					if (!selector) {
						if (!rawBuffer) break;
						throw new Error(`agent://${outputId} missing metadata`);
					}
					if (attempt + 1 >= MANAGED_SELECTOR_READ_ATTEMPTS) {
						throw new Error(`agent://${outputId} generation changed during read`);
					}
					const refreshed = readManagedOutputSelector(outputId, root, selectorFilename);
					if (!refreshed) throw new Error(`agent://${outputId} generation changed during read`);
					if (sameManagedOutputSelector(selector, refreshed)) {
						if (!rawBuffer) throw new Error(`agent://${outputId} selected generation unavailable`);
						throw new Error(`agent://${outputId} missing metadata`);
					}
					selector = refreshed;
				}
			} finally {
				closeAuthorizedArtifactsRoot(root);
			}
		}

		if (!anyDirExists) {
			throw new Error("No artifacts directory found");
		}

		if (!foundPath || !foundMetadataPath || !foundBytes || !foundMetadataBytes) {
			throw new Error(`agent://${outputId} not found`);
		}

		const rawBytes = foundBytes;
		await verifyAgentOutputMetadata(outputId, foundMetadataBytes, rawBytes, foundSelector);
		const rawContent = rawBytes.toString("utf8");
		const notes: string[] = [];
		let content = rawContent;
		let contentType: InternalResource["contentType"] = "text/markdown";

		if (hasPathExtraction || hasQueryExtraction) {
			let jsonValue: unknown;
			try {
				jsonValue = JSON.parse(rawContent);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				throw new Error(`Output ${outputId} is not valid JSON: ${message}`);
			}

			const query = hasPathExtraction ? pathToQuery(urlPath) : queryParam!;
			if (query) {
				const extracted = applyQuery(jsonValue, query);
				try {
					content = JSON.stringify(extracted, null, 2) ?? "null";
				} catch {
					content = String(extracted);
				}
				notes.push(`Extracted: ${query}`);
			} else {
				content = JSON.stringify(jsonValue, null, 2);
			}
			contentType = "application/json";
		}

		return {
			url: url.href,
			content,
			contentType,
			size: Buffer.byteLength(content, "utf-8"),
			sourcePath: foundPath,
			notes,
		};
	}
}
