/**
 * Pure per-update inbound reaction transition ordering.
 *
 * Extracted from the Telegram daemon so the serialization and terminal-state
 * contract is testable without daemon/attachment/topic-lease infrastructure.
 * The production router dispatches notification frames without awaiting prior
 * callbacks, so an `accepted` handler can still be in flight when the
 * `consumed` handler runs. Chaining every transition for one update through a
 * single promise keeps effects ordered, and skipping nonterminal transitions
 * after a terminal one makes the terminal state monotonic: a late queued
 * marker can never overwrite an already-sent consumed marker or retraction.
 */

/** A single ordered Bot API reaction transition for one update id. */
export interface InboundReactionTransition {
	/** Serialized in submission order per update id. */
	readonly effect: () => Promise<void>;
	/** Terminal transitions (consumed / retraction) close the update. */
	readonly terminal: boolean;
}

export class InboundReactionSequencer {
	/** Update ids whose reaction reached a terminal (consumed/retracted) state. */
	readonly #terminal = new Set<number>();
	/** Per-update serialization chain. */
	readonly #chains = new Map<number, Promise<void>>();

	/** True once a terminal transition completed for this update. */
	isTerminal(updateId: number): boolean {
		return this.#terminal.has(updateId);
	}

	/**
	 * Enqueue one transition. The returned promise settles when the transition
	 * has run (or was skipped because a terminal state already closed it).
	 */
	apply(updateId: number, transition: InboundReactionTransition): Promise<void> {
		const run = async (): Promise<void> => {
			if (this.#terminal.has(updateId)) return;
			await transition.effect();
			if (transition.terminal) this.#terminal.add(updateId);
		};
		const prior = this.#chains.get(updateId) ?? Promise.resolve();
		const next = prior.then(run, run);
		this.#chains.set(
			updateId,
			next.catch(() => undefined),
		);
		return next;
	}
}

/** Body for setting an emoji reaction on an inbound Telegram message. */
export function inboundReactionSetPayload(
	chatId: string,
	messageId: number,
	emoji: string,
): {
	chat_id: string;
	message_id: number;
	reaction: Array<{ type: "emoji"; emoji: string }>;
} {
	return { chat_id: chatId, message_id: messageId, reaction: [{ type: "emoji", emoji }] };
}

/**
 * Body for retracting a reaction. The Bot API clears a bot reaction with the
 * empty reaction list; an empty `emoji` string is not a valid reaction and is
 * silently rejected, leaving the stale queued marker visible.
 */
export function inboundReactionRetractPayload(
	chatId: string,
	messageId: number,
): {
	chat_id: string;
	message_id: number;
	reaction: [];
} {
	return { chat_id: chatId, message_id: messageId, reaction: [] };
}
