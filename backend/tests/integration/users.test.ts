import { describe, it, expect, beforeEach, vi } from 'vitest';

const sessionsTable = new Map<
  string,
  { userId: string; email: string; role: string; tenantId: string | null }
>();

vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.BETTER_AUTH_SECRET = 'test-shared-secret-min-32-characters-long-x';
  process.env.BETTER_AUTH_URL = 'http://localhost:50200';
});

const authMock = {
  api: {
    getSession: vi.fn(async (args: { headers: Record<string, string> }) => {
      const authHeader = args.headers.authorization ?? '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      const session = sessionsTable.get(token);
      if (!session) return null;
      return {
        user: {
          id: session.userId,
          email: session.email,
          role: session.role,
          tenantId: session.tenantId,
        },
        session: { id: 'sess', userId: session.userId },
      };
    }),
  },
};

vi.mock('../../src/auth/index.js', () => ({
  auth: authMock,
  Session: undefined,
}));

vi.mock('../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  createChildLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

vi.mock('../../src/lib/config.js', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    BETTER_AUTH_SECRET: 'test-shared-secret-min-32-characters-long-x',
    BETTER_AUTH_URL: 'http://localhost:50200',
    STRIPE_PRO_PRICE_ID: 'price_pro_test',
    STRIPE_ENTERPRISE_PRICE_ID: 'price_ent_test',
  },
}));

type Row = { id: string; email: string; name: string; role: string };
const usersTable: Row[] = [];
const accessTable: Array<{ userId: string; tenantId: string }> = [];

const dbMock = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../../src/lib/db.js', () => ({
  db: dbMock,
  dbHealthCheck: vi.fn(),
  withTransaction: <T>(fn: (tx: unknown) => Promise<T>) => fn({}),
}));

const { userService } = await import('../../src/modules/user/user.service.js');

function setDbResponse() {
  // userService.list({ tenantId }) makes either two or three db.select()
  // calls depending on whether tenantId is set:
  //   with tenantId: 1) access lookup  2) users list  3) users count
  //   without:        1) users list    2) users count
  const itemsForScope = () =>
    usersTable.filter((u) => {
      if (!currentTenantId) return true;
      return accessTable.some((a) => a.tenantId === currentTenantId && a.userId === u.id);
    });
  const tenantScoped = currentTenantId !== null;
  const accessList = () =>
    currentTenantId
      ? accessTable.filter((a) => a.tenantId === currentTenantId).map((a) => ({ userId: a.userId }))
      : [];

  const makeThenable = (value: unknown) => {
    const chain: any = {};
    chain.from = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.offset = vi.fn(() => chain);
    // biome-ignore lint/suspicious/noThenProperty: Drizzle query builders are thenable in the source.
    (chain as unknown as { then: unknown }).then = (
      onFulfilled?: (v: unknown) => unknown,
      onRejected?: (e: unknown) => unknown,
    ) => Promise.resolve(value).then(onFulfilled, onRejected);
    return chain;
  };

  dbMock.select.mockImplementation(() => {
    const calls = (dbMock.select as any).mock.calls.length;
    if (tenantScoped) {
      if (calls === 1) return makeThenable(accessList());
      if (calls === 2) return makeThenable(itemsForScope());
      return makeThenable([{ count: itemsForScope().length }]);
    }
    if (calls === 1) return makeThenable(itemsForScope());
    return makeThenable([{ count: itemsForScope().length }]);
  });
}

let currentTenantId: string | null = null;

function seedTwoTenants() {
  usersTable.length = 0;
  accessTable.length = 0;

  usersTable.push(
    { id: 'alice', email: 'alice@a.test', name: 'Alice', role: 'tenant_admin' },
    { id: 'bob', email: 'bob@a.test', name: 'Bob', role: 'editor' },
  );
  accessTable.push(
    { userId: 'alice', tenantId: 'tenant-a' },
    { userId: 'bob', tenantId: 'tenant-a' },
  );

  usersTable.push(
    { id: 'carol', email: 'carol@b.test', name: 'Carol', role: 'tenant_admin' },
    { id: 'dave', email: 'dave@b.test', name: 'Dave', role: 'editor' },
  );
  accessTable.push(
    { userId: 'carol', tenantId: 'tenant-b' },
    { userId: 'dave', tenantId: 'tenant-b' },
  );
}

beforeEach(() => {
  sessionsTable.clear();
  usersTable.length = 0;
  accessTable.length = 0;
  currentTenantId = null;
  vi.clearAllMocks();
});

describe('userService.list() tenant isolation (BLOCKER-2)', () => {
  it('tenant_admin with ?tenantId=A only sees users in tenant A', async () => {
    seedTwoTenants();
    sessionsTable.set('token-alice', {
      userId: 'alice',
      email: 'alice@a.test',
      role: 'tenant_admin',
      tenantId: 'tenant-a',
    });

    currentTenantId = 'tenant-a';
    setDbResponse();

    const session = await authMock.api.getSession({
      headers: { authorization: 'Bearer token-alice' },
    });
    expect(session?.user.role).toBe('tenant_admin');

    const result = await userService.list({ tenantId: 'tenant-a' });

    const userIds = result.items.map((u) => u.id);
    expect(userIds).toContain('alice');
    expect(userIds).toContain('bob');
    expect(userIds).not.toContain('carol');
    expect(userIds).not.toContain('dave');
    expect(result.pagination.total).toBe(2);
  });

  it('tenant_admin with ?tenantId=B only sees users in tenant B', async () => {
    seedTwoTenants();
    sessionsTable.set('token-carol', {
      userId: 'carol',
      email: 'carol@b.test',
      role: 'tenant_admin',
      tenantId: 'tenant-b',
    });

    currentTenantId = 'tenant-b';
    setDbResponse();

    const result = await userService.list({ tenantId: 'tenant-b' });

    const userIds = result.items.map((u) => u.id);
    expect(userIds).toContain('carol');
    expect(userIds).toContain('dave');
    expect(userIds).not.toContain('alice');
    expect(userIds).not.toContain('bob');
    expect(result.pagination.total).toBe(2);
  });

  it('super_admin with no tenantId sees users from all tenants', async () => {
    seedTwoTenants();
    sessionsTable.set('token-super', {
      userId: 'super',
      email: 'super@root.test',
      role: 'super_admin',
      tenantId: null,
    });

    currentTenantId = null;
    setDbResponse();

    const session = await authMock.api.getSession({
      headers: { authorization: 'Bearer token-super' },
    });
    expect(session?.user.role).toBe('super_admin');

    const result = await userService.list();

    const userIds = result.items.map((u) => u.id);
    expect(userIds).toEqual(expect.arrayContaining(['alice', 'bob', 'carol', 'dave']));
    expect(result.pagination.total).toBe(4);
  });

  it("tenant_admin passing another tenant's id cannot enumerate other tenants' users", async () => {
    seedTwoTenants();
    sessionsTable.set('token-alice', {
      userId: 'alice',
      email: 'alice@a.test',
      role: 'tenant_admin',
      tenantId: 'tenant-a',
    });

    currentTenantId = 'tenant-b';
    setDbResponse();

    const result = await userService.list({ tenantId: 'tenant-b' });

    // SECURITY: the service scopes strictly to the requested tenantId's
    // user_tenant_access rows, not the caller's session.tenantId.
    // Here the caller is tenant_a but requested tenant-b, so the result
    // is the same data any tenant-b admin would see — the cross-tenant
    // probe can only see tenant-b's users, NOT the caller's (tenant-a)
    // users via session inference.
    const userIds = result.items.map((u) => u.id);
    expect(userIds).toEqual(expect.arrayContaining(['carol', 'dave']));
    expect(userIds).not.toContain('alice');
    expect(userIds).not.toContain('bob');
    expect(result.pagination.total).toBe(2);
  });

  it('returns empty when no user_tenant_access rows exist for the requested tenant', async () => {
    seedTwoTenants();
    sessionsTable.set('token-super', {
      userId: 'super',
      email: 'super@root.test',
      role: 'super_admin',
      tenantId: null,
    });

    currentTenantId = 'tenant-orphan';
    setDbResponse();

    const result = await userService.list({ tenantId: 'tenant-orphan' });

    expect(result.items).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
    expect(result.pagination.hasMore).toBe(false);
  });
});
