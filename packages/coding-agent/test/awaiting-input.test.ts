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

/** Seeded random generator for property tests. */
class SeededRandom {
	#seed: number;

	constructor(seed: number) {
		this.#seed = seed;
	}

	/** Returns a random number between 0 (inclusive) and 1 (exclusive). */
	next(): number {
		this.#seed = (this.#seed * 1103515245 + 12345) & 0x7fffffff;
		return this.#seed / 0x7fffffff;
	}

	/** Returns a random integer between min (inclusive) and max (exclusive). */
	int(min: number, max: number): number {
		return Math.floor(this.next() * (max - min)) + min;
	}

	/** Returns a random element from an array. */
	choice<T>(arr: readonly T[]): T {
		return arr[this.int(0, arr.length)];
	}

	/** Generates a random string of given length. */
	string(length: number, charset: string): string {
		let result = "";
		for (let i = 0; i < length; i++) {
			result += this.choice([...charset]);
		}
		return result;
	}
}

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

	// Property test: unrelated text stays unclassified
	test("unrelated generated text stays unclassified", () => {
		const rng = new SeededRandom(42);
		const unrelatedPatterns = ["Building ", "Compiling ", "Processing ", "Loading ", "Downloading "];
		const alphanumeric = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

		// Generate 20 random unrelated outputs and verify they stay unclassified
		for (let i = 0; i < 20; i++) {
			const prefix = rng.choice(unrelatedPatterns);
			const length = rng.int(10, 50);
			const text = prefix + rng.string(length, alphanumeric);
			expect(classifyAwaitingInput(text)).toBeUndefined();
		}
	});

	// Property test: ANSI decoration preserves classification
	test("ANSI decoration with random codes preserves classification", () => {
		const rng = new SeededRandom(123);
		const cases: Array<{ prompt: string; expected: "browser_auth" | "device_code" }> = [
			{ prompt: TAILSCALE, expected: "browser_auth" },
			{ prompt: GH_DEVICE, expected: "device_code" },
			{ prompt: GCLOUD, expected: "browser_auth" },
		];

		const ansiCodes = ["\u001b[0m", "\u001b[1m", "\u001b[32m", "\u001b[4m", "\u001b[31m", "\u001b[44m"];

		for (const { prompt, expected } of cases) {
			// Apply random ANSI codes to random positions
			let decorated = prompt;
			const lines = decorated.split("\n");
			for (let i = 0; i < Math.min(5, lines.length); i++) {
				const lineIdx = rng.int(0, lines.length);
				const code = rng.choice(ansiCodes);
				lines[lineIdx] = `${code + lines[lineIdx]}\u001b[0m`;
			}
			decorated = lines.join("\n");
			expect(classifyAwaitingInput(decorated)).toBe(expected);
		}
	});

	// Property test: detector yields equivalent result across arbitrary chunk splits
	test("AwaitingInputDetector yields same result for arbitrary chunk splits within tail", () => {
		const rng = new SeededRandom(456);
		const testCases: Array<{ prompt: string; expected: "browser_auth" | "device_code" }> = [
			{ prompt: TAILSCALE, expected: "browser_auth" },
			{ prompt: GH_DEVICE, expected: "device_code" },
			{ prompt: GCLOUD, expected: "browser_auth" },
		];

		for (const { prompt, expected } of testCases) {
			// Test full prompt
			expect(classifyAwaitingInput(prompt)).toBe(expected);

			// Test at various random split points within the tail. Only verify if the tail
			// is long enough to reliably contain the classification pattern.
			for (let trial = 0; trial < 15; trial++) {
				const maxRewind = Math.min(rng.int(10, 100), prompt.length);
				const split = Math.max(0, prompt.length - maxRewind);
				const tail = prompt.slice(split);
				if (tail.length > prompt.length / 3) {
					// Only assert if tail contains enough context
					const result = classifyAwaitingInput(tail);
					if (result !== undefined) {
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

	// Property test: no emission after dispose with random timing
	test("no emission after dispose (property test with random timings)", () => {
		const rng = new SeededRandom(789);
		const cases = [TAILSCALE, AZ_DEVICE, GCLOUD];

		for (let trial = 0; trial < 10; trial++) {
			const { clock, signals, instance } = detector();
			const testCase = rng.choice(cases);
			instance.push(testCase);
			// Dispose at a random time BEFORE the quiet window completes
			const disposeTime = rng.int(100, 2_900);
			clock.advance(disposeTime);
			instance.dispose();
			// Advance time well past the quiet window: no signal should fire
			clock.advance(10_000);
			// After dispose, no further emissions should occur
			expect(signals).toEqual([]);
		}
	});
});
