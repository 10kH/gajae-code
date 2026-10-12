// Prints whether agentLoop attached GenAI message content to the chat span.
// Spawned with a controlled cwd so that directory's `.env` is the project
// dotenv the capture switch must ignore.
import { agentLoop } from "@gajae-code/agent-core/agent-loop";
import { GenAIAttr, PiGenAIAttr } from "@gajae-code/agent-core/telemetry";
import type { AgentContext, AgentLoopConfig, AgentMessage } from "@gajae-code/agent-core/types";
import type { Message } from "@gajae-code/ai";
import { createMockModel } from "@gajae-code/ai/providers/mock";
import { context, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";

const CANARY = "gjc-capture-canary";
const ENV_NAME = "OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT";

function identityConverter(messages: AgentMessage[]): Message[] {
	return messages.filter(
		message => message.role === "user" || message.role === "assistant" || message.role === "toolResult",
	) as Message[];
}

async function main(): Promise<void> {
	const beforeLoop = process.env.OTEL_CAPTURE_TRUST_BEFORE_LOOP;
	if (beforeLoop !== undefined) process.env[ENV_NAME] = beforeLoop;
	trace.disable();
	context.disable();
	const contextManager = new AsyncLocalStorageContextManager().enable();
	context.setGlobalContextManager(contextManager);
	const exporter = new InMemorySpanExporter();
	const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
	trace.setGlobalTracerProvider(provider);

	const mock = createMockModel({
		id: "mock-model",
		provider: "mock-provider",
		responses: [{ content: ["ack"], stopReason: "stop" }],
	});
	const warnings: string[] = [];
	const prompts: AgentMessage[] = [{ role: "user", content: CANARY, timestamp: Date.now() }];
	const ctx: AgentContext = { systemPrompt: ["sys-instruction"], messages: [], tools: [] };
	const config: AgentLoopConfig = {
		model: mock.model,
		convertToLlm: identityConverter,
		telemetry: {
			tracer: provider.getTracer("otel-content-capture-trust"),
			onTelemetryWarning: warning => {
				warnings.push(warning.code);
			},
		},
	};

	for await (const _event of agentLoop(prompts, ctx, config, undefined, mock.stream)) {
		// Drain the public agent loop so chat spans finish.
	}

	const chat = exporter.getFinishedSpans().find(span => span.name === "chat mock-model");
	if (!chat) throw new Error("chat span missing");
	const input = chat.attributes[GenAIAttr.InputMessages];
	const request = chat.attributes[PiGenAIAttr.RequestMessages];
	console.log(
		JSON.stringify({
			spanFound: true,
			envValue: process.env[ENV_NAME] ?? null,
			inputMessages: typeof input === "string" ? input : null,
			requestMessages: typeof request === "string" ? request : null,
			warnings,
		}),
	);
	await provider.shutdown();
	context.disable();
	trace.disable();
}

main().catch(error => {
	console.error(error);
	process.exit(1);
});
