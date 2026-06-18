import { describe, it, expect } from 'vitest';
import {
  buildSiteAdapterPlugins,
  type SiteAdapterRow,
} from '../../src/lib/plugins/site-adapter.js';

const croco: SiteAdapterRow = {
  id: 'a1',
  tenantId: 't1',
  slug: 'webs-croco',
  name: 'Croco',
  backendUrl: 'http://api:3001',
  auth: 'jwt',
  modules: ['articles', 'homepage', 'domains', 'kofi'],
  enabled: true,
};

describe('buildSiteAdapterPlugins', () => {
  it('builds one plugin per adapter with id = slug and kind "site"', () => {
    const [plugin] = buildSiteAdapterPlugins([croco]);
    expect(plugin.id).toBe('webs-croco');
    expect(plugin.kind).toBe('site');
    expect(plugin.tenantId).toBe('t1');
    expect(plugin.name).toBe('Croco');
  });

  it('sets the proxy target to the adapter backend and prefix to /api/<slug>', () => {
    const [plugin] = buildSiteAdapterPlugins([croco]);
    expect(plugin.proxy.target).toBe('http://api:3001');
    expect(plugin.proxy.prefix).toBe('/api/webs-croco');
    expect(plugin.proxy.auth).toBe('jwt');
  });

  it('creates one nav group with an item per enabled module, in stable order', () => {
    const [plugin] = buildSiteAdapterPlugins([croco]);
    expect(plugin.navGroups).toHaveLength(1);
    const group = plugin.navGroups[0];
    expect(group.label).toBe('Croco');
    expect(group.items.map((i) => i.label)).toEqual(['Overview', 'Articles', 'Homepage', 'Domain', 'Ko-fi']);
    expect(group.items.map((i) => i.href)).toEqual([
      '/sites/webs-croco',
      '/sites/webs-croco/articles',
      '/sites/webs-croco/homepage',
      '/sites/webs-croco/domain',
      '/sites/webs-croco/kofi',
    ]);
  });

  it('orders nav items canonically regardless of input order', () => {
    const [plugin] = buildSiteAdapterPlugins([
      { ...croco, modules: ['kofi', 'articles', 'domains'] },
    ]);
    expect(plugin.navGroups[0].items.map((i) => i.label)).toEqual(['Overview', 'Articles', 'Domain', 'Ko-fi']);
  });

  it('defaults proxy auth to jwt when not specified', () => {
    const [plugin] = buildSiteAdapterPlugins([{ ...croco, auth: undefined }]);
    expect(plugin.proxy.auth).toBe('jwt');
  });

  it('skips disabled adapters', () => {
    const plugins = buildSiteAdapterPlugins([
      croco,
      { ...croco, slug: 'webs-off', name: 'Off', enabled: false },
    ]);
    expect(plugins.map((p) => p.id)).toEqual(['webs-croco']);
  });

  it('ignores unknown module names', () => {
    const [plugin] = buildSiteAdapterPlugins([
      { ...croco, modules: ['articles', 'bogus', 'kofi'] },
    ]);
    expect(plugin.navGroups[0].items.map((i) => i.label)).toEqual(['Overview', 'Articles', 'Ko-fi']);
  });

  it('returns an empty array for no rows', () => {
    expect(buildSiteAdapterPlugins([])).toEqual([]);
  });
});
