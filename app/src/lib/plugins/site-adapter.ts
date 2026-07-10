import { Coffee, FileText, Globe, Home, Mail, Sparkles } from 'lucide-svelte';
import { type AdapterManifest, adapterManifestSchema } from '$lib/contracts/index.js';
import type { NavGroup, NavIcon, SiteAdapter, SiteModule } from './types.js';

/** Shape of a site adapter as delivered by the backend `/api/site-adapters` (secrets stripped). */
export interface SiteAdapterRow {
  id?: string;
  tenantId: string;
  slug: string;
  name: string;
  backendUrl: string;
  auth?: 'jwt' | 'api-key';
  modules: string[];
  adapterManifestVersion?: string;
  connectorType?: string;
  connectorConfig?: Record<string, unknown>;
  capabilities?: string[];
  externalSiteReference?: string;
  secretRefs?: Record<string, string>;
  enabled?: boolean;
}

const MODULE_NAV: Record<SiteModule, { label: string; icon: NavIcon; segment: string }> = {
  articles: { label: 'Articles', icon: FileText as unknown as NavIcon, segment: 'articles' },
  homepage: { label: 'Homepage', icon: Home as unknown as NavIcon, segment: 'homepage' },
  domains: { label: 'Domain', icon: Globe as unknown as NavIcon, segment: 'domain' },
  kofi: { label: 'Ko-fi', icon: Coffee as unknown as NavIcon, segment: 'kofi' },
  newsletter: { label: 'Newsletter', icon: Mail as unknown as NavIcon, segment: 'newsletter' },
  generation: { label: 'Generation', icon: Sparkles as unknown as NavIcon, segment: 'generation' },
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
        { label: 'Overview', href: `/sites/${row.slug}`, icon: Home as unknown as string },
        ...modules.map((m) => ({
          label: MODULE_NAV[m].label,
          href: `/sites/${row.slug}/${MODULE_NAV[m].segment}`,
          icon: MODULE_NAV[m].icon as unknown as string,
        })),
      ];
      const navGroups: NavGroup[] = [{ label: row.name, items }];
      const manifest: AdapterManifest = adapterManifestSchema.parse({
        adapterManifestVersion: row.adapterManifestVersion ?? '1.0.0',
        connectorType: row.connectorType ?? 'http',
        connectorConfig: row.connectorConfig ?? {},
        capabilities: row.capabilities ?? [],
        modules,
        externalSiteReference: row.externalSiteReference,
        secretRefs: row.secretRefs ?? {},
      });

      return {
        kind: 'site',
        id: row.slug,
        tenantId: row.tenantId,
        name: row.name,
        version: '1.0.0',
        icon: Globe as unknown as NavIcon,
        description: `Site adapter for ${row.name}`,
        navGroups,
        modules,
        manifest,
        connectorType: row.connectorType ?? 'http',
        proxy: {
          prefix: `/api/${row.slug}`,
          target: row.backendUrl,
          auth: row.auth ?? 'jwt',
        },
      } satisfies SiteAdapter;
    });
}
