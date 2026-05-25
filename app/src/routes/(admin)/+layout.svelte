<script lang="ts">
  import type { LayoutData } from './$types';
  import { AdminSidebar, AdminHeader, ThemeToggle, sidebarStore } from '@hiai/ui';
  import { getNavGroups } from '$lib/plugins/registry.js';
  import { registerPlugin } from '$lib/plugins/registry.js';
  import { hiaiPostPlugin } from '$lib/plugins/hiai-post.js';
  import { hiaiStorePlugin } from '$lib/plugins/hiai-store.js';
  import { kofiPlugin } from '$lib/plugins/kofi.js';
  import { umamiPlugin } from '$lib/plugins/umami.js';

  let { data, children } = $props<{ data: LayoutData; children: Snippet }>();

  // Register all plugins on first load
  registerPlugin(hiaiPostPlugin);
  registerPlugin(hiaiStorePlugin);
  registerPlugin(kofiPlugin);
  registerPlugin(umamiPlugin);

  // Core admin nav + plugin nav groups
  const coreNavGroups = [
    {
      label: 'Platform',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: '📊' },
        { label: 'Tenants', href: '/tenants', icon: '🏪' },
        { label: 'Users', href: '/users', icon: '👥' },
        { label: 'Billing', href: '/billing', icon: '💳' },
        { label: 'Analytics', href: '/analytics', icon: '📈' },
        { label: 'Settings', href: '/settings', icon: '⚙️' },
        { label: 'Security', href: '/security/audit', icon: '🔒' },
        { label: 'Integrations', href: '/integrations', icon: '🔗' },
      ],
    },
  ];

  const allNavGroups = $derived([...coreNavGroups, ...getNavGroups()]);
</script>

<div class="flex h-screen overflow-hidden bg-background">
  <AdminSidebar
    groups={allNavGroups}
    collapsed={sidebarStore.collapsed}
    onToggle={() => sidebarStore.toggle()}
    appName="hiai-admin"
  />

  <div class="flex flex-1 flex-col overflow-hidden">
    <AdminHeader user={data.user} onToggleSidebar={() => sidebarStore.toggle()}>
      {#snippet actions()}
        <ThemeToggle />
      {/snippet}
    </AdminHeader>

    <main class="flex-1 overflow-y-auto p-6">
      {@render children()}
    </main>
  </div>
</div>
