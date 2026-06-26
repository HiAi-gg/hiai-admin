<script lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template
import { enhance } from '$app/forms';
import { untrack } from 'svelte';
// biome-ignore lint/correctness/noUnusedImports: used in template
import { Plus, Sun, Moon } from 'lucide-svelte';
// biome-ignore lint/correctness/noUnusedImports: used in template
import { newBlock, reorder, type BlockType, type HomepageBlock } from '$lib/sites/homepage.js';
// biome-ignore lint/correctness/noUnusedImports: used in template
import { BLOCKS_WITH_META, getBlockMeta } from '$lib/sites/block-meta.js';
// biome-ignore lint/correctness/noUnusedImports: used in template
import BlockPreview from '$lib/components/BlockPreview.svelte';

const SOCIAL_PLATFORMS = [
  'Instagram',
  'Telegram',
  'YouTube',
  'X/Twitter',
  'GitHub',
  'LinkedIn',
  'Facebook',
  'TikTok',
  'Website',
  'Email',
] as const;

type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

interface SocialLink {
  platform: SocialPlatform | string;
  url: string;
}

let { data, form } = $props();

let blocks = $state<HomepageBlock[]>(untrack(() => data.blocks ?? []));
let previewDark = $state(false);
let dragIndex = $state<number | null>(null);
let dropTarget = $state<number | null>(null);

function addBlock(type: BlockType) {
  blocks = [...blocks, newBlock(type)];
}

function deleteBlock(id: string) {
  blocks = blocks.filter((b) => b.id !== id);
}

function updateBlockData(id: string, key: string, value: unknown) {
  blocks = blocks.map((b) => (b.id === id ? { ...b, data: { ...b.data, [key]: value } } : b));
}

function getSocialLinks(block: HomepageBlock): SocialLink[] {
  const v = block.data.links;
  if (!Array.isArray(v)) return [];
  return v.filter(
    (entry): entry is SocialLink =>
      !!entry && typeof entry === 'object' && 'platform' in (entry as object),
  );
}

function setSocialLinks(id: string, links: SocialLink[]) {
  updateBlockData(id, 'links', links);
}

function addSocialLink(id: string) {
  const block = blocks.find((b) => b.id === id);
  if (!block) return;
  const links = [...getSocialLinks(block), { platform: 'Instagram' as SocialPlatform, url: '' }];
  setSocialLinks(id, links);
}

function updateSocialLink(id: string, index: number, key: keyof SocialLink, value: string) {
  const block = blocks.find((b) => b.id === id);
  if (!block) return;
  const links = getSocialLinks(block).map((link, i) =>
    i === index ? { ...link, [key]: value } : link,
  );
  setSocialLinks(id, links);
}

function removeSocialLink(id: string, index: number) {
  const block = blocks.find((b) => b.id === id);
  if (!block) return;
  const links = getSocialLinks(block).filter((_, i) => i !== index);
  setSocialLinks(id, links);
}

function handleDragStart(idx: number, e: DragEvent) {
  dragIndex = idx;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }
}

function handleDragOver(idx: number, e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  dropTarget = idx;
}

function handleDragLeave(idx: number) {
  if (dropTarget === idx) dropTarget = null;
}

function handleDrop(idx: number, e: DragEvent) {
  e.preventDefault();
  const from = dragIndex ?? Number(e.dataTransfer?.getData('text/plain') ?? -1);
  if (from >= 0 && from !== idx) {
    blocks = reorder(blocks, from, idx);
  }
  dragIndex = null;
  dropTarget = null;
}

function handleDragEnd() {
  dragIndex = null;
  dropTarget = null;
}

// Form submission: serialize blocks to JSON for the hidden input.
function handleSubmit() {
  const input = document.querySelector('input[name="blocks"]') as HTMLInputElement | null;
  if (input) {
    input.value = JSON.stringify(blocks);
  }
}
</script>

<svelte:head>
  <title>Homepage — {data.slug} — hiai-admin</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Homepage</h1>
      <p class="text-sm text-muted-foreground">
        {data.slug} · {blocks.length} block{blocks.length === 1 ? '' : 's'}
      </p>
    </div>
    <a href={`/sites/${data.slug}`} class="text-sm text-muted-foreground hover:underline">
      ← Back to site
    </a>
  </div>

  {#if form?.error}
    <div
      class="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {form.error}
    </div>
  {/if}
  {#if form?.success}
    <div
      class="rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm text-success"
    >
      Saved {form.updated} block{form.updated === 1 ? '' : 's'}.
    </div>
  {/if}

  {#if data.error}
    <div
      class="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {data.error}
    </div>
  {/if}

  <!-- Block Selector: icon grid (3 cols desktop, 2 cols mobile) -->
  <!-- Each card is a static preview; the + button (bottom-right) commits the addition. -->
  <div class="rounded-md border bg-muted/40 p-4">
    <div class="mb-3 flex items-center justify-between">
      <div>
        <h2 class="text-sm font-semibold">Add a block</h2>
        <p class="text-xs text-muted-foreground">Pick a block type to append to the page.</p>
      </div>
      <span class="text-xs text-muted-foreground">{BLOCKS_WITH_META.length} types</span>
    </div>
    <div class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {#each BLOCKS_WITH_META as { type, meta } (type)}
        {@const Icon = meta.icon}
        <div
          class="flex flex-col items-start gap-1 rounded-md border border-border/60 bg-background px-2.5 py-3"
        >
          <span
            class="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary"
          >
            <Icon class="h-5 w-5" />
          </span>
          <span class="mt-1 text-xs font-medium leading-none">{meta.label}</span>
          <div class="-mt-0.5 flex items-center gap-1.5 w-full">
            <span
              class="line-clamp-2 text-[11px] leading-snug text-muted-foreground flex-1 min-w-0"
              >{meta.description}</span
            >
            <button
              type="button"
              onclick={() => addBlock(type)}
              class="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition-all hover:border-primary/30 hover:text-primary hover:ring-2 hover:ring-primary/20 hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Add {meta.label} block"
            >
              <Plus class="h-5 w-5" />
            </button>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Preview Theme Toggle -->
  <div class="flex items-center justify-between rounded-md border bg-muted/40 px-4 py-3">
    <div>
      <h2 class="text-sm font-semibold">Preview theme</h2>
      <p class="text-xs text-muted-foreground">
        Switches only the preview area below — your admin theme is unchanged.
      </p>
    </div>
    <div
      class="inline-flex h-8 items-center rounded-md border border-input bg-background p-0.5"
      role="radiogroup"
      aria-label="Preview theme"
    >
      <button
        type="button"
        role="radio"
        aria-checked={!previewDark}
        onclick={() => (previewDark = false)}
        class="inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors {!previewDark
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'}"
      >
        <Sun class="h-3.5 w-3.5" />
        Light
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={previewDark}
        onclick={() => (previewDark = true)}
        class="inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors {previewDark
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'}"
      >
        <Moon class="h-3.5 w-3.5" />
        Dark
      </button>
    </div>
  </div>

  <!-- Blocks Editor -->
  {#if blocks.length === 0}
    <div
      class="rounded-md border border-dashed px-4 py-12 text-center text-sm text-muted-foreground"
    >
      No blocks yet. Add your first block to get started.
    </div>
  {:else}
    <form
      method="POST"
      action="?/save"
      use:enhance
      onsubmit={handleSubmit}
      class="space-y-4"
    >
      <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />

      <div class="space-y-3">
        {#each blocks as block, idx (block.id)}
          {@const blockMeta = getBlockMeta(block.type)}
          {@const BlockIcon = blockMeta.icon}
          <div
            class="rounded-md border bg-muted/40 p-4 transition-colors {dropTarget === idx
              ? 'border-primary ring-2 ring-primary/30'
              : ''} {dragIndex === idx ? 'opacity-60' : ''}"
            draggable="true"
            ondragstart={(e) => handleDragStart(idx, e)}
            ondragover={(e) => handleDragOver(idx, e)}
            ondragleave={() => handleDragLeave(idx)}
            ondrop={(e) => handleDrop(idx, e)}
            ondragend={handleDragEnd}
            role="listitem"
          >
            <!-- Block Header -->
            <div class="mb-4 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span
                  class="cursor-grab select-none text-base text-muted-foreground active:cursor-grabbing"
                  title="Drag to reorder"
                  aria-hidden="true"
                >
                  ⋮⋮
                </span>
                {#if BlockIcon}
                  <span
                    class="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary"
                  >
                    <BlockIcon class="h-3.5 w-3.5" />
                  </span>
                {/if}
                <span class="text-sm font-medium">{blockMeta.label}</span>
                <span class="ml-2 text-xs text-muted-foreground">#{idx + 1}</span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  onclick={() => deleteBlock(block.id)}
                  class="inline-flex h-7 items-center justify-center rounded-md border border-destructive px-2 text-xs text-destructive hover:bg-destructive/10"
                >
                  Delete
                </button>
              </div>
            </div>

            <!-- Block Type-Specific Fields -->
            {#if block.type === 'hero'}
              <div class="grid gap-2 sm:grid-cols-2">
                <label class="space-y-1">
                  <span class="text-xs font-medium">Title</span>
                  <input
                    type="text"
                    value={block.data.title ?? ''}
                    onchange={(e) => updateBlockData(block.id, 'title', e.currentTarget.value)}
                    placeholder="Hero title"
                    class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  />
                </label>
                <label class="space-y-1">
                  <span class="text-xs font-medium">Subtitle (optional)</span>
                  <input
                    type="text"
                    value={block.data.subtitle ?? ''}
                    onchange={(e) => updateBlockData(block.id, 'subtitle', e.currentTarget.value)}
                    placeholder="Subtitle"
                    class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  />
                </label>
                <label class="col-span-2 space-y-1">
                  <span class="text-xs font-medium">CTA Label (optional)</span>
                  <input
                    type="text"
                    value={block.data.ctaLabel ?? ''}
                    onchange={(e) => updateBlockData(block.id, 'ctaLabel', e.currentTarget.value)}
                    placeholder="CTA text"
                    class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  />
                </label>
              </div>
            {:else if block.type === 'featured'}
              <label class="space-y-1">
                <span class="text-xs font-medium">Title</span>
                <input
                  type="text"
                  value={block.data.title ?? ''}
                  onchange={(e) => updateBlockData(block.id, 'title', e.currentTarget.value)}
                  placeholder="Section title"
                  class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                />
              </label>
            {:else if block.type === 'text'}
              <label class="space-y-1">
                <span class="text-xs font-medium">Content</span>
                <textarea
                  value={String(block.data.text ?? '')}
                  onchange={(e) => updateBlockData(block.id, 'text', e.currentTarget.value)}
                  placeholder="Text content"
                  rows={4}
                  class="w-full rounded-md border border-input bg-background p-2 text-xs"
                ></textarea>
              </label>
            {:else if block.type === 'image'}
              <div class="grid gap-2">
                <label class="space-y-1">
                  <span class="text-xs font-medium">Image URL</span>
                  <input
                    type="url"
                    value={block.data.url ?? ''}
                    onchange={(e) => updateBlockData(block.id, 'url', e.currentTarget.value)}
                    placeholder="https://..."
                    class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  />
                </label>
                <label class="space-y-1">
                  <span class="text-xs font-medium">Alt text (optional)</span>
                  <input
                    type="text"
                    value={block.data.alt ?? ''}
                    onchange={(e) => updateBlockData(block.id, 'alt', e.currentTarget.value)}
                    placeholder="Image description"
                    class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  />
                </label>
              </div>
            {:else if block.type === 'cta'}
              <div class="grid gap-2 sm:grid-cols-2">
                <label class="space-y-1">
                  <span class="text-xs font-medium">Label</span>
                  <input
                    type="text"
                    value={block.data.label ?? ''}
                    onchange={(e) => updateBlockData(block.id, 'label', e.currentTarget.value)}
                    placeholder="Button text"
                    class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  />
                </label>
                <label class="space-y-1">
                  <span class="text-xs font-medium">Href</span>
                  <input
                    type="text"
                    value={block.data.href ?? ''}
                    onchange={(e) => updateBlockData(block.id, 'href', e.currentTarget.value)}
                    placeholder="/contact or https://..."
                    class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  />
                </label>
              </div>
            {:else if block.type === 'newsletter'}
              <label class="space-y-1">
                <span class="text-xs font-medium">Title</span>
                <input
                  type="text"
                  value={block.data.title ?? ''}
                  onchange={(e) => updateBlockData(block.id, 'title', e.currentTarget.value)}
                  placeholder="Newsletter section title"
                  class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                />
              </label>
            {:else if block.type === 'profile'}
              <div class="grid gap-2 sm:grid-cols-2">
                <label class="space-y-1 sm:col-span-2">
                  <span class="text-xs font-medium">Avatar URL</span>
                  <input
                    type="url"
                    value={block.data.avatarUrl ?? ''}
                    onchange={(e) =>
                      updateBlockData(block.id, 'avatarUrl', e.currentTarget.value)}
                    placeholder="https://..."
                    class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  />
                </label>
                <label class="space-y-1 sm:col-span-2">
                  <span class="text-xs font-medium">Display Name</span>
                  <input
                    type="text"
                    value={block.data.displayName ?? ''}
                    onchange={(e) =>
                      updateBlockData(block.id, 'displayName', e.currentTarget.value)}
                    placeholder="Your name"
                    class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  />
                </label>
                <label class="space-y-1 sm:col-span-2">
                  <span class="text-xs font-medium">Bio</span>
                  <textarea
                    value={String(block.data.bio ?? '')}
                    onchange={(e) => updateBlockData(block.id, 'bio', e.currentTarget.value)}
                    placeholder="A short bio"
                    rows={3}
                    class="w-full rounded-md border border-input bg-background p-2 text-xs"
                  ></textarea>
                </label>
              </div>
            {:else if block.type === 'link-card'}
              <div class="grid gap-2 sm:grid-cols-2">
                <label class="space-y-1">
                  <span class="text-xs font-medium">Label</span>
                  <input
                    type="text"
                    value={block.data.label ?? ''}
                    onchange={(e) => updateBlockData(block.id, 'label', e.currentTarget.value)}
                    placeholder="Link label"
                    class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  />
                </label>
                <label class="space-y-1">
                  <span class="text-xs font-medium">URL</span>
                  <input
                    type="url"
                    value={block.data.url ?? ''}
                    onchange={(e) => updateBlockData(block.id, 'url', e.currentTarget.value)}
                    placeholder="https://..."
                    class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  />
                </label>
                <label class="space-y-1">
                  <span class="text-xs font-medium">Icon (optional)</span>
                  <input
                    type="text"
                    value={block.data.icon ?? ''}
                    onchange={(e) => updateBlockData(block.id, 'icon', e.currentTarget.value)}
                    placeholder="emoji or icon name"
                    class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  />
                </label>
                <label class="space-y-1">
                  <span class="text-xs font-medium">Description (optional)</span>
                  <input
                    type="text"
                    value={block.data.description ?? ''}
                    onchange={(e) =>
                      updateBlockData(block.id, 'description', e.currentTarget.value)}
                    placeholder="Short description"
                    class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  />
                </label>
              </div>
            {:else if block.type === 'social-links'}
              {@const links = getSocialLinks(block)}
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium">Links</span>
                  <button
                    type="button"
                    onclick={() => addSocialLink(block.id)}
                    class="inline-flex h-7 items-center rounded-md border px-2 text-xs hover:bg-muted"
                  >
                    + Add link
                  </button>
                </div>
                {#if links.length === 0}
                  <p class="text-xs text-muted-foreground">
                    No links yet. Click "+ Add link" to add one.
                  </p>
                {/if}
                {#each links as link, linkIdx (linkIdx)}
                  <div class="grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
                    <select
                      value={link.platform}
                      onchange={(e) =>
                        updateSocialLink(block.id, linkIdx, 'platform', e.currentTarget.value)}
                      class="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {#each SOCIAL_PLATFORMS as platform (platform)}
                        <option value={platform}>{platform}</option>
                      {/each}
                    </select>
                    <input
                      type="url"
                      value={link.url}
                      onchange={(e) =>
                        updateSocialLink(block.id, linkIdx, 'url', e.currentTarget.value)}
                      placeholder="https://..."
                      class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                    />
                    <button
                      type="button"
                      onclick={() => removeSocialLink(block.id, linkIdx)}
                      class="inline-flex h-8 items-center justify-center rounded-md border border-destructive px-2 text-xs text-destructive hover:bg-destructive/10"
                    >
                      Remove
                    </button>
                  </div>
                {/each}
              </div>
            {/if}

            <BlockPreview {block} dark={previewDark} />
          </div>
        {/each}
      </div>

      <div class="flex justify-end gap-3">
        <a
          href={`/sites/${data.slug}`}
          class="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
        >
          Cancel
        </a>
        <button
          type="submit"
          class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-hover"
        >
          Save All Blocks
        </button>
      </div>
    </form>
  {/if}
</div>
