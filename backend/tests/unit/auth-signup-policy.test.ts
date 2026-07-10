import { describe, it, expect, vi } from 'vitest';

const TRUSTED_HEADER = 'x-auth-trusted-client';
const trustedSecret = 'test-trusted-secret-super-safe';

vi.mock('../../src/lib/config.js', () => ({
  env: {
    AUTH_SIGNUP_MODE: 'public',
    AUTH_TRUSTED_CLIENT_SECRET: trustedSecret,
    BETTER_AUTH_SECRET: 'test-shared-secret-min-32-characters-long-x',
    LOG_LEVEL: 'info',
    BETTER_AUTH_URL: 'http://localhost:50200',
    BETTER_AUTH_TRUSTED_ORIGINS: [],
    REDIS_URL: 'redis://localhost:6379',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    AUTH_EVENT_WEBHOOK_URL: undefined,
    AUTH_EVENT_WEBHOOK_SECRET: undefined,
    AUTH_EVENT_WEBHOOK_AUDIENCE: 'hiai-admin',
    AUTH_EVENT_WEBHOOK_ISSUER: 'hiai-admin',
  },
}));

const { getAuthSignupPolicyError } = await import('../../src/auth/index.js');
const SIGNUP_PATH = '/api/auth/sign-up/email';
const FORGET_PATH = '/api/auth/forget-password';
const REQUEST_PASSWORD_RESET_PATH = '/api/auth/request-password-reset';

describe('AUTH_SIGNUP_MODE policy', () => {
  it('blocks signup when disabled', () => {
    expect(
      getAuthSignupPolicyError(SIGNUP_PATH, 'POST', undefined, 'disabled'),
    ).toMatchObject({
      status: 403,
      code: 'AUTH_SIGNUP_DISABLED',
    });
  });

  it('blocks password-reset request when disabled', () => {
    expect(
      getAuthSignupPolicyError(FORGET_PATH, 'POST', undefined, 'disabled'),
    ).toMatchObject({
      status: 403,
      code: 'AUTH_PASSWORD_RESET_DISABLED',
    });
  });

  it('requires trusted client header for signup in trusted-client mode', () => {
    expect(
      getAuthSignupPolicyError(SIGNUP_PATH, 'POST', undefined, 'trusted-client'),
    ).toMatchObject({
      status: 403,
      code: 'AUTH_TRUSTED_CLIENT_REQUIRED_FOR_SIGNUP',
    });

    expect(
      getAuthSignupPolicyError(
        SIGNUP_PATH,
        'POST',
        { [TRUSTED_HEADER]: trustedSecret } as Record<string, string>,
        'trusted-client',
      ),
    ).toBeNull();
  });

  it('requires trusted client header for password-reset request in trusted-client mode', () => {
    expect(
      getAuthSignupPolicyError(FORGET_PATH, 'POST', undefined, 'trusted-client'),
    ).toMatchObject({
      status: 403,
      code: 'AUTH_TRUSTED_CLIENT_REQUIRED_FOR_PASSWORD_RESET',
    });

    expect(
      getAuthSignupPolicyError(
        FORGET_PATH,
        'POST',
        { [TRUSTED_HEADER]: trustedSecret } as Record<string, string>,
        'trusted-client',
      ),
    ).toBeNull();
    expect(
      getAuthSignupPolicyError(
        REQUEST_PASSWORD_RESET_PATH,
        'POST',
        { [TRUSTED_HEADER]: trustedSecret } as Record<string, string>,
        'trusted-client',
      ),
    ).toBeNull();
  });

  it('allows signup and reset in public mode', () => {
    expect(getAuthSignupPolicyError(SIGNUP_PATH, 'POST', undefined, 'public')).toBeNull();
    expect(getAuthSignupPolicyError(FORGET_PATH, 'POST', undefined, 'public')).toBeNull();
  });

  it('ignores unrelated Better Auth routes', () => {
    expect(getAuthSignupPolicyError('/api/auth/sign-in/email', 'POST', undefined, 'disabled')).toBeNull();
  });
});
