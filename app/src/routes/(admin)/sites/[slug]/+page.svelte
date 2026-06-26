<script lang="ts">
import type { Article } from '$lib/sites/articles.js';
import OnboardingWizard from '$lib/components/OnboardingWizard.svelte';
import { Globe, Settings, LayoutDashboard } from 'lucide-svelte';

let { data } = $props();

const adapter = $derived(data.adapter);
const settings = $derived(data.settings);
const publicUrl = $derived<string | null>(data.publicUrl ?? null);
const articlesCount = $derived<number | null>(data.articlesCount ?? null);
const blocksCount = $derived<number | null>(data.blocksCount ?? null);
const domainStatus = $derived(data.domainStatus ?? { state: 'none' as const });
const recentArticles = $derived<Article[]>(data.recentArticles ?? []);

// Header display name: settings name (loaded from the site backend) wins over the adapter name.
const siteName = $derived(settings.name || adapter?.name || 'Site');
// Subtitle slug falls back to params-derived slug when the adapter is missing.
const subtitleSlug = $derived(adapter?.slug ?? settings.slug ?? '');
// Show the onboarding wizard only when the site is empty (no homepage blocks yet).
const showOnboarding = $derived(blocksCount === 0);

function formatDate(v: string): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function countDisplay(n: number | null): string {
  return n === null ? '—' : n.toLocaleString();
}

function domainLabel(state: typeof domainStatus): string {
  if (state.state === 'none') return 'No domains';
  if (state.state === 'pending') return 'Pending';
  if (state.state === 'verified') return state.count === 1 ? 'Verified' : `${state.count} verified`;
  return state.count === 1 ? 'Error' : `${state.count} errors`;
}

function domainToneClass(state: typeof domainStatus): string {
  if (state.state === 'verified') return 'text-success';
  if (state.state === 'pending') return 'text-warning';
  if (state.state === 'error') return 'text-destructive';
  return 'text-muted-foreground';
}

const statusBadgeClass = $derived(
  (() => {
    const s = settings.status;
    if (s === 'active') return 'bg-success/10 text-success border-success/20';
    if (s === 'suspended') return 'bg-destructive/10 text-destructive border-destructive/20';
    if (s === 'draft') return 'bg-muted text-muted-foreground border-border';
    if (s === 'inactive') return 'bg-muted text-muted-foreground border-border';
    return 'bg-info/10 text-info border-info/20';
  })(),
);
</script>

<svelte:head>
  <title>{siteName} — hiai-admin</title>
</svelte:head>

<div class="space-y-6">
  {#if data.error}
    <div class="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {data.error}
    </div>
  {/if}

  <!-- Header -->
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div class="min-w-0">
      <h1 class="text-2xl font-bold tracking-tight">{siteName}</h1>
      {#if subtitleSlug}
        <p class="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{subtitleSlug}</code>
          <span
            class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium {statusBadgeClass}"
          >
            {settings.status}
          </span>
        </p>
      {/if}
    </div>
    <div class="flex flex-wrap items-center gap-2">
      {#if publicUrl}
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          <span aria-hidden="true">↗</span>
          View site
        </a>
      {/if}
      {#if adapter}
        <a
          href={`/sites/${adapter.slug}/edit`}
          class="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Edit site
        </a>
      {/if}
      <a
        href="/sites"
        class="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to sites
      </a>
    </div>
  </div>

  <!-- Onboarding wizard (empty sites only) -->
  {#if showOnboarding}
    <OnboardingWizard slug={adapter?.slug ?? subtitleSlug} {siteName} />
  {/if}

  <!-- Stats -->
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <a
      href={adapter ? `/sites/${adapter.slug}/articles` : undefined}
      class="block rounded-md border bg-muted/40 p-4 transition-colors hover:bg-muted/60"
    >
      <div class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Articles</div>
      <div class="mt-1 text-2xl font-semibold">{countDisplay(articlesCount)}</div>
      <div class="mt-1 text-xs text-muted-foreground">Total published + drafts</div>
    </a>
    <a
      href={adapter ? `/sites/${adapter.slug}/homepage` : undefined}
      class="block rounded-md border bg-muted/40 p-4 transition-colors hover:bg-muted/60"
    >
      <div class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Homepage blocks</div>
      <div class="mt-1 text-2xl font-semibold">{countDisplay(blocksCount)}</div>
      <div class="mt-1 text-xs text-muted-foreground">Sections on the homepage</div>
    </a>
    <a
      href={adapter ? `/sites/${adapter.slug}/domain` : undefined}
      class="block rounded-md border bg-muted/40 p-4 transition-colors hover:bg-muted/60"
    >
      <div class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Domain</div>
      <div class="mt-1 text-2xl font-semibold {domainToneClass(domainStatus)}">
        {domainLabel(domainStatus)}
      </div>
      <div class="mt-1 text-xs text-muted-foreground">Verification status</div>
    </a>
    <div class="rounded-md border bg-muted/40 p-4">
      <div class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Site status</div>
      <div class="mt-1 text-2xl font-semibold capitalize">{settings.status}</div>
      <div class="mt-1 text-xs text-muted-foreground">Theme: {settings.theme || 'default'}</div>
    </div>
  </div>

  <!-- Quick Actions + Site Info -->
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
    <div class="rounded-md border bg-muted/40 p-4 lg:col-span-2">
      <h2 class="mb-4 text-sm font-semibold">Quick actions</h2>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {#if adapter}
          <a
            href={`/sites/${adapter.slug}/articles/new`}
            class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
          >
            <span aria-hidden="true">✎</span>
            New article
          </a>
          <a
            href={`/sites/${adapter.slug}/homepage`}
            class="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            <LayoutDashboard class="h-4 w-4" aria-hidden="true" />
            Edit homepage
          </a>
          <a
            href={`/sites/${adapter.slug}/domain`}
            class="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Globe class="h-4 w-4" aria-hidden="true" />
            Manage domain
          </a>
          <a
            href={`/sites/${adapter.slug}/edit`}
            class="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Settings class="h-4 w-4" aria-hidden="true" />
            Site settings
          </a>
        {:else}
          <p class="col-span-2 text-sm text-muted-foreground">Connect a site to enable actions.</p>
        {/if}
      </div>
    </div>
    <div class="rounded-md border bg-muted/40 p-4">
      <h2 class="mb-3 text-sm font-semibold">Site info</h2>
      <dl class="space-y-2 text-sm">
        <div class="flex items-start justify-between gap-3">
          <dt class="shrink-0 text-muted-foreground">Name</dt>
          <dd class="text-right font-medium">{siteName}</dd>
        </div>
        <div class="flex items-start justify-between gap-3">
          <dt class="shrink-0 text-muted-foreground">Slug</dt>
          <dd class="text-right font-mono text-xs">{subtitleSlug || '—'}</dd>
        </div>
        <div class="flex items-start justify-between gap-3">
          <dt class="shrink-0 text-muted-foreground">Status</dt>
          <dd class="text-right">
            <span
              class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium {statusBadgeClass}"
            >
              {settings.status}
            </span>
          </dd>
        </div>
        <div class="flex items-start justify-between gap-3">
          <dt class="shrink-0 text-muted-foreground">Theme</dt>
          <dd class="text-right capitalize">{settings.theme || 'default'}</dd>
        </div>
        <div class="flex items-start justify-between gap-3">
          <dt class="shrink-0 text-muted-foreground">Description</dt>
          <dd class="max-w-[60%] text-right text-muted-foreground">{settings.description || 'No description.'}</dd>
        </div>
      </dl>
    </div>
  </div>

  <!-- Recent Articles -->
  <div class="rounded-md border bg-muted/40 p-4">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-sm font-semibold">Recent articles</h2>
      {#if adapter}
        <a
          href={`/sites/${adapter.slug}/articles`}
          class="text-xs text-primary hover:underline"
        >
          View all →
        </a>
      {/if}
    </div>
    {#if recentArticles.length === 0}
      <div class="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
        No articles yet.
        {#if adapter}
          <a
            href={`/sites/${adapter.slug}/articles/new`}
            class="text-primary hover:underline"
          >
            Create your first article
          </a>
        {/if}
      </div>
    {:else}
      <div class="overflow-x-auto rounded-md border bg-background">
        <table class="w-full text-sm">
          <thead class="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th class="px-4 py-2.5">Title</th>
              <th class="px-4 py-2.5">Status</th>
              <th class="px-4 py-2.5">Updated</th>
              <th class="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {#each recentArticles as article (article.id)}
              <tr class="border-b last:border-0 transition-colors hover:bg-muted/30">
                <td class="px-4 py-2.5 font-medium">{article.title}</td>
                <td class="px-4 py-2.5">
                  <span
                    class={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      article.status === 'published'
                        ? 'bg-success/10 text-success'
                        : article.status === 'draft'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {article.status}
                  </span>
                </td>
                <td class="px-4 py-2.5 text-muted-foreground">{formatDate(article.updatedAt)}</td>
                <td class="px-4 py-2.5 text-right">
                  {#if adapter}
                    <a
                      href={`/sites/${adapter.slug}/articles/${article.id}`}
                      class="text-primary hover:underline"
                    >
                      Open
                    </a>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
