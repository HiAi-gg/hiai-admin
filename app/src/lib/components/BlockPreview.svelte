<script lang="ts">
import type { HomepageBlock } from '$lib/sites/homepage.js';

let { block, dark = false }: { block: HomepageBlock; dark?: boolean } = $props();

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

const title = $derived(str(block.data.title));
const subtitle = $derived(str(block.data.subtitle));
const ctaLabel = $derived(str(block.data.ctaLabel));
const text = $derived(str(block.data.text));
const url = $derived(str(block.data.url));
const alt = $derived(str(block.data.alt));
const label = $derived(str(block.data.label));
const avatarUrl = $derived(str(block.data.avatarUrl));
const displayName = $derived(str(block.data.displayName));
const bio = $derived(str(block.data.bio));
const icon = $derived(str(block.data.icon));
const description = $derived(str(block.data.description));

const socialLinks = $derived.by(() => {
  const v = block.data.links;
  if (!Array.isArray(v)) return [] as Array<{ platform: string; url: string }>;
  return v
    .filter(
      (entry): entry is { platform: string; url: string } =>
        !!entry &&
        typeof entry === 'object' &&
        typeof (entry as { platform?: unknown }).platform === 'string' &&
        typeof (entry as { url?: unknown }).url === 'string',
    )
    .map((entry) => ({ platform: entry.platform, url: entry.url }));
});

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}
</script>

<div
  class="pointer-events-none mt-4 rounded-md border border-dashed bg-muted/30 p-2 text-xs"
  class:dark={dark}
  aria-label="Live preview"
>
  <div class="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
    Preview
  </div>

  <div class="mx-auto max-w-xs">
    {#if block.type === 'hero'}
      <div
        class="rounded-md bg-gradient-to-br from-primary/15 to-primary/5 px-3 py-4 text-center"
      >
        <h3 class="text-base font-bold leading-tight">
          {title || 'Hero title'}
        </h3>
        {#if subtitle}
          <p class="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        {/if}
        {#if ctaLabel}
          <span
            class="mt-3 inline-flex items-center rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
          >
            {ctaLabel}
          </span>
        {/if}
      </div>
    {:else if block.type === 'featured'}
      <div class="space-y-1">
        <span
          class="inline-block rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary"
        >
          Featured
        </span>
        <h3 class="text-sm font-semibold">{title || 'Featured title'}</h3>
      </div>
    {:else if block.type === 'text'}
      <p class="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
        {text || 'Text content preview'}
      </p>
    {:else if block.type === 'image'}
      {#if url}
        <img
          src={url}
          alt={alt}
          class="max-h-32 w-full rounded-sm object-cover"
        />
      {:else}
        <div
          class="flex h-24 w-full items-center justify-center rounded-sm bg-muted text-[10px] text-muted-foreground"
        >
          Image
        </div>
      {/if}
      {#if alt}
        <p class="mt-1 text-[10px] italic text-muted-foreground">{alt}</p>
      {/if}
    {:else if block.type === 'cta'}
      <div class="flex justify-center">
        <span
          class="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          {label || 'Button'}
        </span>
      </div>
    {:else if block.type === 'newsletter'}
      <div class="space-y-2 rounded-md border border-border/60 bg-background p-2">
        <h4 class="text-xs font-semibold">{title || 'Newsletter'}</h4>
        <div class="flex gap-1">
          <span
            class="flex-1 rounded-sm border border-input bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground"
          >
            email@example.com
          </span>
          <span
            class="inline-flex items-center rounded-sm bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground"
          >
            Subscribe
          </span>
        </div>
      </div>
    {:else if block.type === 'profile'}
      <div class="flex flex-col items-center gap-2 text-center">
        {#if avatarUrl}
          <img
            src={avatarUrl}
            alt={displayName}
            class="h-12 w-12 rounded-full object-cover"
          />
        {:else}
          <div
            class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary"
          >
            {initial(displayName)}
          </div>
        {/if}
        {#if displayName}
          <p class="text-xs font-semibold">{displayName}</p>
        {/if}
        {#if bio}
          <p class="text-[10px] leading-relaxed text-muted-foreground">{bio}</p>
        {/if}
      </div>
    {:else if block.type === 'link-card'}
      <div class="flex items-center gap-2 rounded-md border border-border/60 bg-background p-2">
        {#if icon}
          <span class="text-base" aria-hidden="true">{icon}</span>
        {/if}
        <div class="min-w-0 flex-1">
          <p class="truncate text-xs font-medium">{label || 'Link label'}</p>
          {#if description}
            <p class="truncate text-[10px] text-muted-foreground">{description}</p>
          {/if}
        </div>
        <span class="text-muted-foreground" aria-hidden="true">→</span>
      </div>
    {:else if block.type === 'social-links'}
      {#if socialLinks.length === 0}
        <p class="text-[10px] text-muted-foreground">No social links yet</p>
      {:else}
        <div class="flex flex-wrap gap-1.5">
          {#each socialLinks as link, i (i)}
            <span
              class="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-0.5 text-[10px]"
            >
              <span class="font-medium">{link.platform}</span>
            </span>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</div>