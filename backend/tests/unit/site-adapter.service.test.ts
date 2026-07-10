import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

interface MockChain {
  select: Mock;
  from: Mock;
  where: Mock;
  limit: Mock;
  insert: Mock;
  values: Mock;
  returning: Mock;
}

function createChain(terminal: unknown): MockChain {
  const chain = {} as MockChain;
  chain.select = vi.fn(() => chain);
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.values = vi.fn(() => chain);
  chain.returning = vi.fn(async () => terminal);
  // biome-ignore lint/suspicious/noThenProperty: intentional thenable to mock Drizzle
  (chain as unknown as { then: unknown }).then = (
    onFulfilled?: (v: unknown) => unknown,
    onRejected?: (e: unknown) => unknown,
  ) => Promise.resolve(terminal).then(onFulfilled, onRejected);
  return chain;
}

const dbMock = { select: vi.fn(), insert: vi.fn() };

vi.mock('../../src/lib/db.js', () => ({
  db: dbMock,
  dbHealthCheck: vi.fn(),
  withTransaction: vi.fn(),
}));
vi.mock('../../src/lib/config.js', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    BETTER_AUTH_SECRET: 'test-shared-secret-min-32-characters-long-x',
    BETTER_AUTH_URL: 'http://localhost:50200',
  },
}));
vi.mock('../../src/lib/encryption.js', () => ({
  encrypt: vi.fn((plaintext: string) => `enc(${plaintext})`),
  decrypt: vi.fn((ciphertext: string) => ciphertext.replace(/^enc\((.*)\)$/, '$1')),
}));

const { siteAdapterService } = await import(
  '../../src/modules/site-adapter/site-adapter.service.js'
);

const dbRow = {
  id: 'a1',
  tenantId: 't1',
  slug: 'webs-croco',
  adapterSlug: 'webs-croco',
  publicSlug: 'croco',
  siteId: 'site-croco',
  name: 'Croco',
  backendUrl: 'http://api:3001',
  apiBase: '/api/v1',
  auth: 'jwt',
  jwtSecretEncrypted: 'enc(s3cr3t)',
  modules: ['articles', 'kofi'],
  pathMap: {},
  adapterManifestVersion: '1.0.0',
  connectorType: 'http',
  connectorConfig: { healthPath: '/healthz' },
  capabilities: ['articles:read', 'homepage:write'],
  externalSiteReference: 'webs-site-id-1',
  secretRefs: { jwtSecret: 'SITE_ADAPTER_JWT_SECRET_WEBS_CROCO' },
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('siteAdapterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('list', () => {
    it('returns DTOs that never expose the encrypted secret', async () => {
      dbMock.select.mockReturnValue(createChain([dbRow]));

      const [dto] = await siteAdapterService.list();

      expect(dto).toEqual({
        id: 'a1',
        tenantId: 't1',
        slug: 'webs-croco',
        adapterSlug: 'webs-croco',
        publicSlug: 'croco',
        siteId: 'site-croco',
        name: 'Croco',
        backendUrl: 'http://api:3001',
        apiBase: '/api/v1',
        auth: 'jwt',
        modules: ['articles', 'kofi'],
        pathMap: {},
        adapterManifestVersion: '1.0.0',
        connectorType: 'http',
        connectorConfig: { healthPath: '/healthz' },
        capabilities: ['articles:read', 'homepage:write'],
        externalSiteReference: 'webs-site-id-1',
        secretRefs: { jwtSecret: 'SITE_ADAPTER_JWT_SECRET_WEBS_CROCO' },
        enabled: true,
      });
      expect(dto).not.toHaveProperty('jwtSecretEncrypted');
    });

    it('scopes by tenantId when provided', async () => {
      const chain = createChain([dbRow]);
      dbMock.select.mockReturnValue(chain);

      await siteAdapterService.list('t1');

      expect(chain.where).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('persists manifest metadata and secret references to DB', async () => {
      const chain = createChain([dbRow]);
      dbMock.insert.mockReturnValue(chain);

      await siteAdapterService.create({
        tenantId: 't1',
        slug: 'webs-croco',
        name: 'Croco',
        backendUrl: 'http://api:3001',
        apiBase: '/api/v1',
        auth: 'jwt',
        jwtSecret: 's3cr3t',
        modules: ['articles', 'kofi'],
        adapterManifestVersion: '1.1.0',
        connectorType: 'drizzle',
        connectorConfig: { schema: 'tenant_site' },
        capabilities: ['articles:read'],
        externalSiteReference: 'external-42',
        secretRefs: { jwtSecret: 'WEBS_CROCO_SECRET_REF' },
        pathMap: {},
      });

      expect(chain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          adapterManifestVersion: '1.1.0',
          connectorType: 'drizzle',
          connectorConfig: { schema: 'tenant_site' },
          capabilities: ['articles:read'],
          externalSiteReference: 'external-42',
          secretRefs: { jwtSecret: 'WEBS_CROCO_SECRET_REF' },
        }),
      );
    });

    it('encrypts the jwt secret at rest and returns a secret-free DTO', async () => {
      const chain = createChain([dbRow]);
      dbMock.insert.mockReturnValue(chain);

      const dto = await siteAdapterService.create({
        tenantId: 't1',
        slug: 'webs-croco',
        name: 'Croco',
        backendUrl: 'http://api:3001',
        apiBase: '/api/v1',
        auth: 'jwt',
        jwtSecret: 's3cr3t',
        modules: ['articles', 'kofi'],
        adapterManifestVersion: '1.0.0',
        connectorType: 'http',
        connectorConfig: {},
        capabilities: ['articles:read'],
        externalSiteReference: 'webs-site-id-1',
        secretRefs: { jwtSecret: 'SITE_ADAPTER_JWT_SECRET_WEBS_CROCO' },
        pathMap: {},
      });

      expect(chain.values).toHaveBeenCalledWith(
        expect.objectContaining({ jwtSecretEncrypted: 'enc(s3cr3t)' }),
      );
      expect(dto).not.toHaveProperty('jwtSecretEncrypted');
    });

    it('stores null when no secret is provided', async () => {
      const chain = createChain([{ ...dbRow, jwtSecretEncrypted: null }]);
      dbMock.insert.mockReturnValue(chain);

      await siteAdapterService.create({
        tenantId: 't1',
        slug: 'webs-x',
        name: 'X',
        backendUrl: 'http://api:3001',
        apiBase: '/api/v1',
        auth: 'jwt',
        modules: [],
        adapterManifestVersion: '1.0.0',
        connectorType: 'http',
        connectorConfig: {},
        capabilities: ['articles:read'],
        secretRefs: {},
        pathMap: {},
      });

      expect(chain.values).toHaveBeenCalledWith(
        expect.objectContaining({ jwtSecretEncrypted: null }),
      );
    });
  });

  describe('getSigningSecret', () => {
    it('returns the decrypted secret for an adapter that has one', async () => {
      dbMock.select.mockReturnValue(createChain([{ secret: 'enc(s3cr3t)' }]));

      expect(await siteAdapterService.getSigningSecret('webs-croco')).toBe('s3cr3t');
    });

    it('returns null when the adapter has no stored secret', async () => {
      dbMock.select.mockReturnValue(createChain([{ secret: null }]));

      expect(await siteAdapterService.getSigningSecret('webs-croco')).toBeNull();
    });

    it('returns null when no adapter matches the slug', async () => {
      dbMock.select.mockReturnValue(createChain([]));

      expect(await siteAdapterService.getSigningSecret('missing')).toBeNull();
    });
  });

  describe('checkHealth', () => {
    it('reports ok with the status when the backend /health responds 2xx', async () => {
      const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);

      const result = await siteAdapterService.checkHealth('http://api:3001');

      expect(result).toEqual({ ok: true, status: 200 });
      expect(fetchMock).toHaveBeenCalledWith('http://api:3001/health', expect.any(Object));
    });

    it('strips a trailing slash from the base before appending /health', async () => {
      const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);

      await siteAdapterService.checkHealth('http://api:3001/');

      expect(fetchMock).toHaveBeenCalledWith('http://api:3001/health', expect.any(Object));
    });

    it('reports the failing status for a non-2xx response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('no', { status: 503 })),
      );

      expect(await siteAdapterService.checkHealth('http://api:3001')).toEqual({
        ok: false,
        status: 503,
      });
    });

    it('returns ok:false with null status when the backend is unreachable', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new Error('ECONNREFUSED');
        }),
      );

      expect(await siteAdapterService.checkHealth('http://nope:9999')).toEqual({
        ok: false,
        status: null,
      });
    });
  });
});
