<script lang="ts">
  import { page } from '$app/state';

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: '📊' },
    { label: 'Tenants', href: '/tenants', icon: '🏪' },
    { label: 'Users', href: '/users', icon: '👥' },
    { label: 'Billing', href: '/billing', icon: '💳' },
    { label: 'Analytics', href: '/analytics', icon: '📈' },
    { label: 'Settings', href: '/settings', icon: '⚙️' },
    { label: 'Security', href: '/security/audit', icon: '🔒' },
    { label: 'Integrations', href: '/integrations', icon: '🔗' },
  ];

  let collapsed = $state(false);
</script>

<aside class="flex flex-col border-r bg-muted/30 transition-all duration-200" class:w-64={!collapsed} class:w-16={collapsed}>
  <div class="flex items-center justify-between p-4 border-b">
    {#if !collapsed}
      <span class="font-semibold text-lg">hiai-admin</span>
    {/if}
    <button onclick={() => collapsed = !collapsed} class="p-1 rounded hover:bg-muted" aria-label="Toggle sidebar">
      {collapsed ? '→' : '←'}
    </button>
  </div>

  <nav class="flex-1 p-2 space-y-1">
    {#each navItems as item}
      <a
        href={item.href}
        class="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted"
        class:bg-muted={page.url.pathname.startsWith(item.href)}
        class:font-medium={page.url.pathname.startsWith(item.href)}
        title={item.label}
      >
        <span class="text-lg">{item.icon}</span>
        {#if !collapsed}
          <span>{item.label}</span>
        {/if}
      </a>
    {/each}
  </nav>
</aside>
