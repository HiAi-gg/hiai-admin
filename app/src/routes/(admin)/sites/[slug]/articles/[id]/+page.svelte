<script lang="ts">
import { enhance } from '$app/forms';
import { untrack } from 'svelte';
import TipexEditor from '@hiai/ui/components/editor/TipexEditor.svelte';
import { STATUS_OPTIONS, statusLabel } from '$lib/sites/articles.js';
import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

let { data, form } = $props();

const article = $derived(data.article);

const breadcrumbs = $derived([
  { label: 'Sites', href: '/sites' },
  { label: data.slug, href: `/sites/${data.slug}` },
  { label: 'Articles', href: `/sites/${data.slug}/articles` },
  { label: data.isNew ? 'New' : (article?.title ?? 'New') },
]);

// Live markdown (kept in sync via the editor's onUpdate) — submitted via the hidden field.
let liveContent = $state(untrack(() => data.article?.content ?? ''));
// What we hand to the editor's `content` prop; only changed on explicit inserts (image upload),
// not on every keystroke, so typing never round-trips through setContent.
let editorContent = $state(untrack(() => data.article?.content ?? ''));

let uploading = $state(false);
let uploadError = $state<string | undefined>(undefined);

async function uploadImage(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  uploading = true;
  uploadError = undefined;
  try {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('site', data.slug);
    const res = await fetch(`/api/${data.slug}/images/upload`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
    const body = await res.json();
    const url = body.url ?? body.location ?? body.data?.url;
    if (!url) throw new Error('Upload response had no URL');
    const snippet = `\n\n![${file.name}](${url})\n`;
    editorContent = `${liveContent}${snippet}`;
  } catch (e) {
    uploadError = e instanceof Error ? e.message : 'Upload failed';
  } finally {
    uploading = false;
    input.value = '';
  }
}

// Common content languages; free text is allowed for anything else.
const LANGUAGES = ['en', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'zh', 'ja'];

const values = $derived(form?.values ?? article);
</script>

<svelte:head>
  <title>{data.isNew ? 'New article' : 'Edit article'} — {data.slug} — hiai-admin</title>
</svelte:head>

<div class="space-y-6">
  <Breadcrumbs items={breadcrumbs} />

  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">{data.isNew ? 'New article' : 'Edit article'}</h1>
      <p class="text-sm text-muted-foreground">{data.slug}</p>
    </div>
    <a href={`/sites/${data.slug}/articles`} class="text-sm text-muted-foreground hover:underline">
      ← Back to articles
    </a>
  </div>

  {#if data.error}
    <div class="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {data.error}
    </div>
  {:else if article}
    {#if form?.error}
      <div class="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {form.error}
      </div>
    {/if}

    <form method="POST" action="?/save" use:enhance class="space-y-5">
      <input type="hidden" name="content" value={liveContent} />

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="space-y-1">
          <span class="text-sm font-medium">Title</span>
          <input
            name="title"
            value={values?.title ?? ''}
            placeholder="Article title"
            class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label class="space-y-1">
          <span class="text-sm font-medium">Slug</span>
          <input
            name="slug"
            value={values?.slug ?? ''}
            placeholder="article-slug (optional)"
            class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label class="space-y-1">
          <span class="text-sm font-medium">Status</span>
          <select
            name="status"
            value={values?.status ?? 'draft'}
            class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            {#each STATUS_OPTIONS as s (s)}
              <option value={s}>{statusLabel(s)}</option>
            {/each}
          </select>
        </label>
        <label class="space-y-1">
          <span class="text-sm font-medium">Language</span>
          <input
            name="language"
            value={values?.language ?? 'en'}
            list="article-languages"
            class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm uppercase shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <datalist id="article-languages">
            {#each LANGUAGES as l (l)}
              <option value={l}></option>
            {/each}
          </datalist>
        </label>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">Content</span>
          <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            {uploading ? 'Uploading…' : '🖼 Insert image'}
            <input type="file" accept="image/*" class="hidden" onchange={uploadImage} disabled={uploading} />
          </label>
        </div>
        {#if uploadError}
          <p class="text-xs text-destructive">{uploadError}</p>
        {/if}
        <div class="rounded-md border">
          <TipexEditor content={editorContent} onUpdate={(md) => (liveContent = md)} />
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <a
          href={`/sites/${data.slug}/articles`}
          class="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
        >
          Cancel
        </a>
        <button
          type="submit"
          class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-hover"
        >
          Save
        </button>
      </div>
    </form>
  {/if}
</div>
