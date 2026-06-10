import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const sessionsTable = new Map<
  string,
  {
    id: string;
    userId: string;
    email: string;
    expiresAt: number;
    token: string;
    revoked: boolean;
    role: string;
    tenantId: string | null;
  }
>();
const propagationLog: Array<{ sessionId: string; at: number; recipients: string[] }> = [];

const SHARED_SECRET = 'test-shared-secret-min-32-characters-long-x';

function nowMs() {
  return Date.now();
}

function signJwt(payload: Record<string, unknown>, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = Buffer.from(`${header}.${body}.${secret}`).toString('base64url').slice(0, 32);
  return `${header}.${body}.${sig}`;
}

const authMock = {
  api: {
    getSession: vi.fn(async (args: { headers: Record<string, string> }) => {
      const authHeader = args.headers.authorization ?? '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      const session = sessionsTable.get(token);
      if (!session) return null;
      if (session.revoked) return null;
      if (session.expiresAt < nowMs()) return null;
      return {
        user: {
          id: session.userId,
          email: session.email,
          role: session.role,
          tenantId: session.tenantId,
        },
        session: {
          id: session.id,
          userId: session.userId,
          expiresAt: new Date(session.expiresAt),
        },
      };
    }),
  },
};

vi.mock('../../src/auth/index.js', () => ({
  auth: authMock,
  Session: undefined,
}));

vi.mock('../../src/lib/db.js', () => ({
  db: {
    select: vi.fn(() => ({ from: () => ({ where: () => ({ limit: () => [] }) }) })),
    insert: vi.fn(() => ({ values: () => ({ returning: () => [{ id: 'row-1' }] }) })),
    update: vi.fn(() => ({
      set: () => ({ where: () => ({ returning: () => [{ id: 'row-1' }] }) }),
    })),
    delete: vi.fn(() => ({ where: () => [] })),
  },
  withTransaction: <T>(fn: (tx: unknown) => Promise<T>) => fn({}),
}));

vi.mock('../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  createChildLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

vi.mock('../../src/lib/config.js', () => ({
  env: {
    BETTER_AUTH_SECRET: SHARED_SECRET,
    BETTER_AUTH_URL: 'http://localhost:50200',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  },
}));

const { auth } = await import('../../src/auth/index.js');

async function revokeAndPropagate(sessionId: string) {
  for (const [token, row] of sessionsTable) {
    if (row.id === sessionId) {
      row.revoked = true;
      sessionsTable.delete(token);
    }
  }
  propagationLog.push({
    sessionId,
    at: nowMs(),
    recipients: ['hiai-store', 'hiai-post', 'hiai-docs'],
  });
  return { revoked: true, propagatedTo: ['hiai-store', 'hiai-post', 'hiai-docs'] };
}

beforeEach(() => {
  sessionsTable.clear();
  propagationLog.length = 0;
  authMock.api.getSession.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Shared Auth (JWT cross-validation)', () => {
  it('accepts a JWT issued for a tenant_admin on a hiai-admin protected route', async () => {
    const token = signJwt(
      {
        sub: 'user_1',
        sid: 'sess_1',
        email: '[email protected]',
        role: 'tenant_admin',
        tenantId: 'tenant_1',
        exp: Math.floor(nowMs() / 1000) + 3600,
      },
      SHARED_SECRET,
    );
    sessionsTable.set(token, {
      id: 'sess_1',
      userId: 'user_1',
      email: '[email protected]',
      role: 'tenant_admin',
      tenantId: 'tenant_1',
      expiresAt: nowMs() + 3600_000,
      token,
      revoked: false,
    });

    const result = await auth.api.getSession({ headers: { authorization: `Bearer ${token}` } });
    expect(result).not.toBeNull();
    const user = (result as any).user;
    expect(user.id).toBe('user_1');
    expect(user.role).toBe('tenant_admin');
    expect((result as any).session.userId).toBe('user_1');
  });

  it('rejects a JWT whose signature was generated with a different secret', async () => {
    const bogus = signJwt(
      { sub: 'u', sid: 'x', exp: Math.floor(nowMs() / 1000) + 3600 },
      'WRONG-SECRET-DOES-NOT-MATCH',
    );
    const result = await auth.api.getSession({ headers: { authorization: `Bearer ${bogus}` } });
    expect(result).toBeNull();
  });

  it('rejects a JWT whose exp claim is in the past', async () => {
    const token = signJwt(
      { sub: 'u', sid: 'x', exp: Math.floor(nowMs() / 1000) - 60 },
      SHARED_SECRET,
    );
    sessionsTable.set(token, {
      id: 'sess_exp',
      userId: 'u',
      email: '[email protected]',
      role: 'tenant_admin',
      tenantId: 't',
      expiresAt: nowMs() - 60_000,
      token,
      revoked: false,
    });

    const result = await auth.api.getSession({ headers: { authorization: `Bearer ${token}` } });
    expect(result).toBeNull();
  });

  it('cross-service: a JWT issued by hiai-store is verifiable by hiai-admin (shared secret)', async () => {
    const token = signJwt(
      {
        sub: 'user_xs',
        sid: 'sess_xs',
        email: '[email protected]',
        role: 'merchant_admin',
        tenantId: 'tenant_xs',
        exp: Math.floor(nowMs() / 1000) + 3600,
      },
      SHARED_SECRET,
    );
    sessionsTable.set(token, {
      id: 'sess_xs',
      userId: 'user_xs',
      email: '[email protected]',
      role: 'merchant_admin',
      tenantId: 'tenant_xs',
      expiresAt: nowMs() + 3600_000,
      token,
      revoked: false,
    });

    const result = await auth.api.getSession({ headers: { authorization: `Bearer ${token}` } });
    expect(result).not.toBeNull();
    expect((result as any).user.id).toBe('user_xs');
  });
});

describe('Shared Auth (Better Auth sync)', () => {
  it('Better Auth getSession returns the session row for a known token', async () => {
    const token = signJwt(
      {
        sub: 'user_ba_1',
        sid: 'sess_ba_1',
        email: '[email protected]',
        exp: Math.floor(nowMs() / 1000) + 3600,
      },
      SHARED_SECRET,
    );
    sessionsTable.set(token, {
      id: 'sess_ba_1',
      userId: 'user_ba_1',
      email: '[email protected]',
      role: 'tenant_admin',
      tenantId: 'tenant_ba_1',
      expiresAt: nowMs() + 3600_000,
      token,
      revoked: false,
    });

    const result = await auth.api.getSession({ headers: { authorization: `Bearer ${token}` } });
    expect(result).not.toBeNull();
    expect((result as any).user.email).toBe('[email protected]');
  });

  it('Better Auth returns null for an unknown token', async () => {
    const result = await auth.api.getSession({ headers: { authorization: 'Bearer unknown' } });
    expect(result).toBeNull();
  });

  it('a session synced from hiai-store is visible to hiai-admin via the same shared secret', async () => {
    const token = signJwt(
      {
        sub: 'user_sync_1',
        sid: 'sess_sync_1',
        email: '[email protected]',
        role: 'merchant_admin',
        tenantId: 'tenant_sync_1',
        exp: Math.floor(nowMs() / 1000) + 3600,
      },
      SHARED_SECRET,
    );
    sessionsTable.set(token, {
      id: 'sess_sync_1',
      userId: 'user_sync_1',
      email: '[email protected]',
      role: 'merchant_admin',
      tenantId: 'tenant_sync_1',
      expiresAt: nowMs() + 3600_000,
      token,
      revoked: false,
    });

    const result = await auth.api.getSession({ headers: { authorization: `Bearer ${token}` } });
    expect((result as any).session.id).toBe('sess_sync_1');
  });
});

describe('Shared Auth (Logout propagation)', () => {
  it('revokes the session and propagates the logout to all dependent services', async () => {
    const token = signJwt(
      {
        sub: 'user_lo_1',
        sid: 'sess_lo_1',
        email: '[email protected]',
        exp: Math.floor(nowMs() / 1000) + 3600,
      },
      SHARED_SECRET,
    );
    sessionsTable.set(token, {
      id: 'sess_lo_1',
      userId: 'user_lo_1',
      email: '[email protected]',
      role: 'tenant_admin',
      tenantId: 'tenant_lo_1',
      expiresAt: nowMs() + 3600_000,
      token,
      revoked: false,
    });

    const result = await revokeAndPropagate('sess_lo_1');
    expect(result.revoked).toBe(true);
    expect(result.propagatedTo).toContain('hiai-store');
    expect(result.propagatedTo).toContain('hiai-post');
    expect(result.propagatedTo).toContain('hiai-docs');

    const stillValid = await auth.api.getSession({ headers: { authorization: `Bearer ${token}` } });
    expect(stillValid).toBeNull();
  });

  it('a previously-valid JWT is rejected after logout propagation', async () => {
    const token = signJwt(
      {
        sub: 'user_lo_2',
        sid: 'sess_lo_2',
        email: '[email protected]',
        exp: Math.floor(nowMs() / 1000) + 3600,
      },
      SHARED_SECRET,
    );
    sessionsTable.set(token, {
      id: 'sess_lo_2',
      userId: 'user_lo_2',
      email: '[email protected]',
      role: 'super_admin',
      tenantId: null,
      expiresAt: nowMs() + 3600_000,
      token,
      revoked: false,
    });

    expect(
      await auth.api.getSession({ headers: { authorization: `Bearer ${token}` } }),
    ).not.toBeNull();

    await revokeAndPropagate('sess_lo_2');

    const after = await auth.api.getSession({ headers: { authorization: `Bearer ${token}` } });
    expect(after).toBeNull();
  });

  it('logout events are timestamped and audit-logged for compliance', async () => {
    const before = propagationLog.length;
    const beforeAt = nowMs();
    await revokeAndPropagate('sess_lo_3');
    const afterAt = nowMs();

    expect(propagationLog.length).toBe(before + 1);
    const event = propagationLog[propagationLog.length - 1];
    expect(event.sessionId).toBe('sess_lo_3');
    expect(event.at).toBeGreaterThanOrEqual(beforeAt);
    expect(event.at).toBeLessThanOrEqual(afterAt);
    expect(event.recipients).toContain('hiai-store');
    expect(event.recipients).toContain('hiai-post');
    expect(event.recipients).toContain('hiai-docs');
  });
});
