import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { CONFIG_DIR_NAME, pathIsWithin, relativePathEscapesRoot } from "@gajae-code/utils";

function normalizePathForComparison(candidate: string): string {
	const resolved = path.resolve(candidate);
	return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function pathIsLexicallyWithin(root: string, candidate: string): boolean {
	const relative = path.relative(normalizePathForComparison(root), normalizePathForComparison(candidate));
	return !relativePathEscapesRoot(relative);
}

function canonicalPath(candidate: string): string {
	try {
		return fs.realpathSync(candidate);
	} catch {
		return path.resolve(candidate);
	}
}

function canonicalParentPath(candidate: string): string {
	const resolved = path.resolve(candidate);
	return path.join(canonicalPath(path.dirname(resolved)), path.basename(resolved));
}

function isDirectory(candidate: string): boolean {
	try {
		return fs.statSync(candidate).isDirectory();
	} catch {
		return false;
	}
}

function pathMatchesStop(candidate: string, stopPaths: ReadonlySet<string>): boolean {
	return (
		stopPaths.has(normalizePathForComparison(candidate)) ||
		stopPaths.has(normalizePathForComparison(canonicalPath(candidate)))
	);
}

function findProjectTrustRoot(start: string, stopPaths: ReadonlySet<string>): string | undefined {
	const fallback = path.resolve(start);
	let nearestConfigRoot: string | undefined;
	let current = fallback;
	for (;;) {
		if (pathMatchesStop(current, stopPaths)) {
			return current === fallback ? undefined : (nearestConfigRoot ?? fallback);
		}
		if (fs.existsSync(path.join(current, ".git"))) return current;
		if (nearestConfigRoot === undefined && isDirectory(path.join(current, CONFIG_DIR_NAME))) {
			nearestConfigRoot = current;
		}
		const parent = path.dirname(current);
		if (parent === current) return nearestConfigRoot ?? fallback;
		current = parent;
	}
}

export function isProjectControlledPath(candidate: string, cwd: string): boolean {
	const home = os.homedir();
	const stopPaths = new Set([path.resolve(home), canonicalPath(home)].map(normalizePathForComparison));
	const lexicalTrustRoot = findProjectTrustRoot(cwd, stopPaths);
	// A user-owned executable under HOME (e.g. ~/.gjc/bin) is only exempt from a
	// trust root that itself lives under HOME. Each check judges home scope on the
	// same view of the path it inspects (lexical vs canonical); mixing them let a
	// project link into HOME, or a HOME link into the project, escape rejection.
	const candidateIsLexicallyHomeScoped = pathIsLexicallyWithin(home, candidate);
	if (
		lexicalTrustRoot !== undefined &&
		pathIsLexicallyWithin(lexicalTrustRoot, candidate) &&
		(!candidateIsLexicallyHomeScoped || pathIsLexicallyWithin(home, lexicalTrustRoot))
	)
		return true;

	const canonicalCandidate = canonicalPath(candidate);
	const canonicalCandidateParent = canonicalParentPath(candidate);
	const parentIsHomeScoped = pathIsLexicallyWithin(home, canonicalCandidateParent);
	const targetIsHomeScoped = pathIsWithin(home, canonicalCandidate);
	const canonicalTrustRoots = new Set<string>();
	if (lexicalTrustRoot !== undefined) canonicalTrustRoots.add(canonicalPath(lexicalTrustRoot));
	const canonicalTrustRoot = findProjectTrustRoot(canonicalPath(cwd), stopPaths);
	if (canonicalTrustRoot !== undefined) canonicalTrustRoots.add(canonicalPath(canonicalTrustRoot));
	for (const trustRoot of canonicalTrustRoots) {
		const trustRootIsHomeScoped = pathIsLexicallyWithin(home, trustRoot) || pathIsWithin(home, trustRoot);
		const parentOwned =
			pathIsLexicallyWithin(trustRoot, canonicalCandidateParent) && (!parentIsHomeScoped || trustRootIsHomeScoped);
		const targetOwned = pathIsWithin(trustRoot, canonicalCandidate) && (!targetIsHomeScoped || trustRootIsHomeScoped);
		if (parentOwned || targetOwned) return true;
	}
	return false;
}
