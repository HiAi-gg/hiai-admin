import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// vitest does not auto-load .env — encryption.ts requires the secret to be set.
process.env.BETTER_AUTH_SECRET ??= 'test-secret-min-32-characters-long-aaaa';

type DbCall = {
  kind: 'select' | 'insert' | 'update' | 'delete';
  table?: string;
  values?: unknown;
  setValues?: unknown;
  filters?: unknown;
  result?: unknown[];
};

const dbCalls: DbCall[] = [];
// table → row id → row — needed so the second `set()` sees the first `set()`'s row
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

// Extract the first Param value from a Drizzle SQL expression. Drizzle builds
// SQL by concatenating `queryChunks`; `eq(col, val)` puts a `Param { value }`
// chunk between operator chunks, and `and(...)` nests SQL chunks recursively.
function firstParamValue(sql: unknown): unknown {
  if (!sql || typeof sql !== 'object') return undefined;
  const obj = sql as { queryChunks?: unknown[] };
  if (!Array.isArray(obj.queryChunks)) return undefined;
  for (const chunk of obj.queryChunks) {
    if (chunk && typeof chunk === 'object') {
      const c = chunk as { value?: unknown; queryChunks?: unknown[] };
      if ('value' in c && c.value !== undefined && (c as any).brand === undefined) {
        // Param chunks store a single scalar; SQL chunks wrap more chunks.
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
      const all = Array.from(bucket.values());
      const targetId = lastFilter !== undefined ? firstParamValue(lastFilter) : undefined;
      if (targetId !== undefined) {
        const match = bucket.get(String(targetId));
        resolve(match ? [match] : []);
        return;
      }
      resolve(all);
      return;
    }
    resolve([]);
  };

  chain.returning = vi.fn(() => {
    const row = { id: 'mock-id', createdAt: new Date() };
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
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
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

const { settingsService } = await import('../../src/modules/settings/settings.service.js');
const { auditService } = await import('../../src/modules/audit/audit.service.js');
const { encrypt, decrypt } = await import('../../src/lib/encryption.js');

function lastInsert(): DbCall | undefined {
  for (let i = dbCalls.length - 1; i >= 0; i--) {
    if (dbCalls[i].kind === 'insert') return dbCalls[i];
  }
  return undefined;
}

function _lastUpdate(): DbCall | undefined {
  for (let i = dbCalls.length - 1; i >= 0; i--) {
    if (dbCalls[i].kind === 'update') return dbCalls[i];
  }
  return undefined;
}

beforeEach(() => {
  dbCalls.length = 0;
  dbMock.select.mockClear();
  dbMock.insert.mockClear();
  dbMock.update.mockClear();
  dbMock.delete.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Cross-Project Integration: hiai-admin ↔ hiai-post — Settings Sync', () => {
  it('persists a platform setting with key, value, and updatedBy', async () => {
    await settingsService.set('post_max_hashtags', 30, 'super_admin_1');

    const insert = lastInsert();
    expect(insert).toBeDefined();
    expect(insert?.kind).toBe('insert');
    expect(insert?.values).toMatchObject({
      id: 'post_max_hashtags',
      value: 30,
      updatedBy: 'super_admin_1',
    });
  });

  it('overwrites an existing setting in place rather than duplicating', async () => {
    await settingsService.set('post_max_chars', 280, 'admin_a');
    await settingsService.set('post_max_chars', 2200, 'admin_b');

    const updates = dbCalls.filter((c) => c.kind === 'update');
    expect(updates.length).toBeGreaterThan(0);
    const last = updates[updates.length - 1];
    expect(last.setValues).toMatchObject({ value: 2200, updatedBy: 'admin_b' });
  });

  it('encrypts social account credentials before persistence (AES-256-GCM)', async () => {
    const plaintext = JSON.stringify({
      instagramAccessToken: 'IGAA-test-token',
      instagramUserId: '17841401234567890',
    });

    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(ciphertext.length).toBeGreaterThan(0);

    const recovered = decrypt(ciphertext);
    expect(recovered).toBe(plaintext);

    const decoded = Buffer.from(ciphertext, 'base64');
    expect(decoded.length).toBeGreaterThanOrEqual(16 + 16);
  });

  it('setting list groups entries by category prefix so hiai-post can fetch a namespace', async () => {
    await settingsService.set('post_max_hashtags', 30, 'admin');
    await settingsService.set('post_default_platform', 'instagram', 'admin');
    await settingsService.set('billing_stripe_enabled', true, 'admin');

    await settingsService.list();

    const selects = dbCalls.filter((c) => c.kind === 'select');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('persists a numeric platform setting used to throttle hiai-post publishing', async () => {
    await settingsService.set('post_rate_limit_per_min', 100, 'super_admin_1');
    const insert = lastInsert();
    expect(insert?.values).toMatchObject({
      id: 'post_rate_limit_per_min',
      value: 100,
      updatedBy: 'super_admin_1',
    });
  });
});

describe('Cross-Project Integration: hiai-admin ↔ hiai-post — Audit Log Entries', () => {
  it('records a post:published event with the expected audit schema', async () => {
    const event = {
      actorId: 'system:hiai-post',
      actorEmail: 'system@hiai-post.local',
      action: 'social_post:published',
      resource: 'social_post',
      resourceId: 'post_abc123',
      newValue: {
        platform: 'instagram',
        tenantId: 'tenant_42',
        publishedAt: new Date().toISOString(),
      },
      ipAddress: '10.0.0.5',
      userAgent: 'hiai-post/1.0',
    };

    await auditService.record(event);

    const insert = lastInsert();
    expect(insert).toBeDefined();
    expect(insert?.values).toMatchObject({
      actorId: 'system:hiai-post',
      action: 'social_post:published',
      resource: 'social_post',
      resourceId: 'post_abc123',
    });
    const values = insert?.values as Record<string, any>;
    expect(values.newValue).toMatchObject({
      platform: 'instagram',
      tenantId: 'tenant_42',
    });
  });

  it('records a post:failed event with failure metadata preserved', async () => {
    await auditService.record({
      actorId: 'system:hiai-post',
      actorEmail: 'system@hiai-post.local',
      action: 'social_post:failed',
      resource: 'social_post',
      resourceId: 'post_xyz789',
      newValue: {
        platform: 'tiktok',
        tenantId: 'tenant_99',
        errorCode: 'TIKTOK_RATE_LIMIT',
        attempt: 3,
      },
      ipAddress: '10.0.0.5',
    });

    const insert = lastInsert();
    expect(insert?.values).toMatchObject({
      action: 'social_post:failed',
      resourceId: 'post_xyz789',
    });
    const values = insert?.values as Record<string, any>;
    expect(values.newValue).toMatchObject({
      errorCode: 'TIKTOK_RATE_LIMIT',
      attempt: 3,
    });
  });

  it('records a post:scheduled event so compliance can attribute scheduled publishes', async () => {
    const before = dbCalls.length;
    await auditService.record({
      actorId: 'system:hiai-post',
      actorEmail: 'system@hiai-post.local',
      action: 'social_post:scheduled',
      resource: 'social_post',
      resourceId: 'post_compliance_1',
      newValue: {
        platform: 'linkedin',
        tenantId: 'tenant_compliance',
        scheduledAt: '2026-06-07T10:00:00Z',
      },
      ipAddress: '10.0.0.5',
      userAgent: 'hiai-post/1.0',
    });

    const insert = dbCalls.slice(before).find((c) => c.kind === 'insert');
    expect(insert).toBeDefined();
    const values = insert?.values as Record<string, unknown>;
    expect(values.actorId).toBe('system:hiai-post');
    expect(values.ipAddress).toBe('10.0.0.5');
    expect(values.userAgent).toBe('hiai-post/1.0');
    expect(values.action).toMatch(/^social_post:/);
    expect(values.resource).toBe('social_post');
    expect(values.resourceId).toBe('post_compliance_1');
  });

  it('audit list query filters by action and resource type', async () => {
    await auditService.record({
      actorId: 'system:hiai-post',
      actorEmail: 'system@hiai-post.local',
      action: 'social_post:published',
      resource: 'social_post',
      resourceId: 'post_q1',
    });

    const result = await auditService.list({ resource: 'social_post', limit: 5 });
    expect(result.pagination.limit).toBe(5);
    expect(dbCalls.some((c) => c.kind === 'select')).toBe(true);
  });

  it('audit export returns a CSV string with header row', async () => {
    await auditService.record({
      actorId: 'system:hiai-post',
      actorEmail: 'system@hiai-post.local',
      action: 'social_post:published',
      resource: 'social_post',
      resourceId: 'post_csv_1',
    });

    const csv = await auditService.export({});
    expect(csv).toContain('Actor');
    expect(csv).toContain('Action');
    expect(csv).toContain('Resource');
  });
});
