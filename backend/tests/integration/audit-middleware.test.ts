import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.BETTER_AUTH_SECRET = 'test-shared-secret-min-32-characters-long-x';
  process.env.BETTER_AUTH_URL = 'http://localhost:50200';
});

const record = vi.fn();
// Mutable env so individual tests can flip AUDIT_FAIL_CLOSED (read at request time).
const envMock = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379',
  BETTER_AUTH_SECRET: 'test-shared-secret-min-32-characters-long-x',
  BETTER_AUTH_URL: 'http://localhost:50200',
  AUDIT_FAIL_CLOSED: false,
};

vi.mock('../../src/lib/config.js', () => ({ env: envMock }));
vi.mock('../../src/lib/logger.js', () => {
  const noop = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  return { logger: { ...noop, child: () => noop }, createChildLogger: () => noop };
});
vi.mock('../../src/modules/audit/audit.service.js', () => ({ auditService: { record } }));

const { auditMiddleware, getAuditMetrics } = await import('../../src/api/middleware/audit.js');

type User = { id: string; email: string } | null;
let currentUser: User = null;

// Routes are defined on the auditMiddleware instance so its onAfterHandle hook runs.
const app = auditMiddleware
  .derive(() => (currentUser ? { user: currentUser } : {}))
  .post('/api/v1/tenants/t1', () => ({ ok: true }))
  .get('/api/v1/tenants', () => ({ ok: true }));

const post = () =>
  app.handle(new Request('http://localhost/api/v1/tenants/t1', { method: 'POST' }));
const getList = () => app.handle(new Request('http://localhost/api/v1/tenants'));

describe('auditMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = { id: 'admin-1', email: 'admin@hiai.dev' };
    envMock.AUDIT_FAIL_CLOSED = false;
    record.mockResolvedValue(undefined);
  });

  it('records a CUD operation by an authenticated user', async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        actorEmail: 'admin@hiai.dev',
        action: 'tenants:create',
        resource: 'tenants',
        resourceId: 't1',
      }),
    );
  });

  it('does not audit read (GET) requests', async () => {
    const res = await getList();
    expect(res.status).toBe(200);
    expect(record).not.toHaveBeenCalled();
  });

  it('does not audit when there is no authenticated user', async () => {
    currentUser = null;
    const res = await post();
    expect(res.status).toBe(200);
    expect(record).not.toHaveBeenCalled();
  });

  it('fails open by default: the CUD response still succeeds when the audit write throws', async () => {
    record.mockRejectedValueOnce(new Error('db down'));
    const before = getAuditMetrics().audit_failures_total;

    const res = await post();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(getAuditMetrics().audit_failures_total).toBe(before + 1);
  });

  it('fails closed when AUDIT_FAIL_CLOSED is set: rejects the response with 500', async () => {
    envMock.AUDIT_FAIL_CLOSED = true;
    record.mockRejectedValueOnce(new Error('db down'));
    const before = getAuditMetrics().audit_fail_closed_rejections_total;

    const res = await post();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: 'Audit log unavailable; operation rejected (AUDIT_FAIL_CLOSED)',
    });
    expect(getAuditMetrics().audit_fail_closed_rejections_total).toBe(before + 1);
  });
});
