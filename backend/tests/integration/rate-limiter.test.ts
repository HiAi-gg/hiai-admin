import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.BETTER_AUTH_SECRET = 'test-shared-secret-min-32-characters-long-x';
  process.env.BETTER_AUTH_URL = 'http://localhost:50200';
});

const redisMock = { incr: vi.fn(), pexpire: vi.fn() };

vi.mock('../../src/lib/redis.js', () => ({ redis: redisMock }));
vi.mock('../../src/lib/logger.js', () => {
  const noop = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  return { logger: { ...noop, child: () => noop }, createChildLogger: () => noop };
});

const { createRateLimiter } = await import('../../src/api/middleware/rateLimiter.js');

// 'billing' tier → max 30 / 60s window.
// The route is defined on the limiter instance itself so its `.derive` hook
// (a named, locally-scoped Elysia plugin) actually runs for the request.
function makeApp() {
  return createRateLimiter('billing').get('/x', () => ({ ok: true }));
}

function get(app: ReturnType<typeof makeApp>) {
  return app.handle(
    new Request('http://localhost/x', { headers: { 'x-forwarded-for': '203.0.113.7' } }),
  );
}

describe('createRateLimiter (billing tier: 30/min)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows the first request and sets the window TTL', async () => {
    redisMock.incr.mockResolvedValueOnce(1);
    const res = await get(makeApp());
    expect(res.status).toBe(200);
    expect(redisMock.incr).toHaveBeenCalledWith('rl:bill:203.0.113.7');
    expect(redisMock.pexpire).toHaveBeenCalledWith('rl:bill:203.0.113.7', 60_000);
  });

  it('allows requests that stay within the limit without resetting the TTL', async () => {
    redisMock.incr.mockResolvedValueOnce(30); // exactly at max
    const res = await get(makeApp());
    expect(res.status).toBe(200);
    expect(redisMock.pexpire).not.toHaveBeenCalled(); // only set when count === 1
  });

  it('rejects with 429 and rate-limit headers once the limit is exceeded', async () => {
    redisMock.incr.mockResolvedValueOnce(31); // over max
    const res = await get(makeApp());
    expect(res.status).toBe(429);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('30');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(res.headers.get('Retry-After')).toBe('60');
  });

  it('fails open (allows the request) when Redis is unavailable', async () => {
    redisMock.incr.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const res = await get(makeApp());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
