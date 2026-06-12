import { describe, expect, it } from 'vitest';
import { hiaiPostPlugin } from '../../src/lib/plugins/hiai-post';
import { hiaiStorePlugin } from '../../src/lib/plugins/hiai-store';
import { kofiPlugin } from '../../src/lib/plugins/kofi';
import { umamiPlugin } from '../../src/lib/plugins/umami';
import type { HiAiPlugin, NavItem } from '../../src/lib/plugins/types';

const allPlugins: HiAiPlugin[] = [hiaiStorePlugin, hiaiPostPlugin, umamiPlugin, kofiPlugin];

describe('built-in plugin data — required fields', () => {
  for (const plugin of allPlugins) {
    describe(plugin.id, () => {
      it('has a non-empty id, name, version and description', () => {
        expect(plugin.id).toBeTruthy();
        expect(plugin.name).toBeTruthy();
        expect(plugin.version).toMatch(/^\d+\.\d+\.\d+/);
        expect(plugin.description.length).toBeGreaterThan(8);
      });

      it('exposes at least one nav group with at least one item', () => {
        expect(plugin.navGroups.length).toBeGreaterThan(0);
        const items = plugin.navGroups.flatMap((g) => g.items);
        expect(items.length).toBeGreaterThan(0);
      });

      it('declares a proxy config with prefix and target', () => {
        expect(plugin.proxy.prefix.startsWith('/api/')).toBe(true);
        expect(plugin.proxy.target).toMatch(/^https?:\/\//);
      });

      it('uses unique nav item hrefs (no duplicates inside the plugin)', () => {
        const items: NavItem[] = plugin.navGroups.flatMap((g) => g.items);
        const hrefs: string[] = items.map((i) => i.href);
        const unique = new Set<string>(hrefs);
        expect(unique.size).toBe(hrefs.length);
      });
    });
  }
});

describe('built-in plugin data — id uniqueness', () => {
  it('no two built-in plugins share an id', () => {
    const ids: string[] = allPlugins.map((p) => p.id);
    const unique = new Set<string>(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe('built-in plugin data — hiai-store', () => {
  it('targets the store backend on port 50400 with jwt auth', () => {
    expect(hiaiStorePlugin.proxy).toMatchObject({
      prefix: '/api/shop',
      target: 'http://localhost:50400',
      auth: 'jwt',
    });
  });

  it('exposes a labelled E-Commerce group with the expected item count', () => {
    const group = hiaiStorePlugin.navGroups[0];
    expect(group?.label).toBe('E-Commerce');
    expect(group?.items.length).toBeGreaterThanOrEqual(5);
  });
});

describe('built-in plugin data — hiai-post', () => {
  it('targets the post backend on port 50300 with jwt auth', () => {
    expect(hiaiPostPlugin.proxy).toMatchObject({
      prefix: '/api/social',
      target: 'http://localhost:50300',
      auth: 'jwt',
    });
  });

  it('exposes a labelled Social Media group', () => {
    expect(hiaiPostPlugin.navGroups[0]?.label).toBe('Social Media');
  });
});

describe('built-in plugin data — umami', () => {
  it('uses api-key auth and targets the umami analytics host', () => {
    expect(umamiPlugin.proxy).toMatchObject({ prefix: '/api/umami', auth: 'api-key' });
    expect(umamiPlugin.proxy.target).toMatch(/^https?:\/\//);
  });
});

describe('built-in plugin data — kofi', () => {
  it('uses api-key auth against the ko-fi api', () => {
    expect(kofiPlugin.proxy).toMatchObject({ prefix: '/api/kofi', auth: 'api-key' });
    expect(kofiPlugin.proxy.target).toContain('ko-fi.com');
  });
});
