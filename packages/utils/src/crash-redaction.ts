/**
 * Best-effort credential scrubbing for durable crash records.
 *
 * This is a *persistence-time* scrub: it keeps obvious credential shapes out of
 * a file GJC keeps indefinitely. It is explicitly NOT a privacy guarantee and
 * must never be treated as one for data that leaves the machine — outbound
 * text goes through `sanitizeExternalCrashV1` instead.
 */

const CREDENTIAL_KEY_LABELS =
	"api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|id[_-]?token|session[_-]?key|session[_-]?token|client[_-]?secret|aws[_-]?secret[_-]?access[_-]?key|secret[_-]?key|secret[_-]?access[_-]?key|password|passwd|auth|authorization|bearer|private[_-]?token|token|secrets?|credentials?|private[_-]?key|cookie";
const CREDENTIAL_KEY_PATTERN = `(?:[A-Za-z0-9][A-Za-z0-9_-]*[_-])?(?:${CREDENTIAL_KEY_LABELS})`;
const CREDENTIAL_KEY_SUFFIX = new RegExp(`^${CREDENTIAL_KEY_PATTERN}$`, "i");
const CREDENTIAL_ASSIGNMENT_PREFIX = String.raw`(?<![A-Za-z0-9_-])((?:\\*["']?-*)(?:${CREDENTIAL_KEY_PATTERN})(?:\\*["']?\s*[=:]\s*))`;
const CREDENTIAL_AUTH_VALUE_PATTERN = new RegExp(
	String.raw`${CREDENTIAL_ASSIGNMENT_PREFIX}(?:Bearer|Basic|Token)\s+(?:\\[ \t]|[^\s"',;}\]])+`,
	"gi",
);
const CREDENTIAL_VALUE_PATTERN = new RegExp(
	String.raw`${CREDENTIAL_ASSIGNMENT_PREFIX}(?:(\\+")((?:\\[\s\S]|[^"\\])*?)(\\+")(?=$|[\s,;}\]])|(")((?:\\[\s\S]|[^"\\])*)(")|(\\+')((?:\\[\s\S]|[^'\\])*?)(\\+')(?=$|[\s,;}\]])|(')((?:\\[\s\S]|[^'\\])*)(')|(\\+")([^\r\n]*)(?=\r?\n|$)|(")([^\r\n]*)(?=\r?\n|$)|(\\+')([^\r\n]*)(?=\r?\n|$)|(')([^\r\n]*)(?=\r?\n|$)|((?:\\[ \t]|[^\s"',;}\]])+))`,
	"gi",
);

/** Whether a field name ends in a credential label recognized by the redactor. */
export function isCredentialKey(key: string): boolean {
	return CREDENTIAL_KEY_SUFFIX.test(key);
}

/**
 * Scrub credential material from crash text before it is persisted.
 * Covers bearer/basic-style headers, key=value or JSON key forms of common
 * credential names, and well-known vendor token shapes. Normal messages and
 * stack frames are untouched; matches are replaced in place so surrounding
 * diagnostic context survives.
 */
export function redactCrashSecrets(text: string): string {
	let redacted = redactCredentialContainers(text);
	redacted = redacted.replace(/\b(?:Bearer|Basic|Token)\s+[A-Za-z0-9._~+/=-]{8,}/gi, "«redacted-auth»");
	redacted = redacted.replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "«redacted-jwt»");
	redacted = redacted.replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "«redacted-api-key»");
	// `gh[opsur]_` covers the classic PAT/OAuth/server/user/refresh prefixes;
	// fine-grained PATs use an entirely different `github_pat_` prefix and would
	// otherwise survive into a log the module keeps indefinitely.
	redacted = redacted.replace(/\bgh[opsur]_[A-Za-z0-9]{16,}\b/g, "«redacted-github-token»");
	redacted = redacted.replace(/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, "«redacted-github-token»");
	redacted = redacted.replace(/\bxox[baprs]-[A-Za-z0-9-]{8,}\b/g, "«redacted-slack-token»");
	// The five shapes below are the ones `crash/upstream/envelope.ts` already
	// classifies as credential-like and refuses to transmit. That refusal only
	// guards the Sentry frame fields; the persisted crash log and the
	// `gjc crash report` body — which the user files as a public issue — reach
	// egress through this function alone, so the same shapes have to be named here.
	redacted = redacted.replace(/\bnpm_[A-Za-z0-9]{20,}\b/g, "«redacted-npm-token»");
	redacted = redacted.replace(/\bglpat-[A-Za-z0-9_-]{20,}\b/g, "«redacted-gitlab-token»");
	// Stripe separates with `_`, so the `sk-` rule above never matched one.
	redacted = redacted.replace(/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g, "«redacted-api-key»");
	redacted = redacted.replace(/\bhf_[A-Za-z0-9]{20,}\b/g, "«redacted-api-key»");
	// A PEM block carries the key material itself, so it is redacted whole rather
	// than line by line. It runs before the narrower rules because they would
	// otherwise chew on the base64 body and leave a truncated key behind.
	redacted = redacted.replace(
		/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g,
		"«redacted-private-key»",
	);
	// Google API keys are a fixed 39-character shape that carries no label of its
	// own, so the labeled-value rule below never sees one.
	redacted = redacted.replace(
		/(?<![A-Za-z0-9_-])AIza[0-9A-Za-z_-]{35}(?![A-Za-z0-9_-])/g,
		"«redacted-google-api-key»",
	);
	// Basic-auth credentials embedded in a URL. Scheme and host stay readable
	// because they are the diagnostic value; only the userinfo is dropped. The
	// scheme repetition is bounded: an unbounded `[a-z0-9+.-]*` in front of the
	// literal `://` re-tries every prefix of a long alphabetic run, which is
	// quadratic in input length and costs ~10s on a 200 KB crash body.
	redacted = redacted.replace(
		/(?<![A-Za-z0-9+.-])([a-z][a-z0-9+.-]{0,15}:\/\/)[^/\s:@]{1,256}(?::[^/\s@]*)?@/gi,
		"$1«redacted-url-credential»@",
	);
	// AKIA is the long-term access key id; ASIA is the temporary/STS one, which is
	// the shape that actually shows up in a crashed request. ABIA (bearer) and
	// ACCA (context) complete the set the session-import scrubber already lists.
	// The id alone is not
	// the credential: an STS payload carries `SecretAccessKey` and `SessionToken`
	// alongside it, so the labeled-value rule below must name both. `secret_key`
	// does not match `SecretAccessKey` (the canonical field has `Access` in the
	// middle), and `access_token` does not match `SessionToken`.
	redacted = redacted.replace(/\b(?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/g, "«redacted-aws-key»");
	// Cookie headers contain multiple semicolon-separated values; redacting only
	// the first pair would leave later session cookies visible in exported text.
	redacted = redacted.replace(
		/(?:(?<![A-Za-z0-9_-])|(?<=\\n))((?:set-)?cookie\s*:\s*)(?:(?!\\+n|\\+r\\+n)[^\r\n])*/gi,
		"$1«redacted»",
	);
	redacted = redacted.replace(CREDENTIAL_AUTH_VALUE_PATTERN, (_match, prefix: string) => `${prefix}«redacted»`);
	// Escaped delimiters support JSON nested in diagnostic strings. Their quoted
	// branch stops at a closing delimiter followed by a field boundary, while an
	// unterminated value is redacted through the end of its line. Capture each
	// complete key once and inspect its suffix; repeated compound-prefix groups
	// backtrack quadratically on long attacker-controlled identifiers.
	redacted = redacted.replace(
		CREDENTIAL_VALUE_PATTERN,
		(
			_match: string,
			prefix: string,
			escapedDoubleOpen: string | undefined,
			escapedDoubleQuoted: string | undefined,
			escapedDoubleClose: string | undefined,
			doubleOpen: string | undefined,
			doubleQuoted: string | undefined,
			doubleClose: string | undefined,
			escapedSingleOpen: string | undefined,
			escapedSingleQuoted: string | undefined,
			escapedSingleClose: string | undefined,
			singleOpen: string | undefined,
			singleQuoted: string | undefined,
			singleClose: string | undefined,
			unclosedEscapedDoubleOpen: string | undefined,
			unclosedEscapedDoubleQuoted: string | undefined,
			unclosedDoubleOpen: string | undefined,
			unclosedDoubleQuoted: string | undefined,
			unclosedEscapedSingleOpen: string | undefined,
			unclosedEscapedSingleQuoted: string | undefined,
			unclosedSingleOpen: string | undefined,
			unclosedSingleQuoted: string | undefined,
		) => {
			if (escapedDoubleQuoted !== undefined && escapedDoubleOpen !== undefined && escapedDoubleClose !== undefined) {
				return `${prefix}${escapedDoubleOpen}«redacted»${escapedDoubleClose}`;
			}
			if (doubleQuoted !== undefined && doubleOpen !== undefined && doubleClose !== undefined) {
				return `${prefix}${doubleOpen}«redacted»${doubleClose}`;
			}
			if (escapedSingleQuoted !== undefined && escapedSingleOpen !== undefined && escapedSingleClose !== undefined) {
				return `${prefix}${escapedSingleOpen}«redacted»${escapedSingleClose}`;
			}
			if (singleQuoted !== undefined && singleOpen !== undefined && singleClose !== undefined) {
				return `${prefix}${singleOpen}«redacted»${singleClose}`;
			}
			if (unclosedEscapedDoubleQuoted !== undefined && unclosedEscapedDoubleOpen !== undefined) {
				return `${prefix}${unclosedEscapedDoubleOpen}«redacted»`;
			}
			if (unclosedDoubleQuoted !== undefined && unclosedDoubleOpen !== undefined) {
				return `${prefix}${unclosedDoubleOpen}«redacted»`;
			}
			if (unclosedEscapedSingleQuoted !== undefined && unclosedEscapedSingleOpen !== undefined) {
				return `${prefix}${unclosedEscapedSingleOpen}«redacted»`;
			}
			if (unclosedSingleQuoted !== undefined && unclosedSingleOpen !== undefined) {
				return `${prefix}${unclosedSingleOpen}«redacted»`;
			}
			return `${prefix}«redacted»`;
		},
	);
	return redacted;
}

function redactCredentialContainers(text: string): string {
	const assignment = new RegExp(String.raw`${CREDENTIAL_ASSIGNMENT_PREFIX}(?=[\[{])`, "gi");
	let output = "";
	let copiedUntil = 0;
	for (let match = assignment.exec(text); match !== null; match = assignment.exec(text)) {
		const containerStart = assignment.lastIndex;
		if (containerStart < copiedUntil) continue;
		const containerEnd = findCredentialContainerEnd(text, containerStart);
		output += `${text.slice(copiedUntil, containerStart)}«redacted»`;
		copiedUntil = containerEnd;
		assignment.lastIndex = containerEnd;
	}
	return copiedUntil === 0 ? text : output + text.slice(copiedUntil);
}

function findCredentialContainerEnd(text: string, start: number): number {
	const closing = [text[start] === "[" ? "]" : "}"];
	let quote: "'" | '"' | undefined;
	let escaped = false;
	for (let index = start + 1; index < text.length; index++) {
		const character = text[index] ?? "";
		if (escaped) {
			escaped = false;
			continue;
		}
		if (character === "\\") {
			escaped = true;
			continue;
		}
		if (quote) {
			if (character === quote) quote = undefined;
			continue;
		}
		if (character === '"' || character === "'") {
			quote = character;
			continue;
		}
		if (character === "[") closing.push("]");
		else if (character === "{") closing.push("}");
		else if (character === closing[closing.length - 1]) {
			closing.pop();
			if (closing.length === 0) return index + 1;
		}
	}
	return text.length;
}

/** Every placeholder `redactCrashSecrets` can emit. Used by downstream normalizers. */
export const CRASH_REDACTION_MARKERS: readonly string[] = [
	"«redacted-auth»",
	"«redacted-jwt»",
	"«redacted-api-key»",
	"«redacted-github-token»",
	"«redacted-slack-token»",
	"«redacted-npm-token»",
	"«redacted-gitlab-token»",
	"«redacted-aws-key»",
	"«redacted-private-key»",
	"«redacted-google-api-key»",
	"«redacted-url-credential»",
	"«redacted»",
];
