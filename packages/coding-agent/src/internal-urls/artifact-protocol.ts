/**
 * Protocol handler for artifact:// URLs.
 *
 * Resolves artifact IDs only against artifacts directories explicitly authorized
 * by the caller's ResolveContext. Unlike agent://, artifacts are raw text.
 *
 * URL form:
 * - artifact://<id> - Full artifact content
 *
 * Pagination is handled by the read tool via offset/limit parameters.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { isEnoent } from "@gajae-code/utils";
import { isValidArtifactId } from "../utils/artifact-id";
import {
	type AuthorizedArtifactsRoot,
	authorizedArtifactsDirsFromContext,
	closeAuthorizedArtifactsRoot,
	openAuthorizedArtifactsRoot,
	readAuthorizedArtifactFile,
} from "./registry-helpers";
import type { InternalResource, InternalUrl, ProtocolHandler, ResolveContext } from "./types";

export class ArtifactProtocolHandler implements ProtocolHandler {
	readonly scheme = "artifact";
	readonly immutable = true;

	async resolve(url: InternalUrl, context?: ResolveContext): Promise<InternalResource> {
		const id = url.rawHost || url.hostname;
		if (!id) {
			throw new Error("artifact:// URL requires a numeric ID: artifact://0");
		}
		if (!isValidArtifactId(id)) {
			throw new Error(`artifact:// ID must be numeric, got: ${id}`);
		}

		const dirs = authorizedArtifactsDirsFromContext(context);

		if (dirs.length === 0) {
			throw new Error("No session - artifacts unavailable");
		}

		let foundPath: string | undefined;
		let foundBytes: Buffer | undefined;
		let foundSize = 0;
		let anyDirExists = false;
		const MAX_ARTIFACT_READ_BYTES = 16 * 1024 * 1024;

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
				const files = await fs.readdir(dir);
				for (const f of files) {
					if (f.endsWith(".meta.json") || !f.startsWith(`${id}.`)) continue;
					const captured = readAuthorizedArtifactFile(root, f, MAX_ARTIFACT_READ_BYTES);
					if (!captured) continue;
					if (foundPath) throw new Error(`artifact://${id} ambiguous id in authorized artifacts`);
					foundPath = path.join(dir, f);
					foundBytes = captured.bytes;
					foundSize = captured.size;
				}
			} finally {
				closeAuthorizedArtifactsRoot(root);
			}
		}

		if (!anyDirExists) {
			throw new Error("No artifacts directory found");
		}

		if (!foundPath || !foundBytes) {
			throw new Error(`artifact://${id} not found`);
		}

		const content =
			foundSize > foundBytes.byteLength
				? `${foundBytes.toString("utf8")}\n\n[Artifact truncated: first ${foundBytes.byteLength} of ${foundSize} bytes shown; use a narrower range or a specialized tool for the full content.]`
				: foundBytes.toString("utf8");
		return {
			url: url.href,
			content,
			contentType: "text/plain",
			size: Buffer.byteLength(content, "utf-8"),
			sourcePath: foundPath,
		};
	}
}
