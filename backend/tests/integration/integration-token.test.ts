import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Elysia } from 'elysia';

vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.BETTER_AUTH_SECRET = 'test-shared-secret-min-32-characters-long-x';
  process.env.BETTER_AUTH_URL = 'http://localhost:50200';
  process.env.AUTH_INTEGRATIONS_JSON = JSON.stringify([
    {
      id: 'tenant-onboard',
      audience: 'tenant-onboard-aud',
      issuer: 'tenant-onboard-iss',
      secretRef: 'TENANT_ONBOARD_SECRET',
      allowedOrigins: ['https://trusted.example'],
    },
  ]);
  process.env.TENANT_ONBOARD_SECRET = 'tenant-onboard-secret-that-is-long-enough-32-chars';
});
import { resetIntegrationRegistryForTests } from '../../src/modules/integrations/integration-registry.js';

vi.mock('../../src/api/middleware/rateLimiter.js', () => ({ createRateLimiter: () => new Elysia() }));

const authMock = {
  api: {
    getSession: vi.fn(async ({ headers }: { headers: Headers }) => {
      const authHeader = headers.get('authorization') ?? '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      const session = sessions.get(token);
      if (!session) return null;
      return {
        user: session.user,
        session: session.session,
      };
    }),
  },
};

type PlatformProfile = { id: string; email: string; name: string | null };

const sessions = new Map<
  string,
  {
    user: { id: string; email: string; name: string; emailVerified?: boolean };
    session: { id: string; userId: string; expiresAt: Date };
  }
>();

const profilesByEmail: Record<string, PlatformProfile> = {
  'verified@hiai.local': { id: 'platform-user-1', email: 'verified@hiai.local', name: 'Verified User' },
  'unverified@hiai.local': {
    id: 'platform-user-2',
    email: 'unverified@hiai.local',
    name: 'Unverified User',
  },
};

function createChain<T>(rows: T[]) {
  const chain: any = {};
  chain.from = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.then = (resolve: (rows: T[]) => void) => Promise.resolve(rows).then(resolve);
  return chain;
}

const dbMock = {
  select: vi.fn(() => {
    const nextRows = dbState.selectRows.shift() ?? [];
    return createChain(nextRows as unknown[]);
  }),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

let dbState: { selectRows: unknown[][] } = { selectRows: [] };

vi.mock('../../src/lib/db.js', () => ({ db: dbMock }));

vi.mock('../../src/auth/index.js', () => ({ auth: authMock }));

vi.mock('../../src/modules/user/user.service.js', () => ({
  userService: {
    getByEmail: vi.fn(async (email: string) => {
      return profilesByEmail[email.toLowerCase()] ?? null;
    }),
  },
}));

const { integrationTokenRoutes } = await import('../../src/api/routes/integration-tokens.js');
const { loadSession } = await import('../../src/api/middleware/auth.js');

const app = new Elysia().derive(async ({ request }) => loadSession(request.headers)).use(integrationTokenRoutes);

function decodeJwtPayload(token: string) {
  const [, payload] = token.split('.');
  const body = Buffer.from(payload, 'base64url').toString('utf8');
  return JSON.parse(body);
}

describe('integration token endpoints', () => {
  beforeEach(() => {
    sessions.clear();
    dbState.selectRows = [];
    dbMock.select.mockClear();
    (authMock.api.getSession as any).mockClear();
    resetIntegrationRegistryForTests();
  });

  it('rejects missing session', async () => {
    const response = await app.handle(
      new Request('http://localhost/api/integration-tokens/tenant-onboard', {
        method: 'POST',
        headers: { Origin: 'https://trusted.example' },
      }),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
  });

  it('rejects unverified sessions', async () => {
    sessions.set('unverified-token', {
      user: {
        id: 'auth-user-2',
        email: 'unverified@hiai.local',
        name: 'Unverified User',
        emailVerified: false,
      },
      session: { id: 'session-2', userId: 'auth-user-2', expiresAt: new Date() },
    });

    const response = await app.handle(
      new Request('http://localhost/api/integration-tokens/tenant-onboard', {
        method: 'POST',
        headers: {
          Origin: 'https://trusted.example',
          Authorization: 'Bearer unverified-token',
        },
      }),
    );
    expect(response.status).toBe(403);
  });

  it('rejects origin mismatch', async () => {
    sessions.set('trusted-token', {
      user: {
        id: 'auth-user-1',
        email: 'verified@hiai.local',
        name: 'Verified User',
        emailVerified: true,
      },
      session: { id: 'session-1', userId: 'auth-user-1', expiresAt: new Date() },
    });

    const response = await app.handle(
      new Request('http://localhost/api/integration-tokens/tenant-onboard', {
        method: 'POST',
        headers: {
          Origin: 'https://evil.example',
          Authorization: 'Bearer trusted-token',
        },
      }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'Cross-origin request denied: untrusted origin.',
    });
  });

  it('mints a scoped identity token with only configured aud/iss and platform profile id as sub', async () => {
    sessions.set('trusted-token', {
      user: {
        id: 'auth-user-1',
        email: 'verified@hiai.local',
        name: 'Verified User',
        emailVerified: true,
      },
      session: { id: 'session-1', userId: 'auth-user-1', expiresAt: new Date() },
    });

    const response = await app.handle(
      new Request('http://localhost/api/integration-tokens/tenant-onboard', {
        method: 'POST',
        headers: {
          Origin: 'https://trusted.example',
          Authorization: 'Bearer trusted-token',
        },
      }),
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toHaveProperty('token');
    expect(payload).toHaveProperty('expiresAt');
    const body = decodeJwtPayload(payload.token);
    const before = Math.floor(Date.now() / 1000);

    expect(body).toMatchObject({
      iss: 'tenant-onboard-iss',
      aud: 'tenant-onboard-aud',
      sub: 'platform-user-1',
      email: 'verified@hiai.local',
      name: 'Verified User',
      emailVerified: true,
    });
    expect(body).not.toHaveProperty('role');
    expect(body).not.toHaveProperty('tenantId');
    expect(body).not.toHaveProperty('globalRole');
    expect(body.exp - body.iat).toBe(300);
    expect(body.exp).toBeGreaterThanOrEqual(before + 299);
    expect(body.exp).toBeLessThanOrEqual(before + 301);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('lists only adapters for the integration and exact membership', async () => {
    sessions.set('trusted-token', {
      user: {
        id: 'auth-user-1',
        email: 'verified@hiai.local',
        name: 'Verified User',
        emailVerified: true,
      },
      session: { id: 'session-1', userId: 'auth-user-1', expiresAt: new Date() },
    });

    dbState.selectRows.push([
      {
        adapterSlug: 'site-a',
        publicSlug: 'site-a-public',
        name: 'Site A',
        enabled: true,
        integrationId: 'tenant-onboard',
      },
      {
        adapterSlug: 'site-b',
        publicSlug: 'site-b-public',
        name: 'Site B',
        enabled: true,
        integrationId: 'other-integration',
      },
    ]);

    const response = await app.handle(
      new Request('http://localhost/api/integration-sites/tenant-onboard', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer trusted-token',
        },
      }),
    );

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toMatchObject({
      adapters: [{ adapterSlug: 'site-a', publicSlug: 'site-a-public', name: 'Site A', enabled: true }],
    });
    expect(result.adapters).toHaveLength(1);
  });
});
