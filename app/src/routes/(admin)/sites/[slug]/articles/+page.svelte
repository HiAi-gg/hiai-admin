<script lang="ts">
import { enhance } from '$app/forms';
import { STATUS_OPTIONS, statusLabel, type Article } from '$lib/sites/articles.js';
import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

let { data, form } = $props();

const breadcrumbs = $derived([
  { label: 'Sites', href: '/sites' },
  { label: data.slug, href: `/sites/${data.slug}` },
  { label: 'Articles' },
]);

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

const statusClasses: Record<string, string> = {
  published: 'bg-green-500/10 text-green-600 dark:text-green-400',
  draft: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  archived: 'bg-muted text-muted-foreground',
};
</script>

<svelte:head>
  <title>Articles — {data.slug} — hiai-admin</title>
</svelte:head>

<div class="space-y-6">
  <Breadcrumbs items={breadcrumbs} />

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
    <div class="rounded-md border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
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
            <th class="px-4 py-3">Updated</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {#each articles as article (article.id)}
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
              <td class="px-4 py-3 uppercase text-muted-foreground">{article.language}</td>
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
