<script lang="ts">
import type { ComponentProps, Snippet } from 'svelte';
import type { LayoutData } from './$types';
import type { NavGroup } from '@hiai/ui';
import { page } from '$app/state';
import { goto } from '$app/navigation';
import { env as publicEnv } from '$env/dynamic/public';
// biome-ignore lint/correctness/noUnusedImports: used in template
import { AdminSidebar, AdminHeader, ThemeToggle, authStore } from '@hiai/ui';
// biome-ignore lint/correctness/noUnusedImports: used in template
import { sidebarStore } from '$lib/stores/sidebar.svelte.js';
import { buildSiteAdapterPlugins } from '$lib/plugins/site-adapter.js';
// biome-ignore lint/correctness/noUnusedImports: used in template
import SiteSwitcher from '$lib/components/SiteSwitcher.svelte';
// biome-ignore lint/correctness/noUnusedImports: used in template
import ViewSiteButton from '$lib/components/ViewSiteButton.svelte';
// biome-ignore lint/correctness/noUnusedImports: used in template
import NotificationBell from '$lib/components/NotificationBell.svelte';
import {
  Activity,
  BarChart3,
  CreditCard,
  Link2,
  Plug,
  Settings,
  Shield,
  Store,
  TrendingUp,
  UsersRound,
} from 'lucide-svelte';

// biome-ignore lint/correctness/noUnusedVariables: used in template
let { data, children }: { data: LayoutData; children: Snippet } = $props();

// NOTE: Plugin registration lives in +layout.server.ts only. The plugin
// registry is a module-level Map shared across requests on the server, so
// registering here too would re-add plugins on every client navigation
// (registerPlugin dedupes, but stale/cross-tenant adapters from prior
// requests would still leak in via the shared Map). See S1.5.

// `AdminSidebar` declares its own internal `NavGroup` type whose `icon`
// is a Svelte 5 functional `Component` (not the `Component<any> | string`
// variant that `@hiai/ui`'s public `NavGroup` exports). They are
// structurally compatible at runtime (lucide-svelte icons satisfy both
// because they extend the Svelte 4 class component shape), so the
// `groups` prop accepts both. We pull the prop's actual type via
// `ComponentProps` rather than re-annotating, so adding an icon variant
// to one of the two definitions won't drift them out of sync.
type AdminSidebarGroups = ComponentProps<typeof AdminSidebar>['groups'];

const coreNavGroups: NavGroup[] = [
  {
    label: 'Platform',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: BarChart3 as unknown as string },
      { label: 'Tenants', href: '/tenants', icon: Store as unknown as string },
      { label: 'Connect Site', href: '/sites/connect', icon: Plug as unknown as string },
      { label: 'Users', href: '/users', icon: UsersRound as unknown as string },
      { label: 'RBAC', href: '/rbac', icon: Shield as unknown as string },
      { label: 'Billing', href: '/billing', icon: CreditCard as unknown as string },
      { label: 'Analytics', href: '/analytics', icon: TrendingUp as unknown as string },
      { label: 'Settings', href: '/settings', icon: Settings as unknown as string },
      { label: 'Security', href: '/security/audit', icon: Activity as unknown as string },
      { label: 'Integrations', href: '/integrations', icon: Link2 as unknown as string },
    ],
  },
];

// Nav scoping:
//   - super_admin  → full Platform section + every registered plugin/site nav group
//   - non-super_admin (site admin) → ONLY the nav groups for their scoped site
//     adapters (data.adapters is already tenant-scoped server-side). The
//     Platform section is hidden because every item in it (Tenants, Connect
//     Site, Users, RBAC, Billing, Analytics, Integrations) is a
//     super_admin-only surface that would leak cross-tenant context if
//     exposed to a per-site operator. Site admins live entirely inside their
//     site's nav (e.g. TEST SITE).
const isSuperAdmin = $derived((data.user?.role ?? '') === 'super_admin');
const siteNavGroups = $derived(
  buildSiteAdapterPlugins(data.adapters ?? []).flatMap((p) => p.navGroups),
);
// biome-ignore lint/correctness/noUnusedVariables: used in template
const allNavGroups: AdminSidebarGroups = $derived(
  isSuperAdmin
    ? ([...coreNavGroups, ...(data.navGroups ?? [])] as AdminSidebarGroups)
    : (siteNavGroups as AdminSidebarGroups),
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

const BACKEND = (import.meta.env.PUBLIC_API_URL as string | undefined) ?? 'http://localhost:50200';

async function handleSignOut(): Promise<void> {
  authStore.setUser(null);
  try {
    await fetch(`${BACKEND}/api/auth/sign-out`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    // Backend failure must not block local logout.
  }
  await goto('/login', { replaceState: true, invalidateAll: true });
}
</script>

<div class="flex h-screen overflow-hidden bg-background text-foreground">
  <AdminSidebar
    groups={allNavGroups}
    collapsed={sidebarStore.collapsed}
    onToggle={() => sidebarStore.toggle()}
  />

  <div class="flex flex-1 flex-col overflow-hidden">
    <AdminHeader user={data.user} onSignOut={handleSignOut}>
      {#snippet actions()}
        <SiteSwitcher adapters={data.adapters ?? []} currentSlug={currentSiteSlug} />
        <ViewSiteButton href={currentSiteUrl} />
        <ThemeToggle />
        <NotificationBell />
      {/snippet}
    </AdminHeader>

    <main class="flex-1 overflow-y-auto p-6">
      {@render children()}
    </main>
  </div>
</div>
