export interface AdaptiveCompactionState {
	turnsSinceCompact: number;
	callsInWindow: number;
	windowStart: number;
	lastContextTokens: number;
	lastCompactContextTokens: number | null;
	lastCompactTs: number | null;
}

export interface AdaptiveCompactionDecisionState {
	turnsSinceCompact: number;
	callsInWindow: number;
	lastContextTokens?: number;
}

export interface AdaptiveCompactionOptions {
	enabled: boolean;
	turnWindow: number;
	baseThresholdPercent: number;
	aggression: number;
	minThresholdPercent?: number;
}

export class AdaptiveCompactionTracker {
	#state: AdaptiveCompactionState;

	constructor(
		public windowMs = 60_000,
		now = Date.now(),
	) {
		this.#state = {
			turnsSinceCompact: 0,
			callsInWindow: 0,
			windowStart: now,
			lastContextTokens: 0,
			lastCompactContextTokens: null,
			lastCompactTs: null,
		};
	}

	setWindowMs(windowMs: number, now = Date.now()): void {
		const nextWindowMs = Math.max(1, windowMs);
		if (nextWindowMs === this.windowMs) return;
		this.windowMs = nextWindowMs;
		this.#state.windowStart = now;
		this.#state.callsInWindow = 0;
	}

	recordCall(contextTokens: number, now = Date.now()): void {
		this.#state.turnsSinceCompact += 1;
		if (now - this.#state.windowStart > this.windowMs) {
			this.#state.windowStart = now;
			this.#state.callsInWindow = 0;
		}
		this.#state.callsInWindow += 1;
		this.#state.lastContextTokens = contextTokens;
	}

	recordCompact(contextTokens: number, now = Date.now()): void {
		this.#state.turnsSinceCompact = 0;
		this.#state.callsInWindow = 0;
		this.#state.windowStart = now;
		this.#state.lastContextTokens = contextTokens;
		this.#state.lastCompactContextTokens = contextTokens;
		this.#state.lastCompactTs = now;
	}

	snapshot(): AdaptiveCompactionState {
		return { ...this.#state };
	}

	decisionState(): AdaptiveCompactionDecisionState {
		return {
			turnsSinceCompact: this.#state.turnsSinceCompact,
			callsInWindow: this.#state.callsInWindow,
			lastContextTokens: this.#state.lastContextTokens,
		};
	}
}
