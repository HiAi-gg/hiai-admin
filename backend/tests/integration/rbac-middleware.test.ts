import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Elysia } from 'elysia';

vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.BETTER_AUTH_SECRET = 'test-shared-secret-min-32-characters-long-x';
  process.env.BETTER_AUTH_URL = 'http://localhost:50200';
});

const checkPermission = vi.fn();

vi.mock('../../src/modules/rbac/rbac.service.js', () => ({ checkPermission }));

const { rbacMiddleware } = await import('../../src/api/middleware/rbac.js');

type User = { id: string; email: string; role: string } | null;

function makeApp(user: User, permission: string) {
  return new Elysia()
    .derive(() => (user ? { user } : {}))
    .use(rbacMiddleware)
    .get('/x', () => ({ ok: true }), { requirePermission: permission });
}

function get(app: ReturnType<typeof makeApp>) {
  return app.handle(new Request('http://localhost/x'));
}

describe('rbacMiddleware.requirePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await get(makeApp(null, 'tenants:read'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
    expect(checkPermission).not.toHaveBeenCalled();
  });

  it('bypasses the permission check for super_admin', async () => {
    const res = await get(
      makeApp({ id: 'u1', email: 'a@b.c', role: 'super_admin' }, 'tenants:delete'),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(checkPermission).not.toHaveBeenCalled();
  });

  it('allows the request when the user holds the required permission', async () => {
    checkPermission.mockResolvedValueOnce(true);
    const res = await get(makeApp({ id: 'u1', email: 'a@b.c', role: 'staff' }, 'tenants:read'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(checkPermission).toHaveBeenCalledWith('u1', 'tenants:read');
  });

  it('forbids the request with 403 when the permission is missing', async () => {
    checkPermission.mockResolvedValueOnce(false);
    const res = await get(makeApp({ id: 'u1', email: 'a@b.c', role: 'staff' }, 'tenants:delete'));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden — requires: tenants:delete' });
  });
});
