import { describe, it, expect, vi } from 'vitest';

// Set env vars BEFORE config.ts is imported, so the loadEnv() call at module
// load time doesn't call process.exit(1).
vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.BETTER_AUTH_SECRET = 'test-shared-secret-min-32-characters-long-x';
  process.env.BETTER_AUTH_URL = 'http://localhost:50200';
});

import { envSchema } from '../../src/lib/config.js';

const validBaseEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  BETTER_AUTH_SECRET: 'a-very-long-secret-that-is-at-least-32-chars',
  BETTER_AUTH_URL: 'http://localhost:50200',
};

describe('envSchema (config validation)', () => {
  describe('valid inputs', () => {
    it('parses a minimal valid env (only required fields)', () => {
      const result = envSchema.safeParse(validBaseEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.DATABASE_URL).toBe(validBaseEnv.DATABASE_URL);
        expect(result.data.API_PORT).toBe(50200);
        expect(result.data.FRONTEND_PORT).toBe(50201);
        expect(result.data.NODE_ENV).toBe('development');
        expect(result.data.LOG_LEVEL).toBe('info');
      }
    });

    it('parses a full valid env with all optional fields', () => {
      const result = envSchema.safeParse({
        ...validBaseEnv,
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_123',
        STRIPE_PLATFORM_ACCOUNT_ID: 'acct_123',
        HIAI_OBSERVE_URL: 'http://localhost:8001',
        API_PORT: '51000',
        FRONTEND_PORT: '51001',
        NODE_ENV: 'production',
        LOG_LEVEL: 'debug',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.API_PORT).toBe(51000);
        expect(result.data.FRONTEND_PORT).toBe(51001);
        expect(result.data.NODE_ENV).toBe('production');
        expect(result.data.LOG_LEVEL).toBe('debug');
        expect(result.data.STRIPE_SECRET_KEY).toBe('sk_test_123');
      }
    });

    it('coerces port strings to numbers', () => {
      const result = envSchema.safeParse({
        ...validBaseEnv,
        API_PORT: '60000',
        FRONTEND_PORT: '60001',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.API_PORT).toBe(60000);
        expect(result.data.FRONTEND_PORT).toBe(60001);
      }
    });

    it('accepts a valid https URL for DATABASE_URL', () => {
      const result = envSchema.safeParse({
        ...validBaseEnv,
        DATABASE_URL: 'https://example.com/db',
      });
      expect(result.success).toBe(true);
    });

    it('accepts postgresql:// prefix for DATABASE_URL without protocol-valid url', () => {
      const result = envSchema.safeParse({
        ...validBaseEnv,
        DATABASE_URL: 'postgresql://only-prefix-no-tld',
      });
      expect(result.success).toBe(true);
    });

    it('accepts redis:// prefix for REDIS_URL', () => {
      const result = envSchema.safeParse({
        ...validBaseEnv,
        REDIS_URL: 'redis://only-prefix',
      });
      expect(result.success).toBe(true);
    });

    it('accepts each valid NODE_ENV value', () => {
      for (const nodeEnv of ['development', 'production', 'test'] as const) {
        const result = envSchema.safeParse({ ...validBaseEnv, NODE_ENV: nodeEnv });
        expect(result.success).toBe(true);
      }
    });

    it('accepts each valid LOG_LEVEL value', () => {
      for (const logLevel of ['debug', 'info', 'warn', 'error'] as const) {
        const result = envSchema.safeParse({ ...validBaseEnv, LOG_LEVEL: logLevel });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('invalid inputs', () => {
    it('rejects missing DATABASE_URL', () => {
      const env = { ...validBaseEnv };
      delete (env as Record<string, unknown>).DATABASE_URL;
      const result = envSchema.safeParse(env);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path[0] === 'DATABASE_URL')).toBe(true);
      }
    });

    it('rejects missing REDIS_URL', () => {
      const env = { ...validBaseEnv };
      delete (env as Record<string, unknown>).REDIS_URL;
      const result = envSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it('rejects missing BETTER_AUTH_SECRET', () => {
      const env = { ...validBaseEnv };
      delete (env as Record<string, unknown>).BETTER_AUTH_SECRET;
      const result = envSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it('rejects missing BETTER_AUTH_URL', () => {
      const env = { ...validBaseEnv };
      delete (env as Record<string, unknown>).BETTER_AUTH_URL;
      const result = envSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it('rejects BETTER_AUTH_SECRET shorter than 32 chars', () => {
      const result = envSchema.safeParse({
        ...validBaseEnv,
        BETTER_AUTH_SECRET: 'short',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path[0] === 'BETTER_AUTH_SECRET');
        expect(issue).toBeDefined();
      }
    });

    it('rejects DATABASE_URL with a non-url, non-postgresql:// value', () => {
      const result = envSchema.safeParse({
        ...validBaseEnv,
        DATABASE_URL: 'just-a-string-no-scheme',
      });
      expect(result.success).toBe(false);
    });

    it('rejects REDIS_URL with a non-url, non-redis:// value', () => {
      const result = envSchema.safeParse({
        ...validBaseEnv,
        REDIS_URL: 'just-a-string-no-scheme',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid NODE_ENV values', () => {
      const result = envSchema.safeParse({
        ...validBaseEnv,
        NODE_ENV: 'staging',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid LOG_LEVEL values', () => {
      const result = envSchema.safeParse({
        ...validBaseEnv,
        LOG_LEVEL: 'verbose',
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-url BETTER_AUTH_URL', () => {
      const result = envSchema.safeParse({
        ...validBaseEnv,
        BETTER_AUTH_URL: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('rejects HIAI_OBSERVE_URL when present but invalid', () => {
      const result = envSchema.safeParse({
        ...validBaseEnv,
        HIAI_OBSERVE_URL: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('defaults', () => {
    it('applies API_PORT=50200 by default', () => {
      const result = envSchema.safeParse(validBaseEnv);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.API_PORT).toBe(50200);
    });

    it('applies FRONTEND_PORT=50201 by default', () => {
      const result = envSchema.safeParse(validBaseEnv);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.FRONTEND_PORT).toBe(50201);
    });

    it('applies NODE_ENV=development by default', () => {
      const result = envSchema.safeParse(validBaseEnv);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.NODE_ENV).toBe('development');
    });

    it('applies LOG_LEVEL=info by default', () => {
      const result = envSchema.safeParse(validBaseEnv);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.LOG_LEVEL).toBe('info');
    });
  });
});
