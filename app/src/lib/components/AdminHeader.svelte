<script lang="ts">
import { page } from '$app/state';
import type { Snippet } from 'svelte';

let {
  user,
  onToggleSidebar,
  actions,
}: { user: any; onToggleSidebar: () => void; actions?: Snippet } = $props();

let breadcrumbs = $derived(() => {
  const segments = page.url.pathname.split('/').filter(Boolean);
  return segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
    href: `/${segments.slice(0, i + 1).join('/')}`,
    current: i === segments.length - 1,
  }));
});
</script>

<header class="flex h-14 items-center justify-between border-b border-border bg-card px-4">
  <div class="flex items-center gap-4">
    <button
      onclick={onToggleSidebar}
      class="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label="Toggle sidebar"
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <nav aria-label="Breadcrumb">
      <ol class="flex items-center gap-2 text-sm">
        {#each breadcrumbs() as crumb, i}
          {#if i > 0}
            <li class="text-muted-foreground/50">/</li>
          {/if}
          <li>
            {#if crumb.current}
              <span class="font-semibold text-foreground">{crumb.label}</span>
            {:else}
              <a href={crumb.href} class="text-muted-foreground transition-colors hover:text-foreground">{crumb.label}</a>
            {/if}
          </li>
        {/each}
      </ol>
    </nav>
  </div>

  <div class="flex items-center gap-3">
    {#if actions}
      {@render actions()}
    {/if}

    <button class="relative rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Notifications">
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      <span class="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive"></span>
    </button>

    <div class="flex items-center gap-2 pl-2 border-l border-border">
      <div class="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
        {user?.name?.charAt(0) || 'A'}
      </div>
      <div class="hidden sm:block">
        <p class="text-sm font-medium leading-none">{user?.name || 'Admin'}</p>
        <p class="text-[10px] text-muted-foreground leading-none mt-0.5">super admin</p>
      </div>
    </div>
  </div>
</header>
