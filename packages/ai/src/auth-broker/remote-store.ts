/**
 * Client-side {@link AuthCredentialStore} that mirrors a remote broker's
 * snapshot. Refresh tokens never leave the broker; mutating methods (`replace*`,
 * `upsert*`, `delete*ForProvider`) throw because login flows are server-side.
 *
 * Cache (`getCache`/`setCache`/`cleanExpiredCache`) is in-memory and ephemeral —
 * usage reports cache TTL is 5 minutes per credential, so durability across
 * runs isn't required.
 */

import { createHash } from "node:crypto";
import { scheduler } from "node:timers/promises";

import { logger } from "@gajae-code/utils";
import {
	type AuthCredential,
	type AuthCredentialIfAbsentResult,
	type AuthCredentialSnapshotEntry,
	type AuthCredentialStore,
	assertCanonicalMCPOAuthBinding,
	type CachedUsagePresentation,
	type CredentialInventoryRecord,
	type MCPOAuthRefreshClient,
	type OAuthCredential,
	REMOTE_REFRESH_SENTINEL,
	type SafeUsageReport,
	type StoredAuthCredential,
} from "../auth-storage";
import type { Provider } from "../types";
import type { UsageReport } from "../usage";
import type { OAuthCredentials } from "../utils/oauth/types";
import {
	type AuthBrokerClient,
	AuthBrokerCredentialMetadataUnsupportedError,
	AuthBrokerStreamUnsupportedError,
} from "./client";
import type {
	CredentialMetadataRecord,
	RefresherSchedule,
	SnapshotEntry,
	SnapshotResponse,
	SnapshotStreamEvent,
} from "./types";

export type CredentialInventoryMetadataCapability = "pending" | "supported" | "unsupported" | "mismatch" | "failed";

export interface CachedInventoryNotice {
	status: Exclude<CredentialInventoryMetadataCapability, "supported">;
	reason: string;
	generation?: number;
}

export interface CredentialInventoryMetadataState {
	capability: CredentialInventoryMetadataCapability;
	generation: number;
	records: readonly CredentialInventoryRecord[];
	notice?: CachedInventoryNotice;
}

/**
 * Client-side TTL for the aggregate `/v1/usage` response. Set below the
 * broker server's own 30s usage cache so we typically pick up the broker's
 * cached value instead of re-walking the network — but high enough to absorb
 * the parallel fan-out from `#rankOAuthSelections` into a single round-trip.
 */
const USAGE_CACHE_TTL_MS = 15_000;
const WAIT_THRESHOLD_MS = 1_000;
const MAX_WAIT_MS = 5_000;
const BACKGROUND_WAIT_MS = 30_000;
const BACKGROUND_BACKOFF_INITIAL_MS = 500;
const BACKGROUND_BACKOFF_MAX_MS = 30_000;
const PRESENTATION_FRESH_MS = 5 * 60_000;
const PRESENTATION_RETENTION_MS = 24 * 60 * 60_000;

function emptySnapshot(): SnapshotResponse {
	return {
		generation: 0,
		generatedAt: 0,
		serverNowMs: 0,
		refresher: {
			enabled: false,
			intervalMs: 0,
			skewMs: 0,
			nextSweepInMs: Number.MAX_SAFE_INTEGER,
		},
		credentials: [],
	};
}

interface CacheEntry {
	value: string;
	expiresAtSec: number;
}

interface UsageCacheEntry {
	reports: UsageReport[];
	fetchedAt: number;
}

export interface RemoteAuthCredentialStoreOptions {
	client: AuthBrokerClient;
	/**
	 * Initial snapshot. When omitted, callers must call
	 * {@link RemoteAuthCredentialStore.refreshSnapshot} before the first read.
	 */
	initialSnapshot?: SnapshotResponse;
	/**
	 * Subscribe to the broker's SSE snapshot stream when available. Falls back
	 * to long-poll permanently when the broker returns 404. Default `true`.
	 */
	streamSnapshots?: boolean;
}

export class RemoteAuthCredentialStore implements AuthCredentialStore {
	readonly #client: AuthBrokerClient;
	readonly #streamSnapshots: boolean;
	#snapshot: SnapshotResponse = emptySnapshot();
	#snapshotReceivedAt = Date.now();
	#generation = 0;
	#backgroundAbort = new AbortController();
	#cache: Map<string, CacheEntry> = new Map();
	#usageCache?: UsageCacheEntry;
	#usageInflight?: Promise<UsageReport[] | null>;
	#usageCacheEpoch = 0;
	#inventoryMetadata = new Map<number, CredentialMetadataRecord>();
	#inventoryMetadataGeneration = -1;
	#inventoryState: CredentialInventoryMetadataState = {
		capability: "pending",
		generation: 0,
		records: [],
		notice: { status: "pending", reason: "credential metadata sync pending", generation: 0 },
	};
	#inventorySyncInflight?: Promise<Readonly<CredentialInventoryMetadataState>>;
	#inventoryMetadataUnsupported = false;
	#usagePresentations = new Map<number, CachedUsagePresentation>();
	#closed = false;
	/**
	 * `true` once the SSE consumer received its first frame and hasn't dropped
	 * since. Writes consult this to suppress the otherwise-mandatory
	 * `refreshSnapshot()` follow-up — the stream will deliver the new
	 * generation without an extra GET.
	 */
	#streamingActive = false;
	/** Latched once the broker has answered 404 — never try the stream again. */
	#streamingUnsupported = false;

	constructor(opts: RemoteAuthCredentialStoreOptions) {
		this.#client = opts.client;
		this.#streamSnapshots = opts.streamSnapshots ?? true;
		this.#applySnapshot(opts.initialSnapshot ?? emptySnapshot(), opts.initialSnapshot?.generation ?? 0, false);
		this.#setInventoryState("pending", this.#generation, {
			status: "pending",
			reason: "credential metadata sync pending",
			generation: this.#generation,
		});
		void this.#runBackground();
	}

	get client(): AuthBrokerClient {
		return this.#client;
	}

	get snapshot(): SnapshotResponse {
		return this.#snapshot;
	}

	getInventoryMetadataState(): Readonly<CredentialInventoryMetadataState> {
		const records = this.#buildInventoryRecords().map(record => ({ ...record }));
		const notice = this.#inventoryState.notice ? { ...this.#inventoryState.notice } : undefined;
		return {
			capability: this.#inventoryState.capability,
			generation: this.#inventoryState.generation,
			records,
			...(notice ? { notice } : {}),
		};
	}

	#applySnapshot(snapshot: SnapshotResponse, generation: number, scheduleMetadata = true): void {
		const generationChanged = generation !== this.#generation || this.#inventoryMetadataGeneration !== generation;
		this.#snapshot = snapshot;
		this.#generation = generation;
		this.#snapshotReceivedAt = Date.now();
		if (generationChanged) {
			this.#inventoryMetadata.clear();
			this.#inventoryMetadataGeneration = -1;
			this.#invalidateUsageCache();
			this.#reconcileUsagePresentations();
			if (this.#inventoryMetadataUnsupported) {
				this.#setInventoryState("unsupported", generation, {
					status: "unsupported",
					reason: "credential metadata endpoint unsupported; disabled rows unavailable",
					generation,
				});
			} else {
				this.#setInventoryState("pending", generation, {
					status: "pending",
					reason: "credential metadata sync pending",
					generation,
				});
				if (scheduleMetadata) this.#scheduleInventoryMetadataSync();
			}
		}
	}

	#setInventoryState(
		capability: CredentialInventoryMetadataCapability,
		generation: number,
		notice?: CachedInventoryNotice,
	): void {
		const records = this.#buildInventoryRecords();
		this.#inventoryState = {
			capability,
			generation,
			records,
			...(notice ? { notice } : {}),
		};
	}

	#buildInventoryRecords(): CredentialInventoryRecord[] {
		const metadataReady = this.#inventoryMetadataGeneration === this.#generation;
		const records: CredentialInventoryRecord[] = [];
		const seen = new Set<number>();
		for (const entry of this.#snapshot.credentials) {
			const metadata = metadataReady ? this.#inventoryMetadata.get(entry.id) : undefined;
			seen.add(entry.id);
			records.push({
				id: entry.id,
				provider: entry.provider,
				credentialKind: metadata?.type ?? entry.credential.type,
				identityLabel: metadata?.identity ?? snapshotIdentityLabel(entry),
				disabled: false,
				disabledCause: null,
			});
		}
		if (metadataReady) {
			for (const metadata of this.#inventoryMetadata.values()) {
				if (seen.has(metadata.id) || metadata.disabledCause === null) continue;
				records.push({
					id: metadata.id,
					provider: metadata.provider,
					credentialKind: metadata.type,
					identityLabel: metadata.identity,
					disabled: true,
					disabledCause: metadata.disabledCause,
				});
			}
		}
		return records;
	}

	#scheduleInventoryMetadataSync(): void {
		if (this.#closed || this.#inventoryMetadataUnsupported) return;
		if (this.#inventorySyncInflight) return;
		void this.syncInventoryMetadata().catch(() => {});
	}

	async syncInventoryMetadata(): Promise<Readonly<CredentialInventoryMetadataState>> {
		if (this.#inventoryMetadataUnsupported) return this.getInventoryMetadataState();
		if (this.#inventoryState.capability === "supported" && this.#inventoryMetadataGeneration === this.#generation) {
			return this.getInventoryMetadataState();
		}
		if (this.#inventorySyncInflight) return this.#inventorySyncInflight;
		const inflight = this.#syncInventoryMetadata().finally(() => {
			this.#inventorySyncInflight = undefined;
		});
		this.#inventorySyncInflight = inflight;
		return inflight;
	}

	async #syncInventoryMetadata(): Promise<Readonly<CredentialInventoryMetadataState>> {
		for (let attempt = 0; attempt < 2; attempt += 1) {
			try {
				const metadata = await this.#client.fetchCredentialMetadata();
				if (metadata.generation !== this.#generation) {
					if (attempt === 0) {
						await this.refreshSnapshot().catch(() => {});
						continue;
					}
					this.#inventoryMetadata.clear();
					this.#inventoryMetadataGeneration = -1;
					this.#setInventoryState("mismatch", this.#generation, {
						status: "mismatch",
						reason: "credential metadata generation mismatch",
						generation: this.#generation,
					});
					return this.getInventoryMetadataState();
				}
				this.#inventoryMetadata = new Map(metadata.credentials.map(record => [record.id, { ...record }]));
				this.#inventoryMetadataGeneration = metadata.generation;
				this.#setInventoryState("supported", metadata.generation);
				this.#reconcileUsagePresentations();
				return this.getInventoryMetadataState();
			} catch (error) {
				if (error instanceof AuthBrokerCredentialMetadataUnsupportedError || isErrorStatus(error, 404)) {
					this.#inventoryMetadataUnsupported = true;
					this.#inventoryMetadata.clear();
					this.#inventoryMetadataGeneration = -1;
					this.#setInventoryState("unsupported", this.#generation, {
						status: "unsupported",
						reason: "credential metadata endpoint unsupported; disabled rows unavailable",
						generation: this.#generation,
					});
					return this.getInventoryMetadataState();
				}
				this.#setInventoryState("failed", this.#generation, {
					status: "failed",
					reason: "credential metadata sync failed; retry explicitly",
					generation: this.#generation,
				});
				return this.getInventoryMetadataState();
			}
		}
		this.#setInventoryState("mismatch", this.#generation, {
			status: "mismatch",
			reason: "credential metadata generation mismatch",
			generation: this.#generation,
		});
		return this.getInventoryMetadataState();
	}

	async #runBackground(): Promise<void> {
		let backoffMs = BACKGROUND_BACKOFF_INITIAL_MS;
		while (!this.#closed && !this.#backgroundAbort.signal.aborted) {
			if (this.#streamSnapshots && !this.#streamingUnsupported) {
				try {
					await this.#consumeSnapshotStream();
					backoffMs = BACKGROUND_BACKOFF_INITIAL_MS;
					continue;
				} catch (error) {
					if (this.#closed || this.#backgroundAbort.signal.aborted) break;
					if (error instanceof AuthBrokerStreamUnsupportedError) {
						this.#streamingUnsupported = true;
						logger.debug("auth-broker snapshot stream unsupported; falling back to long-poll");
						continue;
					}
					logger.debug("auth-broker snapshot stream failed; backing off", { error: String(error) });
					await scheduler.wait(backoffMs, { signal: this.#backgroundAbort.signal }).catch(() => {});
					backoffMs = Math.min(BACKGROUND_BACKOFF_MAX_MS, backoffMs * 2);
					continue;
				}
			}
			try {
				const result = await this.#client.fetchSnapshot({
					ifGenerationGt: this.#generation,
					waitMs: BACKGROUND_WAIT_MS,
					signal: this.#backgroundAbort.signal,
				});
				if (result.status === 200) this.#applySnapshot(result.snapshot, result.generation);
				backoffMs = BACKGROUND_BACKOFF_INITIAL_MS;
			} catch (error) {
				if (this.#closed || this.#backgroundAbort.signal.aborted) break;
				logger.debug("auth-broker background snapshot sync failed", { error: String(error) });
				await scheduler.wait(backoffMs, { signal: this.#backgroundAbort.signal }).catch(() => {});
				backoffMs = Math.min(BACKGROUND_BACKOFF_MAX_MS, backoffMs * 2);
			}
		}
	}

	async #consumeSnapshotStream(): Promise<void> {
		const iterator = this.#client.openSnapshotStream({ signal: this.#backgroundAbort.signal });
		try {
			for await (const event of iterator) {
				if (this.#closed || this.#backgroundAbort.signal.aborted) break;
				this.#streamingActive = true;
				this.#applyStreamEvent(event);
			}
		} finally {
			this.#streamingActive = false;
		}
	}

	#applyStreamEvent(event: SnapshotStreamEvent): void {
		switch (event.kind) {
			case "snapshot": {
				// Strip the discriminator so we store the wire-shape SnapshotResponse.
				const { kind: _kind, ...snapshot } = event;
				if (snapshot.generation < this.#generation) {
					logger.debug("auth-broker stream snapshot older than local; ignoring", {
						local: this.#generation,
						incoming: snapshot.generation,
					});
					return;
				}
				this.#applySnapshot(snapshot, snapshot.generation);
				return;
			}
			case "entry": {
				if (event.generation < this.#generation) return;
				this.#applyStreamEntry(event.entry, event.refresher, event.generation, event.serverNowMs);
				return;
			}
			case "removed": {
				if (event.generation < this.#generation) return;
				this.#removeStreamCredential(event.id, event.refresher, event.generation, event.serverNowMs);
				return;
			}
		}
	}

	#applyStreamEntry(
		entry: SnapshotEntry,
		refresher: RefresherSchedule,
		generation: number,
		serverNowMs: number,
	): void {
		const index = this.#snapshot.credentials.findIndex(candidate => candidate.id === entry.id);
		const credentials =
			index === -1
				? [...this.#snapshot.credentials, entry]
				: this.#snapshot.credentials.map((candidate, i) => (i === index ? entry : candidate));
		this.#applySnapshot({ ...this.#snapshot, generation, serverNowMs, refresher, credentials }, generation);
	}

	#removeStreamCredential(id: number, refresher: RefresherSchedule, generation: number, serverNowMs: number): void {
		const credentials = this.#snapshot.credentials.filter(entry => entry.id !== id);
		this.#applySnapshot({ ...this.#snapshot, generation, serverNowMs, refresher, credentials }, generation);
	}

	/**
	 * Payload-free inventory view. This method never performs network I/O; metadata
	 * rows appear only after an explicit or background metadata synchronization for
	 * the current snapshot generation.
	 */
	listCredentialInventory(provider?: string): CredentialInventoryRecord[] {
		return this.#buildInventoryRecords()
			.filter(record => provider === undefined || record.provider === provider)
			.map(record => ({ ...record }));
	}

	/** Re-hydrate the in-memory snapshot from the broker. */
	async refreshSnapshot(): Promise<SnapshotResponse> {
		const result = await this.#client.fetchSnapshot();
		if (result.status === 200) this.#applySnapshot(result.snapshot, result.generation);
		return this.#snapshot;
	}

	listAuthCredentials(provider?: string): StoredAuthCredential[] {
		const out: StoredAuthCredential[] = [];
		for (const entry of this.#snapshot.credentials) {
			if (provider !== undefined && entry.provider !== provider) continue;
			out.push({
				id: entry.id,
				provider: entry.provider,
				credential: entry.credential as AuthCredential,
				disabledCause: null,
			});
		}
		return out;
	}

	/**
	 * In-memory update from a successful refresh through the broker. AuthStorage
	 * calls this after `#replaceCredentialAt`; the broker already persisted the
	 * authoritative row, so we just mirror it.
	 */
	updateAuthCredential(id: number, credential: AuthCredential): void {
		for (const entry of this.#snapshot.credentials) {
			if (entry.id !== id) continue;
			entry.credential = credential as typeof entry.credential;
			return;
		}
	}

	deleteAuthCredential(_id: number, _disabledCause: string): void {
		throw new Error("Remote auth-broker credentials can only be disabled on the broker host");
	}

	tryDisableAuthCredentialIfMatches(_id: number, _expectedData: string, _disabledCause: string): boolean {
		return false;
	}

	async waitForFreshSnapshot(maxWaitMs: number, opts: { signal?: AbortSignal } = {}): Promise<boolean> {
		const previousGeneration = this.#generation;
		const result = await this.#client.fetchSnapshot({
			ifGenerationGt: this.#generation,
			waitMs: maxWaitMs,
			signal: opts.signal,
		});
		if (result.status === 200) this.#applySnapshot(result.snapshot, result.generation);
		return this.#generation !== previousGeneration;
	}

	async prepareForRequest(credentialId: number, opts: { signal?: AbortSignal } = {}): Promise<boolean> {
		const entry = this.#snapshot.credentials.find(candidate => candidate.id === credentialId);
		if (entry?.credential.type !== "oauth" || entry.rotatesInMs === null) return false;
		const remainingMs = this.#snapshotReceivedAt + entry.rotatesInMs - Date.now();
		if (remainingMs > WAIT_THRESHOLD_MS) return false;
		return this.waitForFreshSnapshot(MAX_WAIT_MS, opts);
	}

	async markCredentialSuspect(credentialId: number, opts: { signal?: AbortSignal } = {}): Promise<void> {
		const { entry } = await this.#client.refreshCredential(credentialId, opts.signal);
		if (entry.credential.type !== "oauth") {
			throw new Error(`Broker returned non-OAuth credential for id=${credentialId}`);
		}
		this.#applyCredentialEntry(entry);
		this.#maybeRefreshSnapshot("suspect credential refresh");
	}

	replaceAuthCredentialsForProvider(_provider: string, _credentials: AuthCredential[]): StoredAuthCredential[] {
		throw new Error(
			"RemoteAuthCredentialStore is read-only on the client. Use `gjc auth-broker login <provider>` to mutate credentials.",
		);
	}

	upsertAuthCredentialForProvider(_provider: string, _credential: AuthCredential): StoredAuthCredential[] {
		throw new Error(
			"RemoteAuthCredentialStore is read-only on the client. Use `gjc auth-broker login <provider>` to mutate credentials.",
		);
	}

	upsertAuthCredentialForProviderIfAbsent(
		_provider: string,
		_credential: AuthCredential,
	): AuthCredentialIfAbsentResult {
		throw new Error(
			"RemoteAuthCredentialStore is read-only on the client. Use `gjc auth-broker login <provider>` to mutate credentials.",
		);
	}

	deleteAuthCredentialsForProvider(_provider: string, _disabledCause: string): void {
		throw new Error(
			"RemoteAuthCredentialStore is read-only on the client. Use `gjc auth-broker logout <provider>` to mutate credentials.",
		);
	}

	/**
	 * Upsert a single credential through the broker. The broker server is the
	 * canonical writer — see `POST /v1/credential`. The redacted snapshot
	 * entries returned by the server replace the provider's rows in our local
	 * snapshot, and the global snapshot is then refreshed in the background so
	 * any concurrent peer (refresh, generation bump) stays in sync.
	 */
	async upsertAuthCredentialRemote(provider: string, credential: AuthCredential): Promise<StoredAuthCredential[]> {
		const { entries } = await this.#client.uploadCredential(provider, credential);
		this.#applyProviderEntries(provider, entries);
		this.#maybeRefreshSnapshot("upload");
		return this.listAuthCredentials(provider);
	}

	async upsertAuthCredentialRemoteIfAbsent(
		provider: string,
		credential: AuthCredential,
	): Promise<AuthCredentialIfAbsentResult> {
		const { inserted, reason, entries } = await this.#client.uploadCredentialIfAbsent(provider, credential);
		this.#applyProviderEntries(provider, entries);
		this.#maybeRefreshSnapshot("upload-if-absent");
		return { inserted, reason, provider, entries: this.listAuthCredentials(provider) };
	}

	/**
	 * Replace-all semantics: disable every active credential for the provider,
	 * then upload each of the new credentials. Used by API-key login so a new
	 * key clobbers any previously stored key for the same provider.
	 */
	async replaceAuthCredentialsRemote(
		provider: string,
		credentials: AuthCredential[],
	): Promise<StoredAuthCredential[]> {
		const existing = this.listAuthCredentials(provider);
		for (const entry of existing) {
			await this.#client.disableCredential(entry.id, "replaced by newer credential");
		}
		await this.refreshSnapshot();
		for (const credential of credentials) {
			const { entries } = await this.#client.uploadCredential(provider, credential);
			this.#applyProviderEntries(provider, entries);
		}
		this.#maybeRefreshSnapshot("replace");
		return this.listAuthCredentials(provider);
	}

	#applyProviderEntries(provider: string, entries: AuthCredentialSnapshotEntry[]): void {
		// `entries` is the broker's authoritative post-upsert list of rows for
		// `provider`. Drop our existing rows for the same provider and splice in
		// the fresh set — preserving every other provider's rows in place.
		const others = this.#snapshot.credentials.filter(entry => entry.provider !== provider);
		const incoming = entries.map(entry => ({ ...entry, rotatesInMs: null }));
		this.#snapshot = { ...this.#snapshot, credentials: [...others, ...incoming] };
	}
	#applyCredentialEntry(entry: AuthCredentialSnapshotEntry): void {
		const incoming = { ...entry, rotatesInMs: null };
		const index = this.#snapshot.credentials.findIndex(candidate => candidate.id === entry.id);
		if (index === -1) {
			this.#snapshot = { ...this.#snapshot, credentials: [...this.#snapshot.credentials, incoming] };
			return;
		}
		const credentials = [...this.#snapshot.credentials];
		credentials[index] = incoming;
		this.#snapshot = { ...this.#snapshot, credentials };
	}

	/**
	 * Fire-and-forget `refreshSnapshot()` after a write. When the SSE stream is
	 * active the broker will deliver the new generation push, so the extra GET
	 * is wasted bandwidth and we skip it.
	 */
	#maybeRefreshSnapshot(reason: string): void {
		if (this.#streamingActive) return;
		void this.refreshSnapshot().catch(error => {
			logger.debug("auth-broker snapshot refresh after write failed", { reason, error: String(error) });
		});
	}

	getCache(key: string): string | null {
		const entry = this.#cache.get(key);
		if (!entry) return null;
		if (entry.expiresAtSec * 1000 <= Date.now()) {
			this.#cache.delete(key);
			return null;
		}
		return entry.value;
	}

	setCache(key: string, value: string, expiresAtSec: number): void {
		this.#cache.set(key, { value, expiresAtSec });
	}

	cleanExpiredCache(): void {
		const nowSec = Math.floor(Date.now() / 1000);
		for (const [key, entry] of this.#cache) {
			if (entry.expiresAtSec <= nowSec) this.#cache.delete(key);
		}
	}

	deleteCachePrefix(prefix: string): void {
		for (const key of this.#cache.keys()) {
			if (key.startsWith(prefix)) this.#cache.delete(key);
		}
		if (prefix.startsWith("usage_cache:")) this.#invalidateUsageCache();
	}

	#invalidateUsageCache(): void {
		this.#usageCache = undefined;
		this.#usageInflight = undefined;
		this.#usageCacheEpoch += 1;
	}

	/**
	 * Store-level hook consumed by `AuthStorage` — routes refresh through the
	 * broker so the actual refresh token never leaves the broker host. Returns
	 * the broker-redacted credential with {@link REMOTE_REFRESH_SENTINEL} in
	 * the `refresh` slot.
	 */
	async refreshOAuthCredential(
		_provider: Provider,
		credentialId: number,
		_credential: OAuthCredential,
		signal?: AbortSignal,
	): Promise<OAuthCredentials & { mcpBinding?: OAuthCredential["mcpBinding"] }> {
		let entry: AuthCredentialSnapshotEntry;
		try {
			({ entry } = await this.#client.refreshCredential(credentialId, signal));
		} catch (error) {
			if (isErrorStatus(error, 404) && !this.#streamingActive) {
				await this.refreshSnapshot().catch(refreshError => {
					logger.debug("auth-broker snapshot refresh after missing credential refresh failed", {
						error: String(refreshError),
					});
				});
			}
			throw error;
		}
		if (!this.#streamingActive) {
			await this.refreshSnapshot().catch(error => {
				logger.debug("auth-broker snapshot refresh after credential refresh failed", { error: String(error) });
			});
		}
		if (entry.credential.type !== "oauth") {
			throw new Error(`Broker returned non-OAuth credential for id=${credentialId}`);
		}
		const refreshed = entry.credential;
		return {
			access: refreshed.access,
			refresh: REMOTE_REFRESH_SENTINEL,
			expires: refreshed.expires,
			accountId: refreshed.accountId,
			email: refreshed.email,
			projectId: refreshed.projectId,
			enterpriseUrl: refreshed.enterpriseUrl,
			mcpBinding: refreshed.mcpBinding,
		};
	}

	async refreshMCPOAuthCredential(
		credentialId: number,
		credential: OAuthCredential,
		client: MCPOAuthRefreshClient,
		signal?: AbortSignal,
	): Promise<OAuthCredential> {
		const { entry } = await this.#client.refreshMCPCredential(credentialId, client, signal);
		if (entry.credential.type !== "oauth") {
			throw new Error(`Broker returned non-OAuth credential for id=${credentialId}`);
		}
		assertCanonicalMCPOAuthBinding(credential.mcpBinding);
		assertCanonicalMCPOAuthBinding(entry.credential.mcpBinding);
		if (
			entry.credential.mcpBinding.resourceOrigin !== credential.mcpBinding.resourceOrigin ||
			entry.credential.mcpBinding.tokenEndpoint !== credential.mcpBinding.tokenEndpoint
		) {
			throw new Error("Broker returned mismatched MCP OAuth credential binding");
		}
		this.#applyCredentialEntry(entry);
		this.#maybeRefreshSnapshot("MCP credential refresh");
		return entry.credential;
	}

	/**
	 * Store-level hook consumed by `AuthStorage.fetchUsageReports()` — proxies
	 * to the broker's `/v1/usage` endpoint. The broker's egress IP isn't
	 * rate-limited by Anthropic's per-IP `/usage` cap the way a heavy
	 * residential laptop is, so all credentials surface every cycle.
	 */
	async fetchUsageReports(signal?: AbortSignal): Promise<UsageReport[] | null> {
		return this.#raceWithSignal(this.#loadUsageReports(), signal);
	}

	/** Synchronous, zero-network usage presentation read. */
	peekCachedUsagePresentation(provider: Provider, credentialId: number): CachedUsagePresentation | undefined {
		const entry = this.#snapshot.credentials.find(candidate => candidate.id === credentialId);
		if (!entry || entry.provider !== provider) return undefined;
		const cached = this.#usagePresentations.get(credentialId);
		if (!cached) return undefined;
		const now = Date.now();
		if (cached.retainUntil <= now) {
			this.#usagePresentations.delete(credentialId);
			return undefined;
		}
		const identityDigest = this.#identityDigestForEntry(entry);
		if (
			cached.provider !== provider ||
			cached.inventoryGeneration !== this.#generation ||
			cached.identityDigest !== identityDigest
		) {
			this.#usagePresentations.delete(credentialId);
			return undefined;
		}
		return cloneUsagePresentation(cached);
	}

	/** Record a safe usage observation after an explicit broker usage/check call. */
	recordUsagePresentation(observation: CachedUsagePresentation): void {
		if (!Number.isInteger(observation.credentialId)) return;
		if (!Number.isFinite(observation.inventoryGeneration) || observation.inventoryGeneration !== this.#generation)
			return;
		if (!Number.isFinite(observation.fetchedAt) || !Number.isFinite(observation.freshUntil)) return;
		if (!Number.isFinite(observation.retainUntil) || observation.retainUntil <= observation.fetchedAt) return;
		const entry = this.#snapshot.credentials.find(candidate => candidate.id === observation.credentialId);
		if (!entry || entry.provider !== observation.provider) return;
		if (this.#identityDigestForEntry(entry) !== observation.identityDigest) return;
		const usage = safePresentationUsageReport(observation.usage);
		const stored = cloneUsagePresentation({
			credentialId: observation.credentialId,
			provider: observation.provider,
			inventoryGeneration: observation.inventoryGeneration,
			identityDigest: observation.identityDigest,
			usage,
			fetchedAt: observation.fetchedAt,
			freshUntil: Math.min(observation.freshUntil, observation.fetchedAt + PRESENTATION_FRESH_MS),
			retainUntil: Math.min(observation.retainUntil, observation.fetchedAt + PRESENTATION_RETENTION_MS),
		});
		this.#usagePresentations.set(observation.credentialId, stored);
	}

	/**
	 * Per-credential usage hook consumed by `AuthStorage.#getUsageReport`. Pulls
	 * the aggregate broker `/v1/usage` once and serves all callers from the
	 * same response (coalesced + cached), then matches the credential to a
	 * report by provider + identity (accountId / email / projectId).
	 *
	 * The broker already aggregates with its own 30s TTL on the server side; our
	 * 15s client TTL is below that so we usually re-use the broker's cache too.
	 */
	async getUsageReport(
		provider: Provider,
		credential: OAuthCredential,
		signal?: AbortSignal,
	): Promise<UsageReport | null> {
		const reports = await this.#raceWithSignal(this.#loadUsageReports(), signal);
		if (!reports) return null;
		return matchUsageReport(reports, provider, credential);
	}

	/**
	 * Reject the awaited promise when the caller's signal aborts, without
	 * affecting the shared upstream fetch. Used to give each caller their
	 * own cancel without one caller's abort cascading into a peer's in-flight
	 * request through the single-flight `#usageInflight`.
	 */
	#raceWithSignal<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
		if (!signal) return promise;
		if (signal.aborted) return Promise.reject(new Error("auth-broker request aborted"));
		return new Promise<T>((resolve, reject) => {
			const onAbort = (): void => {
				signal.removeEventListener("abort", onAbort);
				reject(new Error("auth-broker request aborted"));
			};
			signal.addEventListener("abort", onAbort, { once: true });
			promise.then(
				value => {
					signal.removeEventListener("abort", onAbort);
					resolve(value);
				},
				err => {
					signal.removeEventListener("abort", onAbort);
					reject(err);
				},
			);
		});
	}

	#identityDigestForEntry(entry: SnapshotEntry): string {
		const credential = entry.credential;
		const identity =
			credential.type === "oauth"
				? {
						accountId: credential.accountId ?? null,
						email: credential.email?.trim().toLowerCase() ?? null,
						projectId: credential.projectId ?? null,
						enterpriseUrl: credential.enterpriseUrl ?? null,
						mcpBinding: credential.mcpBinding ?? null,
					}
				: { type: credential.type };
		return createHash("sha256")
			.update(JSON.stringify({ id: entry.id, provider: entry.provider, type: credential.type, identity }))
			.digest("hex");
	}

	#reconcileUsagePresentations(): void {
		for (const [credentialId, cached] of this.#usagePresentations) {
			const entry = this.#snapshot.credentials.find(candidate => candidate.id === credentialId);
			if (
				!entry ||
				entry.provider !== cached.provider ||
				this.#identityDigestForEntry(entry) !== cached.identityDigest
			) {
				this.#usagePresentations.delete(credentialId);
				continue;
			}
			this.#usagePresentations.set(credentialId, { ...cached, inventoryGeneration: this.#generation });
		}
	}

	#recordUsageReports(reports: UsageReport[], epoch: number): void {
		if (this.#usageCacheEpoch !== epoch) return;
		for (const entry of this.#snapshot.credentials) {
			if (entry.credential.type !== "oauth") continue;
			const report = matchUsageReport(reports, entry.provider, entry.credential);
			if (!report) continue;
			const fetchedAt = Number.isFinite(report.fetchedAt) ? report.fetchedAt : Date.now();
			this.recordUsagePresentation({
				credentialId: entry.id,
				provider: entry.provider,
				inventoryGeneration: this.#generation,
				identityDigest: this.#identityDigestForEntry(entry),
				usage: safePresentationUsageReport(report),
				fetchedAt,
				freshUntil: fetchedAt + PRESENTATION_FRESH_MS,
				retainUntil: fetchedAt + PRESENTATION_RETENTION_MS,
			});
		}
	}

	#loadUsageReports(): Promise<UsageReport[] | null> {
		const cached = this.#usageCache;
		if (cached && Date.now() - cached.fetchedAt < USAGE_CACHE_TTL_MS) {
			return Promise.resolve(cached.reports);
		}
		if (this.#usageInflight) return this.#usageInflight;
		const epoch = this.#usageCacheEpoch;
		const inflight = this.#client
			.fetchUsage()
			.then(body => {
				if (this.#usageCacheEpoch === epoch) {
					this.#usageCache = { reports: body.reports, fetchedAt: Date.now() };
					this.#recordUsageReports(body.reports, epoch);
				}
				return body.reports;
			})
			.catch(error => {
				logger.warn("auth-broker usage fetch failed", { error: String(error) });
				return null;
			})
			.finally(() => {
				if (this.#usageCacheEpoch === epoch) this.#usageInflight = undefined;
			});
		this.#usageInflight = inflight;
		return inflight;
	}

	close(): void {
		if (this.#closed) return;
		this.#closed = true;
		this.#backgroundAbort.abort();
		this.#cache.clear();
		this.#usagePresentations.clear();
		this.#inventoryMetadata.clear();
		this.#inventorySyncInflight = undefined;
	}
}

function isErrorStatus(error: unknown, status: number): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"status" in error &&
		(error as { status?: unknown }).status === status
	);
}

function snapshotIdentityLabel(entry: SnapshotEntry): string | null {
	if (entry.credential.type !== "oauth") return null;
	return entry.credential.email ?? entry.credential.accountId ?? entry.credential.projectId ?? null;
}

function safePresentationUsageReport(report: UsageReport): SafeUsageReport {
	const { raw: _raw, metadata: _metadata, ...safe } = report;
	return {
		...safe,
		limits: safe.limits.map(limit => {
			const { accountId: _accountId, projectId: _projectId, orgId: _orgId, ...scope } = limit.scope;
			return { ...limit, scope };
		}),
	};
}

function cloneUsagePresentation(observation: CachedUsagePresentation): CachedUsagePresentation {
	return {
		...observation,
		usage: {
			...observation.usage,
			limits: observation.usage.limits.map(limit => ({
				...limit,
				scope: { ...limit.scope },
				window: limit.window ? { ...limit.window } : undefined,
				amount: { ...limit.amount },
				notes: limit.notes ? [...limit.notes] : undefined,
			})),
			metadata: observation.usage.metadata ? { ...observation.usage.metadata } : undefined,
		},
	};
}

/**
 * Match a broker-supplied usage report to a specific OAuth credential. The
 * broker returns aggregate reports across all credentials it manages, so we
 * pick the one whose identity (accountId / email / projectId) lines up with
 * the credential the caller is asking about.
 *
 * Falls back to the lone candidate when only one matches the provider; falls
 * through to `null` when nothing matches, which `AuthStorage` treats as "no
 * usage data" (ranking proceeds without a usage signal for this credential).
 */
function matchUsageReport(reports: UsageReport[], provider: Provider, credential: OAuthCredential): UsageReport | null {
	const candidates = reports.filter(report => report.provider === provider);
	if (candidates.length === 0) return null;
	if (candidates.length === 1) return candidates[0];
	const accountId = credential.accountId?.trim().toLowerCase();
	const email = credential.email?.trim().toLowerCase();
	const projectId = credential.projectId?.trim().toLowerCase();
	for (const report of candidates) {
		if (reportMatchesIdentity(report, accountId, email, projectId)) return report;
	}
	return null;
}

function reportMatchesIdentity(
	report: UsageReport,
	accountId: string | undefined,
	email: string | undefined,
	projectId: string | undefined,
): boolean {
	const metadata = (report.metadata ?? {}) as Record<string, unknown>;
	if (accountId) {
		const metaAccount = readMetadataString(metadata, "accountId") ?? readMetadataString(metadata, "account_id");
		if (metaAccount && metaAccount.toLowerCase() === accountId) return true;
		for (const limit of report.limits) {
			if (limit.scope.accountId?.toLowerCase() === accountId) return true;
		}
	}
	if (email) {
		const metaEmail = readMetadataString(metadata, "email");
		if (metaEmail && metaEmail.toLowerCase() === email) return true;
	}
	if (projectId) {
		const metaProject = readMetadataString(metadata, "projectId") ?? readMetadataString(metadata, "project_id");
		if (metaProject && metaProject.toLowerCase() === projectId) return true;
		for (const limit of report.limits) {
			if (limit.scope.projectId?.toLowerCase() === projectId) return true;
		}
	}
	return false;
}

function readMetadataString(metadata: Record<string, unknown>, key: string): string | undefined {
	const value = metadata[key];
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
