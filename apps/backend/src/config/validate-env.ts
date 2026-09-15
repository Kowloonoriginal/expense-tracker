const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Placeholder values that have appeared as JWT_SECRET in this repo's own
 * .env.example (and earlier revisions of it). A length floor alone does not
 * catch these — "your-secret-key-change-in-production" is 36 characters,
 * comfortably past any reasonable minimum — so someone who follows
 * `cp .env.example .env` literally, without editing the value, ends up
 * running a server whose signing key is a string anyone can read on GitHub.
 * A forged `{ sub: <any-user-id> }` token then passes `JwtStrategy.validate()`
 * unconditionally, since it only checks that the user exists.
 */
const KNOWN_PLACEHOLDER_SECRETS = new Set([
  'your-secret-key-change-in-production',
  'dev-secret-change-in-production',
  'change-me',
  'changeme',
  'secret',
]);

/**
 * Passed to `ConfigModule.forRoot({ validate })` — runs once at boot, before
 * any request is served, so a misconfigured secret fails loudly at startup
 * instead of silently accepting forged tokens.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const secret = config.JWT_SECRET;

  if (typeof secret !== 'string' || secret.length === 0) {
    throw new Error(
      'JWT_SECRET is required. Generate one with: openssl rand -base64 48',
    );
  }

  if (KNOWN_PLACEHOLDER_SECRETS.has(secret)) {
    throw new Error(
      'JWT_SECRET is set to a known placeholder value — anyone who read ' +
        '.env.example (or an earlier version of it) knows this string. ' +
        'Generate a real secret with: openssl rand -base64 48',
    );
  }

  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters ` +
        '(it signs every access token). ' +
        'Generate one with: openssl rand -base64 48',
    );
  }

  return config;
}
