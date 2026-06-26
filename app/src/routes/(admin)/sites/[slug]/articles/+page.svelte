<script lang="ts">
import { enhance } from '$app/forms';
import { STATUS_OPTIONS, statusLabel, type Article } from '$lib/sites/articles.js';
import { Eye } from 'lucide-svelte';

let { data, form } = $props();

const articles = $derived<Article[]>(data.articles ?? []);
let selected = $state<Set<string>>(new Set());
let bulkStatus = $state<(typeof STATUS_OPTIONS)[number]>('published');

const allSelected = $derived(articles.length > 0 && selected.size === articles.length);
const selectedIds = $derived([...selected]);

function toggleAll() {
  selected = allSelected ? new Set() : new Set(articles.map((a) => a.id));
}

function toggleOne(id: string) {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selected = next;
}

function formatDate(v: string): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function formatViews(n: number | null | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

/**
 * Backend today returns a single `language` string per article. Forward-compatible:
 * if a future backend supplies an array (e.g. via `languages` / `translations`),
 * we render first 2 as badges + "+N more" popover with the rest.
 */
type ArticleLike = Article & {
  languages?: string[];
  translations?: string[];
  views?: number | null;
  viewCount?: number | null;
};

function getLanguages(article: ArticleLike): string[] {
  const candidates: unknown[] = [
    (article as { languages?: unknown }).languages,
    (article as { translations?: unknown }).translations,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) {
      const arr = c.filter((x): x is string => typeof x === 'string' && x.length > 0);
      if (arr.length > 0) return arr;
    }
  }
  // Fallback to the single-language field shipped today.
  return article.language ? [article.language] : [];
}

function getViews(article: ArticleLike): number | null {
  const v =
    (article as { views?: unknown }).views ?? (article as { viewCount?: unknown }).viewCount;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

const statusClasses: Record<string, string> = {
  published: 'bg-success/10 text-success',
  draft: 'bg-warning/10 text-warning',
  archived: 'bg-muted text-muted-foreground',
};
</script>

<svelte:head>
  <title>Articles — {data.slug} — hiai-admin</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Articles</h1>
      <p class="text-sm text-muted-foreground">
        {data.slug}
        {#if data.draftCount !== null}· {data.draftCount} draft{data.draftCount === 1 ? '' : 's'}{/if}
      </p>
    </div>
    <a
      href={`/sites/${data.slug}/articles/new`}
      class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
    >
      + New article
    </a>
  </div>

  {#if form?.error}
    <div class="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {form.error}
    </div>
  {/if}
  {#if form?.success}
    <div class="rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
      Updated {form.updated} article{form.updated === 1 ? '' : 's'} → {statusLabel(form.status)}.
    </div>
  {/if}

  {#if data.error}
    <div class="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {data.error}
    </div>
  {:else if articles.length === 0}
    <div class="rounded-md border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
      No articles yet. Create the first one.
    </div>
  {:else}
    {#if selected.size > 0}
      <form
        method="POST"
        action="?/bulkStatus"
        use:enhance={() => {
          return async ({ update }) => {
            selected = new Set();
            await update();
          };
        }}
        class="flex items-center gap-3 rounded-md border bg-muted/40 px-4 py-2 text-sm"
      >
        <span class="font-medium">{selected.size} selected</span>
        {#each selectedIds as id (id)}
          <input type="hidden" name="ids" value={id} />
        {/each}
        <label class="flex items-center gap-2">
          Set status
          <select
            name="status"
            bind:value={bulkStatus}
            class="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            {#each STATUS_OPTIONS as s (s)}
              <option value={s}>{statusLabel(s)}</option>
            {/each}
          </select>
        </label>
        <button
          type="submit"
          class="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          Apply
        </button>
      </form>
    {/if}

    <div class="overflow-x-auto rounded-md border">
      <table class="w-full text-sm">
        <thead class="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th class="w-10 px-4 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onchange={toggleAll}
                aria-label="Select all articles"
              />
            </th>
            <th class="px-4 py-3">Title</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Language</th>
            <th class="px-4 py-3">Views</th>
            <th class="px-4 py-3">Updated</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {#each articles as article (article.id)}
            {@const articleEx = article as ArticleLike}
            {@const langs = getLanguages(articleEx)}
            {@const visibleLangs = langs.slice(0, 2)}
            {@const extraLangs = langs.slice(2)}
            {@const views = getViews(articleEx)}
            <tr class="border-b last:border-0 hover:bg-muted/30">
              <td class="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.has(article.id)}
                  onchange={() => toggleOne(article.id)}
                  aria-label={`Select ${article.title}`}
                />
              </td>
              <td class="px-4 py-3 font-medium">{article.title}</td>
              <td class="px-4 py-3">
                <span class={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses[article.status] ?? statusClasses.archived}`}>
                  {statusLabel(article.status)}
                </span>
              </td>
              <td class="px-4 py-3">
                {#if langs.length === 0}
                  <span class="text-muted-foreground">—</span>
                {:else}
                  <div class="flex flex-wrap items-center gap-1">
                    {#each visibleLangs as lang (lang)}
                      <span
                        class="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground/80"
                      >
                        {lang}
                      </span>
                    {/each}
                    {#if extraLangs.length > 0}
                      <div class="group relative">
                        <button
                          type="button"
                          class="inline-flex cursor-pointer items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20"
                          aria-label={`Show ${extraLangs.length} more languages`}
                        >
                          +{extraLangs.length} more
                        </button>
                        <div
                          class="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-40 rounded-md border bg-popover p-2 text-xs text-popover-foreground shadow-md group-hover:block group-focus-within:block"
                          role="tooltip"
                        >
                          <div class="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
                            All languages
                          </div>
                          <div class="flex flex-wrap gap-1">
                            {#each langs as lang (lang)}
                              <span
                                class="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                              >
                                {lang}
                              </span>
                            {/each}
                          </div>
                        </div>
                      </div>
                    {/if}
                  </div>
                {/if}
              </td>
              <td class="px-4 py-3">
                {#if views === null}
                  <span class="text-muted-foreground">—</span>
                {:else}
                  <span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye class="h-3 w-3" aria-hidden="true" />
                    <span class="font-medium text-foreground/80 tabular-nums">{formatViews(views)}</span>
                  </span>
                {/if}
              </td>
              <td class="px-4 py-3 text-muted-foreground">{formatDate(article.updatedAt)}</td>
              <td class="px-4 py-3 text-right">
                <a
                  href={`/sites/${data.slug}/articles/${article.id}`}
                  class="text-primary hover:underline"
                >
                  Edit
                </a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
