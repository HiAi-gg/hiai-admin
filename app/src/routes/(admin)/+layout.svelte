<script lang="ts">
import type { Snippet } from 'svelte';
import type { LayoutData } from './$types';
// biome-ignore lint/correctness/noUnusedImports: used in template
import { AdminSidebar, AdminHeader, ThemeToggle } from '@hiai/ui';
// biome-ignore lint/correctness/noUnusedImports: used in template
import { sidebarStore } from '$lib/stores/sidebar.svelte.js';
import { registerPlugin, getNavGroups } from '$lib/plugins/registry.js';
import { hiaiPostPlugin } from '$lib/plugins/hiai-post.js';
import { hiaiStorePlugin } from '$lib/plugins/hiai-store.js';
import { kofiPlugin } from '$lib/plugins/kofi.js';
import { umamiPlugin } from '$lib/plugins/umami.js';

// biome-ignore lint/correctness/noUnusedVariables: used in template
let { data, children }: { data: LayoutData; children: Snippet } = $props();

registerPlugin(hiaiPostPlugin);
registerPlugin(hiaiStorePlugin);
registerPlugin(kofiPlugin);
registerPlugin(umamiPlugin);

const coreNavGroups = [
  {
    label: 'Platform',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: '📊' },
      { label: 'Tenants', href: '/tenants', icon: '🏪' },
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

// biome-ignore lint/correctness/noUnusedVariables: used in template
const allNavGroups = $derived([...coreNavGroups, ...getNavGroups()]);
</script>

<div class="flex h-screen overflow-hidden bg-background">
  <AdminSidebar
    groups={allNavGroups}
    collapsed={sidebarStore.collapsed}
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
