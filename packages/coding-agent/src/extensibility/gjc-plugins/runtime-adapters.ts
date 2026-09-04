import { createHash, randomBytes } from "node:crypto";
import type { Dirent } from "node:fs";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { bindPluginMcpToPublicNetwork } from "../../runtime-mcp/plugin-network-boundary";
import type { MCPStdioSpawnLaunch } from "../../runtime-mcp/types";
import { loadCustomTools } from "../custom-tools/loader";
import type { CustomTool } from "../custom-tools/types";
import { compileGjcPluginBundle } from "./compiler";
import { bundleIdentity } from "./lifecycle-reconciliation";
import {
	assertDnsResolvesPublic,
	assertMcpInstallPolicy,
	assertUrlAllowed,
	classifyStdioInvocation,
} from "./mcp-policy";
import { canonicalJson, verifyImplementationHash } from "./metadata";
import { isV2Tool } from "./migration";
import { gjcPluginInstallRoot, resolveWithinRoot } from "./paths";
import { loadEffectiveGjcPluginRegistry, registryPathForScope, registryRootForScope } from "./registry";
import { type SessionQuarantine, type SessionValidationResult, validateSessionBundles } from "./session-validation";
import type { GjcPluginRegistryEntry, GjcPluginScope, JsonSchema202012, NormalizedToolSurfaceV2 } from "./types";

export interface AlwaysOnPluginTools {
	tools: CustomTool[];
	quarantine: SessionQuarantine[];
}

export interface GjcPluginToolDeclaration extends NormalizedToolSurfaceV2 {
	plugin: string;
	scope: GjcPluginScope;
}

function isWithin(root: string, target: string): boolean {
	const rel = path.relative(root, target);
	return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

async function resolveRuntimeFile(root: string, relativePath: string): Promise<string> {
	const lexical = resolveWithinRoot(root, relativePath);
	const [rootReal, fileReal] = await Promise.all([fs.realpath(root), fs.realpath(lexical)]);
	if (!isWithin(rootReal, fileReal))
		throw new Error(`GJC plugin implementation escapes its installed root: ${relativePath}`);
	return fileReal;
}
/**
 * Return v2 tool declarations without reading or importing implementation
 * modules. This is the schema-serving path used by discovery and diagnostics.
 */
export async function getGjcPluginToolDeclarations(cwd: string): Promise<GjcPluginToolDeclaration[]> {
	const entries = await loadEffectiveGjcPluginRegistry(cwd);
	const declarations: GjcPluginToolDeclaration[] = [];
	for (const entry of entries) {
		if (!entry.enabled || entry.migration?.status === "failed") continue;
		for (const surface of entry.surfaces.tools) {
			if (isV2Tool(surface))
				declarations.push({ ...surface, plugin: entry.name, scope: entry.scope } as GjcPluginToolDeclaration);
		}
	}
	return declarations;
}

/** Serve the canonical schemas keyed by their stable tool surface id. */
export async function serveGjcPluginSchemas(cwd: string): Promise<Record<string, JsonSchema202012>> {
	const declarations = await getGjcPluginToolDeclarations(cwd);
	return Object.fromEntries(declarations.map(declaration => [declaration.extensionId, declaration.schema]));
}

interface FileSnapshot {
	path: string;
	mtimeMs: number;
	ctimeMs: number;
	size: number;
	ino: number;
}

interface ValidatedPluginRegistry {
	effective: GjcPluginRegistryEntry[];
	active: GjcPluginRegistryEntry[];
	quarantine: SessionQuarantine[];
	validation: SessionValidationResult;
	registryFiles: FileSnapshot[];
	pluginFiles: FileSnapshot[];
}

interface CachedValidatedPluginRegistry extends ValidatedPluginRegistry {
	registryKey: string;
	pluginKey: string;
}

const validatedRegistryCache = new Map<string, CachedValidatedPluginRegistry>();
const hashCache = new Map<string, string>();
// Bound the digest memo so long sessions with plugin churn cannot grow it
// unboundedly; entries are re-derivable from disk at the cost of one read.
const HASH_CACHE_MAX_ENTRIES = 512;
const registryScopes: GjcPluginScope[] = ["user", "project"];

async function snapshotExistingFile(filePath: string): Promise<FileSnapshot | null> {
	try {
		const stat = await fs.stat(filePath);
		return { path: filePath, mtimeMs: stat.mtimeMs, ctimeMs: stat.ctimeMs, size: stat.size, ino: stat.ino };
	} catch (error) {
		if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return null;
		throw error;
	}
}

function snapshotsKey(snapshots: readonly FileSnapshot[]): string {
	return snapshots.map(s => `${s.path}:${s.mtimeMs}:${s.ctimeMs}:${s.size}:${s.ino}`).join("|");
}

async function snapshotRegistryFiles(cwd: string): Promise<FileSnapshot[]> {
	const snapshots = await Promise.all(
		registryScopes.map(scope => snapshotExistingFile(registryPathForScope(scope, cwd))),
	);
	return snapshots.filter((s): s is FileSnapshot => s !== null);
}

async function snapshotPluginFiles(entries: readonly GjcPluginRegistryEntry[]): Promise<FileSnapshot[]> {
	const snapshots: FileSnapshot[] = [];
	for (const entry of entries) {
		if (!entry.enabled) continue;
		for (const file of entry.copiedFiles) {
			const abs = path.join(entry.pluginRoot, file.relativePath);
			const snapshot = await snapshotExistingFile(abs);
			if (!snapshot) {
				snapshots.push({ path: abs, mtimeMs: Number.NaN, ctimeMs: Number.NaN, size: Number.NaN, ino: Number.NaN });
			} else {
				snapshots.push(snapshot);
			}
		}
	}
	return snapshots;
}

function sha256(buf: Buffer): string {
	return createHash("sha256").update(buf).digest("hex");
}

function canonicalPersistedJson(value: unknown): string {
	const serialized = JSON.stringify(value);
	if (serialized === undefined) throw new Error("Cannot canonicalize an undefined persisted value");
	return canonicalJson(JSON.parse(serialized) as unknown);
}

const VERIFIED_STDIO_MODULE_WRAPPER = `
import { createHash } from "node:crypto";
import { constants, rmSync } from "node:fs";
import { mkdir, open, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [entrypointPath, registryPath, expectedEntryHash, pluginName, pluginRoot, expectedRootReal, cwdRelative, snapshotBaseReal, snapshotRoot, workspaceRootReal, ...serverArgs] = process.argv.slice(1);
if (!entrypointPath || !registryPath || !expectedEntryHash || !pluginName || !pluginRoot || !expectedRootReal || cwdRelative === undefined || !snapshotBaseReal || !snapshotRoot || !workspaceRootReal) {
	throw new Error("invalid verified plugin MCP launch metadata");
}
if (!/^[a-f0-9]{64}$/u.test(expectedEntryHash)) throw new Error("invalid plugin MCP registry authority hash");
const flags = constants.O_RDONLY | (typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0);

function sha256(bytes) {
	return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value) {
	if (value === null || typeof value !== "object") {
		const serialized = JSON.stringify(value);
		if (serialized === undefined) throw new Error("invalid plugin MCP registry value");
		return serialized;
	}
	if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
	return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonicalJson(value[key])).join(",") + "}";
}

function isWithin(root, target) {
	const rel = relative(root, target);
	return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function resolveInside(root, relativePath, label) {
	if (typeof relativePath !== "string" || relativePath.length === 0 || isAbsolute(relativePath)) {
		throw new Error(label + " is not a relative file path");
	}
	const target = resolve(root, relativePath);
	if (!isWithin(root, target) || target === root) throw new Error(label + " escapes its authenticated root");
	return target;
}

async function readStableFile(target, label) {
	const handle = await open(target, flags);
	try {
		const before = await handle.stat();
		if (!before.isFile()) throw new Error(label + " is not a regular file");
		const bytes = await handle.readFile();
		const after = await handle.stat();
		if (
			before.dev !== after.dev ||
			before.ino !== after.ino ||
			before.size !== after.size ||
			before.mtimeMs !== after.mtimeMs ||
			before.ctimeMs !== after.ctimeMs ||
			bytes.byteLength !== after.size
		) {
			throw new Error(label + " changed while reading");
		}
		return bytes;
	} finally {
		await handle.close();
	}
}

const actualRootReal = await realpath(pluginRoot);
if (actualRootReal !== expectedRootReal) throw new Error("verified plugin MCP root drifted before execution");
const expectedOriginalCwd = resolve(actualRootReal, cwdRelative);
if (!isWithin(actualRootReal, expectedOriginalCwd)) throw new Error("verified plugin MCP cwd escapes its root");
if (await realpath(process.cwd()) !== await realpath(expectedOriginalCwd)) {
	throw new Error("verified plugin MCP cwd drifted before execution");
}

const registryBytes = await readStableFile(registryPath, "plugin MCP registry");
const registry = JSON.parse(registryBytes.toString("utf8"));
const matches = Array.isArray(registry && registry.plugins)
	? registry.plugins.filter(entry => entry && entry.name === pluginName && entry.pluginRoot === pluginRoot)
	: [];
if (matches.length !== 1) throw new Error("verified plugin MCP registry identity is missing or ambiguous");
const registryEntry = matches[0];
if (sha256(Buffer.from(canonicalJson(registryEntry))) !== expectedEntryHash) {
	throw new Error("verified plugin MCP registry authority drifted before execution");
}
if (!Array.isArray(registryEntry.copiedFiles) || registryEntry.copiedFiles.length === 0) {
	throw new Error("verified plugin MCP copied-file authority is missing");
}

const entrypointReal = await realpath(entrypointPath);
if (!isWithin(actualRootReal, entrypointReal)) throw new Error("verified plugin MCP entrypoint escapes its root");
const entrypointRelative = relative(actualRootReal, entrypointReal);
if (dirname(snapshotRoot) !== snapshotBaseReal || await realpath(snapshotBaseReal) !== snapshotBaseReal) {
	throw new Error("verified plugin MCP snapshot base drifted before execution");
}
if (isWithin(actualRootReal, snapshotRoot) || isWithin(workspaceRootReal, snapshotRoot)) {
	throw new Error("verified plugin MCP snapshot overlaps an untrusted root");
}
await mkdir(snapshotRoot, { mode: 0o700 });
if (await realpath(snapshotRoot) !== snapshotRoot) throw new Error("verified plugin MCP snapshot root drifted");
let cleaned = false;
function cleanupSnapshot() {
	if (cleaned) return;
	cleaned = true;
	try {
		process.chdir(snapshotBaseReal);
	} catch {
		// The parent transport owns authoritative cleanup after confirmed exit.
	}
	try {
		rmSync(snapshotRoot, { recursive: true, force: true });
	} catch {
		// Best effort in-child; the parent transport retries after confirmed exit.
	}
}
process.once("exit", cleanupSnapshot);

try {
	let entrypointCaptured = false;
	for (const file of registryEntry.copiedFiles) {
		if (!file || typeof file.relativePath !== "string" || !/^[a-f0-9]{64}$/u.test(file.sha256)) {
			throw new Error("verified plugin MCP copied-file record is malformed");
		}
		const sourceLexical = resolveInside(pluginRoot, file.relativePath, "plugin MCP source file");
		const sourceReal = await realpath(sourceLexical);
		if (!isWithin(actualRootReal, sourceReal)) throw new Error("verified plugin MCP source file escapes its root");
		const bytes = await readStableFile(sourceReal, "plugin MCP source file");
		if (sha256(bytes) !== file.sha256) throw new Error("verified plugin MCP source file hash mismatch");
		const destination = resolveInside(snapshotRoot, file.relativePath, "plugin MCP snapshot file");
		await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
		await writeFile(destination, bytes, { flag: "wx", mode: 0o600 });
		if (sourceReal === entrypointReal) entrypointCaptured = true;
	}
	if (!entrypointCaptured) throw new Error("verified plugin MCP entrypoint is not in the copied-file authority");
	const snapshotCwd = cwdRelative === "" ? snapshotRoot : resolveInside(snapshotRoot, cwdRelative, "plugin MCP snapshot cwd");
	await mkdir(snapshotCwd, { recursive: true, mode: 0o700 });
	const snapshotEntrypoint = resolveInside(snapshotRoot, entrypointRelative, "plugin MCP snapshot entrypoint");
	process.chdir(snapshotCwd);
	process.argv = [process.execPath, snapshotEntrypoint, ...serverArgs];
	await import(pathToFileURL(snapshotEntrypoint).href);
} catch (error) {
	cleanupSnapshot();
	throw error;
}
`;

/**
 * Resolve host launchers through absolute PATH entries outside the workspace
 * and installed plugin. Relative entries such as `.` and absolute workspace
 * entries can otherwise select repository-controlled executables before the
 * authenticated plugin wrapper.
 */
async function resolveTrustedStdioLauncher(
	launcher: "node" | "bun",
	workspaceRoot: string,
	pluginRoot: string,
): Promise<string> {
	const lexicalRoots = [workspaceRoot, pluginRoot].map(root => path.resolve(root));
	const realRoots = await Promise.all(lexicalRoots.map(root => fs.realpath(root)));
	const untrustedRoots = [...new Set([...lexicalRoots, ...realRoots])];
	const pathEntries = (Bun.env.PATH ?? "")
		.split(path.delimiter)
		.map(entry => {
			const trimmed = entry.trim();
			return trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1, -1) : trimmed;
		})
		.filter(entry => entry.length > 0 && path.isAbsolute(entry));

	for (const pathEntry of pathEntries) {
		const candidate = Bun.which(launcher, { PATH: pathEntry });
		if (!candidate || !path.isAbsolute(candidate)) continue;
		try {
			const lexical = path.resolve(candidate);
			if (untrustedRoots.some(root => isWithin(root, lexical))) continue;
			const real = await fs.realpath(lexical);
			if (untrustedRoots.some(root => isWithin(root, real))) continue;
			if ((await fs.stat(real)).isFile()) return real;
		} catch {
			// A stale PATH entry is not launcher authority; try the next one.
		}
	}
	throw new Error(`Trusted stdio launcher is unavailable from absolute host PATH entries: ${launcher}`);
}

async function resolveTrustedSnapshotBase(
	workspaceRoot: string,
	pluginRoot: string,
): Promise<{
	baseReal: string;
	workspaceRootReal: string;
}> {
	const lexicalRoots = [workspaceRoot, pluginRoot].map(root => path.resolve(root));
	const realRoots = await Promise.all(lexicalRoots.map(root => fs.realpath(root)));
	const untrustedRoots = [...new Set([...lexicalRoots, ...realRoots])];
	const candidates = [
		os.tmpdir(),
		...(process.platform === "win32" ? [] : ["/tmp"]),
		path.join(os.homedir(), ".gjc", "plugin-mcp-tmp"),
	];
	for (const candidate of [...new Set(candidates.map(value => path.resolve(value)))]) {
		if (untrustedRoots.some(root => isWithin(root, candidate))) continue;
		try {
			await fs.mkdir(candidate, { recursive: true, mode: 0o700 });
			const real = await fs.realpath(candidate);
			if (untrustedRoots.some(root => isWithin(root, real))) continue;
			return { baseReal: real, workspaceRootReal: realRoots[0] };
		} catch {
			// An unavailable or unwritable base is not snapshot authority.
		}
	}
	throw new Error("Trusted plugin MCP snapshot base is unavailable outside untrusted roots");
}

function verifiedStdioArgs(input: {
	launcher: "node" | "bun";
	entrypointPath: string;
	registryPath: string;
	registryEntryHash: string;
	pluginName: string;
	pluginRoot: string;
	pluginRootReal: string;
	cwdRelative: string;
	snapshotBaseReal: string;
	snapshotRoot: string;
	workspaceRootReal: string;
	serverArgs: readonly string[];
}): string[] {
	return [
		...(input.launcher === "bun"
			? [`--config=${os.devNull}`, "--no-env-file", "--no-install"]
			: ["--input-type=module"]),
		"--eval",
		VERIFIED_STDIO_MODULE_WRAPPER,
		"--",
		input.entrypointPath,
		input.registryPath,
		input.registryEntryHash,
		input.pluginName,
		input.pluginRoot,
		input.pluginRootReal,
		input.cwdRelative,
		input.snapshotBaseReal,
		input.snapshotRoot,
		input.workspaceRootReal,
		...input.serverArgs,
	];
}

async function hashFile(snapshot: FileSnapshot): Promise<string> {
	const key = `${snapshot.path}:${snapshot.mtimeMs}:${snapshot.ctimeMs}:${snapshot.size}:${snapshot.ino}`;
	const cached = hashCache.get(key);
	if (cached) return cached;
	const digest = sha256(await fs.readFile(snapshot.path));
	if (hashCache.size >= HASH_CACHE_MAX_ENTRIES) {
		// FIFO eviction is sufficient: the memo only avoids re-reads within a
		// session; correctness never depends on a hit.
		const oldest = hashCache.keys().next().value;
		if (oldest !== undefined) hashCache.delete(oldest);
	}
	hashCache.set(key, digest);
	return digest;
}

async function verifyEntryHashesCached(entry: GjcPluginRegistryEntry): Promise<SessionQuarantine | null> {
	for (const file of entry.copiedFiles) {
		let abs: string;
		try {
			abs = resolveWithinRoot(entry.pluginRoot, file.relativePath);
		} catch (error) {
			return {
				identity: bundleIdentity(entry.scope, entry.name),
				plugin: entry.name,
				surfaceId: `plugin:${entry.name}`,
				code: "runtime_mismatch",
				message: error instanceof Error ? error.message : String(error),
			};
		}
		const snapshot = await snapshotExistingFile(abs);
		if (!snapshot) {
			return {
				identity: bundleIdentity(entry.scope, entry.name),
				plugin: entry.name,
				surfaceId: `plugin:${entry.name}`,
				code: "runtime_mismatch",
				message: `Installed file missing: ${file.relativePath}`,
			};
		}
		if ((await hashFile(snapshot)) !== file.sha256) {
			return {
				identity: bundleIdentity(entry.scope, entry.name),
				plugin: entry.name,
				surfaceId: `plugin:${entry.name}`,
				code: "runtime_mismatch",
				message: `Installed file hash drift: ${file.relativePath}`,
			};
		}
	}
	return null;
}

async function assertMcpPluginRootOwnedByScope(entry: GjcPluginRegistryEntry, cwd: string): Promise<void> {
	const scopeRoot = path.resolve(registryRootForScope(entry.scope, cwd));
	const pluginRoot = path.resolve(entry.pluginRoot);
	const expectedPluginRoot = path.resolve(gjcPluginInstallRoot(entry.scope, cwd, entry.name));
	if (pluginRoot !== expectedPluginRoot) {
		throw new Error(
			`Installed plugin root does not match its canonical ${entry.scope} identity: ${entry.pluginRoot}`,
		);
	}
	if (!isWithin(scopeRoot, pluginRoot)) {
		throw new Error(`Installed plugin root escapes its ${entry.scope} registry scope: ${entry.pluginRoot}`);
	}
	const [scopeRootReal, pluginRootReal, expectedPluginRootReal] = await Promise.all([
		fs.realpath(scopeRoot),
		fs.realpath(pluginRoot),
		fs.realpath(expectedPluginRoot),
	]);
	if (pluginRootReal !== expectedPluginRootReal) {
		throw new Error(
			`Installed plugin real root does not match its canonical ${entry.scope} identity: ${entry.pluginRoot}`,
		);
	}
	if (!isWithin(scopeRootReal, pluginRootReal)) {
		throw new Error(`Installed plugin root escapes its ${entry.scope} registry scope: ${entry.pluginRoot}`);
	}
}

async function assertInstalledTreeAuthenticated(entry: GjcPluginRegistryEntry): Promise<void> {
	const expected = new Set(entry.copiedFiles.map(file => path.normalize(file.relativePath)));
	const visit = async (directory: string): Promise<void> => {
		let children: Dirent[];
		try {
			children = await fs.readdir(directory, { withFileTypes: true });
		} catch (error) {
			throw new Error(
				`Installed plugin tree is unreadable: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
		for (const child of children.sort((a, b) => a.name.localeCompare(b.name))) {
			const absolutePath = path.join(directory, child.name);
			const relativePath = path.normalize(path.relative(entry.pluginRoot, absolutePath));
			if (child.isSymbolicLink()) throw new Error(`Installed plugin tree contains a symlink: ${relativePath}`);
			if (child.isDirectory()) {
				await visit(absolutePath);
				continue;
			}
			if (!child.isFile()) throw new Error(`Installed plugin tree contains an unsupported entry: ${relativePath}`);
			if (!expected.delete(relativePath)) {
				throw new Error(`Installed plugin tree contains an unauthenticated file: ${relativePath}`);
			}
		}
	};
	await visit(entry.pluginRoot);
	if (expected.size > 0) {
		throw new Error(`Installed plugin tree is missing authenticated files: ${[...expected].sort().join(", ")}`);
	}
}

async function loadValidatedPluginRegistry(cwd: string, forceRefresh = false): Promise<ValidatedPluginRegistry> {
	const registryFiles = await snapshotRegistryFiles(cwd);
	const registryKey = snapshotsKey(registryFiles);
	const cached = validatedRegistryCache.get(cwd);
	if (!forceRefresh && cached && cached.registryKey === registryKey) {
		const pluginFiles = await snapshotPluginFiles(cached.effective);
		const pluginKey = snapshotsKey(pluginFiles);
		if (cached.pluginKey === pluginKey) return cached;
	}

	const effective = await loadEffectiveGjcPluginRegistry(cwd, forceRefresh ? { migrate: false } : undefined);
	const currentRegistryFiles = await snapshotRegistryFiles(cwd);
	const preQuarantine: SessionQuarantine[] = [];
	for (const entry of effective) {
		if (!entry.enabled) continue;
		const drift = await verifyEntryHashesCached(entry);
		if (drift) preQuarantine.push(drift);
	}
	const validation = validateSessionBundles(effective, {}, preQuarantine);
	const pluginFiles = await snapshotPluginFiles(effective);
	const next: CachedValidatedPluginRegistry = {
		effective,
		active: validation.active,
		quarantine: validation.quarantine,
		validation,
		registryFiles: currentRegistryFiles,
		pluginFiles,
		registryKey: snapshotsKey(currentRegistryFiles),
		pluginKey: snapshotsKey(pluginFiles),
	};
	validatedRegistryCache.set(cwd, next);
	return next;
}

/**
 * Load the always-on plugin tool surfaces for the effective registry at `cwd`.
 *
 * Safety properties:
 * - Hash drift quarantines the plugin (runtime_mismatch) before any import.
 * - Session-start collisions vs reserved/built-in names quarantine fail-closed.
 * - Manifest-declared tool names are authoritative: a factory that returns a
 *   different/extra/missing name is rejected with runtime_mismatch and skipped.
 * - Reserved tool names are never overwritten.
 *
 * Returns an empty result when no plugins are installed, so callers that always
 * call this in `createAgentSession` incur no behavior change without plugins.
 */
export async function loadAlwaysOnPluginTools(input: {
	cwd: string;
	reservedToolNames: string[];
	declarations?: readonly GjcPluginToolDeclaration[];
	/** Test seam runs before the final per-import integrity guard. */
	beforeImport?: (resolvedPath: string) => Promise<void>;
}): Promise<AlwaysOnPluginTools> {
	const validated = await loadValidatedPluginRegistry(input.cwd);
	const { effective } = validated;
	if (effective.length === 0) return { tools: [], quarantine: [] };

	const reserved = new Set(input.reservedToolNames);
	const { active, quarantine } = validateSessionBundles(
		effective,
		{ toolNames: input.reservedToolNames },
		validated.quarantine,
	);

	// Map declared (path -> name) for every active always-on tool surface.
	const declaredMetadata = new Map(
		(input.declarations ?? []).map(surface => [`${surface.scope}:${surface.plugin}:${surface.extensionId}`, surface]),
	);
	const declared = new Map<
		string,
		{
			name: string;
			plugin: string;
			scope: GjcPluginScope;
			pluginRoot: string;
			relativePath: string;
			implementationHash?: string;
		}
	>();
	for (const entry of active) {
		const disabled = new Set(entry.disabledSurfaceIds);
		for (const t of entry.surfaces.tools) {
			if (disabled.has(t.extensionId)) continue;
			let implementationPath: string;
			try {
				implementationPath = await resolveRuntimeFile(entry.pluginRoot, t.relativePath);
			} catch (error) {
				quarantine.push({
					identity: bundleIdentity(entry.scope, entry.name),
					plugin: entry.name,
					surfaceId: t.extensionId,
					code: "runtime_mismatch",
					message: error instanceof Error ? error.message : String(error),
				});
				continue;
			}
			const metadata = declaredMetadata.get(`${entry.scope}:${entry.name}:${t.extensionId}`);
			declared.set(implementationPath, {
				name: t.name,
				plugin: entry.name,
				scope: entry.scope,
				pluginRoot: entry.pluginRoot,
				relativePath: t.relativePath,
				implementationHash:
					metadata?.implementationHash ??
					("implementationHash" in t && typeof t.implementationHash === "string"
						? t.implementationHash
						: undefined),
			});
		}
	}
	if (declared.size === 0) return { tools: [], quarantine };

	// Declaration and activation are separate: all metadata is read first, then
	// each implementation is hash-checked immediately before the single import.
	for (const [declaredPath, info] of [...declared]) {
		if (!info.implementationHash) continue;
		try {
			await verifyImplementationHash(declaredPath, info.implementationHash);
		} catch (error) {
			quarantine.push({
				identity: bundleIdentity(info.scope, info.plugin),
				plugin: info.plugin,
				surfaceId: `tool:${info.name}`,
				code:
					error instanceof Error && "code" in error && (error as { code?: unknown }).code === "hash_mismatch"
						? "runtime_mismatch"
						: "runtime_mismatch",
				message: error instanceof Error ? error.message : String(error),
			});
			declared.delete(declaredPath);
		}
	}
	if (declared.size === 0) return { tools: [], quarantine };
	const loaded = await loadCustomTools(
		[...declared.keys()].map(p => ({ path: p })),
		input.cwd,
		input.reservedToolNames,
		undefined,
		async resolvedPath => {
			await input.beforeImport?.(resolvedPath);
			const info = declared.get(path.resolve(resolvedPath));
			if (!info?.implementationHash) throw new Error(`Unregistered or unhashed GJC tool import: ${resolvedPath}`);
			const finalPath = await resolveRuntimeFile(info.pluginRoot, info.relativePath);
			if (path.resolve(finalPath) !== path.resolve(resolvedPath))
				throw new Error(`GJC tool path drifted before import: ${info.relativePath}`);
			await verifyImplementationHash(finalPath, info.implementationHash);
		},
	);

	// Group loaded tools by their source path for exact-name verification.
	const byPath = new Map<string, string[]>();
	for (const lt of loaded.tools) {
		const key = path.resolve(lt.path);
		const list = byPath.get(key) ?? [];
		list.push(lt.tool.name);
		byPath.set(key, list);
	}

	const tools: CustomTool[] = [];
	const seenNames = new Set<string>(reserved);
	for (const [declaredPath, info] of declared) {
		const returned = byPath.get(path.resolve(declaredPath)) ?? [];
		// Manifest is authoritative: exactly the one declared name must come back.
		if (returned.length !== 1 || returned[0] !== info.name) {
			quarantine.push({
				identity: bundleIdentity(info.scope, info.plugin),
				plugin: info.plugin,
				surfaceId: `tool:${info.name}`,
				code: "runtime_mismatch",
				message: `Tool factory returned ${JSON.stringify(returned)}, expected exactly ["${info.name}"]`,
			});
			continue;
		}
		if (seenNames.has(info.name)) {
			// Defense in depth: never overwrite a reserved/earlier name.
			quarantine.push({
				identity: bundleIdentity(info.scope, info.plugin),
				plugin: info.plugin,
				surfaceId: `tool:${info.name}`,
				code: "session_collision",
				message: `Tool name "${info.name}" already present; refusing to overwrite`,
			});
			continue;
		}
		const match = loaded.tools.find(lt => path.resolve(lt.path) === path.resolve(declaredPath));
		if (match) {
			tools.push(match.tool);
			seenNames.add(info.name);
		}
	}
	return { tools, quarantine };
}

/**
 * Render the always-on system-appendix blocks for the effective registry at
 * `cwd`, applying hash-drift + collision quarantine first. Returns "" when no
 * plugins are installed/enabled. Safe to call unconditionally at session start.
 */
export async function renderAlwaysOnSystemAppendices(input: { cwd: string }): Promise<string> {
	const { effective, active } = await loadValidatedPluginRegistry(input.cwd);
	if (effective.length === 0) return "";
	const { renderPluginAppendices } = await import("./prompt-appendix");
	return (await renderPluginAppendices(active)).system;
}

/**
 * Render the agent-appendix block and Tier-1 sub-skill advertisement for a role
 * agent at session/spawn time. Hash-drift + collision quarantine applied first.
 * Returns empty strings when nothing applies.
 */
export async function renderAgentPromptAdditions(input: {
	cwd: string;
	agentName: string;
}): Promise<{ appendix: string; advertisement: string }> {
	const { effective, active } = await loadValidatedPluginRegistry(input.cwd);
	if (effective.length === 0) return { appendix: "", advertisement: "" };
	const { renderPluginAppendices } = await import("./prompt-appendix");
	const { buildAgentSubskillAdvertisement } = await import("./injection");
	const rendered = await renderPluginAppendices(active);
	return {
		appendix: rendered.byAgent.get(input.agentName as never) ?? "",
		advertisement: buildAgentSubskillAdvertisement(active, input.agentName),
	};
}

/**
 * Render the Tier-1 sub-skill advertisement for a workflow parent skill.
 * Returns "" when nothing applies. Quarantine applied first.
 */
export async function renderSkillAdvertisement(input: {
	cwd: string;
	skillName: string;
	phase?: string;
}): Promise<string> {
	const { effective, active } = await loadValidatedPluginRegistry(input.cwd);
	if (effective.length === 0) return "";
	const { buildSubskillAdvertisement } = await import("./injection");
	return buildSubskillAdvertisement(active, input.skillName, input.phase);
}

/**
 * Convert active plugin-bundle MCP surfaces into runtime MCPServerConfig entries,
 * applying install + runtime MCP policy (URL scheme/private-range deny, DNS
 * re-resolution for http/sse, stdio root-confinement) before connection. Servers
 * failing policy are quarantined and excluded. Returns {} when none.
 */
export async function buildPluginMcpConfigs(input: { cwd: string }): Promise<{
	configs: Record<string, any>;
	quarantine: SessionQuarantine[];
}> {
	const { effective, active, quarantine } = await loadValidatedPluginRegistry(input.cwd, true);
	if (effective.length === 0) return { configs: {}, quarantine: [] };

	// A manifest-controlled MCP name such as "constructor" or "toString" must
	// remain an ordinary own key rather than interacting with Object.prototype.
	const configs: Record<string, any> = Object.create(null) as Record<string, any>;
	for (const entry of active) {
		const disabled = new Set(entry.disabledSurfaceIds);
		let compiledMcps: Map<string, (typeof entry.surfaces.mcps)[number]> | undefined;
		let compileError: unknown;
		try {
			await assertMcpPluginRootOwnedByScope(entry, input.cwd);
			await assertInstalledTreeAuthenticated(entry);
			const compiled = await compileGjcPluginBundle(entry.pluginRoot);
			if (
				compiled.name !== entry.name ||
				compiled.version !== entry.version ||
				compiled.manifestHash !== entry.manifestHash ||
				canonicalPersistedJson(compiled.files) !== canonicalPersistedJson(entry.copiedFiles)
			) {
				throw new Error(`Installed plugin bundle identity does not match registry entry: ${entry.name}`);
			}
			compiledMcps = new Map(compiled.surfaces.mcps.map(surface => [surface.extensionId, surface]));
		} catch (error) {
			compileError = error;
		}
		for (const m of entry.surfaces.mcps) {
			if (disabled.has(m.extensionId)) continue;
			const cfg = m.config;
			try {
				if (compileError) throw compileError;
				const compiled = compiledMcps?.get(m.extensionId);
				if (
					!compiled ||
					compiled.name !== m.name ||
					compiled.extensionId !== m.extensionId ||
					m.configHash !== compiled.configHash ||
					canonicalPersistedJson(cfg) !== canonicalPersistedJson(compiled.config)
				) {
					throw new Error(`MCP "${m.name}": persisted config no longer matches its compiled manifest`);
				}
				assertMcpInstallPolicy(cfg, { pluginRoot: entry.pluginRoot });
				if (cfg.transport === "stdio") {
					const invocation = classifyStdioInvocation(cfg, { pluginRoot: entry.pluginRoot });
					for (const relativePath of invocation.ownedRelativePaths) {
						const ownedFile = entry.copiedFiles.find(
							file => path.normalize(file.relativePath) === path.normalize(relativePath),
						);
						if (!ownedFile) {
							throw new Error(
								`MCP "${m.name}": selected file is not in the authenticated copied-file set: ${relativePath}`,
							);
						}
					}
					const ownedFile = entry.copiedFiles.find(
						file => path.normalize(file.relativePath) === path.normalize(invocation.ownedRelativePath),
					);
					if (!ownedFile) throw new Error(`MCP "${m.name}": authenticated entrypoint record is missing`);
					const ownedExecutablePath = await resolveRuntimeFile(entry.pluginRoot, ownedFile.relativePath);
					const command = await resolveTrustedStdioLauncher(invocation.launcher, input.cwd, entry.pluginRoot);
					const registryPath = registryPathForScope(entry.scope, input.cwd);
					const registryEntryHash = sha256(Buffer.from(canonicalPersistedJson(entry)));
					const pluginRootReal = await fs.realpath(entry.pluginRoot);
					const cwdRelative = path.relative(entry.pluginRoot, invocation.cwd);
					const { baseReal: snapshotBaseReal, workspaceRootReal } = await resolveTrustedSnapshotBase(
						input.cwd,
						entry.pluginRoot,
					);
					const snapshotRoot = path.join(snapshotBaseReal, `gjc-plugin-mcp-${randomBytes(16).toString("hex")}`);
					const args = verifiedStdioArgs({
						launcher: invocation.launcher,
						entrypointPath: ownedExecutablePath,
						registryPath,
						registryEntryHash,
						pluginName: entry.name,
						pluginRoot: entry.pluginRoot,
						pluginRootReal,
						cwdRelative,
						snapshotBaseReal,
						snapshotRoot,
						workspaceRootReal,
						serverArgs: (cfg.args ?? []).slice(1),
					});
					configs[m.name] = {
						type: "stdio",
						command,
						args,
						cwd: invocation.cwd,
						timeout: 5_000,
						// Third-party plugin MCP processes must not inherit host secrets;
						// only a minimal OS allowlist (PATH/HOME/temp/locale) is provided.
						// Bun additionally receives an immutable empty config plus flags
						// that disable ambient dotenv and package auto-install behavior.
						noInheritEnv: true,
						afterProcessExit: async () => {
							await fs.rm(snapshotRoot, { recursive: true, force: true });
						},
						spawnGuard: async (launch: MCPStdioSpawnLaunch) => {
							await assertMcpPluginRootOwnedByScope(entry, input.cwd);
							await assertInstalledTreeAuthenticated(entry);
							const freshBundle = await compileGjcPluginBundle(entry.pluginRoot);
							if (
								freshBundle.name !== entry.name ||
								freshBundle.version !== entry.version ||
								freshBundle.manifestHash !== entry.manifestHash ||
								canonicalPersistedJson(freshBundle.files) !== canonicalPersistedJson(entry.copiedFiles)
							) {
								throw new Error(`MCP "${m.name}": installed bundle identity/files drifted before spawn`);
							}
							const freshSurface = freshBundle.surfaces.mcps.find(
								surface => surface.extensionId === m.extensionId,
							);
							if (
								!freshSurface ||
								freshSurface.name !== m.name ||
								freshSurface.extensionId !== m.extensionId ||
								freshSurface.configHash !== m.configHash ||
								canonicalPersistedJson(freshSurface.config) !== canonicalPersistedJson(cfg)
							) {
								throw new Error(`MCP "${m.name}": installed manifest/config drifted before spawn`);
							}
							const freshInvocation = classifyStdioInvocation(freshSurface.config, {
								pluginRoot: entry.pluginRoot,
							});
							for (const relativePath of freshInvocation.ownedRelativePaths) {
								const freshOwnedFile = entry.copiedFiles.find(
									file => path.normalize(file.relativePath) === path.normalize(relativePath),
								);
								if (!freshOwnedFile) {
									throw new Error(
										`MCP "${m.name}": unauthenticated installed file selected before spawn: ${relativePath}`,
									);
								}
								const freshPath = await resolveRuntimeFile(entry.pluginRoot, freshOwnedFile.relativePath);
								await verifyImplementationHash(freshPath, freshOwnedFile.sha256);
							}
							const freshExecutablePath = await resolveRuntimeFile(
								entry.pluginRoot,
								freshInvocation.ownedRelativePath,
							);
							const freshOwnedFile = entry.copiedFiles.find(
								file => path.normalize(file.relativePath) === path.normalize(freshInvocation.ownedRelativePath),
							);
							if (!freshOwnedFile)
								throw new Error(`MCP "${m.name}": authenticated entrypoint drifted before spawn`);
							const expectedCommand = await resolveTrustedStdioLauncher(
								freshInvocation.launcher,
								input.cwd,
								entry.pluginRoot,
							);
							const expectedArgs = verifiedStdioArgs({
								launcher: freshInvocation.launcher,
								entrypointPath: freshExecutablePath,
								registryPath,
								registryEntryHash,
								pluginName: entry.name,
								pluginRoot: entry.pluginRoot,
								pluginRootReal,
								cwdRelative: path.relative(entry.pluginRoot, freshInvocation.cwd),
								snapshotBaseReal,
								snapshotRoot,
								workspaceRootReal,
								serverArgs: (freshSurface.config.args ?? []).slice(1),
							});
							const [launchCwdReal, expectedCwdReal] = await Promise.all([
								fs.realpath(launch.cwd),
								fs.realpath(freshInvocation.cwd),
							]);
							if (
								launch.command !== expectedCommand ||
								launchCwdReal !== expectedCwdReal ||
								canonicalPersistedJson(launch.args) !== canonicalPersistedJson(expectedArgs)
							) {
								throw new Error(`MCP "${m.name}": launch plan drifted before spawn`);
							}
						},
					};
				} else {
					const url = assertUrlAllowed(cfg.url ?? "", `MCP "${m.name}" url`);
					await assertDnsResolvesPublic(url.hostname, `MCP "${m.name}" host`);
					// Headers are intentionally NOT forwarded: the generic MCP config
					// resolution path expands ${env:...}/shell templates, which would let
					// a third-party bundle exfiltrate host secrets. Plugin-bundle MCP
					// servers connect without bundle-declared headers.
					configs[m.name] = bindPluginMcpToPublicNetwork({ type: cfg.transport, url: url.toString() });
				}
			} catch (error) {
				quarantine.push({
					identity: bundleIdentity(entry.scope, entry.name),
					plugin: entry.name,
					surfaceId: m.extensionId,
					code: "security_policy",
					message: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}
	return { configs, quarantine };
}
