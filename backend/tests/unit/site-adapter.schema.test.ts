import { describe, expect, it } from 'vitest';
import {
  createSiteAdapterSchema,
  updateSiteAdapterSchema,
} from '../../src/api/validation/site-adapter.schema.js';

describe('site-adapter validation', () => {
  it('applies manifest defaults for create payloads', () => {
    const parsed = createSiteAdapterSchema.parse({
      tenantId: '11111111-2222-3333-4444-555555555555',
      slug: 'webs-croco',
      name: 'Croco',
      backendUrl: 'https://api.webs.local',
      auth: 'jwt',
      modules: ['articles'],
      pathMap: {},
    });

    expect(parsed.adapterManifestVersion).toBe('1.0.0');
    expect(parsed.connectorType).toBe('http');
    expect(parsed.connectorConfig).toEqual({});
    expect(parsed.capabilities).toEqual([]);
    expect(parsed.secretRefs).toEqual({});
  });

  it('accepts explicit connector manifest fields', () => {
    const parsed = createSiteAdapterSchema.parse({
      tenantId: '11111111-2222-3333-4444-555555555555',
      slug: 'webs-croco',
      name: 'Croco',
      backendUrl: 'https://api.webs.local',
      auth: 'api-key',
      modules: ['articles'],
      pathMap: {},
      adapterManifestVersion: '1.2.3',
      connectorType: 'drizzle',
      connectorConfig: { dbTable: 'site_adapters' },
      capabilities: ['proxy:read', 'proxy:write'],
      externalSiteReference: 'site-123',
      secretRefs: { jwtSecret: 'WEB_SITE_ADAPTER_SECRET' },
    });

    expect(parsed.adapterManifestVersion).toBe('1.2.3');
    expect(parsed.connectorType).toBe('drizzle');
    expect(parsed.connectorConfig).toEqual({ dbTable: 'site_adapters' });
    expect(parsed.capabilities).toEqual(['proxy:read', 'proxy:write']);
    expect(parsed.externalSiteReference).toBe('site-123');
    expect(parsed.secretRefs).toEqual({ jwtSecret: 'WEB_SITE_ADAPTER_SECRET' });
  });

  it('rejects invalid manifest versions', () => {
    expect(() =>
      createSiteAdapterSchema.parse({
        tenantId: '11111111-2222-3333-4444-555555555555',
        slug: 'webs-croco',
        name: 'Croco',
        backendUrl: 'https://api.webs.local',
        auth: 'jwt',
        modules: ['articles'],
        pathMap: {},
        adapterManifestVersion: 'latest',
      }),
    ).toThrow();
  });

  it('allows partial updates without tenantId', () => {
    const parsed = updateSiteAdapterSchema.parse({
      connectorType: 'http',
      connectorConfig: { mode: 'readonly' },
      secretRefs: { jwtSecret: 'SITE_ADAPTER_SECRET' },
    });

    expect(parsed).toEqual({
      connectorType: 'http',
      connectorConfig: { mode: 'readonly' },
      secretRefs: { jwtSecret: 'SITE_ADAPTER_SECRET' },
      modules: undefined,
      adapterManifestVersion: undefined,
      adapterSlug: undefined,
      publicSlug: undefined,
      pathMap: undefined,
      siteId: undefined,
      externalSiteReference: undefined,
      capabilities: undefined,
      tenantId: undefined,
      apiBase: undefined,
      auth: undefined,
      jwtSecret: undefined,
      name: undefined,
      slug: undefined,
      backendUrl: undefined,
    });
  });
});
