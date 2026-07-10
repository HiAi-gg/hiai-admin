<!-- EditorToolbar.svelte — Formatting toolbar for HiAiEditor (TipTap) -->
<script lang="ts">
import type { Editor } from '@tiptap/core';
// biome-ignore lint/style/useImportType: Bold is used as a value in the Svelte template
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Smile,
  Table as TableIcon,
  Type,
  Underline,
  Undo,
  Redo,
} from 'lucide-svelte';
import LinkDialog from './LinkDialog.svelte';
import * as DropdownMenu from '@hiai/ui/components/ui/dropdown-menu/index';
import * as Popover from '@hiai/ui/components/ui/popover/index';

const {
  editor = null,
  documentId = '',
  imageUploadUrl = '',
}: {
  editor?: Editor | null;
  documentId?: string;
  imageUploadUrl?: string;
} = $props();

// 8 preset highlight colors, keyed to the swatches shown in the popover.
const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#fde68a' },
  { name: 'Orange', value: '#fed7aa' },
  { name: 'Red', value: '#fecaca' },
  { name: 'Green', value: '#bbf7d0' },
  { name: 'Blue', value: '#bfdbfe' },
  { name: 'Purple', value: '#e9d5ff' },
  { name: 'Pink', value: '#fbcfe8' },
  { name: 'Gray', value: '#e5e7eb' },
] as const;

type HighlightColor = (typeof HIGHLIGHT_COLORS)[number]['value'];

// Curated list of common emojis shown in the picker popover.
const EMOJIS = [
  '😀',
  '😂',
  '😍',
  '🤔',
  '😎',
  '😢',
  '😡',
  '🥳',
  '👍',
  '👏',
  '🙏',
  '🔥',
  '⭐',
  '✅',
  '❌',
  '❤️',
  '🎉',
  '💡',
  '📌',
  '🚀',
] as const;

type TextAlignValue = 'left' | 'center' | 'right' | 'justify';

// Open state for controlled popovers (highlight, emoji, table).
let linkDialogOpen = $state(false);
let highlightPickerOpen = $state(false);
let emojiPickerOpen = $state(false);
let tablePickerOpen = $state(false);
// Hovered cell extent in the table size-picker grid (1-based; 0 = none).
let tableHoverRows = $state(0);
let tableHoverCols = $state(0);

// TipTap mutates its internal state during transactions but doesn't bump
// Svelte's reactive graph, so template calls to `editor.isActive(...)` would
// only re-evaluate when something *else* in the script changes. We track a
// monotonic revision counter on selection/mark changes and read it from
// deriveds/template expressions so the toolbar re-renders in sync.
let editorRevision = $state(0);
const readEditorRevision = $derived(editorRevision);

$effect(() => {
  if (!editor) return;
  const bump = () => {
    editorRevision++;
  };
  editor.on('selectionUpdate', bump);
  editor.on('transaction', bump);
  return () => {
    editor.off('selectionUpdate', bump);
    editor.off('transaction', bump);
  };
});

// Active-state snapshot for the current selection.
type ActiveStates = Partial<Record<string, boolean>>;
const activeStates = $derived.by<ActiveStates>(() => {
  void readEditorRevision;
  if (!editor) return {};
  return {
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    underline: editor.isActive('underline'),
    heading1: editor.isActive('heading', { level: 1 }),
    heading2: editor.isActive('heading', { level: 2 }),
    heading3: editor.isActive('heading', { level: 3 }),
    bulletList: editor.isActive('bulletList'),
    orderedList: editor.isActive('orderedList'),
    taskList: editor.isActive('taskList'),
    blockquote: editor.isActive('blockquote'),
    codeBlock: editor.isActive('codeBlock'),
    link: editor.isActive('link'),
    highlight: editor.isActive('highlight'),
    alignLeft: editor.isActive({ textAlign: 'left' }),
    alignCenter: editor.isActive({ textAlign: 'center' }),
    alignRight: editor.isActive({ textAlign: 'right' }),
    alignJustify: editor.isActive({ textAlign: 'justify' }),
  };
});

const activeHeadingLevel = $derived.by<1 | 2 | 3 | null>(() => {
  void readEditorRevision;
  if (!editor) return null;
  if (editor.isActive('heading', { level: 1 })) return 1;
  if (editor.isActive('heading', { level: 2 })) return 2;
  if (editor.isActive('heading', { level: 3 })) return 3;
  return null;
});

const activeAlignment = $derived.by<TextAlignValue>(() => {
  void readEditorRevision;
  if (!editor) return 'left';
  if (editor.isActive({ textAlign: 'center' })) return 'center';
  if (editor.isActive({ textAlign: 'right' })) return 'right';
  if (editor.isActive({ textAlign: 'justify' })) return 'justify';
  return 'left';
});

const activeHighlightColor = $derived.by<HighlightColor | null>(() => {
  if (!editor) return null;
  void readEditorRevision;
  if (!editor.isActive('highlight')) return null;
  const attrs = editor.getAttributes('highlight');
  const color = (attrs.color ?? '') as string;
  const match = HIGHLIGHT_COLORS.find((c) => c.value === color);
  return (match?.value as HighlightColor) ?? null;
});

function isDisabled(): boolean {
  if (!editor) return true;
  return !editor.isEditable;
}

function applyHighlight(color: HighlightColor) {
  if (!editor) return;
  editor.chain().focus().toggleHighlight({ color }).run();
  highlightPickerOpen = false;
}

function clearHighlight() {
  if (!editor) return;
  editor.chain().focus().unsetHighlight().run();
  highlightPickerOpen = false;
}

function insertEmoji(emoji: string) {
  if (!editor) return;
  editor.chain().focus().insertContent(emoji).run();
  emojiPickerOpen = false;
}

const TABLE_GRID_MAX = 8;

function insertTable(rows: number, cols: number) {
  if (!editor) return;
  editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
  tablePickerOpen = false;
}

function applyHeading(level: 1 | 2 | 3 | null) {
  if (!editor) return;
  if (level === null) {
    editor.chain().focus().setParagraph().run();
  } else {
    editor.chain().focus().toggleHeading({ level }).run();
  }
}

function applyList(kind: 'bullet' | 'ordered' | 'task') {
  if (!editor) return;
  if (kind === 'bullet') {
    editor.chain().focus().toggleBulletList().run();
  } else if (kind === 'ordered') {
    editor.chain().focus().toggleOrderedList().run();
  } else {
    editor.chain().focus().toggleTaskList().run();
  }
}

function toggleBlockquote() {
  if (!editor) return;
  editor.chain().focus().toggleBlockquote().run();
}

function insertHorizontalRule() {
  if (!editor) return;
  editor.chain().focus().setHorizontalRule().run();
}

function applyAlignment(value: TextAlignValue) {
  if (!editor) return;
  editor.chain().focus().setTextAlign(value).run();
}

function undo() {
  if (!editor) return;
  editor.chain().focus().undo().run();
}

function redo() {
  if (!editor) return;
  editor.chain().focus().redo().run();
}

// --- Image upload state ---
let imageFileInput = $state<HTMLInputElement | null>(null);
let imageUploading = $state(false);
let imageError = $state<string | null>(null);

function formatMegabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function triggerImageUpload() {
  if (imageUploading) return;
  imageError = null;
  imageFileInput?.click();
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

async function handleImageSelected(event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  // Always reset the input so the same file can be re-selected.
  input.value = '';
  if (!file || !editor) return;

  if (!isImageFile(file)) {
    imageError = 'Only image files are supported';
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    imageError = `File too large (${formatMegabytes(file.size)})`;
    return;
  }
  if (!imageUploadUrl) {
    imageError = 'Image upload endpoint not configured';
    return;
  }

  imageUploading = true;
  imageError = null;
  try {
    const fd = new FormData();
    fd.append('image', file);
    if (documentId) fd.append('documentId', documentId);
    const res = await fetch(imageUploadUrl, { method: 'POST', body: fd });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
    const body = await res.json();
    const url: string | undefined = body.url ?? body.location ?? body.data?.url;
    if (!url) throw new Error('Upload response had no URL');
    editor.chain().focus().setImage({ src: url, alt: file.name }).run();
  } catch (err) {
    imageError = err instanceof Error ? err.message : 'Upload failed';
  } finally {
    imageUploading = false;
  }
}
</script>

{#if editor}
	<div class="toolbar" role="toolbar" aria-label="Editor formatting toolbar">
		<!-- Undo / Redo -->
		<button
			class="toolbar-btn"
			disabled={isDisabled()}
			onclick={undo}
			title="Undo"
			aria-label="Undo"
			type="button"
		>
			<Undo size={16} />
		</button>
		<button
			class="toolbar-btn"
			disabled={isDisabled()}
			onclick={redo}
			title="Redo"
			aria-label="Redo"
			type="button"
		>
			<Redo size={16} />
		</button>

		<div class="toolbar-divider" aria-hidden="true"></div>

		<!-- Inline marks -->
		<button
			class="toolbar-btn"
			class:active={activeStates.bold ?? false}
			disabled={isDisabled()}
			onclick={() => editor?.chain().focus().toggleBold().run()}
			title="Bold"
			aria-label="Bold"
			aria-pressed={activeStates.bold ?? false}
			type="button"
		>
			<Bold size={16} />
		</button>
		<button
			class="toolbar-btn"
			class:active={activeStates.italic ?? false}
			disabled={isDisabled()}
			onclick={() => editor?.chain().focus().toggleItalic().run()}
			title="Italic"
			aria-label="Italic"
			aria-pressed={activeStates.italic ?? false}
			type="button"
		>
			<Italic size={16} />
		</button>
		<button
			class="toolbar-btn"
			class:active={activeStates.underline ?? false}
			disabled={isDisabled()}
			onclick={() => editor?.chain().focus().toggleUnderline().run()}
			title="Underline"
			aria-label="Underline"
			aria-pressed={activeStates.underline ?? false}
			type="button"
		>
			<Underline size={16} />
		</button>

		<div class="toolbar-divider" aria-hidden="true"></div>

		<!-- Heading dropdown -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child(triggerProps)}
					<button
						{...triggerProps.props}
						class="toolbar-btn dropdown-trigger"
						class:active={activeHeadingLevel !== null}
						disabled={isDisabled()}
						title="Heading"
						aria-label="Heading"
						type="button"
					>
						{#if activeHeadingLevel !== null}
							<Heading1 size={16} />
						{:else}
							<Type size={16} />
						{/if}
						<ChevronDown size={14} class="dropdown-chevron" />
					</button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start">
				<DropdownMenu.Item onclick={() => applyHeading(null)}>
					<Type size={16} />
					<span>Paragraph</span>
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => applyHeading(1)}>
					<Heading1 size={16} />
					<span>Heading 1</span>
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => applyHeading(2)}>
					<Heading2 size={16} />
					<span>Heading 2</span>
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => applyHeading(3)}>
					<Heading3 size={16} />
					<span>Heading 3</span>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<div class="toolbar-divider" aria-hidden="true"></div>

		<!-- List dropdown -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child(triggerProps)}
					<button
						{...triggerProps.props}
						class="toolbar-btn dropdown-trigger"
						class:active={(activeStates.bulletList ?? false) || (activeStates.orderedList ?? false)}
						disabled={isDisabled()}
						title="List"
						aria-label="List"
						type="button"
					>
						<List size={16} />
						<ChevronDown size={14} class="dropdown-chevron" />
					</button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start">
				<DropdownMenu.Item onclick={() => applyList("bullet")}>
					<List size={16} />
					<span>Bullet list</span>
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => applyList("ordered")}>
					<ListOrdered size={16} />
					<span>Ordered list</span>
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => applyList("task")}>
					<ListChecks size={16} />
					<span>Task list</span>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<div class="toolbar-divider" aria-hidden="true"></div>

		<!-- Block marks -->
		<button
			class="toolbar-btn"
			class:active={activeStates.codeBlock ?? false}
			disabled={isDisabled()}
			onclick={() => editor?.chain().focus().toggleCodeBlock().run()}
			title="Code block"
			aria-label="Code block"
			aria-pressed={activeStates.codeBlock ?? false}
			type="button"
		>
			<Code2 size={16} />
		</button>
		<button
			class="toolbar-btn"
			class:active={activeStates.blockquote ?? false}
			disabled={isDisabled()}
			onclick={toggleBlockquote}
			title="Quote"
			aria-label="Quote"
			aria-pressed={activeStates.blockquote ?? false}
			type="button"
		>
			<Quote size={16} />
		</button>
		<button
			class="toolbar-btn"
			disabled={isDisabled()}
			onclick={insertHorizontalRule}
			title="Horizontal rule"
			aria-label="Horizontal rule"
			type="button"
		>
			<Minus size={16} />
		</button>
		<button
			class="toolbar-btn"
			class:active={activeStates.link ?? false}
			disabled={isDisabled()}
			onclick={() => (linkDialogOpen = true)}
			title="Link"
			aria-label="Link"
			aria-pressed={activeStates.link ?? false}
			type="button"
		>
			<LinkIcon size={16} />
		</button>

		<div class="toolbar-divider" aria-hidden="true"></div>

		<!-- Highlight color picker -->
		<Popover.Root bind:open={highlightPickerOpen}>
			<Popover.Trigger>
				{#snippet child(triggerProps)}
					<button
						{...triggerProps.props}
						class="toolbar-btn highlight-btn"
						class:active={activeStates.highlight ?? false}
						disabled={isDisabled()}
						title="Highlight"
						aria-label="Highlight"
						type="button"
					>
						<Highlighter size={16} />
						<span
							class="highlight-dot"
							class:visible={activeHighlightColor !== null}
							style:background-color={activeHighlightColor ?? "transparent"}
							aria-hidden="true"
						></span>
					</button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="min-w-[180px] p-2" align="start">
				<div class="highlight-swatch-grid">
					{#each HIGHLIGHT_COLORS as color (color.value)}
						<button
							type="button"
							class="highlight-swatch"
							class:selected={activeHighlightColor === color.value}
							style:background-color={color.value}
							title={color.name}
							aria-label={color.name}
							onclick={() => applyHighlight(color.value)}
						></button>
					{/each}
				</div>
				{#if activeHighlightColor !== null}
					<button
						type="button"
						class="highlight-clear"
						onclick={clearHighlight}
					>
						Clear
					</button>
				{/if}
			</Popover.Content>
		</Popover.Root>

		<div class="toolbar-divider" aria-hidden="true"></div>

		<!-- Align dropdown -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child(triggerProps)}
					<button
						{...triggerProps.props}
						class="toolbar-btn dropdown-trigger"
						class:active={activeAlignment !== "left"}
						disabled={isDisabled()}
						title="Align"
						aria-label="Align"
						type="button"
					>
						{#if activeAlignment === "center"}
							<AlignCenter size={16} />
						{:else if activeAlignment === "right"}
							<AlignRight size={16} />
						{:else if activeAlignment === "justify"}
							<AlignJustify size={16} />
						{:else}
							<AlignLeft size={16} />
						{/if}
						<ChevronDown size={14} class="dropdown-chevron" />
					</button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start">
				<DropdownMenu.Item onclick={() => applyAlignment("left")}>
					<AlignLeft size={16} />
					<span>Align left</span>
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => applyAlignment("center")}>
					<AlignCenter size={16} />
					<span>Align center</span>
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => applyAlignment("right")}>
					<AlignRight size={16} />
					<span>Align right</span>
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => applyAlignment("justify")}>
					<AlignJustify size={16} />
					<span>Justify</span>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<div class="toolbar-divider" aria-hidden="true"></div>

		<!-- Image upload -->
		<button
			class="toolbar-btn image-btn"
			class:uploading={imageUploading}
			disabled={isDisabled() || imageUploading || !imageUploadUrl}
			onclick={triggerImageUpload}
			title={imageError ?? "Insert image"}
			aria-label="Insert image"
			type="button"
		>
			{#if imageUploading}
				<Loader2 size={16} class="animate-spin" />
			{:else}
				<ImageIcon size={16} />
			{/if}
		</button>

		<input
			bind:this={imageFileInput}
			type="file"
			accept="image/*"
			class="visually-hidden-file-input"
			onchange={handleImageSelected}
		/>

		<div class="toolbar-divider" aria-hidden="true"></div>

		<!-- Emoji picker -->
		<Popover.Root bind:open={emojiPickerOpen}>
			<Popover.Trigger>
				{#snippet child(triggerProps)}
					<button
						{...triggerProps.props}
						class="toolbar-btn"
						disabled={isDisabled()}
						title="Emoji"
						aria-label="Emoji"
						type="button"
					>
						<Smile size={16} />
					</button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="min-w-[220px] p-2" align="start">
				<div class="emoji-grid">
					{#each EMOJIS as emoji (emoji)}
						<button
							type="button"
							class="emoji-button"
							onclick={() => insertEmoji(emoji)}
							aria-label={emoji}
						>
							{emoji}
						</button>
					{/each}
				</div>
			</Popover.Content>
		</Popover.Root>

		<div class="toolbar-divider" aria-hidden="true"></div>

		<!-- Table insert -->
		<Popover.Root bind:open={tablePickerOpen}>
			<Popover.Trigger>
				{#snippet child(triggerProps)}
					<button
						{...triggerProps.props}
						class="toolbar-btn"
						disabled={isDisabled()}
						title="Insert table"
						aria-label="Insert table"
						type="button"
					>
						<TableIcon size={16} />
					</button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="p-2" align="start">
				<div class="table-grid" role="presentation">
					{#each Array(TABLE_GRID_MAX) as _, r}
						{#each Array(TABLE_GRID_MAX) as _, c}
							<button
								type="button"
								class="table-cell"
								class:active={r < tableHoverRows && c < tableHoverCols}
								onmouseenter={() => {
									tableHoverRows = r + 1;
									tableHoverCols = c + 1;
								}}
								onfocus={() => {
									tableHoverRows = r + 1;
									tableHoverCols = c + 1;
								}}
								onclick={() => insertTable(r + 1, c + 1)}
								aria-label={`${r + 1} × ${c + 1}`}
							></button>
						{/each}
					{/each}
				</div>
				<div class="table-grid-label">
					{tableHoverRows > 0
						? `${tableHoverRows} × ${tableHoverCols}`
						: "Insert table"}
				</div>
			</Popover.Content>
		</Popover.Root>
	</div>

	{#if imageError}
		<div class="image-error" role="alert">
			<span>{imageError}</span>
			<button
				type="button"
				class="image-error-dismiss"
				onclick={() => (imageError = null)}
				aria-label="Dismiss error"
			>
				&times;
			</button>
		</div>
	{/if}

	<LinkDialog bind:open={linkDialogOpen} {editor} />
{/if}

<style>
	.toolbar {
		display: flex;
		align-items: center;
		gap: 1px;
		padding: 6px 10px;
		border-bottom: 1px solid var(--border);
		background: var(--card);
		flex-wrap: wrap;
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.toolbar-divider {
		width: 1px;
		height: 18px;
		background: var(--border);
		margin: 0 2px;
	}

	.toolbar-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 34px;
		min-height: 34px;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: var(--muted-foreground);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.toolbar-btn:hover:not(:disabled) {
		background: var(--accent);
		color: var(--accent-foreground);
	}

	.toolbar-btn.active {
		background: var(--primary);
		color: var(--primary-foreground);
	}

	.toolbar-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.dropdown-trigger {
		gap: 2px;
		padding: 0 6px;
	}

	:global(.dropdown-chevron) {
		opacity: 0.6;
	}

	.highlight-btn {
		position: relative;
	}

	.highlight-dot {
		position: absolute;
		bottom: 6px;
		right: 6px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		border: 1px solid var(--border);
		opacity: 0;
		transform: scale(0.6);
		transition: opacity 0.15s ease, transform 0.15s ease;
		pointer-events: none;
	}

	.highlight-dot.visible {
		opacity: 1;
		transform: scale(1);
	}

	.highlight-swatch-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 6px;
	}

	.highlight-swatch {
		width: 28px;
		height: 28px;
		border-radius: 6px;
		border: 1px solid var(--border);
		cursor: pointer;
		padding: 0;
		transition: transform 0.1s ease, box-shadow 0.1s ease;
	}

	.highlight-swatch:hover {
		transform: scale(1.08);
		box-shadow: 0 0 0 2px var(--ring);
	}

	.highlight-swatch.selected {
		box-shadow: 0 0 0 2px var(--ring);
	}

	.highlight-clear {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 4px 8px;
		margin-top: 6px;
		font-size: 0.75rem;
		color: var(--muted-foreground);
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 4px;
		cursor: pointer;
	}

	.highlight-clear:hover {
		background: var(--accent);
		color: var(--accent-foreground);
	}

	.visually-hidden-file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.image-btn.uploading {
		color: var(--ring);
	}

	.image-btn:disabled:not(.uploading) {
		opacity: 0.4;
		cursor: not-allowed;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.image-btn :global(.animate-spin) {
		animation: spin 1s linear infinite;
	}

	.image-error {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 6px 12px;
		font-size: 12px;
		background: color-mix(in srgb, var(--destructive) 10%, transparent);
		color: var(--destructive);
		border-bottom: 1px solid color-mix(in srgb, var(--destructive) 20%, transparent);
	}

	.image-error-dismiss {
		background: none;
		border: none;
		color: var(--destructive);
		cursor: pointer;
		font-size: 16px;
		line-height: 1;
		padding: 0 4px;
	}

	.emoji-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 4px;
	}

	.emoji-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		font-size: 1.25rem;
		line-height: 1;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 6px;
		cursor: pointer;
		padding: 0;
		transition: background 0.1s ease, transform 0.1s ease;
	}

	.emoji-button:hover {
		background: var(--accent);
		transform: scale(1.08);
	}

	.emoji-button:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 1px;
	}

	.table-grid {
		display: grid;
		grid-template-columns: repeat(8, 18px);
		grid-auto-rows: 18px;
		gap: 3px;
	}

	.table-cell {
		width: 18px;
		height: 18px;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 3px;
		background: var(--background);
		cursor: pointer;
		transition: background 0.08s ease, border-color 0.08s ease;
	}

	.table-cell:hover {
		border-color: var(--primary);
	}

	.table-cell.active {
		background: color-mix(in srgb, var(--primary) 35%, transparent);
		border-color: var(--primary);
	}

	.table-grid-label {
		margin-top: 8px;
		text-align: center;
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}
</style>
