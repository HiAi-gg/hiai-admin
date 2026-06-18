<script lang="ts">
import type { Snippet } from 'svelte';
import type { LayoutData } from './$types';
import { page } from '$app/state';
import { env as publicEnv } from '$env/dynamic/public';
// biome-ignore lint/correctness/noUnusedImports: used in template
import { AdminSidebar, AdminHeader, ThemeToggle } from '@hiai/ui';
// biome-ignore lint/correctness/noUnusedImports: used in template
import { sidebarStore } from '$lib/stores/sidebar.svelte.js';
import { buildSiteAdapterPlugins } from '$lib/plugins/site-adapter.js';
// biome-ignore lint/correctness/noUnusedImports: used in template
import SiteSwitcher from '$lib/components/SiteSwitcher.svelte';
// biome-ignore lint/correctness/noUnusedImports: used in template
import ViewSiteButton from '$lib/components/ViewSiteButton.svelte';

// biome-ignore lint/correctness/noUnusedVariables: used in template
let { data, children }: { data: LayoutData; children: Snippet } = $props();

// NOTE: Plugin registration lives in +layout.server.ts only. The plugin
// registry is a module-level Map shared across requests on the server, so
// registering here too would re-add plugins on every client navigation
// (registerPlugin dedupes, but stale/cross-tenant adapters from prior
// requests would still leak in via the shared Map). See S1.5.

const coreNavGroups = [
  {
    label: 'Platform',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: '📊' },
      { label: 'Tenants', href: '/tenants', icon: '🏪' },
      { label: 'Connect Site', href: '/sites/connect', icon: '🔌' },
      { label: 'Users', href: '/users', icon: '👥' },
      { label: 'RBAC', href: '/rbac', icon: '🛡️' },
      { label: 'Billing', href: '/billing', icon: '💳' },
      { label: 'Analytics', href: '/analytics', icon: '📈' },
      { label: 'Settings', href: '/settings', icon: '⚙️' },
      { label: 'Security', href: '/security/audit', icon: '🔒' },
      { label: 'Integrations', href: '/integrations', icon: '🔗' },
    ],
  },
];

// Nav scoping: super_admin (global) sees platform + all plugin/site nav. A site admin
// (non-super_admin) sees ONLY the nav for their scoped sites (data.adapters is already
// tenant-scoped server-side) — no platform section, no platform verticals. This avoids
// the global plugin-registry singleton leaking other tenants' sites into a site admin's nav.
const isSuperAdmin = $derived((data.user?.role ?? '') === 'super_admin');
const siteNavGroups = $derived(
  buildSiteAdapterPlugins(data.adapters ?? []).flatMap((p) => p.navGroups),
);
// biome-ignore lint/correctness/noUnusedVariables: used in template
const allNavGroups = $derived(
  isSuperAdmin ? [...coreNavGroups, ...(data.navGroups ?? [])] : siteNavGroups,
);

// Extract the site slug from `/sites/<slug>/...` (if any). Used to highlight
// the active site in the switcher and to build the "View site" public URL.
const currentSiteSlug = $derived.by(() => {
  const match = page.url.pathname.match(/^\/sites\/([^/]+)/);
  return match?.[1];
});

const baseSiteUrl = (publicEnv.PUBLIC_SITE_BASE_URL ?? '').replace(/\/$/, '');
const currentSiteUrl = $derived.by(() => {
  if (!currentSiteSlug) return null;
  const site = (data.adapters ?? []).find((a) => a.slug === currentSiteSlug);
  if (!site) return null;
  return baseSiteUrl ? `${baseSiteUrl}/${site.slug}` : null;
});
</script>

<div class="flex h-screen overflow-hidden bg-background">
  <AdminSidebar
    groups={allNavGroups}
    collapsed={sidebarStore.collapsed}
  />

  <div class="flex flex-1 flex-col overflow-hidden">
    <AdminHeader user={data.user} onToggleSidebar={() => sidebarStore.toggle()}>
      {#snippet actions()}
        <SiteSwitcher adapters={data.adapters ?? []} currentSlug={currentSiteSlug} />
        <ViewSiteButton href={currentSiteUrl} />
        <ThemeToggle />
      {/snippet}
    </AdminHeader>

    <main class="flex-1 overflow-y-auto p-6">
      {@render children()}
    </main>
  </div>
</div>
