// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { findPage, registerPlugin, resetRegistry } from '../../src/lib/plugins/registry';
import type { Component } from 'svelte';
import type { HiAiPlugin, PluginPage } from '../../src/lib/plugins/types';

const stubComponent: Component = (() => ({})) as unknown as Component;

function makePage(path: string): PluginPage {
  return { path, component: stubComponent };
}

function registerWithPages(id: string, pages: PluginPage[]): HiAiPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    description: 'test plugin',
    navGroups: [{ items: [{ label: 'Home', href: pages[0]?.path ?? '/' }] }],
    proxy: { prefix: `/api/${id}`, target: 'http://localhost:0' },
    pages,
  };
}

afterEach(() => {
  resetRegistry();
  vi.restoreAllMocks();
});

describe('findPage — happy path', () => {
  it('returns the matching page with its plugin', () => {
    const page = makePage('/shop/dashboard');
    registerPlugin(registerWithPages('shop', [page]));
    const hit = findPage('/shop/dashboard');
    expect(hit?.plugin.id).toBe('shop');
    expect(hit?.page.path).toBe('/shop/dashboard');
  });

  it('matches the first registered page when multiple pages share a prefix', () => {
    const a = makePage('/shop');
    const b = makePage('/shop/orders');
    registerPlugin(registerWithPages('shop', [a, b]));
    const hit = findPage('/shop');
    expect(hit?.page.path).toBe('/shop');
  });

  it('matches a deeply nested subpath under a page', () => {
    const page = makePage('/a/b/c');
    registerPlugin(registerWithPages('a', [page]));
    expect(findPage('/a/b/c/d/e/f')?.page.path).toBe('/a/b/c');
  });
});

describe('findPage — no match', () => {
  it('returns undefined when no plugin is registered', () => {
    expect(findPage('/anything')).toBeUndefined();
  });

  it('returns undefined when the plugin has no pages array', () => {
    registerPlugin({
      id: 'no-pages',
      name: 'no-pages',
      version: '1.0.0',
      description: 'no pages',
      navGroups: [],
      proxy: { prefix: '/api/np', target: 'http://localhost:0' },
    });
    expect(findPage('/no-pages/somewhere')).toBeUndefined();
  });

  it('returns undefined when path does not match any registered page', () => {
    registerPlugin(registerWithPages('a', [makePage('/a/foo')]));
    expect(findPage('/b/foo')).toBeUndefined();
  });

  it('does not match a path that shares a prefix word but differs', () => {
    registerPlugin(registerWithPages('a', [makePage('/dashboard')]));
    expect(findPage('/dashboard-old')).toBeUndefined();
  });

  it('matches a path that is nested under a registered page', () => {
    registerPlugin(registerWithPages('a', [makePage('/dashboard')]));
    expect(findPage('/dashboard/extra')?.page.path).toBe('/dashboard');
  });
});

describe('findPage — multiple plugins', () => {
  it('returns the page from whichever plugin owns it', () => {
    registerPlugin(registerWithPages('shop', [makePage('/shop/products')]));
    registerPlugin(registerWithPages('social', [makePage('/social/posts')]));
    expect(findPage('/social/posts')?.plugin.id).toBe('social');
  });

  it('first registration wins on overlapping exact paths', () => {
    const first = makePage('/shared/page');
    const second = makePage('/shared/page');
    registerPlugin(registerWithPages('first', [first]));
    registerPlugin(registerWithPages('second', [second]));
    expect(findPage('/shared/page')?.plugin.id).toBe('first');
  });
});
