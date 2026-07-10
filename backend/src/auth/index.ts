import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import * as schema from '../db/schema/index.js';
import { env } from '../lib/config.js';
import { db } from '../lib/db.js';
import { createChildLogger } from '../lib/logger.js';
import { timingSafeEqual } from 'node:crypto';
import { userService } from '../modules/user/user.service.js';
import {
  authEventService,
  createAuthEventPayload,
} from '../modules/auth-events/auth-event.service.js';

const log = createChildLogger('auth');
type HeaderLike = Headers | { get?: (name: string) => string | null } | Record<string, string | string[] | undefined>;

const TRUSTED_CLIENT_HEADER = 'x-auth-trusted-client';

function readHeader(headers: HeaderLike | undefined, key: string): string | undefined {
  if (!headers) return undefined;
  const headerKey = key.toLowerCase();
  if (typeof (headers as { get?: (name: string) => string | null }).get === 'function') {
    return (headers as { get: (name: string) => string | null }).get(headerKey) || undefined;
  }

  const value = (headers as Record<string, string | string[] | undefined>)[headerKey];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  const max = Math.max(left.length, right.length);
  const leftPadded = Buffer.alloc(max);
  const rightPadded = Buffer.alloc(max);
  left.copy(leftPadded);
  right.copy(rightPadded);

  return left.length === right.length && timingSafeEqual(leftPadded, rightPadded);
}

function hasTrustedClientHeader(requestHeaders: HeaderLike | undefined): boolean {
  const expected = env.AUTH_TRUSTED_CLIENT_SECRET;
  if (!expected) return false;
  const provided = readHeader(requestHeaders, TRUSTED_CLIENT_HEADER);
  if (!provided) return false;
  return constantTimeEquals(provided, expected);
}

function assertTrustedClientAllowed(route: string, requestHeaders: HeaderLike | undefined) {
  if (env.AUTH_SIGNUP_MODE === 'disabled') {
    throw new Error(`Auth action is disabled for ${route}`);
  }

  if (env.AUTH_SIGNUP_MODE !== 'trusted-client') return;

  if (!hasTrustedClientHeader(requestHeaders)) {
    throw new Error(`Missing or invalid ${TRUSTED_CLIENT_HEADER} header`);
  }
}

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
    databaseHooks: {
      user: {
        create: {
          after: async (user: any) => {
            const email = (user?.email ?? '').trim().toLowerCase();
            if (!email) return;
            const name = user?.name;
            await userService.ensurePlatformProfile({ email, name });
          },
        },
      },
    },
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL, ...env.BETTER_AUTH_TRUSTED_ORIGINS],
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    session: {
      // All session lifecycle knobs are env-driven so downstream consumers
      // downstream deployments can pick their own TTL without forking
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
      cookie: {
        domain: env.AUTH_COOKIE_DOMAIN,
        attributes: {
          secure: true,
          httpOnly: true,
          sameSite: 'lax',
        },
      },
    },
    emailVerification: {
      sendVerificationEmail: async (data: any) => {
        assertTrustedClientAllowed('email-verification', data?.request?.headers ?? data?.requestHeaders);
        const event = createAuthEventPayload({
          type: 'auth.email_verification_requested',
          email: data?.user?.email ?? data?.email,
          name: data?.user?.name,
          actionUrl: data?.url,
          locale: data?.locale,
        });
        await authEventService.sendEmailVerificationRequested({
          type: event.type,
          email: event.recipient.email,
          name: event.recipient.name,
          actionUrl: event.actionUrl,
          locale: event.locale,
          id: event.id,
        });
      },
    },
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async (data: any) => {
        assertTrustedClientAllowed('password-reset', data?.request?.headers ?? data?.requestHeaders);
        const event = createAuthEventPayload({
          type: 'auth.password_reset_requested',
          email: data?.user?.email ?? data?.email,
          name: data?.user?.name,
          actionUrl: data?.url,
          locale: data?.locale,
        });
        await authEventService.sendPasswordResetRequested({
          type: event.type,
          email: event.recipient.email,
          name: event.recipient.name,
          actionUrl: event.actionUrl,
          locale: event.locale,
          id: event.id,
        });
      },
    },
    advanced: {
      database: { generateId: () => crypto.randomUUID() },
    },
  } as unknown as Parameters<typeof betterAuth>[0]) as unknown as AuthInstance;
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
