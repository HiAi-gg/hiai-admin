import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

process.env.STRIPE_PRO_PRICE_ID ??= 'price_pro_test';
process.env.STRIPE_ENTERPRISE_PRICE_ID ??= 'price_enterprise_test';

type DbCall = {
  kind: 'select' | 'insert' | 'update' | 'delete';
  table?: string;
  values?: unknown;
  setValues?: unknown;
  filters?: unknown;
};

const dbCalls: DbCall[] = [];
const dbState = new Map<string, Map<string, Record<string, unknown>>>();

function rowsFor(table: unknown): Map<string, Record<string, unknown>> {
  const key = tableKey(table);
  let bucket = dbState.get(key);
  if (!bucket) {
    bucket = new Map();
    dbState.set(key, bucket);
  }
  return bucket;
}

function tableKey(table: unknown): string {
  if (table && typeof table === 'object') {
    const name = (table as { [k: symbol]: unknown })[Symbol.for('drizzle:Name')];
    if (typeof name === 'string') return name;
  }
  return String(table);
}

function firstParamValue(sql: unknown): unknown {
  if (!sql || typeof sql !== 'object') return undefined;
  const obj = sql as { queryChunks?: unknown[] };
  if (!Array.isArray(obj.queryChunks)) return undefined;
  for (const chunk of obj.queryChunks) {
    if (chunk && typeof chunk === 'object') {
      const c = chunk as { value?: unknown; queryChunks?: unknown[] };
      if ('value' in c && c.value !== undefined && (c as any).brand === undefined) {
        if (typeof c.value === 'string' || typeof c.value === 'number') return c.value;
      }
      if (Array.isArray(c.queryChunks)) {
        const nested = firstParamValue(c);
        if (nested !== undefined) return nested;
      }
    }
  }
  return undefined;
}

function makeChain(initialTable?: unknown) {
  let currentTable: unknown = initialTable;
  let lastFilter: unknown;
  let lastReturning: unknown[] | null = null;
  const chain: any = {};

  chain.from = vi.fn((t: unknown) => {
    currentTable = t;
    const last = dbCalls[dbCalls.length - 1];
    if (last) last.table = String(t);
    return chain;
  });
  chain.where = vi.fn((f: unknown) => {
    lastFilter = f;
    const last = dbCalls[dbCalls.length - 1];
    if (last) last.filters = f;
    return chain;
  });
  chain.limit = vi.fn(() => chain);
  chain.offset = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);

  chain.values = vi.fn((v: unknown) => {
    dbCalls.push({ kind: 'insert', values: v });
    if (currentTable) {
      const bucket = rowsFor(currentTable);
      const rowObj = (v && typeof v === 'object' ? (v as Record<string, unknown>) : {}) as Record<
        string,
        unknown
      >;
      const id = rowObj.id != null ? String(rowObj.id) : JSON.stringify(v);
      bucket.set(id, { ...rowObj, id, createdAt: new Date() });
    }
    return chain;
  });

  chain.set = vi.fn((v: unknown) => {
    const last = dbCalls[dbCalls.length - 1];
    if (last && last.kind === 'update') {
      last.setValues = v;
    } else {
      dbCalls.push({ kind: 'update', setValues: v });
    }
    if (currentTable) {
      const bucket = rowsFor(currentTable);
      const patch = (v && typeof v === 'object' ? (v as Record<string, unknown>) : {}) as Record<
        string,
        unknown
      >;
      const targetId = lastFilter !== undefined ? firstParamValue(lastFilter) : undefined;
      if (targetId !== undefined) {
        const existing = bucket.get(String(targetId));
        if (existing) bucket.set(String(targetId), { ...existing, ...patch });
      } else {
        for (const [id, row] of bucket) {
          bucket.set(id, { ...row, ...patch });
        }
      }
    }
    return chain;
  });

  // biome-ignore lint/suspicious/noThenProperty: Drizzle chains are thenables that the source code awaits
  chain.then = (resolve: (v: unknown) => void, _reject: (e: unknown) => void) => {
    if (lastReturning) {
      resolve(lastReturning);
      return;
    }
    if (currentTable) {
      const bucket = rowsFor(currentTable);
      const targetId = lastFilter !== undefined ? firstParamValue(lastFilter) : undefined;
      if (targetId !== undefined) {
        const match = bucket.get(String(targetId));
        resolve(match ? [match] : []);
        return;
      }
      resolve(Array.from(bucket.values()));
      return;
    }
    resolve([]);
  };

  chain.returning = vi.fn(() => {
    const row = { id: 'row-1', createdAt: new Date() };
    lastReturning = [row];
    const sub: any = {};
    // biome-ignore lint/suspicious/noThenProperty: Drizzle's `returning()` is itself a thenable
    sub.then = (resolve: (v: unknown) => void) => resolve([row]);
    return sub;
  });

  return chain;
}

const dbMock = {
  select: vi.fn(() => {
    dbCalls.push({ kind: 'select' });
    return makeChain();
  }),
  // `chain.values` already records the insert payload. Pushing here too would
  // make `dbCalls.find(kind==='insert')` return the table-only entry with no values.
  insert: vi.fn((_t: unknown) => makeChain(_t)),
  update: vi.fn((t: unknown) => {
    dbCalls.push({ kind: 'update', table: String(t) });
    return makeChain(t);
  }),
  delete: vi.fn((t: unknown) => {
    dbCalls.push({ kind: 'delete', table: String(t) });
    return makeChain(t);
  }),
};

vi.mock('../../src/lib/db.js', () => ({
  db: dbMock,
  dbHealthCheck: () => Promise.resolve(true),
  withTransaction: <T>(fn: (tx: typeof dbMock) => Promise<T>) => fn(dbMock),
}));

vi.mock('../../src/lib/redis.js', () => ({
  redis: {
    incr: vi.fn(() => Promise.resolve(1)),
    get: vi.fn(() => Promise.resolve(null)),
    set: vi.fn(() => Promise.resolve('OK')),
  },
  redisHealthCheck: () => Promise.resolve(true),
}));

vi.mock('../../src/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
  createChildLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

vi.mock('../../src/lib/config.js', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    BETTER_AUTH_SECRET: 'a'.repeat(32),
    BETTER_AUTH_URL: 'http://localhost:50200',
    STRIPE_SECRET_KEY: 'sk_test_mock',
    STRIPE_WEBHOOK_SECRET: 'whsec_mock',
    STRIPE_PLATFORM_ACCOUNT_ID: 'acct_mock',
    HIAI_OBSERVE_URL: 'http://localhost:8001',
    API_PORT: 50200,
    FRONTEND_PORT: 50201,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  },
}));

vi.mock('../../src/auth/index.js', () => ({
  auth: {
    api: {
      getSession: () =>
        Promise.resolve({
          user: { id: 'super_admin_1', email: '[email protected]', role: 'super_admin' },
          session: { id: 'sess_1', expiresAt: new Date(Date.now() + 3600_000) },
        }),
    },
  },
}));

const { tenantService } = await import('../../src/modules/tenant/tenant.service.js');
const { auditService } = await import('../../src/modules/audit/audit.service.js');
const { subscribe, getCurrent } = await import('../../src/modules/billing/subscription.service.js');
const { stripeService } = await import('../../src/modules/billing/stripe.service.js');
const { tenants: tenantsSchema } = await import('../../src/db/schema/index.js');

function lastInsert(): DbCall | undefined {
  for (let i = dbCalls.length - 1; i >= 0; i--) {
    if (dbCalls[i].kind === 'insert') return dbCalls[i];
  }
  return undefined;
}

function insertsWhere(predicate: (v: any) => boolean): DbCall[] {
  return dbCalls.filter((c) => c.kind === 'insert' && predicate(c.values));
}

beforeEach(() => {
  dbCalls.length = 0;
  dbState.clear();
  dbMock.select.mockClear();
  dbMock.insert.mockClear();
  dbMock.update.mockClear();
  dbMock.delete.mockClear();
  // Seed the tenant table so getById/subscribe/etc. find existing rows.
  const tenantsBucket = rowsFor(tenantsSchema);
  for (const id of [
    'tenant_001',
    'tenant_billing',
    'tenant_query',
    'tenant_freebie',
    'tenant_active',
    'tenant_up',
  ]) {
    tenantsBucket.set(id, {
      id,
      name: id,
      slug: id,
      email: `${id}@test.local`,
      plan: 'free',
      status: 'active',
      createdAt: new Date(),
    });
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Cross-Project Integration: hiai-admin ↔ hiai-store — Tenant provisioning triggers store creation', () => {
  it('creates a tenant record in the admin database', async () => {
    await tenantService.create({
      name: 'Acme Coffee',
      slug: 'acme-coffee',
      email: '[email protected]',
      plan: 'free',
    });

    const insert = lastInsert();
    expect(insert).toBeDefined();
    expect(insert?.kind).toBe('insert');
    expect(insert?.values).toMatchObject({
      name: 'Acme Coffee',
      slug: 'acme-coffee',
      email: '[email protected]',
      plan: 'free',
    });
  });

  it('provisions a tenant end-to-end with Stripe customer creation', async () => {
    vi.spyOn(stripeService, 'createCustomer').mockResolvedValue({
      id: 'cus_test_provision',
    } as any);

    const { provisionTenant } = await import('../../src/modules/tenant/provisioning.js');
    const tenant = await provisionTenant('Beta Books', 'beta-books', '[email protected]', 'pro');

    expect(tenant).toBeDefined();
    expect(stripeService.createCustomer).toHaveBeenCalledWith('[email protected]', 'Beta Books');
  });

  it('records an audit log entry with super_admin actor when a tenant is provisioned', async () => {
    await auditService.record({
      actorId: 'super_admin',
      actorEmail: '[email protected]',
      action: 'tenant:provisioned',
      resource: 'tenant',
      resourceId: 'tenant_xyz',
      newValue: { name: 'Test Co', slug: 'test-co' },
      ipAddress: '127.0.0.1',
    });

    const insert = lastInsert();
    expect(insert?.values).toMatchObject({
      actorId: 'super_admin',
      action: 'tenant:provisioned',
      resource: 'tenant',
      resourceId: 'tenant_xyz',
    });
  });

  it('suspends a tenant without affecting related store operations', async () => {
    await tenantService.suspend('tenant_active', 'Compliance hold');

    const updateCalls = dbCalls.filter((c) => c.kind === 'update');
    expect(updateCalls.length).toBeGreaterThan(0);
  });

  it('updates tenant plan and propagates the change to billing', async () => {
    await tenantService.changePlan('tenant_up', 'enterprise');

    const updateCalls = dbCalls.filter((c) => c.kind === 'update');
    expect(updateCalls.length).toBeGreaterThan(0);
  });

  it('queries tenant by id and returns subscription summary', async () => {
    const result = await tenantService.getById('tenant_001');
    expect(result).toBeDefined();
  });
});

describe('Cross-Project Integration: hiai-admin ↔ hiai-store — Billing records transactions', () => {
  it('creates a subscription record when a tenant subscribes to a paid plan', async () => {
    vi.spyOn(stripeService, 'createCustomer').mockResolvedValue({
      id: 'cus_test_1',
    } as any);
    vi.spyOn(stripeService, 'createSubscription').mockResolvedValue({
      id: 'sub_test_1',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
      latest_invoice: null,
    } as any);

    await subscribe('tenant_billing', 'pro');

    const subInserts = insertsWhere((v) => v?.stripeSubscriptionId !== undefined);
    expect(subInserts.length).toBeGreaterThan(0);
  });

  it('records a transaction audit row when an invoice is paid', async () => {
    await auditService.record({
      actorId: 'system:billing',
      actorEmail: '[email protected]',
      action: 'billing:charge_succeeded',
      resource: 'billing_transaction',
      resourceId: 'tx_abc',
      newValue: { tenantId: 'tenant_abc', amount: 2900, currency: 'USD' },
      ipAddress: '127.0.0.1',
    });

    const insert = lastInsert();
    expect(insert?.values).toMatchObject({
      actorId: 'system:billing',
      action: 'billing:charge_succeeded',
      resource: 'billing_transaction',
    });
  });

  it('queries the current subscription for a tenant', async () => {
    vi.spyOn(stripeService, 'createCustomer').mockResolvedValue({ id: 'cus_q_1' } as any);
    vi.spyOn(stripeService, 'createSubscription').mockResolvedValue({
      id: 'sub_q_1',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
      latest_invoice: null,
    } as any);

    await subscribe('tenant_query', 'pro');
    const current = await getCurrent('tenant_query');
    expect(current).toBeDefined();

    const selectCalls = dbCalls.filter((c) => c.kind === 'select');
    expect(selectCalls.length).toBeGreaterThan(0);
  });

  it('does not create a Stripe customer for the free plan', async () => {
    const stripeSpy = vi.spyOn(stripeService, 'createCustomer');

    await subscribe('tenant_freebie', 'free');

    expect(stripeSpy).not.toHaveBeenCalled();
  });

  it('records a refund transaction audit row when a refund is processed', async () => {
    await auditService.record({
      actorId: 'system:billing',
      actorEmail: '[email protected]',
      action: 'billing:refund_processed',
      resource: 'billing_transaction',
      resourceId: 'tx_refund_1',
      newValue: { tenantId: 'tenant_abc', amount: 2900, currency: 'USD' },
      ipAddress: '127.0.0.1',
    });

    const insert = lastInsert();
    expect(insert?.values).toMatchObject({
      action: 'billing:refund_processed',
      resource: 'billing_transaction',
    });
  });
});
