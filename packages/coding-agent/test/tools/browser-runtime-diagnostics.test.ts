import { describe, expect, it, vi } from "bun:test";
import {
	BrowserRuntimeDiagnosticsMailbox,
	consoleErrorDiagnostic,
	instrumentBrowserRuntimeDiagnostics,
	maskBrowserRuntimeUrl,
	pageErrorDiagnostic,
} from "@gajae-code/coding-agent/tools/browser/runtime-diagnostics";

describe("browser runtime diagnostics", () => {
	it("masks query strings and non-web URL payloads", () => {
		expect(maskBrowserRuntimeUrl("https://example.com/callback?token=secret#done")).toBe(
			"https://example.com/callback?…",
		);
		expect(maskBrowserRuntimeUrl("about:blank?token=secret")).toBe("about:blank");
		expect(maskBrowserRuntimeUrl("data:text/plain,secret")).toBe("data:…");
	});

	it("keeps only bounded page-error metadata", () => {
		const diagnostic = pageErrorDiagnostic(
			{
				exceptionDetails: {
					url: "https://example.com/app.js?credential=secret",
					lineNumber: 12,
					columnNumber: 4,
					exception: { className: "TypeError" },
					text: "secret message",
				} as never,
			},
			"https://fallback.invalid/?secret",
		);

		expect(diagnostic).toMatchObject({
			kind: "pageerror",
			url: "https://example.com/app.js?…",
			line: 12,
			column: 4,
			class: "TypeError",
		});
		expect(JSON.stringify(diagnostic)).not.toContain("secret");
	});

	it("accepts console errors but ignores other console levels and argument values", () => {
		const error = consoleErrorDiagnostic(
			{
				type: "error",
				stackTrace: {
					callFrames: [{ url: "https://example.com/ui.js?token=secret", lineNumber: 8, columnNumber: 2 }],
				},
				args: [{ value: "secret argument" }],
			} as never,
			"https://fallback.invalid/",
		);
		expect(error).toMatchObject({
			kind: "console-error",
			url: "https://example.com/ui.js?…",
			line: 8,
			column: 2,
		});
		expect(JSON.stringify(error)).not.toContain("secret");
		expect(consoleErrorDiagnostic({ type: "warning" }, "https://example.com/")).toBeUndefined();
	});

	it("subscribes through CDP and records only runtime error events", async () => {
		const handlers = new Map<string, (event: never) => void>();
		const send = vi.fn(async () => ({}));
		const session = {
			on: (name: string, handler: (event: never) => void) => handlers.set(name, handler),
			send,
		};
		const page = {
			target: () => ({ createCDPSession: async () => session }),
			url: () => "https://example.com/current?token=secret",
		};
		const mailbox = new BrowserRuntimeDiagnosticsMailbox();

		const attached = await instrumentBrowserRuntimeDiagnostics(page as never, mailbox);
		expect(attached).toBe(session as never);
		expect(send).toHaveBeenCalledWith("Runtime.enable");

		handlers.get("Runtime.exceptionThrown")?.({
			exceptionDetails: {
				url: "https://example.com/app.js?token=secret",
				lineNumber: 3,
				exception: { className: "TypeError", description: "secret message" },
			},
		} as never);
		handlers.get("Runtime.consoleAPICalled")?.({ type: "warning" } as never);
		handlers.get("Runtime.consoleAPICalled")?.({
			type: "error",
			args: [{ value: "secret argument" }],
		} as never);

		const drained = mailbox.drain();
		expect(drained.runtimeDiagnostics.map(entry => entry.kind)).toEqual(["pageerror", "console-error"]);
		expect(JSON.stringify(drained)).not.toContain("secret");
	});

	it("retains the newest twenty entries, counts evictions, and drains once", () => {
		const mailbox = new BrowserRuntimeDiagnosticsMailbox();
		for (let index = 0; index < 22; index += 1) {
			mailbox.push({
				kind: "console-error",
				at: `2026-08-10T00:00:${String(index).padStart(2, "0")}.000Z`,
				url: `https://example.com/${index}`,
			});
		}

		const first = mailbox.drain();
		expect(first.runtimeDiagnostics).toHaveLength(20);
		expect(first.runtimeDiagnostics[0]?.url).toBe("https://example.com/2");
		expect(first.runtimeDiagnostics.at(-1)?.url).toBe("https://example.com/21");
		expect(first.runtimeDiagnosticsDropped).toBe(2);
		expect(mailbox.drain()).toEqual({ runtimeDiagnostics: [], runtimeDiagnosticsDropped: 0 });
	});
});
