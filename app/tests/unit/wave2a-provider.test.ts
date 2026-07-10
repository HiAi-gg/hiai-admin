import { describe, expect, it, vi } from 'vitest';
import {
  adapterManifestSchema,
  articleSchema,
  homepageBlockSchema,
} from '$lib/contracts/index.js';
import {
  createWebsDrizzleProvider,
  websDrizzleConfigFromEnv,
} from '$lib/server/providers/webs-drizzle.js';
import { createProviderResolver, UnknownConnectorTypeError } from '$lib/providers/index.js';

describe('Wave 2A provider foundation', () => {
  it('validates canonical DTOs and adapter manifests', () => {
    expect(
      adapterManifestSchema.parse({
        adapterManifestVersion: '0.0.6',
        connectorType: 'drizzle',
      }).connectorType,
    ).toBe('drizzle');
    expect(homepageBlockSchema.parse({ id: 'b1', type: 'hero', order: 0, data: {} }).id).toBe('b1');
    expect(articleSchema.safeParse({ id: 'a1', title: 'Draft' }).success).toBe(false);
  });

  it('resolves providers by generic connectorType', () => {
    const provider = { connectorType: 'http' } as never;
    const resolver = createProviderResolver({ http: () => provider });
    expect(resolver.resolve({ adapterManifestVersion: '0.0.6', connectorType: 'http' })).toBe(provider);
    expect(() => resolver.resolve({ adapterManifestVersion: '0.0.6', connectorType: 'drizzle' })).toThrow(
      UnknownConnectorTypeError,
    );
  });

  it('reads Webs blocks through the injected server-side database', async () => {
    const execute = vi.fn().mockResolvedValue([{ id: 'b1', type: 'hero', order: 0, data: {} }]);
    const provider = createWebsDrizzleProvider(
      { execute },
      { databaseUrl: 'postgres://db', siteId: 'site-1' },
    );
    await expect(provider.listHomepageBlocks()).resolves.toEqual([
      { id: 'b1', type: 'hero', order: 0, data: {} },
    ]);
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ values: ['site-1'] }));
  });

  it('requires server-only Webs configuration', () => {
    expect(() => websDrizzleConfigFromEnv({})).toThrow('WEBS_DATABASE_URL is required');
    expect(
      websDrizzleConfigFromEnv({ WEBS_DATABASE_URL: 'postgres://db', WEBS_SITE_ID: 'site-1' }),
    ).toEqual({ databaseUrl: 'postgres://db', siteId: 'site-1' });
  });
});
