<script lang="ts">
import type { Snippet } from 'svelte';
import { PageHeader } from '@hiai/ui';

interface Tab {
  value: string;
  label: string;
  href?: string;
}

interface Props {
  title: string;
  description?: string;
  /** Page-level path shown in the corner (e.g. "/shop/products"). */
  path?: string;
  /** Optional tabs rendered between the header and the content. */
  tabs?: Tab[];
  /** Currently active tab value (controls highlight when no `href` is set). */
  activeTab?: string;
  /** Right-aligned actions in the header. */
  actions?: Snippet;
  /** Error message rendered as a destructive banner above the content. */
  error?: string | null;
  /** Main content slot. */
  children?: Snippet;
  class?: string;
}

const {
  title,
  description,
  path,
  tabs,
  activeTab,
  actions,
  error,
  children,
  class: className,
}: Props = $props();
</script>

<svelte:head>
  <title>{title} — hiai-admin</title>
</svelte:head>

<div class={`space-y-6 ${className ?? ''}`}>
  <PageHeader {title} {description}>
    {#snippet actions()}
      {#if path}
        <span class="text-xs text-muted-foreground font-mono">{path}</span>
      {/if}
      {#if actions}
        {@render actions()}
      {/if}
    {/snippet}
  </PageHeader>

  {#if tabs && tabs.length > 0}
    <div class="border-b border-border">
      <nav class="-mb-px flex gap-4 overflow-x-auto" aria-label="Module sections">
        {#each tabs as tab (tab.value)}
          {#if tab.href}
            <a
              href={tab.href}
              class="whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-medium transition-colors {activeTab === tab.value
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'}"
              aria-current={activeTab === tab.value ? 'page' : undefined}
            >
              {tab.label}
            </a>
          {:else}
            <button
              type="button"
              class="whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-medium transition-colors {activeTab === tab.value
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'}"
              aria-current={activeTab === tab.value ? 'page' : undefined}
            >
              {tab.label}
            </button>
          {/if}
        {/each}
      </nav>
    </div>
  {/if}

  {#if error}
    <div
      class="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
      role="alert"
    >
      {error}
    </div>
  {/if}

  {#if children}
    {@render children()}
  {/if}
</div>
