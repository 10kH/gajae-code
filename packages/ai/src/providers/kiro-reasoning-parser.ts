/**
 * Shared parser for Kiro native reasoning events (reasoningContentEvent).
 * Used by both kiro-codewhisperer.ts (OAuth) and kiro-api-key.ts (API key).
 *
 * Manages the lifecycle of a single active thinking block per reasoning event stream:
 * - Creates a new block when reasoning begins
 * - Closes exactly once when transitioning to text/tool
 * - Reopens for subsequent reasoning runs
 */
import type { AssistantMessage, ThinkingContent } from "../types";
import type { AssistantMessageEventStream } from "../utils/event-stream";

type Block = (ThinkingContent & { index?: number }) | (any & { index?: number });

interface ReasoningContentEventPayload {
	text?: string;
	signature?: string;
	redactedContent?: string;
}

export interface ReasoningBlockState {
	activeThinkingIndex: number | undefined;
}

export function createReasoningBlockState(): ReasoningBlockState {
	return { activeThinkingIndex: undefined };
}

/**
 * Parse a reasoningContentEvent and emit thinking-related stream events.
 * Creates or reuses the current thinking block; emits thinking_start on first event.
 * The block is closed when a text or tool event arrives (via closeReasoningBlock).
 */
export function parseReasoningContentEventHelper(
	ev: ReasoningContentEventPayload,
	blocks: Block[],
	output: AssistantMessage,
	stream: AssistantMessageEventStream,
	state: ReasoningBlockState,
): void {
	// Validate inputs
	if (ev.text !== undefined && typeof ev.text !== "string") {
		throw new Error("Kiro reasoning text must be a string");
	}
	if (ev.signature !== undefined && typeof ev.signature !== "string") {
		throw new Error("Kiro reasoning signature must be a string");
	}
	if (ev.redactedContent !== undefined && typeof ev.redactedContent !== "string") {
		throw new Error("Kiro reasoning redactedContent must be a string");
	}

	if (!ev.text && !ev.signature && !ev.redactedContent) {
		return; // Nothing to process
	}

	// Get or create the active thinking block
	let thinkingIndex = state.activeThinkingIndex;
	if (thinkingIndex === undefined) {
		// No active block: create a new one
		thinkingIndex = blocks.length;
		const thinkingBlock: ThinkingContent & { index: number } = {
			type: "thinking",
			thinking: "",
			index: thinkingIndex,
		};
		blocks.push(thinkingBlock);
		state.activeThinkingIndex = thinkingIndex;
		stream.push({ type: "thinking_start", contentIndex: thinkingIndex, partial: output });
	}

	const block = blocks[thinkingIndex] as ThinkingContent & { index?: number };

	// Append text content
	if (typeof ev.text === "string" && ev.text) {
		block.thinking += ev.text;
		stream.push({
			type: "thinking_delta",
			contentIndex: thinkingIndex,
			delta: ev.text,
			partial: output,
		});
	}

	// Set thinkingSignature from the last valid tagged block
	// Ignore empty tags and unknown tag prefixes
	if (typeof ev.signature === "string" && ev.signature.length > 0) {
		block.thinkingSignature = `kiro:signature:${ev.signature}`;
	} else if (typeof ev.redactedContent === "string" && ev.redactedContent.length > 0) {
		block.thinkingSignature = `kiro:redactedContent:${ev.redactedContent}`;
	}
}

/**
 * Close the active reasoning block by emitting thinking_end.
 * Called exactly once when a text or tool event arrives.
 * Subsequent reasoning events will start a new block.
 */
export function closeReasoningBlock(
	blocks: Block[],
	output: AssistantMessage,
	stream: AssistantMessageEventStream,
	state: ReasoningBlockState,
): void {
	const thinkingIndex = state.activeThinkingIndex;
	if (thinkingIndex !== undefined && thinkingIndex < blocks.length) {
		const block = blocks[thinkingIndex] as ThinkingContent & { index?: number };
		if (block.type === "thinking") {
			stream.push({
				type: "thinking_end",
				contentIndex: thinkingIndex,
				content: block.thinking,
				partial: output,
			});
		}
	}
	// Clear the active block so the next reasoning event starts fresh
	state.activeThinkingIndex = undefined;
}

/**
 * Finalize remaining thinking block at stream end.
 * Called once when the stream completes without explicit close.
 */
export function closeThinkingBlock(
	blocks: Block[],
	output: AssistantMessage,
	stream: AssistantMessageEventStream,
	state: ReasoningBlockState,
): void {
	closeReasoningBlock(blocks, output, stream, state);
}
