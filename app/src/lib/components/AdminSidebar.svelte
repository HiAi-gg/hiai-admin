<script lang="ts">
  import { page } from '$app/state';
  import type { NavGroup } from '$lib/plugins/types.js';

  let {
    navGroups = [],
    collapsed = false,
  }: {
    navGroups: NavGroup[];
    collapsed?: boolean;
  } = $props();
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

  <nav class="flex-1 p-2 space-y-4 overflow-y-auto">
    {#each navGroups as group}
      {#if group.label && !collapsed}
        <p class="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3 first:mt-0">
          {group.label}
        </p>
      {/if}
      <div class="space-y-1">
        {#each group.items as item}
          <a
            href={item.href}
            class="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted"
            class:bg-muted={page.url.pathname.startsWith(item.href)}
            class:font-medium={page.url.pathname.startsWith(item.href)}
            title={item.label}
          >
            {#if item.icon}
              <span class="text-lg">{item.icon}</span>
            {/if}
            {#if !collapsed}
              <span class="flex-1">{item.label}</span>
              {#if item.badge !== undefined}
                <span class="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">{item.badge}</span>
              {/if}
            {/if}
          </a>
        {/each}
      </div>
    {/each}
  </nav>
</aside>
