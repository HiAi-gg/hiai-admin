import { describe, it, expect } from 'vitest';
import {
  buildSiteAdapterPlugins,
  type SiteAdapterRow,
} from '../../src/lib/plugins/site-adapter.js';

const example: SiteAdapterRow = {
  id: 'a1',
  tenantId: 't1',
  slug: 'example-site',
  name: 'Example',
  backendUrl: 'http://api:3001',
  auth: 'jwt',
  modules: ['articles', 'homepage', 'domains', 'kofi'],
  enabled: true,
};

describe('buildSiteAdapterPlugins', () => {
  it('builds one plugin per adapter with id = slug and kind "site"', () => {
    const [plugin] = buildSiteAdapterPlugins([example]);
    expect(plugin.id).toBe('example-site');
    expect(plugin.kind).toBe('site');
    expect(plugin.tenantId).toBe('t1');
    expect(plugin.name).toBe('Example');
  });

  it('sets the proxy target to the adapter backend and prefix to /api/<slug>', () => {
    const [plugin] = buildSiteAdapterPlugins([example]);
    expect(plugin.proxy.target).toBe('http://api:3001');
    expect(plugin.proxy.prefix).toBe('/api/example-site');
    expect(plugin.proxy.auth).toBe('jwt');
  });

  it('creates one nav group with an item per enabled module, in stable order', () => {
    const [plugin] = buildSiteAdapterPlugins([example]);
    expect(plugin.navGroups).toHaveLength(1);
    const group = plugin.navGroups[0];
    expect(group.label).toBe('Example');
    expect(group.items.map((i) => i.label)).toEqual([
      'Overview',
      'Articles',
      'Homepage',
      'Domain',
      'Ko-fi',
    ]);
    expect(group.items.map((i) => i.href)).toEqual([
      '/sites/example-site',
      '/sites/example-site/articles',
      '/sites/example-site/homepage',
      '/sites/example-site/domain',
      '/sites/example-site/kofi',
    ]);
  });

  it('orders nav items canonically regardless of input order', () => {
    const [plugin] = buildSiteAdapterPlugins([
      { ...example, modules: ['kofi', 'articles', 'domains'] },
    ]);
    expect(plugin.navGroups[0].items.map((i) => i.label)).toEqual([
      'Overview',
      'Articles',
      'Domain',
      'Ko-fi',
    ]);
  });

  it('defaults proxy auth to jwt when not specified', () => {
    const [plugin] = buildSiteAdapterPlugins([{ ...example, auth: undefined }]);
    expect(plugin.proxy.auth).toBe('jwt');
  });

  it('skips disabled adapters', () => {
    const plugins = buildSiteAdapterPlugins([
      example,
      { ...example, slug: 'example-off', name: 'Off', enabled: false },
    ]);
    expect(plugins.map((p) => p.id)).toEqual(['example-site']);
  });

  it('ignores unknown module names', () => {
    const [plugin] = buildSiteAdapterPlugins([
      { ...example, modules: ['articles', 'bogus', 'kofi'] },
    ]);
    expect(plugin.navGroups[0].items.map((i) => i.label)).toEqual([
      'Overview',
      'Articles',
      'Ko-fi',
    ]);
  });

  it('returns an empty array for no rows', () => {
    expect(buildSiteAdapterPlugins([])).toEqual([]);
  });
});
