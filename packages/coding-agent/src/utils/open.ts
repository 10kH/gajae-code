/** Open an http(s) URL or local path. Best-effort, never throws. */
const ALLOWED_OPEN_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Zero-width and non-ASCII spaces. ASCII controls are rejected, not stripped:
 * the URL parser drops some of them and would turn a hostile string into a clean href.
 */
const OUTER_FORMAT = /[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF\u200B\u2060]/;

function hasAsciiControl(value: string): boolean {
	for (let i = 0; i < value.length; i++) {
		const code = value.charCodeAt(i);
		if (code <= 0x1f || code === 0x7f) return true;
	}
	return false;
}

function stripOuterFormat(value: string): string {
	let start = 0;
	let end = value.length;
	while (start < end && OUTER_FORMAT.test(value.charAt(start))) start++;
	while (end > start && OUTER_FORMAT.test(value.charAt(end - 1))) end--;
	return start === 0 && end === value.length ? value : value.slice(start, end);
}

/** Drive paths parse as one-letter schemes (`c:`). Recognize them before that check. */
function isWindowsDrivePath(value: string): boolean {
	return /^[A-Za-z]:[\\/]/.test(value);
}

function resolveOpenTarget(urlOrPath: string): string | undefined {
	if (hasAsciiControl(urlOrPath)) return undefined;
	const trimmed = stripOuterFormat(urlOrPath.trim());
	if (trimmed.length === 0 || trimmed.startsWith("-")) return undefined;
	if (isWindowsDrivePath(trimmed)) return trimmed;
	try {
		const parsed = new URL(trimmed);
		if (!ALLOWED_OPEN_PROTOCOLS.has(parsed.protocol)) return undefined;
		if (hasAsciiControl(parsed.href)) return undefined;
		return parsed.href;
	} catch {
		// Unparsed scheme-shaped tokens are not local paths. A looser opener parser could still accept them.
		if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(trimmed)) return undefined;
		return trimmed;
	}
}

export function openPath(urlOrPath: string): void {
	const target = resolveOpenTarget(urlOrPath);
	if (target === undefined) return;
	let cmd: string[];
	switch (process.platform) {
		case "darwin":
			cmd = ["open", target];
			break;
		case "win32":
			cmd = ["rundll32", "url.dll,FileProtocolHandler", target];
			break;
		default:
			cmd = ["xdg-open", target];
			break;
	}
	try {
		Bun.spawn(cmd, { stdin: "ignore", stdout: "ignore", stderr: "ignore" });
	} catch {
		// Best-effort: browser opening is non-critical
	}
}
