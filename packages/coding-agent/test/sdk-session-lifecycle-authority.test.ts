import { describe, expect, test } from "bun:test";
import * as path from "node:path";

const packageRoot = path.resolve(import.meta.dir, "..");
const source = (relativePath: string): Promise<string> => Bun.file(path.join(packageRoot, relativePath)).text();

const providerAuthorityFiles = [
	"src/sdk/bus/chat-daemon-runtime.ts",
	"src/sdk/bus/discord-daemon.ts",
	"src/sdk/bus/slack-daemon.ts",
	"src/sdk/bus/telegram-daemon.ts",
	"src/sdk/bus/existing-thread-readiness.ts",
	"src/sdk/bus/slack-thread-binding.ts",
] as const;

const forbiddenProviderAuthorities = [
	"readSdkBrokerDiscovery",
	"readSdkSessionEndpoint",
	"SdkSessionEndpoint",
	"SessionIndex",
	"lifecycle-control-runtime",
	"lifecycle-orchestrator",
	"createNativeControlServer",
	"createLifecycleControlServer",
	"createLifecycleOrchestratorDeps",
	"intendedSessionId",
	"scanRoots",
	"registerNotificationRoot",
	"unregisterNotificationRoot",
	"notificationRootRegistration",
	"notificationRootForCwd",
	"WebSocketImpl",
] as const;

describe("SDK-owned session lifecycle authority", () => {
	test("provider and presentation modules cannot import lifecycle or endpoint authority", async () => {
		for (const relativePath of providerAuthorityFiles) {
			const contents = await source(relativePath);
			for (const forbidden of forbiddenProviderAuthorities) {
				expect(contents, `${relativePath} retains forbidden authority ${forbidden}`).not.toContain(forbidden);
			}
		}
		const telegram = await source("src/sdk/bus/telegram-daemon.ts");
		for (const forbidden of ["connectSession(", "readEndpoint("] as const)
			expect(telegram, `telegram-daemon.ts retains forbidden authority ${forbidden}`).not.toContain(forbidden);
	});

	test("only SDK core modules read Broker and session endpoint discovery", async () => {
		const router = await source("src/sdk/router/session-router.ts");
		const lifecycleClient = await source("src/sdk/lifecycle/client.ts");
		expect(router).toContain("readSdkSessionEndpoint");
		expect(router).toContain("readSdkBrokerDiscovery");
		expect(lifecycleClient).toContain("readSdkBrokerDiscovery");
	});

	test("providers consume opaque Router attachments", async () => {
		for (const relativePath of [
			"src/sdk/bus/chat-daemon-runtime.ts",
			"src/sdk/bus/discord-daemon.ts",
			"src/sdk/bus/slack-daemon.ts",
		] as const) {
			const contents = await source(relativePath);
			expect(contents).toContain("SessionAttachment");
			expect(contents).not.toMatch(/endpoint\.(?:url|token|path|pid)/);
		}
	});
});
