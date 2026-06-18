import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.BETTER_AUTH_SECRET = 'test-shared-secret-min-32-characters-long-x';
  process.env.BETTER_AUTH_URL = 'http://localhost:50200';
  process.env.BETTER_AUTH_TRUSTED_ORIGINS = 'http://localhost:3000,https://admin.example.com';
});

const envMock = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379',
  BETTER_AUTH_SECRET: 'test-shared-secret-min-32-characters-long-x',
  BETTER_AUTH_URL: 'http://localhost:50200',
  BETTER_AUTH_TRUSTED_ORIGINS: ['http://localhost:3000', 'https://admin.example.com'],
};

vi.mock('../../src/lib/config.js', () => ({ env: envMock }));
vi.mock('../../src/lib/logger.js', () => {
  const noop = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  return { logger: { ...noop, child: () => noop }, createChildLogger: () => noop };
});

const { csrfMiddleware } = await import('../../src/api/middleware/csrf.js');

// Routes are defined on the middleware instance so its onBeforeHandle hook runs.
const app = csrfMiddleware
  .post('/api/v1/tenants', () => ({ ok: true }))
  .put('/api/v1/tenants/:id', () => ({ ok: true }))
  .patch('/api/v1/tenants/:id', () => ({ ok: true }))
  .delete('/api/v1/tenants/:id', () => ({ ok: true }))
  .get('/api/v1/tenants', () => ({ ok: true }));

describe('csrfMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // POST tests
  it('POST with a trusted origin (cookie-auth) passes', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          cookie: 'session=abc123',
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('POST with an evil origin (cookie-auth) returns 403', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: {
          origin: 'http://evil.com',
          cookie: 'session=abc123',
        },
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('code');
  });

  it('POST with missing origin and cookie-auth returns 403', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: {
          cookie: 'session=abc123',
        },
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('POST with a Bearer token (server-to-server, no cookie) passes without origin check', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: {
          authorization: 'Bearer admin-jwt-token-here',
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('POST with Bearer token and a bad origin still passes (bearer bypasses CSRF check)', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: {
          authorization: 'Bearer admin-jwt-token-here',
          origin: 'http://evil.com',
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  // PUT tests
  it('PUT with a trusted origin (cookie-auth) passes', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants/t1', {
        method: 'PUT',
        headers: {
          origin: 'https://admin.example.com',
          cookie: 'session=abc123',
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('PUT with an evil origin (cookie-auth) returns 403', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants/t1', {
        method: 'PUT',
        headers: {
          origin: 'http://attacker.com',
          cookie: 'session=xyz789',
        },
      }),
    );
    expect(res.status).toBe(403);
  });

  // PATCH tests
  it('PATCH with a trusted origin (cookie-auth) passes', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants/t1', {
        method: 'PATCH',
        headers: {
          origin: 'http://localhost:3000',
          cookie: 'session=abc123',
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('PATCH with an evil origin (cookie-auth) returns 403', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants/t1', {
        method: 'PATCH',
        headers: {
          origin: 'http://evil.com',
          cookie: 'session=abc123',
        },
      }),
    );
    expect(res.status).toBe(403);
  });

  // DELETE tests
  it('DELETE with a trusted origin (cookie-auth) passes', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants/t1', {
        method: 'DELETE',
        headers: {
          origin: 'http://localhost:3000',
          cookie: 'session=abc123',
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('DELETE with an evil origin (cookie-auth) returns 403', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants/t1', {
        method: 'DELETE',
        headers: {
          origin: 'http://bad-site.com',
          cookie: 'session=abc123',
        },
      }),
    );
    expect(res.status).toBe(403);
  });

  // GET always passes
  it('GET with any origin always passes', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants', {
        method: 'GET',
        headers: {
          origin: 'http://evil.com',
          cookie: 'session=abc123',
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('GET with missing origin and cookie-auth passes', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants', {
        method: 'GET',
        headers: {
          cookie: 'session=abc123',
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  // Referer fallback tests
  it('POST with missing origin but valid referer (cookie-auth) passes', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: {
          referer: 'http://localhost:3000/dashboard',
          cookie: 'session=abc123',
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('POST with missing origin but evil referer (cookie-auth) returns 403', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: {
          referer: 'http://attacker.com/page',
          cookie: 'session=abc123',
        },
      }),
    );
    expect(res.status).toBe(403);
  });

  it('POST with neither origin nor referer (cookie-auth) returns 403', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: {
          cookie: 'session=abc123',
        },
      }),
    );
    expect(res.status).toBe(403);
  });

  it('POST without cookie but with origin (no session to protect) passes', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: {
          origin: 'http://evil.com',
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
