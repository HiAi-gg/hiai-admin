<script lang="ts">
import { enhance } from '$app/forms';
import { onDestroy, untrack } from 'svelte';
import { page } from '$app/state';
import HiAiEditor from '$lib/components/editor/HiAiEditor.svelte';
import MarkdownToggle from '$lib/components/editor/MarkdownToggle.svelte';
import { STATUS_OPTIONS, statusLabel } from '$lib/sites/articles.js';
import type { EditorOutput } from '$lib/components/editor/HiAiEditor.svelte';
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@hiai/ui/components/ui/select/index';

let { data, form } = $props();

const articleId = $derived(page.params.id ?? '');

const article = $derived(data.article);

// Live markdown kept in sync via the editor's onUpdate.
let liveContent = $state(untrack(() => data.article?.content ?? ''));
// Local working values for the form fields. Initialized from server data
// and kept in sync via $effect when the server data changes.
let title = $state(untrack(() => data.article?.title ?? ''));
let slug = $state(untrack(() => data.article?.slug ?? ''));
let status = $state(untrack(() => data.article?.status ?? 'draft'));
let language = $state(untrack(() => data.article?.language ?? 'en'));

// Editor mode: "wysiwyg" (default) or "markdown".
let editorMode = $state<'wysiwyg' | 'markdown'>('wysiwyg');

// Auto-save state — debounced 2s after the last change.
let saving = $state(false);
let lastSavedAt = $state<Date | null>(null);
let autosaveError = $state<string | null>(null);
let hasUnsavedChanges = $state(false);
let initialSnapshot = $state('');
let saveTimer: ReturnType<typeof setTimeout> | null = null;

$effect(() => {
  // Establish a baseline snapshot once we have data.
  const snap = `${title}|${slug}|${status}|${language}|${liveContent}`;
  if (!initialSnapshot) {
    initialSnapshot = snap;
  }
});

function buildSnapshot(t: string, s: string, st: string, l: string, c: string): string {
  return `${t}|${s}|${st}|${l}|${c}`;
}

// Common content languages; free text is allowed for anything else.
const LANGUAGES = ['en', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'zh', 'ja'];

const values = $derived(form?.values ?? article);

// Image upload goes through the site adapter proxy:
// `/api/{slug}/images/upload` (POST FormData with field `image`).
const imageUploadUrl = $derived(`/api/${data.slug}/images/upload`);

function handleEditorUpdate(output: EditorOutput) {
  liveContent = output.markdown;
}

function scheduleAutosave() {
  hasUnsavedChanges = true;
  autosaveError = null;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void performAutosave();
  }, 2000);
}

async function performAutosave() {
  if (data.isNew) {
    // No autosave for the create form — submit explicitly via Save button.
    return;
  }
  const snapshot = buildSnapshot(title, slug, status, language, liveContent);
  if (snapshot === initialSnapshot) {
    hasUnsavedChanges = false;
    return;
  }
  saving = true;
  autosaveError = null;
  try {
    const res = await fetch(`/api/${data.slug}/articles/${articleId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title,
        slug: slug || undefined,
        status,
        language,
        content: liveContent,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Save failed (${res.status})`);
    }
    initialSnapshot = snapshot;
    lastSavedAt = new Date();
    hasUnsavedChanges = false;
  } catch (e) {
    autosaveError = e instanceof Error ? e.message : 'Autosave failed';
  } finally {
    saving = false;
  }
}

// React to any of the tracked fields changing and schedule an autosave.
// `liveContent` is the most common trigger (the editor onUpdate sets it).
$effect(() => {
  // Touch every tracked value so the effect re-runs when any changes.
  const _ = [title, slug, status, language, liveContent];
  // Don't schedule on the first run (when initial values settle in).
  const snapshot = buildSnapshot(title, slug, status, language, liveContent);
  if (snapshot === initialSnapshot) return;
  scheduleAutosave();
});

onDestroy(() => {
  if (saveTimer) clearTimeout(saveTimer);
});

function formattedSavedAt(): string {
  if (!lastSavedAt) return '';
  return lastSavedAt.toLocaleTimeString();
}
</script>

<svelte:head>
  <title>{data.isNew ? 'New article' : 'Edit article'} — {data.slug} — hiai-admin</title>
</svelte:head>

<div class="space-y-6">
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
  {:else if article || data.isNew}
    {#if form?.error}
      <div class="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {form.error}
      </div>
    {/if}

    <div
      class="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
      aria-live="polite"
    >
      <div class="flex items-center gap-3">
        <span>
          {#if saving}
            Saving…
          {:else if autosaveError}
            <span class="text-destructive">{autosaveError}</span>
          {:else if hasUnsavedChanges}
            Unsaved changes — autosaves in 2s
          {:else if lastSavedAt}
            Saved at {formattedSavedAt()}
          {:else if data.isNew}
            Click Save to create this article
          {:else}
            Up to date
          {/if}
        </span>
      </div>
      <div class="inline-flex overflow-hidden rounded-md border">
        <button
          type="button"
          class="px-3 py-1 text-xs {editorMode === 'wysiwyg' ? 'bg-primary text-primary-foreground' : 'bg-background'}"
          onclick={() => (editorMode = 'wysiwyg')}
          aria-pressed={editorMode === 'wysiwyg'}
        >
          WYSIWYG
        </button>
        <button
          type="button"
          class="px-3 py-1 text-xs {editorMode === 'markdown' ? 'bg-primary text-primary-foreground' : 'bg-background'}"
          onclick={() => (editorMode = 'markdown')}
          aria-pressed={editorMode === 'markdown'}
        >
          Markdown
        </button>
      </div>
    </div>

    <form method="POST" action="?/save" use:enhance class="space-y-5">
      <input type="hidden" name="content" value={liveContent} />

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="space-y-1">
          <span class="text-sm font-medium">Title</span>
          <input
            name="title"
            bind:value={title}
            placeholder="Article title"
            class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label class="space-y-1">
          <span class="text-sm font-medium">Slug</span>
          <input
            name="slug"
            bind:value={slug}
            placeholder="article-slug (optional)"
            class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label class="space-y-1">
          <span class="text-sm font-medium">Status</span>
          <SelectRoot type="single" bind:value={status}>
            <SelectTrigger class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {#each STATUS_OPTIONS as s (s)}
                <SelectItem value={s}>{statusLabel(s)}</SelectItem>
              {/each}
            </SelectContent>
          </SelectRoot>
          <input type="hidden" name="status" value={status} />
        </label>
        <label class="space-y-1">
          <span class="text-sm font-medium">Language</span>
          <input
            name="language"
            bind:value={language}
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
        <span class="text-sm font-medium">Content</span>
        <div class="rounded-md border">
          {#if editorMode === 'wysiwyg'}
            <HiAiEditor
              content={liveContent}
              imageUploadUrl={data.isNew ? '' : imageUploadUrl}
              onUpdate={handleEditorUpdate}
            />
          {:else}
            <MarkdownToggle content={liveContent} onUpdate={handleEditorUpdate} />
          {/if}
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
          {data.isNew ? 'Create' : 'Save'}
        </button>
      </div>
    </form>
  {/if}
</div>