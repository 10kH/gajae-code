export const SDK_STATE_VERSION = 1;

// The session-index snapshot carries its own format version, independent of the shared
// SDK_STATE_VERSION used by discovery, the lifecycle ledger, and per-event records.
// Version 4 requires SessionLocatorV2 (`cwd`, `worktreeRoot`, `stateRoot`) on every
// retained row. Older snapshots are intentionally unreadable: legacy `repo` rows are
// ambiguous and must re-register rather than being translated at read time.
export const SESSION_INDEX_SNAPSHOT_VERSION = 4;

export class UnsupportedStateVersionError extends Error {
	readonly code = "unsupported_state_version";

	constructor(
		readonly file: string,
		readonly version: number,
		readonly maximumSupportedVersion = SDK_STATE_VERSION,
	) {
		super(
			`Unsupported SDK state version ${version} in ${file}; maximum supported version is ${maximumSupportedVersion}.`,
		);
		this.name = "UnsupportedStateVersionError";
	}
}

export function assertSupportedStateVersion(file: string, value: unknown): void {
	if (!value || typeof value !== "object") return;
	const record = value as { version?: unknown; stateVersion?: unknown };
	for (const version of [record.version, record.stateVersion]) {
		if (typeof version === "number" && Number.isFinite(version) && version > SDK_STATE_VERSION) {
			throw new UnsupportedStateVersionError(file, version);
		}
	}
}

// Fences future session-index snapshot formats. Locator-v2 row validation below
// rejects legacy `repo` rows without translating them, while snapshots predating
// v4 remain readable solely to quarantine those rows with a re-register diagnostic.
export function assertSupportedSnapshotVersion(file: string, value: unknown): void {
	if (!value || typeof value !== "object") return;
	const record = value as { version?: unknown; stateVersion?: unknown };
	for (const version of [record.version, record.stateVersion]) {
		if (typeof version === "number" && Number.isFinite(version) && version > SESSION_INDEX_SNAPSHOT_VERSION) {
			throw new UnsupportedStateVersionError(file, version, SESSION_INDEX_SNAPSHOT_VERSION);
		}
	}
}
