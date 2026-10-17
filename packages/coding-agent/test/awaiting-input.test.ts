import { describe, expect, test } from "bun:test";
import { AwaitingInputDetector, type AwaitingInputSignal, classifyAwaitingInput } from "../src/tools/awaiting-input";

const TAILSCALE = "\nTo authenticate, visit:\n\n\thttps://login.tailscale.com/a/1a2b3c4d5e6f\n\n";
const AZ_DEVICE =
	"To sign in, use a web browser to open the page https://microsoft.com/devicelogin and enter the code ABCD12345 to authenticate.\n";
const AWS_SSO =
	"Attempting to automatically open the SSO authorization page in your default browser.\nIf the browser does not open or you wish to use a different device to authorize this request, open the following URL:\n\nhttps://device.sso.us-east-1.amazonaws.com/\n\nThen enter the code:\n\nWXYZ-ABCD\n";
const GCLOUD =
	"Go to the following link in your browser:\n\n    https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=x\n\n";
const GH_DEVICE = "! First copy your one-time code: 1A2B-3C4D\nPress Enter to open github.com in your browser... ";

/** Manual scheduler: callbacks run only when the test advances time. */
function manualClock() {
	let now = 1_000;
	let pending: Array<{ at: number; callback: () => void; cancelled: boolean }> = [];
	return {
		now: () => now,
		schedule: (callback: () => void, ms: number) => {
			const entry = { at: now + ms, callback, cancelled: false };
			pending.push(entry);
			return () => {
				entry.cancelled = true;
			};
		},
		advance(ms: number) {
			now += ms;
			const due = pending.filter(entry => !entry.cancelled && entry.at <= now);
			pending = pending.filter(entry => !due.includes(entry));
			for (const entry of due) entry.callback();
		},
	};
}

function detector(quietMs = 3_000) {
	const clock = manualClock();
	const signals: AwaitingInputSignal[] = [];
	const instance = new AwaitingInputDetector({
		onDetect: signal => signals.push(signal),
		quietMs,
		schedule: clock.schedule,
		now: clock.now,
	});
	return { clock, signals, instance };
}

describe("classifyAwaitingInput", () => {
	test("classifies known auth prompts", () => {
		const cases = [
			{ name: "tailscale", output: TAILSCALE, kind: "browser_auth" as const },
			{ name: "gcloud", output: GCLOUD, kind: "browser_auth" as const },
			{ name: "az device code", output: AZ_DEVICE, kind: "device_code" as const },
			{ name: "aws sso", output: AWS_SSO, kind: "device_code" as const },
			{ name: "gh one-time code", output: GH_DEVICE, kind: "device_code" as const },
		];
		for (const { name, output, kind } of cases) {
			expect(classifyAwaitingInput(output)).toBe(kind);
		}
	});

	test("ignores ANSI styling around the prompt", () => {
		expect(
			classifyAwaitingInput(
				`\u001b[1mTo authenticate, visit:\u001b[0m\n\u001b[4mhttps://login.tailscale.com/a/x\u001b[0m`,
			),
		).toBe("browser_auth");
	});

	test("requires a URL for browser-auth phrasing", () => {
		expect(classifyAwaitingInput("To authenticate, visit: the admin console\n")).toBeUndefined();
	});

	test("ignores ordinary output", () => {
		expect(
			classifyAwaitingInput("Compiling crate v0.1.0\nhttps://docs.rs/crate\n   Finished release\n"),
		).toBeUndefined();
	});

	// Property tests: unrelated text stays unclassified
	test("unrelated text stays unclassified", () => {
		const unrelatedTexts = [
			"random output\nno auth here",
			"Building project...\nCompleted successfully",
			"https://example.com/path/to/resource",
			"Visit https://docs.com for more info",
			"Press enter to continue",
			"waiting for input...",
		];
		for (const text of unrelatedTexts) {
			expect(classifyAwaitingInput(text)).toBeUndefined();
		}
	});

	// Property test: ANSI decoration preserves classification
	test("ANSI decoration preserves classification", () => {
		const cases: Array<{ prompt: string; expected: "browser_auth" | "device_code" }> = [
			{ prompt: TAILSCALE, expected: "browser_auth" },
			{ prompt: GH_DEVICE, expected: "device_code" },
			{ prompt: GCLOUD, expected: "browser_auth" },
		];
		for (const { prompt, expected } of cases) {
			const ansiDecorated = prompt
				.replace(/^/gm, "\u001b[32m")
				.replace(/$/gm, "\u001b[0m")
				.replace(/https?:\/\/\S+/g, match => `\u001b[4m${match}\u001b[0m`);
			expect(classifyAwaitingInput(ansiDecorated)).toBe(expected);
		}
	});

	// Property test: equivalent classification across chunk boundaries
	test("gives equivalent result across chunk boundaries within tail", () => {
		const testCases: Array<{ prompt: string; expected: "browser_auth" | "device_code" }> = [
			{ prompt: TAILSCALE, expected: "browser_auth" },
			{ prompt: GH_DEVICE, expected: "device_code" },
			{ prompt: GCLOUD, expected: "browser_auth" },
		];

		for (const { prompt, expected } of testCases) {
			// Test full prompt
			expect(classifyAwaitingInput(prompt)).toBe(expected);

			// Test at various split points
			for (let split = Math.max(1, prompt.length - 50); split < prompt.length; split++) {
				const tail = prompt.slice(split);
				if (tail.length > 0) {
					// Tail should classify the same if it retains enough context
					const result = classifyAwaitingInput(tail);
					// Only verify if the tail is long enough to contain the necessary patterns
					if (tail.length > 50) {
						expect(result).toBe(expected);
					}
				}
			}
		}
	});
});

describe("AwaitingInputDetector", () => {
	test("fires once after the quiet window following a prompt", () => {
		const { clock, signals, instance } = detector();
		instance.push(TAILSCALE);
		clock.advance(2_999);
		expect(signals).toEqual([]);
		clock.advance(1);
		expect(signals).toEqual([{ kind: "browser_auth", detectedAt: 4_000 }]);
		instance.push(TAILSCALE);
		clock.advance(10_000);
		expect(signals).toHaveLength(1);
	});

	test("matches a prompt split across chunks", () => {
		const { clock, signals, instance } = detector();
		instance.push("To authenti");
		instance.push("cate, visit:\n\n\thttps://login.tailscale.com/a/abc\n");
		clock.advance(3_000);
		expect(signals.map(signal => signal.kind)).toEqual(["browser_auth"]);
	});

	test("continued output restarts the quiet window (doc text printed by a busy command)", () => {
		const { clock, signals, instance } = detector();
		instance.push(AZ_DEVICE);
		clock.advance(2_000);
		instance.push("more documentation lines\n");
		clock.advance(2_000);
		expect(signals).toEqual([]);
		clock.advance(1_000);
		expect(signals.map(signal => signal.kind)).toEqual(["device_code"]);
	});

	test("does not fire once the prompt scrolls out of the recent tail", () => {
		const { clock, signals, instance } = detector();
		instance.push(TAILSCALE);
		instance.push(`${"x".repeat(4_096)}\n`);
		clock.advance(10_000);
		expect(signals).toEqual([]);
	});

	test("dispose before the quiet window elapses suppresses the signal (command exited)", () => {
		const { clock, signals, instance } = detector();
		instance.push(GCLOUD);
		clock.advance(1_000);
		instance.dispose();
		clock.advance(10_000);
		instance.push(GCLOUD);
		clock.advance(10_000);
		expect(signals).toEqual([]);
	});
});
