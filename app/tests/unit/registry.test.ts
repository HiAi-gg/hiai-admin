import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Component } from 'svelte';
import {
  findPage,
  getNavGroups,
  getPlugin,
  getPlugins,
  getProxyConfig,
  getProxyConfigs,
  registerPlugin,
  resetRegistry,
} from '../../src/lib/plugins/registry';
import type { HiAiPlugin, NavIcon, PluginPage } from '../../src/lib/plugins/types';

const stubComponent: Component = (() => ({})) as unknown as Component;

function makePlugin(overrides: Partial<HiAiPlugin> = {}): HiAiPlugin {
  return {
    id: 'sample',
    name: 'Sample Plugin',
    version: '1.0.0',
    icon: '🧪' as unknown as NavIcon,
    description: 'sample plugin used in tests',
    navGroups: [
      {
        label: 'Sample',
        items: [
          { label: 'Home', href: '/sample', icon: '🏠' },
          { label: 'Settings', href: '/sample/settings', icon: '⚙️' },
        ],
      },
    ],
    proxy: { prefix: '/api/sample', target: 'http://localhost:50900', auth: 'jwt' },
    ...overrides,
  };
}

afterEach(() => {
  resetRegistry();
  vi.restoreAllMocks();
});

describe('plugin registry — registerPlugin', () => {
  it('stores a plugin in the registry', () => {
    const plugin = makePlugin();
    registerPlugin(plugin);
    expect(getPlugin('sample')).toEqual(plugin);
  });

  it('warns and does not overwrite when the same id is registered twice', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const first = makePlugin({ name: 'First' });
    const second = makePlugin({ name: 'Second' });

    registerPlugin(first);
    registerPlugin(second);

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain('sample');
    expect(getPlugin('sample')?.name).toBe('First');
  });

  it('treats plugin ids as case-sensitive', () => {
    registerPlugin(makePlugin({ id: 'CaseSensitive' }));
    expect(getPlugin('CaseSensitive')).toBeDefined();
    expect(getPlugin('casesensitive')).toBeUndefined();
  });
});

describe('plugin registry — getPlugins', () => {
  it('returns an empty array when no plugins are registered', () => {
    expect(getPlugins()).toEqual([]);
  });

  it('returns every registered plugin', () => {
    registerPlugin(makePlugin({ id: 'alpha' }));
    registerPlugin(makePlugin({ id: 'beta' }));
    registerPlugin(makePlugin({ id: 'gamma' }));

    const ids = getPlugins()
      .map((p) => p.id)
      .sort();
    expect(ids).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('returns a fresh array on every call (no shared mutation)', () => {
    registerPlugin(makePlugin({ id: 'alpha' }));
    const a = getPlugins();
    const b = getPlugins();
    expect(a).not.toBe(b);
    a.pop();
    expect(getPlugins()).toHaveLength(1);
  });
});

describe('plugin registry — getPlugin', () => {
  it('returns undefined for unknown ids', () => {
    expect(getPlugin('nope')).toBeUndefined();
  });
});

describe('plugin registry — getNavGroups', () => {
  it('flattens nav groups from every registered plugin', () => {
    registerPlugin(
      makePlugin({
        id: 'shop',
        navGroups: [{ label: 'Shop', items: [{ label: 'Products', href: '/shop/products' }] }],
      }),
    );
    registerPlugin(
      makePlugin({
        id: 'social',
        navGroups: [{ items: [{ label: 'Posts', href: '/social/posts' }] }],
      }),
    );

    const groups = getNavGroups();
    const shopGroup = groups.find((g) => g.label === 'Shop');
    const socialGroup = groups.find((g) => g.items[0]?.href === '/social/posts');

    expect(shopGroup).toBeDefined();
    expect(shopGroup?.items).toEqual([{ label: 'Products', href: '/shop/products' }]);
    expect(socialGroup).toBeDefined();
    expect(socialGroup?.items).toEqual([{ label: 'Posts', href: '/social/posts' }]);
  });

  it('passes each nav group through unchanged (no icon fallback at group level)', () => {
    // NavGroup no longer carries an icon field in @hiai/ui; getNavGroups()
    // simply returns each plugin's navGroups as-is.
    registerPlugin(
      makePlugin({
        id: 'analytics',
        navGroups: [{ items: [{ label: 'Reports', href: '/analytics' }] }],
      }),
    );
    const group = getNavGroups()[0];
    expect(group?.items).toEqual([{ label: 'Reports', href: '/analytics' }]);
  });
});

describe('plugin registry — findPage', () => {
  it('returns undefined when the plugin has no pages array', () => {
    registerPlugin(makePlugin({ id: 'no-pages' }));
    expect(findPage('/no-pages/whatever')).toBeUndefined();
  });

  it('matches an exact page path', () => {
    const page: PluginPage = { path: '/shop/dashboard', component: stubComponent };
    registerPlugin(makePlugin({ id: 'shop', pages: [page] }));
    const hit = findPage('/shop/dashboard');
    expect(hit?.page).toBe(page);
    expect(hit?.plugin.id).toBe('shop');
  });

  it('matches a nested pathname that starts with the page path', () => {
    const page: PluginPage = { path: '/shop/products', component: stubComponent };
    registerPlugin(makePlugin({ id: 'shop', pages: [page] }));
    expect(findPage('/shop/products/123/edit')?.page).toBe(page);
  });

  it('does NOT match a path that merely shares a prefix word', () => {
    const page: PluginPage = { path: '/shop', component: stubComponent };
    registerPlugin(makePlugin({ id: 'shop', pages: [page] }));
    expect(findPage('/shopping')).toBeUndefined();
  });

  it('returns the first matching page across multiple plugins', () => {
    const firstPage: PluginPage = { path: '/a/page', component: stubComponent };
    const secondPage: PluginPage = { path: '/a/page/sub', component: stubComponent };
    registerPlugin(makePlugin({ id: 'first', pages: [firstPage] }));
    registerPlugin(makePlugin({ id: 'second', pages: [secondPage] }));
    expect(findPage('/a/page/sub')?.plugin.id).toBe('first');
  });
});

describe('plugin registry — proxy helpers', () => {
  it('returns an empty list when no plugins expose proxies', () => {
    registerPlugin(
      makePlugin({
        id: 'no-proxy',
        proxy: undefined as unknown as HiAiPlugin['proxy'],
      }),
    );
    expect(getProxyConfigs()).toEqual([]);
  });

  it('collects every proxy config across plugins', () => {
    registerPlugin(
      makePlugin({
        id: 'shop',
        proxy: { prefix: '/api/shop', target: 'http://localhost:50400', auth: 'jwt' },
      }),
    );
    registerPlugin(
      makePlugin({
        id: 'kofi',
        proxy: { prefix: '/api/kofi', target: 'https://ko-fi.com/api/v1', auth: 'api-key' },
      }),
    );
    const configs = getProxyConfigs();
    const prefixes = configs.map((c) => c.prefix).sort();
    expect(prefixes).toEqual(['/api/kofi', '/api/shop']);
  });

  it('returns a single plugin proxy by id', () => {
    registerPlugin(
      makePlugin({
        id: 'kofi',
        proxy: { prefix: '/api/kofi', target: 'https://ko-fi.com/api/v1', auth: 'api-key' },
      }),
    );
    expect(getProxyConfig('kofi')?.target).toBe('https://ko-fi.com/api/v1');
    expect(getProxyConfig('missing')).toBeUndefined();
  });
});

describe('plugin registry — resetRegistry', () => {
  it('removes every registered plugin', () => {
    registerPlugin(makePlugin({ id: 'a' }));
    registerPlugin(makePlugin({ id: 'b' }));
    resetRegistry();
    expect(getPlugins()).toEqual([]);
    expect(getPlugin('a')).toBeUndefined();
  });

  it('is safe to call when the registry is already empty', () => {
    expect(() => resetRegistry()).not.toThrow();
  });
});
