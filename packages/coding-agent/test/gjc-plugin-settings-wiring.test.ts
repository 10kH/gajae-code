import { describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * The Settings surface is only useful if the runtime evidence the session
 * publishes actually reaches it in production. Component tests inject a fake
 * provider, so they cannot see a missing wire: this suite pins the real
 * publish -> session -> selector-context -> component chain by source
 * inspection, which is what a broken wire would silently change.
 */

const srcRoot = path.join(import.meta.dir, "..", "src");

async function read(relative: string): Promise<string> {
	return await fs.readFile(path.join(srcRoot, relative), "utf8");
}

describe("GJC bundle Settings runtime wiring", () => {
	test("createAgentSession publishes the provider onto the session", async () => {
		const source = await read("sdk/session.ts");
		expect(source).toContain("session.gjcRuntimeSnapshot = gjcRuntimeStore;");
		expect(source).toContain("session.gjcActivationGeneration = gjcActivationGeneration;");
	});

	test("the session type carries the provider and generation", async () => {
		const source = await read("session/agent-session.ts");
		expect(source).toContain("gjcRuntimeSnapshot?: GjcRuntimeSnapshotProvider;");
		expect(source).toContain("gjcActivationGeneration?: number;");
	});

	test("the production selector passes both fields into the settings context", async () => {
		const source = await read("modes/controllers/selector-controller.ts");
		expect(source).toContain("gjcRuntimeSnapshot: this.ctx.session.gjcRuntimeSnapshot");
		expect(source).toContain("gjcActivationGeneration: this.ctx.session.gjcActivationGeneration");
	});

	test("the settings selector forwards them into the component dependencies", async () => {
		const source = await read("modes/components/settings-selector.ts");
		expect(source).toContain("runtimeSnapshotProvider: this.context.gjcRuntimeSnapshot");
		expect(source).toContain("activationGeneration: this.context.gjcActivationGeneration");
	});

	test("publication happens only after the last producer", async () => {
		const source = await read("sdk/session.ts");
		const appendix = source.indexOf("renderAlwaysOnSystemAppendices({ cwd })");
		const publish = source.indexOf("gjcRuntimeStore.publish(");
		expect(appendix).toBeGreaterThan(-1);
		expect(publish).toBeGreaterThan(appendix);
		// Exactly one publication site, guarded by the completeness flag.
		expect(source.split("gjcRuntimeStore.publish(").length - 1).toBe(1);
		expect(source).toContain("if (gjcProducersComplete) gjcRuntimeStore.publish(");
	});
});
