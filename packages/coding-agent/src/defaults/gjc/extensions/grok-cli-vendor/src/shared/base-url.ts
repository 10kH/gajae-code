import * as fs from 'node:fs';
import * as path from 'node:path';
import { canonicalEnvKey, type ProjectEnvSnapshot } from '@gajae-code/utils/env-file';

const DEFAULT_GROK_BUILD_BASE_URL = 'https://cli-chat-proxy.grok.com/v1';
const ALLOWED_GROK_BUILD_HOSTS = new Set(['cli-chat-proxy.grok.com']);
const BASE_URL_ENV_NAMES = ['GJC_GROK_CLI_BASE_URL', 'GROK_CLI_BASE_URL'] as const;
const UNSAFE_BASE_URL_ENV = 'GJC_GROK_CLI_ALLOW_UNSAFE_BASE_URL';
const CREDENTIAL_BASE_URL_KEYS = new Set<string>([...BASE_URL_ENV_NAMES, UNSAFE_BASE_URL_ENV]);
const BUN_DOTENV_WHITESPACE = new Set([' ', '\t', '\v', '\f', '\n', '\r']);

// Default parameters run at the call. A fresh read then misses a dotenv Bun
// already copied, once `.env` is removed or the process chdirs, and those
// values look like an operator override. The shared snapshot parser also keeps
// text after a closing quote and does not decode double-quoted escapes, so
// this module records Bun's own value for these three names at load.
const startupBaseUrlSnapshot = credentialBaseUrlSnapshot();

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

function isAllowedCredentialHost(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    return url.protocol === 'https:' && ALLOWED_GROK_BUILD_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isBunDotenvWhitespace(char: string | undefined): boolean {
  return char !== undefined && BUN_DOTENV_WHITESPACE.has(char);
}

function isEnvKeyStart(char: string | undefined): boolean {
  return (
    char !== undefined &&
    ((char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z') || char === '_')
  );
}

function isEnvKeyContinue(char: string | undefined): boolean {
  return isEnvKeyStart(char) || (char !== undefined && char >= '0' && char <= '9');
}

/**
 * Inside double quotes Bun only turns `\n` and `\r` into controls. Every other
 * backslash pair keeps the backslash, so `\\n` stays two backslashes plus `n`
 * rather than a backslash plus a newline.
 */
function decodeDoubleQuoted(raw: string): string {
  let decoded = '';
  for (let index = 0; index < raw.length; index++) {
    const current = raw[index];
    const next = raw[index + 1];
    if (current !== '\\' || next === undefined) {
      decoded += current ?? '';
      continue;
    }
    if (next === 'n') decoded += '\n';
    else if (next === 'r') decoded += '\r';
    else decoded += `\\${next}`;
    index++;
  }
  return decoded;
}

function indexAfterLine(text: string, index: number): number {
  const end = text.indexOf('\n', index);
  return end === -1 ? text.length : end + 1;
}

function skipBunDotenvWhitespace(text: string, index: number): number {
  while (isBunDotenvWhitespace(text[index])) index++;
  return index;
}

function findClosingQuote(text: string, start: number, quote: '"' | "'" | '`'): number {
  for (let index = start; index < text.length; index++) {
    if (text[index] === '\\') {
      if (index + 1 >= text.length) return -1;
      index++;
      continue;
    }
    if (text[index] === quote) return index;
  }
  return -1;
}

function trimBunDotenvWhitespace(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && isBunDotenvWhitespace(value[start])) start++;
  while (end > start && isBunDotenvWhitespace(value[end - 1])) end--;
  return value.slice(start, end);
}

function readDotenvValue(text: string, index: number): { text: string; next: number } {
  const quotedAt = skipBunDotenvWhitespace(text, index);
  const opener = text[quotedAt];
  if ((opener === '"' || opener === "'" || opener === '`') && quotedAt < text.length) {
    const close = findClosingQuote(text, quotedAt + 1, opener);
    if (close !== -1) {
      const raw = text.slice(quotedAt + 1, close);
      return {
        text: opener === '"' ? decodeDoubleQuoted(raw) : raw,
        next: indexAfterLine(text, close + 1),
      };
    }
  }
  let end = index;
  while (end < text.length && text[end] !== '#' && text[end] !== '\n' && text[end] !== '\r') end++;
  const next =
    end >= text.length ? text.length : text[end] === '\n' ? end + 1 : indexAfterLine(text, end);
  return { text: trimBunDotenvWhitespace(text.slice(index, end)), next };
}

/**
 * Values Bun would load for the credential base URL names.
 *
 * The shared dotenv parser keeps a suffix after the closing quote and leaves
 * double-quoted escapes as source text. Either mismatch makes the live value
 * look like an operator override. This reader follows Bun: the first unescaped
 * closer ends the value, and only `\n` / `\r` inside double quotes are controls.
 */
function parseCredentialDotenv(content: string): Record<string, string> {
  const text = content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const result: Record<string, string> = {};
  let index = 0;
  while (index < text.length) {
    index = skipBunDotenvWhitespace(text, index);
    if (index >= text.length) break;
    if (text[index] === '#') {
      index = indexAfterLine(text, index);
      continue;
    }

    const lineStart = index;
    if (text.startsWith('export', index) && isBunDotenvWhitespace(text[index + 6])) {
      const exported = skipBunDotenvWhitespace(text, index + 6);
      if (isEnvKeyStart(text[exported])) index = exported;
    }

    const keyStart = index;
    if (!isEnvKeyStart(text[index])) {
      index = indexAfterLine(text, lineStart);
      continue;
    }
    index++;
    while (isEnvKeyContinue(text[index])) index++;
    const key = text.slice(keyStart, index);
    index = skipBunDotenvWhitespace(text, index);
    const separator = text[index];
    if (separator === '=') index++;
    else if (separator === ':' && isBunDotenvWhitespace(text[index + 1])) index += 2;
    else {
      index = indexAfterLine(text, lineStart);
      continue;
    }

    const value = readDotenvValue(text, index);
    index = value.next;
    if (!CREDENTIAL_BASE_URL_KEYS.has(key) || value.text.includes('\0')) continue;
    result[key] = value.text;
  }
  return result;
}

function credentialBaseUrlSnapshot(cwd = process.cwd()): ProjectEnvSnapshot {
  const nodeEnv = process.env.NODE_ENV;
  const validNodeEnv = nodeEnv && /^[A-Za-z0-9_-]+$/.test(nodeEnv) ? nodeEnv : undefined;
  const files = [
    '.env',
    ...(validNodeEnv ? [`.env.${validNodeEnv}`] : []),
    ...(validNodeEnv !== 'test' ? ['.env.local'] : []),
    ...(validNodeEnv ? [`.env.${validNodeEnv}.local`] : []),
  ];
  const values: Record<string, string> = {};
  const dynamic = new Set<string>();
  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(path.join(cwd, file), 'utf-8');
    } catch {
      continue;
    }
    for (const [rawKey, value] of Object.entries(parseCredentialDotenv(content))) {
      const key = canonicalEnvKey(rawKey);
      values[key] = value;
      if (/[$`]/.test(value)) dynamic.add(key);
      else dynamic.delete(key);
    }
  }
  return { values, dynamic };
}

/**
 * A snapshot built by the shared parser still holds source escapes. Compare
 * those against the controls Bun already wrote, using the same pair rule:
 * `\n` and `\r` decode, and every other backslash pair keeps the backslash.
 */
function unescapeProjectDotenvControls(value: string): string {
  return decodeDoubleQuoted(value);
}

/**
 * A cwd dotenv value is not an operator override. Matching declarations are
 * ambiguous with Bun's overlay, including the control characters Bun decodes
 * from double quotes. Dynamic declarations are refused outright because
 * expansion can hide the text the project file supplied.
 */
function trustedEnvValue(
  name: string,
  env: NodeJS.ProcessEnv,
  snapshot: ProjectEnvSnapshot,
): string | undefined {
  const raw = env[name];
  if (!raw) return undefined;
  const key = canonicalEnvKey(name);
  const declared = snapshot.values[key];
  if (
    declared !== undefined &&
    (snapshot.dynamic.has(key) ||
      declared === raw ||
      unescapeProjectDotenvControls(declared) === raw)
  ) {
    return undefined;
  }
  return raw;
}

function trustedConfiguredBaseUrl(
  env: NodeJS.ProcessEnv,
  snapshot: ProjectEnvSnapshot,
): string | undefined {
  for (const name of BASE_URL_ENV_NAMES) {
    const value = trustedEnvValue(name, env, snapshot);
    if (value) return value;
  }
  return undefined;
}

function unsafeOverrideAllowed(env: NodeJS.ProcessEnv, snapshot: ProjectEnvSnapshot): boolean {
  return trustedEnvValue(UNSAFE_BASE_URL_ENV, env, snapshot) === '1';
}

export function getBaseUrl(
  env: NodeJS.ProcessEnv = process.env,
  snapshot: ProjectEnvSnapshot = startupBaseUrlSnapshot,
): string {
  const configured = trustedConfiguredBaseUrl(env, snapshot);
  if (!configured) return DEFAULT_GROK_BUILD_BASE_URL;

  const normalized = normalizeBaseUrl(configured);
  if (isAllowedCredentialHost(normalized)) return normalized;
  if (unsafeOverrideAllowed(env, snapshot)) return normalized;

  return DEFAULT_GROK_BUILD_BASE_URL;
}

export function isGrokBuildBaseUrlOverrideIgnored(
  env: NodeJS.ProcessEnv = process.env,
  snapshot: ProjectEnvSnapshot = startupBaseUrlSnapshot,
): boolean {
  const configured = trustedConfiguredBaseUrl(env, snapshot);
  if (!configured) return false;
  const normalized = normalizeBaseUrl(configured);
  return !isAllowedCredentialHost(normalized) && !unsafeOverrideAllowed(env, snapshot);
}
