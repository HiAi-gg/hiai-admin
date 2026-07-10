import { describe, it, expect, beforeEach, vi } from 'vitest';

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

vi.mock('../../src/lib/logger.js', () => ({
  logger: { ...logger },
  createChildLogger: () => logger,
}));

vi.mock('../../src/lib/config.js', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    BETTER_AUTH_SECRET: 'test-shared-secret-min-32-characters-long-x',
    BETTER_AUTH_URL: 'http://localhost:50200',
    BETTER_AUTH_TRUSTED_ORIGINS: [],
    AUTH_EVENT_WEBHOOK_URL: 'https://events.hiai.local/webhooks/auth',
    AUTH_EVENT_WEBHOOK_SECRET: 'test-auth-event-secret-that-is-long-enough',
    AUTH_EVENT_WEBHOOK_AUDIENCE: 'hiai-admin',
    AUTH_EVENT_WEBHOOK_ISSUER: 'hiai-admin',
  },
}));

const { createAuthEventService, isPlaceholderSecret } = await import(
  '../../src/modules/auth-events/auth-event.service.js',
);

function decodeClaims(token: string) {
  const [, body] = token.split('.');
  return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
}

describe('authEventService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits a signed verification event without logging actionUrl', async () => {
    const seenHeaders: string[] = [];
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const service = createAuthEventService({
      doFetch: async (_url, init) => {
        const body = JSON.parse(String(init.body));
        seenHeaders.push(body.token);
        return fetchMock();
      },
      sleep: async () => {},
    });

    await service.sendEmailVerificationRequested({
      type: 'auth.email_verification_requested',
      email: 'User@Example.com',
      actionUrl: 'https://admin.local/verify?token=abc',
      name: 'Test',
      id: 'event-a',
    });

    expect(seenHeaders).toHaveLength(1);
    const claims = decodeClaims(seenHeaders[0] as string);
    expect(claims.eventType).toBe('auth.email_verification_requested');
    expect(claims.exp - claims.iat).toBe(60);
    expect(logger.debug.mock.calls[0]?.[0]).toMatchObject({
      eventId: 'event-a',
      eventType: 'auth.email_verification_requested',
      status: 200,
    });
    for (const call of logger.debug.mock.calls.concat(logger.warn.mock.calls, logger.error.mock.calls)) {
      expect(call[0]).not.toHaveProperty('actionUrl');
      expect(call[0]).not.toHaveProperty('token');
    }
  });

  it('emits a signed password-reset event', async () => {
    let bodyText = '';
    const service = createAuthEventService({
      doFetch: async (_url, init) => {
        bodyText = String(init.body);
        return new Response('', { status: 200 });
      },
      sleep: async () => {},
    });

    await service.sendPasswordResetRequested({
      type: 'auth.password_reset_requested',
      email: 'user@example.com',
      name: 'Example',
      actionUrl: 'https://admin.local/reset?token=123',
      id: 'event-b',
    });

    const payload = JSON.parse(bodyText);
    const tokenClaims = decodeClaims(payload.token);
    expect(payload.event.type).toBe('auth.password_reset_requested');
    expect(tokenClaims.eventType).toBe('auth.password_reset_requested');
  });

  it('uses a stable event id across retry attempts', async () => {
    const ids: string[] = [];
    let calls = 0;
    const service = createAuthEventService({
      maxRetries: 3,
      doFetch: async (_url, init) => {
        const payload = JSON.parse(String(init.body));
        ids.push(payload.event.id);
        calls++;
        if (calls < 4) {
          return new Response('', { status: 500, statusText: 'ServerError' });
        }
        return new Response('', { status: 200 });
      },
      sleep: async () => {},
    });

    const result = await service.sendPasswordResetRequested({
      type: 'auth.password_reset_requested',
      email: 'user@example.com',
      actionUrl: 'https://admin.local/reset',
      id: 'stable-id',
    });

    expect(result.eventId).toBe('stable-id');
    expect(new Set(ids).size).toBe(1);
    expect(ids).toEqual(['stable-id', 'stable-id', 'stable-id', 'stable-id']);
    expect(result.attempts).toBe(4);
  });

  it('times out hanging webhook attempts after the configured timeout', async () => {
    const abortSignals: AbortSignal[] = [];
    const service = createAuthEventService({
      maxRetries: 2,
      webhookTimeoutMs: 2,
      doFetch: async (_url, init) =>
        new Promise((_resolve, reject) => {
          const signal = init.signal;
          if (!signal) {
            reject(new Error('signal must be present'));
            return;
          }
          abortSignals.push(signal);
          signal.addEventListener('abort', () => {
            reject(new DOMException('timed out', 'AbortError'));
          });
        }),
      sleep: async () => {},
    });

    await expect(
      service.sendPasswordResetRequested({
        type: 'auth.password_reset_requested',
        email: 'user@example.com',
        actionUrl: 'https://admin.local/reset',
        id: 'timeout-id',
      }),
    ).rejects.toThrow(/timed out/);

    expect(abortSignals).toHaveLength(3);
    expect(abortSignals.every((signal) => signal.aborted)).toBe(true);
  });

  it('rejects placeholder webhook secrets at startup', () => {
    expect(() =>
      createAuthEventService({
        webhookSecret: 'change-me',
      }),
    ).toThrowError(/placeholder value/i);
    expect(isPlaceholderSecret('your-secret')).toBe(true);
    expect(isPlaceholderSecret('real-secret-value')).toBe(false);
  });

  it('fails the auth action after three webhook failures', async () => {
    const sleeps: number[] = [];
    const service = createAuthEventService({
      maxRetries: 2,
      doFetch: async () => new Response('', { status: 502, statusText: 'BadGateway' }),
      sleep: async (ms: number) => {
        sleeps.push(ms);
      },
    });

    await expect(
      service.sendEmailVerificationRequested({
        type: 'auth.email_verification_requested',
        email: 'user@example.com',
        actionUrl: 'https://admin.local/verify',
        id: 'event-fail',
      }),
    ).rejects.toThrow();

    expect(sleeps).toEqual([250, 1000]);
  });
});
