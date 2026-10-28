/**
 * Shared parser for Kiro native reasoning events (reasoningContentEvent).
 * Used by both kiro-codewhisperer.ts (OAuth) and kiro-api-key.ts (API key).
 */
import type { AssistantMessage, ThinkingContent } from "../types";
import type { AssistantMessageEventStream } from "../utils/event-stream";

type Block = (ThinkingContent & { index?: number }) | (any & { index?: number });

interface ReasoningContentEventPayload {
	text?: string;
	signature?: string;
	redactedContent?: string;
}

/**
 * Parse a reasoningContentEvent and emit thinking-related stream events.
 * Creates a thinking block if needed and appends text/signature/redactedContent.
 */
export function parseReasoningContentEventHelper(
	ev: ReasoningContentEventPayload,
	blocks: Block[],
	output: AssistantMessage,
	stream: AssistantMessageEventStream,
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

	// Find or create thinking block
	let thinkingIndex = blocks.findIndex(b => b.type === "thinking");
	if (thinkingIndex === -1) {
		thinkingIndex = blocks.length;
		const thinkingBlock: ThinkingContent & { index: number } = {
			type: "thinking",
			thinking: "",
			index: thinkingIndex,
		};
		blocks.push(thinkingBlock);
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

	// Set thinkingSignature from signature or redactedContent
	if (typeof ev.signature === "string") {
		block.thinkingSignature = `kiro:signature:${ev.signature}`;
	} else if (typeof ev.redactedContent === "string") {
		block.thinkingSignature = `kiro:redactedContent:${ev.redactedContent}`;
	}
}

/**
 * Finalize a thinking block by emitting the thinking_end event.
 * Should be called when a thinking block is complete (e.g., on EOF or refusal).
 */
export function closeThinkingBlock(
	blocks: Block[],
	output: AssistantMessage,
	stream: AssistantMessageEventStream,
): void {
	const thinkingIndex = blocks.findIndex(b => b.type === "thinking");
	if (thinkingIndex >= 0) {
		const block = blocks[thinkingIndex] as ThinkingContent & { index?: number };
		stream.push({
			type: "thinking_end",
			contentIndex: thinkingIndex,
			content: block.thinking,
			partial: output,
		});
	}
}
