/** Artifact protocol IDs are decimal numbers allocated by the session artifact store. */
export function isValidArtifactId(value: unknown): value is string {
	if (typeof value !== "string" || !/^(?:0|[1-9]\d*)$/u.test(value)) return false;
	const numeric = Number(value);
	return Number.isSafeInteger(numeric) && numeric >= 0;
}
