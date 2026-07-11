/**
 * Runtime environment configuration.
 *
 * Validation is lazy: the `env` binding only materialises the parsed config
 * on first property access. This lets the SvelteKit frontend pull in our
 * Better Auth / DB modules for SSR without triggering process.exit(1)
 * during `vite build` (the build does not need real runtime secrets).
 *
 * Compatibility: every previously supported variable still works, so older
 * `.env` files keep working unchanged.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const here = dirname(fileURLToPath(import.meta.url));
for (const candidate of [
  resolve(here, '.env'),
  resolve(here, '../../.env'),
  resolve(here, '../../../.env'),
  resolve(here, '../../../../.env'),
]) {
  if (existsSync(candidate)) {
    for (const line of readFileSync(candidate, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
    break;
  }
}

/** Make a positive-integer-seconds helper with a default. Empty -> default. */
function sec(defaultValue: number) {
  return z.preprocess((v) => {
    if (v === undefined || v === null || v === '') return defaultValue;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : defaultValue;
  }, z.number().int().nonnegative());
}

function num(defaultValue: number) {
  return z.preprocess((v) => {
    if (v === undefined || v === null || v === '') return defaultValue;
    const n = Number(v);
    return Number.isFinite(n) ? n : defaultValue;
  }, z.number());
}

/**
 * Build a Postgres connection URL from split DB_* variables when DATABASE_URL
 * is not provided. This lets downstream consumers
 * pass plain `DB_HOST=...`, `DB_PASSWORD=...` instead of having to URL-encode
 * special characters into the URL themselves.
 *
 * Per RFC 3986, the userinfo portion of a URL must be percent-encoded for any
 * reserved character. We encode here defensively so callers do not have to.
 */
function encodeUserInfo(value: string): string {
  return encodeURIComponent(value).replace(/%25/g, '%25');
}

function buildDatabaseUrl(parts: {
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
}): string {
  const auth = `${encodeUserInfo(parts.user)}:${encodeUserInfo(parts.password)}`;
  return `postgresql://${auth}@${parts.host}:${parts.port}/${parts.name}`;
}

export const envSchema = z
  .object({
    DATABASE_URL: z.string().url().optional(),
    // Split-form DB connection parts. When DATABASE_URL is absent, the API
    // assembles it from these. Useful in docker-compose where we do not want
    // to ship a hardcoded, percent-encoded password in plain text.
    DB_HOST: z.string().min(1).optional(),
    DB_PORT: z.preprocess(
      (v) => (v === undefined || v === null || v === '' ? undefined : Number(v)),
      z.number().int().positive().optional(),
    ),
    DB_USER: z.string().min(1).optional(),
    DB_PASSWORD: z.string().min(1).optional(),
    DB_NAME: z.string().min(1).optional(),

    REDIS_URL: z.string().startsWith('redis://'),
    REDIS_MAX_RETRIES: z.preprocess(
      (v) => (v === undefined || v === null || v === '' ? undefined : Number(v)),
      z.number().int().nonnegative().optional(),
    ),
    REDIS_RETRY_MAX_DELAY_MS: z.preprocess(
      (v) => (v === undefined || v === null || v === '' ? undefined : Number(v)),
      z.number().int().nonnegative().optional(),
    ),

    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    BETTER_AUTH_TRUSTED_ORIGINS: z
      .string()
      .optional()
      .transform((v) =>
        v
          ? v
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s.length > 0)
          : [],
      ),
    FRONTEND_URL: z.string().url().optional(),

    // Better Auth session / cookie-cache lifecycle (Phase 1 configurability).
    // Defaults preserve the previous hardcoded values (7d / 1d / 5m).
    SESSION_EXPIRES_IN_SEC: sec(60 * 60 * 24 * 7),
    SESSION_UPDATE_AGE_SEC: sec(60 * 60 * 24),
    SESSION_COOKIE_CACHE_MAX_AGE_SEC: sec(60 * 5),
    AUTH_COOKIE_DOMAIN: z.string().optional(),
    AUTH_SIGNUP_MODE: z.enum(['disabled', 'public', 'trusted-client']).default('public'),
    AUTH_TRUSTED_CLIENT_SECRET: z.string().optional(),
    AUTH_EVENT_WEBHOOK_URL: z.string().url().optional(),
    AUTH_EVENT_WEBHOOK_SECRET: z
      .string()
      .optional()
      .transform((value) => value ?? '')
      .refine(
        (value) =>
          value.length === 0 ||
          !/(^|[:\s])(change[-_]?me|your[-_]?secret|placeholder|example|dummy)/i.test(value),
        {
          message:
            'AUTH_EVENT_WEBHOOK_SECRET must be a real secret, not a placeholder like "change-me"',
        },
      ),
    AUTH_EVENT_WEBHOOK_AUDIENCE: z.string().default('hiai-admin'),
    AUTH_EVENT_WEBHOOK_ISSUER: z.string().default('hiai-admin'),
    AUTH_INTEGRATIONS_JSON: z
      .string()
      .default('[]')
      .transform((value) => value.trim() || '[]'),
    SERVICE_INTEGRATIONS_JSON: z.string().default('[]').transform((value) => value.trim() || '[]'),

    // Backend (cross-service) JWT TTL used by the admin -> site adapter SSO
    // flow in app/src/lib/server/backend-token.ts. Default 1h matches the
    // historic hardcoded value.
    BACKEND_TOKEN_EXPIRES_IN_SEC: sec(60 * 60),

    // Explicit opt-in for `drizzle-kit push` at startup. Push is destructive
    // (drops columns, rewrites types) and must never run implicitly — only
    // when an operator explicitly sets DB_AUTO_PUSH=true.
    DB_AUTO_PUSH: z
      .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0'), z.literal('')])
      .optional()
      .transform((v) => v === 'true' || v === '1'),

    // Existing optional services.
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PLATFORM_ACCOUNT_ID: z.string().optional(),
    STRIPE_PRO_PRICE_ID: z.string().optional(),
    STRIPE_ENTERPRISE_PRICE_ID: z.string().optional(),
    HIAI_OBSERVE_URL: z.string().url().optional(),
    NOVU_API_KEY: z.string().optional(),
    NOVU_API_URL: z.string().url().optional(),

    API_PORT: num(50200),
    FRONTEND_PORT: num(50201),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    AUDIT_FAIL_CLOSED: z
      .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
      .optional()
      .transform((v) => v === 'true' || v === '1'),
    MAX_BODY_BYTES: num(1024 * 1024),

    // Object storage (SeaweedFS S3-compatible) — optional. The upload routes
    // check `isObjectStorageConfigured()` before attempting any upload and
    // return a clear 503 when env is missing.
    OBJECT_STORAGE_ENDPOINT: z.string().min(1).optional(),
    OBJECT_STORAGE_PORT: z.preprocess(
      (v) => (v === undefined || v === null || v === '' ? undefined : Number(v)),
      z.number().int().positive().optional(),
    ),
    OBJECT_STORAGE_USE_SSL: z
      .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
      .optional()
      .transform((v) => v === 'true' || v === '1'),
    OBJECT_STORAGE_ACCESS_KEY: z.string().min(1).optional(),
    OBJECT_STORAGE_SECRET_KEY: z.string().min(1).optional(),
    OBJECT_STORAGE_REGION: z.string().optional(),
    OBJECT_STORAGE_PUBLIC_URL: z.string().url().optional(),
    OBJECT_STORAGE_BUCKET: z.string().min(1).optional(),
    OBJECT_STORAGE_FORCE_PATH_STYLE: z
      .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
      .optional()
      .transform((v) => v === 'true' || v === '1'),
  })
  .superRefine((val, ctx) => {
    const hasDbUrl = typeof val.DATABASE_URL === 'string';
    const hasParts = Boolean(
      val.DB_HOST && val.DB_PORT && val.DB_USER && val.DB_PASSWORD && val.DB_NAME,
    );
    if (!hasDbUrl && !hasParts) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Either DATABASE_URL or all of DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME must be set',
        path: ['DATABASE_URL'],
      });
    }
  });

export type Env = z.infer<typeof envSchema> & {
  /** Effective DATABASE_URL — assembled from split parts when needed. */
  DATABASE_URL: string;
  REDIS_URL: string;
};

let _envCache: Env | null = null;

function assembleEnv(raw: z.infer<typeof envSchema>): Env {
  let databaseUrl = raw.DATABASE_URL;
  if (!databaseUrl) {
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = raw;
    const missing: string[] = [];
    if (!DB_HOST) missing.push('DB_HOST');
    if (!DB_PORT) missing.push('DB_PORT');
    if (!DB_USER) missing.push('DB_USER');
    if (!DB_PASSWORD) missing.push('DB_PASSWORD');
    if (!DB_NAME) missing.push('DB_NAME');
    if (missing.length > 0) {
      throw new Error(
        `Cannot build DATABASE_URL: missing [${missing.join(', ')}]. ` +
          'Set DATABASE_URL explicitly or provide all five DB_* variables.',
      );
    }
    databaseUrl = buildDatabaseUrl({
      host: DB_HOST!,
      port: DB_PORT!,
      user: DB_USER!,
      password: DB_PASSWORD!,
      name: DB_NAME!,
    });
  }

  const redisUrl = raw.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL is required (no DB_HOST-style fallback for Redis).');
  }

  return { ...raw, DATABASE_URL: databaseUrl, REDIS_URL: redisUrl } as Env;
}

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return assembleEnv(result.data);
}

function getEnv(): Env {
  if (_envCache) return _envCache;
  _envCache = loadEnv();
  return _envCache;
}

/**
 * Lazy env proxy. Property access triggers validation on first read, then
 * caches. This keeps module-load side-effect free so the frontend Vite build
 * can pull backend modules without triggering process.exit(1) for missing
 * secrets.
 */
export const env = new Proxy({} as Env, {
  get(_t, prop) {
    return Reflect.get(getEnv(), prop);
  },
  has(_t, prop) {
    return Reflect.has(getEnv(), prop);
  },
  ownKeys() {
    return Reflect.ownKeys(getEnv());
  },
  getOwnPropertyDescriptor(_t, prop) {
    return Reflect.getOwnPropertyDescriptor(getEnv(), prop);
  },
});

/** Test / diagnostic helper — force re-parse on next access. */
export function _resetEnvForTests(): void {
  _envCache = null;
}
