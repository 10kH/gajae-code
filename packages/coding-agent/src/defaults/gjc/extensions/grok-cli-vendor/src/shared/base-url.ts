import {
  canonicalEnvKey,
  type ProjectEnvSnapshot,
  projectEnvSnapshot,
} from '@gajae-code/utils/env-file';

const DEFAULT_GROK_BUILD_BASE_URL = 'https://cli-chat-proxy.grok.com/v1';
const ALLOWED_GROK_BUILD_HOSTS = new Set(['cli-chat-proxy.grok.com']);
const BASE_URL_ENV_NAMES = ['GJC_GROK_CLI_BASE_URL', 'GROK_CLI_BASE_URL'] as const;
const UNSAFE_BASE_URL_ENV = 'GJC_GROK_CLI_ALLOW_UNSAFE_BASE_URL';

// Default parameters run at the call. A fresh projectEnvSnapshot() then misses
// a dotenv Bun already copied, once `.env` is removed or the process chdirs,
// and those values look like an operator override.
const startupBaseUrlSnapshot = projectEnvSnapshot();

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

/**
 * Bun turns `\n` and `\r` inside double-quoted dotenv values into control
 * characters before they reach `process.env`. The project snapshot keeps the
 * source text, so a literal compare misses that rewrite. `normalizeBaseUrl`
 * then trims the decoded newline and can accept the project URL as an
 * operator override on the allowlisted host.
 */
function unescapeProjectDotenvControls(value: string): string {
  let decoded = '';
  for (let index = 0; index < value.length; index++) {
    const current = value[index];
    const next = value[index + 1];
    if (current === '\\' && next === 'n') {
      decoded += '\n';
      index++;
      continue;
    }
    if (current === '\\' && next === 'r') {
      decoded += '\r';
      index++;
      continue;
    }
    decoded += current ?? '';
  }
  return decoded;
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
