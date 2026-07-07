import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import * as schema from '../db/schema/index.js';
import { env } from '../lib/config.js';
import { db } from '../lib/db.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('auth');

type AuthInstance = ReturnType<typeof betterAuth>;

let _auth: AuthInstance | null = null;

function buildAuth(): AuthInstance {
  log.info(
    {
      sessionExpiresInSec: env.SESSION_EXPIRES_IN_SEC,
      sessionUpdateAgeSec: env.SESSION_UPDATE_AGE_SEC,
      cookieCacheMaxAgeSec: env.SESSION_COOKIE_CACHE_MAX_AGE_SEC,
    },
    'Better Auth initialised for hiai-admin',
  );
  // Cast to AuthInstance: betterAuth() returns `Auth<{ secret: string; ... }>`
  // (literal shape of our options) but AuthInstance = `ReturnType<typeof betterAuth>`
  // resolves to `Auth<BetterAuthOptions>`. The generic parameter is bivariant
  // in practice; double-cast through `unknown` tells TS not to fight us.
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.BETTER_AUTH_URL, ...env.BETTER_AUTH_TRUSTED_ORIGINS],
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    session: {
      // All session lifecycle knobs are env-driven so downstream consumers
      // (e.g. webs docker-compose) can pick their own TTL without forking
      // the Dockerfile. Defaults match the previous hardcoded values:
      //   expiresIn         = 7 days
      //   updateAge         = 1 day  (sliding refresh window)
      //   cookieCache.maxAge = 5 min
      expiresIn: env.SESSION_EXPIRES_IN_SEC,
      updateAge: env.SESSION_UPDATE_AGE_SEC,
      cookieCache: {
        enabled: true,
        maxAge: env.SESSION_COOKIE_CACHE_MAX_AGE_SEC,
      },
    },
    emailAndPassword: { enabled: true },
    advanced: {
      database: { generateId: () => crypto.randomUUID() },
    },
  }) as unknown as AuthInstance;
}

/**
 * Lazy auth proxy. Initialisation (and hence env validation) is deferred
 * until first property access. This matters for the frontend SvelteKit build,
 * which transitively pulls this module via hooks.server.ts but does not need
 * the real Better Auth instance at build time.
 */
export const auth: AuthInstance = new Proxy({} as AuthInstance, {
  get(_t, prop) {
    if (!_auth) _auth = buildAuth();
    return Reflect.get(_auth, prop, _auth);
  },
  has(_t, prop) {
    if (!_auth) _auth = buildAuth();
    return Reflect.has(_auth, prop);
  },
});

/** Force-init helper — for CLI / scripts that want to fail fast on bad env. */
export function initAuth(): AuthInstance {
  if (!_auth) _auth = buildAuth();
  return _auth;
}

export type Session = AuthInstance['$Infer']['Session'];
