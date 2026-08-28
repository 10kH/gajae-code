import { describe, expect, it } from "bun:test";
import { runUpdateCommand } from "../src/cli/update-cli";

const release = {
	tag: "v999.0.0",
	version: "999.0.0",
	registry: "https://github.com/Yeachan-Heo/gajae-code",
	warnings: [],
};

const target = { method: "binary" as const, path: "/tmp/gjc" };

describe("update telemetry lifecycle", () => {
	it("records a bounded allowlisted check lifecycle without changing update behavior", async () => {
		const events: string[] = [];
		await runUpdateCommand(
			{ force: false, check: true, channel: "stable" },
			{
				resolveUpdateTarget: async () => target,
				getLatestRelease: async () => release,
				recordTelemetryEvent: (event, details) => events.push(`${event}:${details.result ?? ""}`),
			},
		);
		expect(events).toEqual([
			"update_check_started:",
			"update_check_completed:available",
			"update_install_completed:skipped",
		]);
	});

	it("records install success after the verified update path completes", async () => {
		const events: string[] = [];
		await runUpdateCommand(
			{ force: false, check: false, channel: "nightly" },
			{
				resolveUpdateTarget: async () => target,
				getLatestRelease: async () => ({ ...release, version: "999.0.1" }),
				performUpdate: async () => ({ ok: true, path: "/tmp/gjc" }),
				runPostUpdateRecovery: async () => undefined,
				refreshInstalledDefaultSkills: async () => undefined,
				recordTelemetryEvent: (event, details) => events.push(`${event}:${details.result ?? ""}`),
			},
		);
		expect(events).toEqual([
			"update_check_started:",
			"update_check_completed:available",
			"update_install_started:",
			"update_install_completed:installed",
		]);
	});
});
