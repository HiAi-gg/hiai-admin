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

export const envSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql://')),
  REDIS_URL: z.string().url().or(z.string().startsWith('redis://')),
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
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PLATFORM_ACCOUNT_ID: z.string().optional(),
  STRIPE_PRO_PRICE_ID: z.string().optional(),
  STRIPE_ENTERPRISE_PRICE_ID: z.string().optional(),
  HIAI_OBSERVE_URL: z.string().url().optional(),
  NOVU_API_KEY: z.string().optional(),
  NOVU_API_URL: z.string().url().optional(),
  API_PORT: z.coerce.number().default(50200),
  FRONTEND_PORT: z.coerce.number().default(50201),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  AUDIT_FAIL_CLOSED: z
    .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  MAX_BODY_BYTES: z.coerce.number().default(1024 * 1024), // Default 1 MB
  // Minio — optional. The upload routes check `isMinioConfigured()` before
  // attempting any upload and return a clear 503 when env is missing.
  MINIO_ENDPOINT: z.string().min(1).optional(),
  MINIO_PORT: z.coerce.number().int().positive().optional(),
  MINIO_USE_SSL: z
    .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  MINIO_ACCESS_KEY: z.string().min(1).optional(),
  MINIO_SECRET_KEY: z.string().min(1).optional(),
  MINIO_REGION: z.string().optional(),
  MINIO_PUBLIC_URL: z.string().url().optional(),
  MINIO_BUCKET: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
