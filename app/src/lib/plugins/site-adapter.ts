import type { NavGroup, SiteAdapter, SiteModule } from './types.js';

/** Shape of a site adapter as delivered by the backend `/api/site-adapters` (secrets stripped). */
export interface SiteAdapterRow {
  id?: string;
  tenantId: string;
  slug: string;
  name: string;
  backendUrl: string;
  auth?: 'jwt' | 'api-key';
  modules: string[];
  enabled?: boolean;
}

const MODULE_NAV: Record<SiteModule, { label: string; icon: string; segment: string }> = {
  articles: { label: 'Articles', icon: '📝', segment: 'articles' },
  homepage: { label: 'Homepage', icon: '🏠', segment: 'homepage' },
  domains: { label: 'Domain', icon: '🌐', segment: 'domain' },
  kofi: { label: 'Ko-fi', icon: '☕', segment: 'kofi' },
  newsletter: { label: 'Newsletter', icon: '✉️', segment: 'newsletter' },
  generation: { label: 'Generation', icon: '✨', segment: 'generation' },
};

// Stable display order regardless of how `modules` is stored.
const MODULE_ORDER: SiteModule[] = [
  'articles',
  'homepage',
  'domains',
  'kofi',
  'newsletter',
  'generation',
];

/**
 * Maps backend site-adapter rows into {@link SiteAdapter} plugins the registry
 * can consume: one nav group per site, one nav item per enabled module, and a
 * proxy whose target is the site backend. Disabled adapters are skipped.
 */
export function buildSiteAdapterPlugins(rows: SiteAdapterRow[]): SiteAdapter[] {
  return rows
    .filter((row) => row.enabled !== false)
    .map((row) => {
      const modules = MODULE_ORDER.filter((m) => row.modules.includes(m));
      const items = [
        { label: 'Overview', href: `/sites/${row.slug}`, icon: '🏠' },
        ...modules.map((m) => ({
          label: MODULE_NAV[m].label,
          href: `/sites/${row.slug}/${MODULE_NAV[m].segment}`,
          icon: MODULE_NAV[m].icon,
        })),
      ];
      const navGroups: NavGroup[] = [{ label: row.name, icon: '🌍', items }];

      return {
        kind: 'site',
        id: row.slug,
        tenantId: row.tenantId,
        name: row.name,
        version: '1.0.0',
        icon: '🌍',
        description: `Site adapter for ${row.name}`,
        navGroups,
        modules,
        proxy: {
          prefix: `/api/${row.slug}`,
          target: row.backendUrl,
          auth: row.auth ?? 'jwt',
        },
      } satisfies SiteAdapter;
    });
}
