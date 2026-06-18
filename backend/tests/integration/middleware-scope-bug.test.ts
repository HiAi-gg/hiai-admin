import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.BETTER_AUTH_SECRET = 'test-shared-secret-min-32-characters-long-x';
  process.env.BETTER_AUTH_URL = 'http://localhost:50200';
});

const redisMock = { incr: vi.fn(), pexpire: vi.fn() };
const record = vi.fn();
const envMock = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379',
  BETTER_AUTH_SECRET: 'test-shared-secret-min-32-characters-long-x',
  BETTER_AUTH_URL: 'http://localhost:50200',
  AUDIT_FAIL_CLOSED: false,
};

vi.mock('../../src/lib/redis.js', () => ({ redis: redisMock }));
vi.mock('../../src/lib/config.js', () => ({ env: envMock }));
vi.mock('../../src/lib/logger.js', () => {
  const noop = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  return { logger: { ...noop, child: () => noop }, createChildLogger: () => noop };
});
vi.mock('../../src/modules/audit/audit.service.js', () => ({ auditService: { record } }));

const Elysia = (await import('elysia')).Elysia;
const { createRateLimiter } = await import('../../src/api/middleware/rateLimiter.js');
const { auditMiddleware } = await import('../../src/api/middleware/audit.js');

describe('middleware scope bug: hooks on sibling-mounted plugins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    record.mockResolvedValue(undefined);
  });

  it('rate limiter should apply to routes mounted as siblings (not defined on the middleware instance itself)', async () => {
    // Simulate the real setup: parent app with middleware, then a separate child plugin with a route.
    // The middleware is used as a sibling, not a parent of the route's plugin.
    const parent = new Elysia()
      .use(createRateLimiter('billing'))
      .derive(() => ({ user: { id: 'user-1', email: 'user@test.com' } }));

    // Separate child plugin (like webhooksStripeRoutes)
    const childRoutes = new Elysia({ prefix: '/webhooks' }).post('/stripe', () => ({
      ok: true,
    }));

    const app = parent.use(childRoutes);

    redisMock.incr.mockResolvedValueOnce(31); // Exceed limit (max is 30 for 'billing' tier)

    const res = await app.handle(
      new Request('http://localhost/webhooks/stripe', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.7' },
      }),
    );

    // The rate limiter should have run and rejected the request with 429.
    // If the hook doesn't run (the bug), this will be 200.
    expect(res.status).toBe(429);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('30');
  });

  it('audit middleware should apply to routes mounted as siblings', async () => {
    const parent = new Elysia()
      .use(auditMiddleware)
      .derive(() => ({ user: { id: 'user-1', email: 'user@test.com' } }));

    // Separate child plugin
    const childRoutes = new Elysia({ prefix: '/api/v1' }).post('/tenants', () => ({
      ok: true,
    }));

    const app = parent.use(childRoutes);

    const res = await app.handle(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.7' },
      }),
    );

    // The audit middleware's onAfterHandle should have recorded the action.
    // If the hook doesn't run (the bug), auditService.record won't be called.
    expect(res.status).toBe(200);
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'user-1',
        actorEmail: 'user@test.com',
        action: 'tenants:create',
      }),
    );
  });
});
