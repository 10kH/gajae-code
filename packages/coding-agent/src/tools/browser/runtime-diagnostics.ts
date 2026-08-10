import type { CDPSession, Page } from "puppeteer-core";

const MAX_RUNTIME_DIAGNOSTICS = 20;
const ERROR_CLASS = /^[A-Za-z_$][A-Za-z0-9_$]{0,64}$/;

export interface BrowserRuntimeDiagnostic {
	kind: "pageerror" | "console-error";
	at: string;
	url: string;
	line?: number;
	column?: number;
	class?: string;
}

interface ExceptionThrownEvent {
	exceptionDetails?: {
		url?: string;
		lineNumber?: number;
		columnNumber?: number;
		exception?: { className?: string };
	};
}

interface ConsoleCalledEvent {
	type?: string;
	stackTrace?: { callFrames?: Array<{ url?: string; lineNumber?: number; columnNumber?: number }> };
}

export function maskBrowserRuntimeUrl(value: string): string {
	try {
		const url = new URL(value);
		if (url.protocol === "http:" || url.protocol === "https:") {
			return `${url.origin}${url.pathname}${url.search ? "?…" : ""}`;
		}
		if (url.protocol === "about:") return `about:${url.pathname}`;
		return `${url.protocol}…`;
	} catch {
		const marker = value.search(/[?#]/);
		return marker < 0 ? value : `${value.slice(0, marker)}?…`;
	}
}

function finite(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function pageErrorDiagnostic(event: ExceptionThrownEvent, fallbackUrl: string): BrowserRuntimeDiagnostic {
	const details = event.exceptionDetails;
	const className = details?.exception?.className;
	return {
		kind: "pageerror",
		at: new Date().toISOString(),
		url: maskBrowserRuntimeUrl(details?.url || fallbackUrl),
		...(finite(details?.lineNumber) === undefined ? {} : { line: details?.lineNumber }),
		...(finite(details?.columnNumber) === undefined ? {} : { column: details?.columnNumber }),
		...(typeof className === "string" && ERROR_CLASS.test(className) ? { class: className } : {}),
	};
}

export function consoleErrorDiagnostic(
	event: ConsoleCalledEvent,
	fallbackUrl: string,
): BrowserRuntimeDiagnostic | undefined {
	if (event.type !== "error") return undefined;
	const frame = event.stackTrace?.callFrames?.[0];
	return {
		kind: "console-error",
		at: new Date().toISOString(),
		url: maskBrowserRuntimeUrl(frame?.url || fallbackUrl),
		...(finite(frame?.lineNumber) === undefined ? {} : { line: frame?.lineNumber }),
		...(finite(frame?.columnNumber) === undefined ? {} : { column: frame?.columnNumber }),
	};
}

export class BrowserRuntimeDiagnosticsMailbox {
	#entries: BrowserRuntimeDiagnostic[] = [];
	#dropped = 0;

	push(entry: BrowserRuntimeDiagnostic): void {
		if (this.#entries.length === MAX_RUNTIME_DIAGNOSTICS) {
			this.#entries.shift();
			this.#dropped += 1;
		}
		this.#entries.push(entry);
	}

	drain(): { runtimeDiagnostics: BrowserRuntimeDiagnostic[]; runtimeDiagnosticsDropped: number } {
		const runtimeDiagnostics = this.#entries.splice(0);
		const runtimeDiagnosticsDropped = this.#dropped;
		this.#dropped = 0;
		return { runtimeDiagnostics, runtimeDiagnosticsDropped };
	}
}

export async function instrumentBrowserRuntimeDiagnostics(
	page: Page,
	mailbox: BrowserRuntimeDiagnosticsMailbox,
): Promise<CDPSession> {
	const session = await page.target().createCDPSession();
	session.on("Runtime.exceptionThrown", event => {
		mailbox.push(pageErrorDiagnostic(event, page.url()));
	});
	session.on("Runtime.consoleAPICalled", event => {
		const diagnostic = consoleErrorDiagnostic(event, page.url());
		if (diagnostic) mailbox.push(diagnostic);
	});
	try {
		await session.send("Runtime.enable");
		return session;
	} catch (error) {
		await session.detach().catch(() => undefined);
		throw error;
	}
}
