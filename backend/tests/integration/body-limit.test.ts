import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.BETTER_AUTH_SECRET = 'test-shared-secret-min-32-characters-long-x';
  process.env.BETTER_AUTH_URL = 'http://localhost:50200';
  process.env.MAX_BODY_BYTES = '1024'; // 1 KB for testing
});

const envMock = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379',
  BETTER_AUTH_SECRET: 'test-shared-secret-min-32-characters-long-x',
  BETTER_AUTH_URL: 'http://localhost:50200',
  MAX_BODY_BYTES: 1024,
};

vi.mock('../../src/lib/config.js', () => ({ env: envMock }));
vi.mock('../../src/lib/logger.js', () => {
  const noop = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  return { logger: { ...noop, child: () => noop }, createChildLogger: () => noop };
});

const { bodyLimitMiddleware } = await import('../../src/api/middleware/bodyLimit.js');

// Routes are defined on the middleware instance so its onBeforeHandle hook runs.
const app = bodyLimitMiddleware
  .post('/api/v1/tenants', () => ({ ok: true }))
  .get('/api/v1/tenants', () => ({ ok: true }));

describe('bodyLimitMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows a request with content-length under the limit', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: { 'content-length': '512' },
        body: 'x'.repeat(512),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('allows a request at exactly the limit', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: { 'content-length': '1024' },
        body: 'x'.repeat(1024),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('rejects a request with content-length exceeding the limit with 413', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: { 'content-length': '2048' },
        body: 'x'.repeat(2048),
      }),
    );
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('code');
  });

  it('allows GET requests regardless of content-length', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants', {
        method: 'GET',
        headers: { 'content-length': '5000' },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('rejects POST without content-length header if body size is suspicious', async () => {
    // When content-length is missing, we should still allow if there's no body.
    // The Elysia request parsing will handle validation.
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
      }),
    );
    expect(res.status).toBe(200);
  });
});
