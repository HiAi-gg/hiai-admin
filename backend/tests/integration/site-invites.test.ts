import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { Elysia } from 'elysia';

vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.BETTER_AUTH_SECRET = 'test-shared-secret-min-32-characters-long-x';
  process.env.BETTER_AUTH_URL = 'http://localhost:50200';
});

const sessions = new Map<
  string,
  {
    id: string;
    userId: string;
    email: string;
    role: string;
    tenantId: string | null;
  }
>();

const authMock = {
  api: {
    getSession: vi.fn(async (args: { headers: Record<string, string> }) => {
      const rawHeaders = args.headers as Record<string, string> | Headers;
      const authHeader = rawHeaders instanceof Headers
        ? rawHeaders.get('authorization') ?? rawHeaders.get('Authorization') ?? ''
        : rawHeaders.authorization ?? '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      const session = sessions.get(token);
      if (!session) return null;
      return {
        user: {
          id: session.userId,
          email: session.email,
          role: session.role,
          tenantId: session.tenantId,
        },
        session: { id: session.id, userId: session.userId, expiresAt: new Date(Date.now() + 3600_000) },
      };
    }),
  },
};

const dbState = {
  selectCalls: {
    rows: [] as unknown[][],
  },
  insertCalls: {
    rows: [] as unknown[][],
  },
  updateCalls: {
    rows: [] as unknown[][],
  },
};

function nextChain(rows: unknown[]) {
  const chain: any = {};
  chain.from = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.offset = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.values = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);
  chain.onConflictDoUpdate = vi.fn(() => chain);
  chain.returning = vi.fn(async () => rows);

  // Drizzle builders are thenables.
  // biome-ignore lint/suspicious/noThenProperty: mock chain imitates Drizzle API shape
  chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject);
  return chain;
}

const dbMock = {
  select: vi.fn(() => nextChain(dbState.selectCalls.rows.shift() ?? [])),
  insert: vi.fn(() => nextChain(dbState.insertCalls.rows.shift() ?? [])),
  update: vi.fn(() => nextChain(dbState.updateCalls.rows.shift() ?? [])),
  delete: vi.fn(),
};

vi.mock('../../src/lib/db.js', () => ({
  db: dbMock,
  dbHealthCheck: vi.fn(),
  withTransaction: (fn: (tx: unknown) => Promise<unknown>) => fn(dbMock),
}));

vi.mock('../../src/lib/config.js', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    BETTER_AUTH_SECRET: 'test-shared-secret-min-32-characters-long-x',
    BETTER_AUTH_URL: 'http://localhost:50200',
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
    API_PORT: 50200,
    FRONTEND_PORT: 50201,
  },
}));

vi.mock('../../src/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
  createChildLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

vi.mock('../../src/auth/index.js', () => ({
  auth: authMock,
  Session: undefined,
}));

const { auditService } = await import('../../src/modules/audit/audit.service.js');
const { profileRoutes } = await import('../../src/api/routes/profile.js');
const { siteInvitesRoutes } = await import('../../src/api/routes/site-invites.js');
const { loadSession } = await import('../../src/api/middleware/auth.js');
const { siteInviteService } = await import(
  '../../src/modules/site-membership/site-invite.service.js'
);
const auditRecordSpy = vi.spyOn(auditService, 'record');

const app = new Elysia()
  .derive(async ({ request }) => loadSession(request.headers))
  .use(profileRoutes)
  .use(siteInvitesRoutes);

function hashInviteToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function makeInviteRow(overrides: Partial<{
  id: string;
  tenantId: string;
  siteAdapterId: string;
  email: string;
  tokenHash: string;
  role: string | null;
  permissions: string[];
  acceptedAt: Date | null;
  expiresAt: Date;
}> = {}) {
  return {
    id: 'invite-1',
    tenantId: 'tenant-1',
    siteAdapterId: 'adapter-1',
    email: 'member@hiai.local',
    tokenHash: hashInviteToken('inv-accept-token'),
    role: 'viewer',
    permissions: [],
    acceptedAt: null,
    expiresAt: new Date(Date.now() + 3600_000),
    ...overrides,
  };
}

beforeEach(() => {
  sessions.clear();
  authMock.api.getSession.mockClear();
  dbMock.select.mockClear();
  dbMock.insert.mockClear();
  dbMock.update.mockClear();
  dbMock.delete.mockClear();
  dbState.selectCalls.rows = [];
  dbState.insertCalls.rows = [];
  dbState.updateCalls.rows = [];
  auditRecordSpy.mockReset();
});

describe('site invite security regressions', () => {
  it('cannot join a tenant by knowing only its slug', async () => {
    sessions.set('member-session', {
      id: 'sess-1',
      userId: 'user-1',
      email: 'member@hiai.local',
      role: 'viewer',
      tenantId: null,
    });
    dbState.selectCalls.rows.push([{ id: 'user-1', email: 'member@hiai.local', role: 'viewer' }]);
    dbState.insertCalls.rows.push([{ id: 'audit-1' }]);

    const response = await app.handle(
      new Request('http://localhost/api/profile/tenants/join', {
        method: 'POST',
        headers: {
          authorization: 'Bearer member-session',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slug: 'acme-coffee' }),
      }),
    );
    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({ error: 'INVITE_REQUIRED', code: 'INVITE_REQUIRED' });
    expect(dbMock.select).toHaveBeenCalledTimes(1);
  });

  it('cannot request super_admin or tenant_admin in invite acceptance', async () => {
    sessions.set('member-session', {
      id: 'sess-1',
      userId: 'user-1',
      email: 'member@hiai.local',
      role: 'viewer',
      tenantId: null,
    });
    const token = 'forbidden-token';
    const inviteRow = makeInviteRow({ tokenHash: hashInviteToken(token), role: 'super_admin' });
    dbState.selectCalls.rows.push([inviteRow]);

    await expect(
      siteInviteService.acceptInvite({
        token,
        email: 'member@hiai.local',
        userId: 'user-1',
        actorEmail: 'member@hiai.local',
      }),
    ).rejects.toMatchObject({
      message: 'Invite role is not allowed',
      code: 'BAD_REQUEST',
    });

    expect(dbMock.insert).not.toHaveBeenCalled();
    expect(dbMock.update).not.toHaveBeenCalled();
  });

  it('accepts an unexpired single-use invite for the exact session email', async () => {
    const token = 'accept-token';
    const inviteRow = makeInviteRow({
      tokenHash: hashInviteToken(token),
      role: 'editor',
      permissions: ['articles:read'],
      expiresAt: new Date(Date.now() + 3600_000),
      acceptedAt: null,
    });
    dbState.selectCalls.rows.push([inviteRow]);
    dbState.insertCalls.rows.push([
      { userId: 'user-1', tenantId: 'tenant-1', role: 'editor', permissions: ['articles:read'] },
    ]);
    dbState.insertCalls.rows.push([
      {
        userId: 'user-1',
        siteAdapterId: 'adapter-1',
        globalRole: 'editor',
        role: 'editor',
        permissions: ['articles:read'],
      },
    ]);
    dbState.updateCalls.rows.push([{ id: 'invite-1', acceptedAt: new Date() }]);
    auditRecordSpy.mockResolvedValue({ id: 'log-1' } as any);

    const result = await siteInviteService.acceptInvite({
      token,
      email: 'member@hiai.local',
      userId: 'user-1',
      actorEmail: 'member@hiai.local',
    });

    expect(result).toMatchObject({
      status: 'accepted',
      tenantId: 'tenant-1',
      siteAdapterId: 'adapter-1',
      role: 'editor',
    });
    expect(dbMock.insert).toHaveBeenCalledTimes(2);
    expect(dbMock.update).toHaveBeenCalledTimes(1);
    const auditLog = auditRecordSpy.mock.calls[0][0] as {
      newValue?: Record<string, unknown>;
    };
    expect(auditLog.newValue).toMatchObject({
      tenantId: 'tenant-1',
      siteAdapterId: 'adapter-1',
      role: 'editor',
    });
    expect(auditLog.newValue).not.toHaveProperty('token');
  });

  it('rejects replay, expired token and mismatched email', async () => {
    const token = 'timed-token';
    const expiredToken = 'expired-token';
    const mismatchToken = 'mismatch-token';

    dbState.selectCalls.rows.push([
      makeInviteRow({
        tokenHash: hashInviteToken(token),
        acceptedAt: new Date('2026-01-01T00:00:00Z'),
      }),
    ]);
    await expect(
      siteInviteService.acceptInvite({
        token,
        email: 'member@hiai.local',
        userId: 'user-1',
        actorEmail: 'member@hiai.local',
      }),
    ).rejects.toMatchObject({
      message: 'Invite has already been accepted',
      code: 'BAD_REQUEST',
    });

    dbState.selectCalls.rows.push([
      makeInviteRow({
        tokenHash: hashInviteToken(expiredToken),
        expiresAt: new Date(Date.now() - 60_000),
      }),
    ]);
    await expect(
      siteInviteService.acceptInvite({
        token: expiredToken,
        email: 'member@hiai.local',
        userId: 'user-1',
        actorEmail: 'member@hiai.local',
      }),
    ).rejects.toMatchObject({
      message: 'Invite has expired',
      code: 'BAD_REQUEST',
    });

    dbState.selectCalls.rows.push([
      makeInviteRow({
        tokenHash: hashInviteToken(mismatchToken),
        email: 'other@hiai.local',
      }),
    ]);
    await expect(
      siteInviteService.acceptInvite({
        token: mismatchToken,
        email: 'member@hiai.local',
        userId: 'user-1',
        actorEmail: 'member@hiai.local',
      }),
    ).rejects.toMatchObject({
      message: 'Invite email does not match current session',
      code: 'BAD_REQUEST',
    });

    expect(dbMock.insert).not.toHaveBeenCalled();
    expect(dbMock.update).not.toHaveBeenCalled();
  });
});
