import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export type SpawnClaimV2 = {
	version: 2;
	claimId: string;
	lifecycleIdentity: string;
	bindingMac: string;
	state:
		| "prepared"
		| "substrate_starting"
		| "authority_active"
		| "seed_prepared"
		| "dispatching"
		| "accepted"
		| "pre_send_rejected"
		| "uncertain"
		| "closed";
	preSendLease?: { epoch: string; status: "owned" | "consumed" };
	childId?: string;
	seed?: SeedDeliveryV2;
	authorityRef?: string;
	createdAt: number;
	updatedAt: number;
};

export type SeedDeliveryV2 = {
	version: 2;
	phase: "prepared" | "dispatching" | "accepted" | "pre_send_rejected" | "uncertain";
	clientRef: string;
	commandId?: string;
	turnId?: string;
	acceptedAt?: number;
	lastQ26Status?: "accepted" | "in_flight" | "terminal_ok" | "failed" | "unknown";
	observedAt?: number;
};

/** Live-only capability check. Implementations must not retain either argument. */
export interface MasterCapabilityVerifier {
	verifyMasterCapability(ownerSessionId: string, rawCapability: string, attestationEpoch: string): Promise<{ allowed: boolean }>;
}

/** Structured, shell-free child launch contract owned by the Broker. */
export interface SpawnSubstrateLaunchSpec {
	childSessionId: string;
	cwd: string;
	argv: readonly string[];
	env?: Readonly<Record<string, string>>;
}

/** Durable facts required to re-prove one spawned substrate without task material. */
export type SpawnSubstrateProof = {
	substrateKind: "tmux" | "psmux" | "headless";
	providerIdentity: string;
	nativeSessionId?: string;
	pid?: number;
	processIncarnation?: string;
	ownerGeneration?: number;
	stateFileProof?: Readonly<Record<string, string | number>>;
};

export interface SpawnSubstrateProvider {
	launch(
		spec: SpawnSubstrateLaunchSpec,
	): Promise<
		| { ok: true; proof: SpawnSubstrateProof }
		| { ok: false; code: "substrate_unavailable" | "substrate_proof_failed"; message: string }
	>;
	verify(proof: SpawnSubstrateProof): Promise<"verified" | "mismatch" | "gone">;
	close(proof: SpawnSubstrateProof): Promise<{ ok: boolean; code?: string }>;
}

export type SpawnClaimDecision =
	| { kind: "owner"; claim: SpawnClaimV2; recovery: boolean }
	| { kind: "in_progress"; claim: SpawnClaimV2 }
	| { kind: "replay"; claim: SpawnClaimV2 }
	| { kind: "terminal"; claim: SpawnClaimV2 }
	| { kind: "terminal_uncertain"; claim: SpawnClaimV2 }
	| { kind: "idempotency_conflict"; claim: SpawnClaimV2 };

type StoredClaim = {
	version: 1;
	claim: SpawnClaimV2;
	integrity: string;
};

export interface SpawnAuthorityStoreOptions {
	/** Test-only hook that runs before the journal record becomes durable. */
	beforeSyncForTest?: () => Promise<void> | void;
}

const CLAIM_STATES = new Set<SpawnClaimV2["state"]>([
	"prepared",
	"substrate_starting",
	"authority_active",
	"seed_prepared",
	"dispatching",
	"accepted",
	"pre_send_rejected",
	"uncertain",
	"closed",
]);
const SEED_PHASES = new Set<SeedDeliveryV2["phase"]>([
	"prepared",
	"dispatching",
	"accepted",
	"pre_send_rejected",
	"uncertain",
]);
const Q26_STATUSES = new Set<NonNullable<SeedDeliveryV2["lastQ26Status"]>>([
	"accepted",
	"in_flight",
	"terminal_ok",
	"failed",
	"unknown",
]);
const CLAIM_KEYS = new Set([
	"version",
	"claimId",
	"lifecycleIdentity",
	"bindingMac",
	"state",
	"preSendLease",
	"childId",
	"seed",
	"authorityRef",
	"createdAt",
	"updatedAt",
]);
const SEED_KEYS = new Set([
	"version",
	"phase",
	"clientRef",
	"commandId",
	"turnId",
	"acceptedAt",
	"lastQ26Status",
	"observedAt",
]);
const FORBIDDEN_FIELD = /(?:task|prompt|capability|idempotency|fingerprint|requesthash|digest|credential|token|secret|password|stderr)/i;

function canonicalJson(value: unknown): string {
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
	const record = value as Record<string, unknown>;
	return `{${Object.keys(record)
		.filter(key => record[key] !== undefined)
		.sort()
		.map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
		.join(",")}}`;
}

function hasOnlyKeys(value: Record<string, unknown>, keys: Set<string>): boolean {
	return Object.keys(value).every(key => keys.has(key) && !FORBIDDEN_FIELD.test(key));
}

function isOpaque(value: unknown): value is string {
	return typeof value === "string" && value.length > 0 && value.length <= 512;
}

function isTimestamp(value: unknown): value is number {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isSeed(value: unknown): value is SeedDeliveryV2 {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const seed = value as Record<string, unknown>;
	return (
		hasOnlyKeys(seed, SEED_KEYS) &&
		seed.version === 2 &&
		typeof seed.phase === "string" &&
		SEED_PHASES.has(seed.phase as SeedDeliveryV2["phase"]) &&
		isOpaque(seed.clientRef) &&
		(seed.commandId === undefined || isOpaque(seed.commandId)) &&
		(seed.turnId === undefined || isOpaque(seed.turnId)) &&
		(seed.acceptedAt === undefined || isTimestamp(seed.acceptedAt)) &&
		(seed.lastQ26Status === undefined ||
			(typeof seed.lastQ26Status === "string" && Q26_STATUSES.has(seed.lastQ26Status as NonNullable<SeedDeliveryV2["lastQ26Status"]>))) &&
		(seed.observedAt === undefined || isTimestamp(seed.observedAt))
	);
}

export function isSpawnClaimV2(value: unknown): value is SpawnClaimV2 {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const claim = value as Record<string, unknown>;
	const lease = claim.preSendLease;
	return (
		hasOnlyKeys(claim, CLAIM_KEYS) &&
		claim.version === 2 &&
		isOpaque(claim.claimId) &&
		isOpaque(claim.lifecycleIdentity) &&
		/^[0-9a-f]{64}$/i.test(String(claim.bindingMac)) &&
		typeof claim.state === "string" &&
		CLAIM_STATES.has(claim.state as SpawnClaimV2["state"]) &&
		(lease === undefined ||
			(typeof lease === "object" &&
				lease !== null &&
				!Array.isArray(lease) &&
				Object.keys(lease).every(key => key === "epoch" || key === "status") &&
				isOpaque((lease as { epoch?: unknown }).epoch) &&
				((lease as { status?: unknown }).status === "owned" || (lease as { status?: unknown }).status === "consumed"))) &&
		(claim.childId === undefined || isOpaque(claim.childId)) &&
		(claim.seed === undefined || isSeed(claim.seed)) &&
		(claim.authorityRef === undefined || isOpaque(claim.authorityRef)) &&
		isTimestamp(claim.createdAt) &&
		isTimestamp(claim.updatedAt) &&
		claim.updatedAt >= claim.createdAt
	);
}

function isRecoverablePreSend(claim: SpawnClaimV2): boolean {
	return claim.state === "prepared" || (claim.state === "seed_prepared" && claim.seed?.phase === "prepared");
}

/**
 * Append-only source of spawn-effect authority. It deliberately records no request
 * input: the opaque identity and structural binding MAC are its only correlators.
 */
export class SpawnAuthorityStore {
	readonly #file: string;
	readonly #identityKey: Buffer;
	readonly #options: SpawnAuthorityStoreOptions;
	readonly #latest = new Map<string, SpawnClaimV2>();
	readonly #active = new Set<string>();
	#tail: Promise<void> = Promise.resolve();

	constructor(agentDir: string, brokerIdentityKey: string, options: SpawnAuthorityStoreOptions = {}) {
		if (!/^[0-9a-f]{64}$/i.test(brokerIdentityKey)) throw new Error("Broker identity key is invalid.");
		this.#file = path.join(agentDir, "sdk", "spawn-authority.jsonl");
		this.#identityKey = Buffer.from(brokerIdentityKey, "hex");
		this.#options = options;
	}

	get file(): string {
		return this.#file;
	}

	claims(): readonly SpawnClaimV2[] {
		return [...this.#latest.values()];
	}

	async open(): Promise<void> {
		await this.#serial(async () => {
			await fs.mkdir(path.dirname(this.#file), { recursive: true, mode: 0o700 });
			this.#latest.clear();
			let source = "";
			try {
				source = await Bun.file(this.#file).text();
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
			}
			for (const line of source.split("\n")) {
				if (!line) continue;
				let row: unknown;
				try {
					row = Bun.JSON5.parse(line);
				} catch {
					throw new Error("Spawn authority journal contains malformed durable evidence.");
				}
				if (!this.#isStoredClaim(row)) throw new Error("Spawn authority journal contains invalid durable evidence.");
				const stored = row as StoredClaim;
				const prior = this.#latest.get(stored.claim.lifecycleIdentity);
				if (prior && (prior.claimId !== stored.claim.claimId || stored.claim.updatedAt < prior.updatedAt))
					throw new Error("Spawn authority journal claim history is invalid.");
				this.#latest.set(stored.claim.lifecycleIdentity, stored.claim);
			}
		});
	}

	async claimOrJoin(lifecycleIdentity: string, bindingMac: string): Promise<SpawnClaimDecision> {
		if (!isOpaque(lifecycleIdentity) || !/^[0-9a-f]{64}$/i.test(bindingMac)) throw new Error("Invalid opaque spawn claim key.");
		return this.#serial(async () => {
			const current = this.#latest.get(lifecycleIdentity);
			if (!current) {
				const now = Date.now();
				const claim: SpawnClaimV2 = {
					version: 2,
					claimId: randomBytes(24).toString("base64url"),
					lifecycleIdentity,
					bindingMac,
					state: "prepared",
					preSendLease: { epoch: randomBytes(24).toString("base64url"), status: "owned" },
					createdAt: now,
					updatedAt: now,
				};
				await this.#append(claim);
				this.#active.add(lifecycleIdentity);
				return { kind: "owner", claim, recovery: false };
			}
			if (!timingSafeEqual(Buffer.from(current.bindingMac, "hex"), Buffer.from(bindingMac, "hex")))
				return { kind: "idempotency_conflict", claim: current };
			if (this.#active.has(lifecycleIdentity)) return { kind: "in_progress", claim: current };
			if (isRecoverablePreSend(current)) {
				const rotated: SpawnClaimV2 = {
					...current,
					preSendLease: { epoch: randomBytes(24).toString("base64url"), status: "owned" },
					updatedAt: Date.now(),
				};
				await this.#append(rotated);
				this.#active.add(lifecycleIdentity);
				return { kind: "owner", claim: rotated, recovery: true };
			}
			if (current.state === "uncertain") return { kind: "terminal_uncertain", claim: current };
			if (current.state === "accepted" || current.state === "pre_send_rejected" || current.state === "closed")
				return { kind: "terminal", claim: current };
			return { kind: "replay", claim: current };
		});
	}

	async releaseOwner(lifecycleIdentity: string): Promise<void> {
		await this.#serial(async () => this.#active.delete(lifecycleIdentity));
	}

	#integrity(claim: SpawnClaimV2): string {
		return createHmac("sha256", this.#identityKey).update(canonicalJson(claim)).digest("hex");
	}

	#isStoredClaim(value: unknown): value is StoredClaim {
		if (!value || typeof value !== "object" || Array.isArray(value)) return false;
		const row = value as Partial<StoredClaim>;
		return (
			row.version === 1 &&
			isSpawnClaimV2(row.claim) &&
			typeof row.integrity === "string" &&
			/^[0-9a-f]{64}$/i.test(row.integrity) &&
			timingSafeEqual(Buffer.from(row.integrity, "hex"), Buffer.from(this.#integrity(row.claim), "hex"))
		);
	}

	async #append(claim: SpawnClaimV2): Promise<void> {
		if (!isSpawnClaimV2(claim)) throw new Error("Refusing to persist an invalid spawn claim.");
		const row: StoredClaim = { version: 1, claim, integrity: this.#integrity(claim) };
		const handle = await fs.open(this.#file, fsSync.constants.O_WRONLY | fsSync.constants.O_APPEND | fsSync.constants.O_CREAT, 0o600);
		try {
			await handle.writeFile(`${canonicalJson(row)}\n`);
			await this.#options.beforeSyncForTest?.();
			await handle.sync();
		} finally {
			await handle.close();
		}
		const directory = await fs.open(path.dirname(this.#file), fsSync.constants.O_RDONLY);
		try {
			await directory.sync();
		} finally {
			await directory.close();
		}
		this.#latest.set(claim.lifecycleIdentity, claim);
	}

	async #serial<T>(operation: () => Promise<T>): Promise<T> {
		const prior = this.#tail;
		const completion = Promise.withResolvers<void>();
		this.#tail = prior.then(() => completion.promise);
		await prior;
		try {
			return await operation();
		} finally {
			completion.resolve();
		}
	}
}
