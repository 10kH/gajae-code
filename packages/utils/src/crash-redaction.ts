/**
 * Best-effort credential scrubbing for durable crash records.
 *
 * This is a *persistence-time* scrub: it keeps obvious credential shapes out of
 * a file GJC keeps indefinitely. It is explicitly NOT a privacy guarantee and
 * must never be treated as one for data that leaves the machine — outbound
 * text goes through `sanitizeExternalCrashV1` instead.
 */

const CREDENTIAL_KEY_LABELS =
	"api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|id[_-]?token|session[_-]?key|session[_-]?token|client[_-]?secret|aws[_-]?secret[_-]?access[_-]?key|secret[_-]?key|secret[_-]?access[_-]?key|encryption[_-]?key|signing[_-]?key|password|passwd|pwd|passphrase|auth|authorization|bearer|private[_-]?token|token|secrets?|credentials?|private[_-]?key|cookie";
const CREDENTIAL_KEY_PREFIX = `(?:[A-Za-z0-9][A-Za-z0-9_-]*[_-])?`;
const CREDENTIAL_KEY_PATTERN = `${CREDENTIAL_KEY_PREFIX}(?:${CREDENTIAL_KEY_LABELS})`;
const CREDENTIAL_KEY_SUFFIX = new RegExp(`^${CREDENTIAL_KEY_PATTERN}$`, "i");
const CREDENTIAL_CAMEL_COMPOUND_SUFFIXES =
	"AccessToken|RefreshToken|IdToken|SessionToken|ClientSecret|EncryptionKey|SigningKey";
const CREDENTIAL_CAMEL_SIMPLE_SUFFIXES =
	"SecretAccessKey|Authorization|Credentials|Credential|ApiKey|SecretKey|PrivateKey|SessionKey|Passphrase|Password|Passwd|Pwd|Secrets|Secret|Bearer|Cookie|Token|Auth";
const CREDENTIAL_CAMEL_PREFIX = "(?:[a-z0-9]+(?:[A-Z]{2,})?|[A-Z][a-z0-9]+(?:[A-Z]{2,})?|[A-Z]{2,})";
const CREDENTIAL_CAMEL_COMPOUND_PREFIX = "(?:[a-z0-9]{2,}(?:[A-Z]{2,})?|[A-Z][a-z0-9]+(?:[A-Z]{2,})?|[A-Z]{2,})";
const CREDENTIAL_CAMEL_MULTI_PREFIX_SEGMENT = "(?:[A-Z][a-z0-9]+|[A-Z]{2,}(?=[A-Z][a-z0-9]))";
const CREDENTIAL_CAMEL_MULTI_PREFIX = `(?:[a-z0-9]{2,}|[A-Z][a-z0-9]+|[A-Z]{2,})(?:${CREDENTIAL_CAMEL_MULTI_PREFIX_SEGMENT})+(?:[A-Z]{2,})?`;
const CREDENTIAL_CAMEL_KEY_PATTERN = `(?:(?:${CREDENTIAL_CAMEL_COMPOUND_PREFIX}|${CREDENTIAL_CAMEL_MULTI_PREFIX})(?:${CREDENTIAL_CAMEL_COMPOUND_SUFFIXES})|(?:${CREDENTIAL_CAMEL_PREFIX}|${CREDENTIAL_CAMEL_MULTI_PREFIX})(?:${CREDENTIAL_CAMEL_SIMPLE_SUFFIXES}))`;
const CREDENTIAL_CAMEL_KEY_SUFFIX = new RegExp(`^${CREDENTIAL_CAMEL_KEY_PATTERN}$`);
const CREDENTIAL_CAMEL_ASSIGNMENT_CANDIDATE_PATTERN = new RegExp(
	String.raw`(?:${CREDENTIAL_CAMEL_COMPOUND_SUFFIXES}|${CREDENTIAL_CAMEL_SIMPLE_SUFFIXES})(?:\\*["']?\s*[=:]\s*)`,
);
const CREDENTIAL_ASSIGNMENT_PREFIX = String.raw`(?<![A-Za-z0-9_-])((?:\\*["']?-*)(?:${CREDENTIAL_KEY_PATTERN})(?:\\*["']?\s*[=:]\s*))`;
const CREDENTIAL_ASSIGNMENT_CANDIDATE_PATTERN = new RegExp(
	String.raw`(?:${CREDENTIAL_KEY_LABELS})(?:\\*["']?\s*[=:]\s*)`,
	"i",
);
const CREDENTIAL_CONTAINER_CANDIDATE_PATTERN = new RegExp(
	String.raw`(?:${CREDENTIAL_KEY_LABELS})(?:\\*["']?\s*[=:]\s*[\[{])`,
	"i",
);
const CREDENTIAL_CAMEL_ASSIGNMENT_PREFIX = String.raw`(?<![A-Za-z0-9_-])((?:\\*["']?-*)(?:${CREDENTIAL_CAMEL_KEY_PATTERN})(?:\\*["']?\s*[=:]\s*))`;
const AUTHORIZATION_HEADER_PREFIX = String.raw`(?<![A-Za-z0-9_-])((?:\\*["']?-*)(?:[A-Za-z0-9][A-Za-z0-9_-]*[_-])?(?:auth|authorization)(?:\\*["']?\s*:\s*))`;
const CREDENTIAL_UNQUOTED_VALUE_PATTERN_BODY = String.raw`(?:(?!\\+n|\\+r\\+n)(?:\\[^\r\n]|[^\s"',;}\]]))+`;
const CREDENTIAL_VALUE_QUOTED_BOUNDARY = String.raw`(?=$|[\s,;}):.\]]|/?>)`;
const CREDENTIAL_AUTH_VALUE_PATTERN = new RegExp(
	String.raw`${CREDENTIAL_ASSIGNMENT_PREFIX}(?:Bearer|Basic|Token)\s+${CREDENTIAL_UNQUOTED_VALUE_PATTERN_BODY}`,
	"gi",
);
const CREDENTIAL_AUTHORIZATION_VALUE_PATTERN = new RegExp(
	String.raw`${AUTHORIZATION_HEADER_PREFIX}(?!\s*(?:["'«\x60]|\\+["']))(?:(?!\\+n|\\+r\\+n)[^\r\n])+`,
	"gi",
);
const CREDENTIAL_VALUE_PATTERN_BODY = String.raw`(?:(\\+")((?:\\[\s\S]|[^"\\])*?)(\\+")${CREDENTIAL_VALUE_QUOTED_BOUNDARY}|(")((?:\\[\s\S]|[^"\\])*)(")|(\\+')((?:\\[\s\S]|[^'\\])*?)(\\+')${CREDENTIAL_VALUE_QUOTED_BOUNDARY}|(')((?:\\[\s\S]|[^'\\])*)(')|(\x60)((?:\\[\s\S]|[^\x60\\])*)(\x60)${CREDENTIAL_VALUE_QUOTED_BOUNDARY}|(\\+")([^\r\n]*)(?=\r?\n|$)|(")([^\r\n]*)(?=\r?\n|$)|(\\+')([^\r\n]*)(?=\r?\n|$)|(')([^\r\n]*)(?=\r?\n|$)|(\x60)([^\r\n]*)(?=\r?\n|$)|(${CREDENTIAL_UNQUOTED_VALUE_PATTERN_BODY}))`;
const CREDENTIAL_VALUE_PATTERN = new RegExp(`${CREDENTIAL_ASSIGNMENT_PREFIX}${CREDENTIAL_VALUE_PATTERN_BODY}`, "gi");
const CREDENTIAL_CAMEL_VALUE_PATTERN = new RegExp(
	`${CREDENTIAL_CAMEL_ASSIGNMENT_PREFIX}${CREDENTIAL_VALUE_PATTERN_BODY}`,
	"g",
);
const COOKIE_VALUE_PATTERN =
	/(?:(?<![A-Za-z0-9_-])|(?<=\\n))((?:[A-Za-z0-9][A-Za-z0-9_-]*[_-])?cookie\s*[:=]\s*)((?:(?!\\+n|\\+r\\+n)[^\r\n])*)/gi;

function isCookieFieldWhitespace(character: string | undefined): boolean {
	return character === " " || character === "\t";
}

function isCookieFieldNameStart(character: string | undefined): boolean {
	if (character === undefined) return false;
	const code = character.charCodeAt(0);
	return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isCookieFieldNameCharacter(character: string | undefined): boolean {
	if (character === undefined) return false;
	const code = character.charCodeAt(0);
	return (
		character === "_" ||
		character === "-" ||
		(code >= 48 && code <= 57) ||
		(code >= 65 && code <= 90) ||
		(code >= 97 && code <= 122)
	);
}

function cookieDiagnosticSuffix(value: string): string {
	let quote: string | undefined;
	for (let index = 0; index < value.length; index++) {
		const character = value[index];
		if (character === "\\") {
			index++;
			continue;
		}
		if (quote !== undefined) {
			if (character === quote) quote = undefined;
			continue;
		}
		if (character === "'" || character === '"' || character === "`") {
			quote = character;
			continue;
		}
		if (!isCookieFieldWhitespace(character)) continue;

		const boundary = index;
		while (isCookieFieldWhitespace(value[index])) index++;
		if (!isCookieFieldNameStart(value[index])) continue;
		while (isCookieFieldNameCharacter(value[index])) index++;
		while (isCookieFieldWhitespace(value[index])) index++;
		if (value[index] !== "=" && value[index] !== ":") continue;

		let previous = boundary - 1;
		while (previous >= 0 && isCookieFieldWhitespace(value[previous])) previous--;
		if (value[previous] !== ";" && value[previous] !== ",") return value.slice(boundary);
	}
	return "";
}

/** Whether a field name ends in a credential label recognized by the redactor. */
export function isCredentialKey(key: string): boolean {
	return CREDENTIAL_KEY_SUFFIX.test(key) || CREDENTIAL_CAMEL_KEY_SUFFIX.test(key);
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
	redacted = redacted.replace(
		/(?<![A-Za-z0-9_-])(?:Bearer|Basic|Token)\s+[A-Za-z0-9._~+/=-]{8,}/gi,
		"«redacted-auth»",
	);
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
	// quadratic in input length and costs ~10s on a 200 KB crash body. The greedy
	// authority scan consumes raw `@` characters in userinfo through its delimiter.
	redacted = redacted.replace(
		/(?<![A-Za-z0-9+.-])([a-z][a-z0-9+.-]{0,15}:\/\/)[^/\s?#]*@/gi,
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
	// Cookie values may contain semicolon- or comma-separated pairs. Preserve a later,
	// whitespace-separated diagnostic assignment so the narrower rules can scrub
	// it independently without losing useful context after the cookie.
	redacted = redacted.replace(
		COOKIE_VALUE_PATTERN,
		(_match, prefix: string, value: string) => `${prefix}«redacted»${cookieDiagnosticSuffix(value)}`,
	);
	redacted = redacted.replace(CREDENTIAL_AUTH_VALUE_PATTERN, (_match, prefix: string) => `${prefix}«redacted»`);
	redacted = redacted.replace(
		CREDENTIAL_AUTHORIZATION_VALUE_PATTERN,
		(_match, prefix: string) => `${prefix}«redacted»`,
	);
	// Escaped delimiters support JSON nested in diagnostic strings. Their quoted
	// branch stops at a closing delimiter followed by a field boundary, while an
	// unterminated value is redacted through the end of its line. Capture each
	// complete key once and inspect its suffix; repeated compound-prefix groups
	// backtrack quadratically on long attacker-controlled identifiers.
	if (CREDENTIAL_ASSIGNMENT_CANDIDATE_PATTERN.test(redacted)) {
		redacted = redacted.replace(CREDENTIAL_VALUE_PATTERN, redactCredentialValue);
	}
	if (CREDENTIAL_CAMEL_ASSIGNMENT_CANDIDATE_PATTERN.test(redacted)) {
		redacted = redacted.replace(CREDENTIAL_CAMEL_VALUE_PATTERN, redactCredentialValue);
	}
	return redacted;
}

function redactCredentialValue(
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
	backtickOpen: string | undefined,
	backtickQuoted: string | undefined,
	backtickClose: string | undefined,
	unclosedEscapedDoubleOpen: string | undefined,
	unclosedEscapedDoubleQuoted: string | undefined,
	unclosedDoubleOpen: string | undefined,
	unclosedDoubleQuoted: string | undefined,
	unclosedEscapedSingleOpen: string | undefined,
	unclosedEscapedSingleQuoted: string | undefined,
	unclosedSingleOpen: string | undefined,
	unclosedSingleQuoted: string | undefined,
	unclosedBacktickOpen: string | undefined,
	unclosedBacktickQuoted: string | undefined,
): string {
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
	if (backtickQuoted !== undefined && backtickOpen !== undefined && backtickClose !== undefined) {
		return `${prefix}${backtickOpen}«redacted»${backtickClose}`;
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
	if (unclosedBacktickQuoted !== undefined && unclosedBacktickOpen !== undefined) {
		return `${prefix}${unclosedBacktickOpen}«redacted»`;
	}
	return `${prefix}«redacted»`;
}

function redactCredentialContainers(text: string): string {
	if (!CREDENTIAL_CONTAINER_CANDIDATE_PATTERN.test(text)) return text;
	const assignment = new RegExp(String.raw`${CREDENTIAL_ASSIGNMENT_PREFIX}(?=[\[{])`, "gi");
	const camelAssignment = new RegExp(String.raw`${CREDENTIAL_CAMEL_ASSIGNMENT_PREFIX}(?=[\[{])`, "g");
	return redactCredentialContainersWithPattern(
		redactCredentialContainersWithPattern(text, assignment),
		camelAssignment,
	);
}

function redactCredentialContainersWithPattern(text: string, assignment: RegExp): string {
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

type EscapedQuoteDelimiter = { delimiter: "'" | '"'; backslashCount: number };

function findCredentialContainerEnd(text: string, start: number): number {
	const closing = [text[start] === "[" ? "]" : "}"];
	const escapedQuoteDelimiter = findEscapedQuoteDelimiter(text, start);
	let quote: "'" | '"' | "`" | undefined;
	for (let index = start + 1; index < text.length; index++) {
		const character = text[index] ?? "";
		if (character === "\\") {
			let backslashEnd = index;
			while (text[backslashEnd + 1] === "\\") backslashEnd++;
			const backslashCount = backslashEnd - index + 1;
			const nextCharacter = text[backslashEnd + 1];
			// The opening escape run identifies this serialization layer; matching runs delimit strings.
			if (
				escapedQuoteDelimiter !== undefined &&
				nextCharacter === escapedQuoteDelimiter.delimiter &&
				backslashCount === escapedQuoteDelimiter.backslashCount
			) {
				if (quote === undefined) quote = escapedQuoteDelimiter.delimiter;
				else if (quote === escapedQuoteDelimiter.delimiter) quote = undefined;
				index = backslashEnd + 1;
				continue;
			}
			index = nextCharacter !== undefined && backslashCount % 2 === 1 ? backslashEnd + 1 : backslashEnd;
			continue;
		}
		if (quote) {
			if (character === quote) quote = undefined;
			continue;
		}
		if (character === '"' || character === "'" || character === "`") {
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

function findEscapedQuoteDelimiter(text: string, start: number): EscapedQuoteDelimiter | undefined {
	const closing = [text[start] === "[" ? "]" : "}"];
	for (let index = start + 1; index < text.length; index++) {
		const character = text[index] ?? "";
		if (character === "\\") {
			let backslashEnd = index;
			while (text[backslashEnd + 1] === "\\") backslashEnd++;
			const backslashCount = backslashEnd - index + 1;
			const nextCharacter = text[backslashEnd + 1];
			if ((nextCharacter === '"' || nextCharacter === "'") && backslashCount % 2 === 1) {
				return { delimiter: nextCharacter, backslashCount };
			}
			index = nextCharacter !== undefined && backslashCount % 2 === 1 ? backslashEnd + 1 : backslashEnd;
			continue;
		}
		if (character === '"' || character === "'") return undefined;
		if (character === "[") closing.push("]");
		else if (character === "{") closing.push("}");
		else if (character === closing[closing.length - 1]) {
			closing.pop();
			if (closing.length === 0) return undefined;
		}
	}
	return undefined;
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
