/** Return whether an error is one of SQLite's explicit database-corruption classes. */
export function isSqliteCorruptionError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const code = (error as { code?: unknown }).code;
	return code === "SQLITE_CORRUPT" || code === "SQLITE_NOTADB";
}
