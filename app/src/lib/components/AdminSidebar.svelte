<script lang="ts">
  import { page } from '$app/state';

  export interface NavItem {
    label: string;
    href: string;
    icon?: string;
    badge?: string | number;
    comingSoon?: boolean;
    disabled?: boolean;
  }

  export interface NavGroup {
    label?: string;
    items: NavItem[];
  }

  let {
    groups = [],
    collapsed = false,
    appName = 'hiai-admin',
    onToggle,
  }: {
    groups: NavGroup[];
    collapsed?: boolean;
    appName?: string;
    onToggle?: () => void;
  } = $props();
</script>

<aside
  class="flex flex-col border-r border-border bg-card transition-all duration-200"
  class:w-64={!collapsed}
  class:w-16={collapsed}
>
  <div class="flex h-14 items-center justify-between border-b border-border px-4">
    {#if !collapsed}
      <div class="flex items-center gap-2">
        <div class="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
          H
        </div>
        <span class="text-sm font-semibold tracking-tight">{appName}</span>
      </div>
    {:else}
      <div class="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
        H
      </div>
    {/if}
    {#if onToggle}
      <button onclick={onToggle} class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Toggle sidebar">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          {#if collapsed}
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          {:else}
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          {/if}
        </svg>
      </button>
    {/if}
  </div>

  <nav class="flex-1 space-y-4 overflow-y-auto p-2">
    {#each groups as group}
      {#if group.label && !collapsed}
        <p class="px-3 pt-3 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase first:pt-0">
          {group.label}
        </p>
      {/if}
      <div class="space-y-0.5">
        {#each group.items as item}
          {@const active = !item.disabled && !item.comingSoon && page.url.pathname.startsWith(item.href)}
          <a
            href={item.disabled || item.comingSoon ? undefined : item.href}
            aria-disabled={item.disabled || item.comingSoon}
            class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
            class:bg-accent={active}
            class:text-foreground={active}
            class:text-muted-foreground={!active && !item.comingSoon && !item.disabled}
            class:opacity-60={item.comingSoon || item.disabled}
            class:cursor-not-allowed={item.comingSoon || item.disabled}
            class:hover:bg-muted={!active && !item.comingSoon && !item.disabled}
            class:hover:text-foreground={!active && !item.comingSoon && !item.disabled}
            title={item.label}
          >
            {#if item.icon}
              <span class="text-base shrink-0" aria-hidden="true">{item.icon}</span>
            {/if}
            {#if !collapsed}
              <span class="flex-1 truncate">{item.label}</span>
              {#if item.comingSoon}
                <span class="text-[10px] font-semibold uppercase tracking-wide rounded-full border border-warning/30 bg-warning/10 text-warning px-1.5 py-0.5">
                  Soon
                </span>
              {:else if item.badge !== undefined}
                <span class="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              {/if}
            {/if}
          </a>
        {/each}
      </div>
    {/each}
  </nav>

  <div class="border-t border-border p-3">
    {#if !collapsed}
      <p class="text-[10px] text-muted-foreground text-center">v0.1.0</p>
    {/if}
  </div>
</aside>
