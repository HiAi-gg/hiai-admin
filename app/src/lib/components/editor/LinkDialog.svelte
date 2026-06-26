<!-- LinkDialog.svelte — Modal dialog to set/edit a link on the active TipTap selection -->
<script lang="ts">
import { Button } from '@hiai/ui/components/ui/button/index.js';
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@hiai/ui/components/ui/dialog/index.js';
import { Input } from '@hiai/ui/components/ui/input/index.js';
import type { Editor } from '@tiptap/core';

let {
  open = $bindable(false),
  editor = null,
}: {
  open?: boolean;
  editor?: Editor | null;
} = $props();

let url = $state('');
let inputEl = $state<HTMLInputElement | null>(null);

// Reset the input field with the existing link href (if any) whenever
// the dialog opens. Using $effect to react to `open` changes.
$effect(() => {
  if (open && editor) {
    const previousUrl = editor.getAttributes('link').href ?? '';
    url = previousUrl;
    // Defer focus to next tick so the input is mounted.
    queueMicrotask(() => inputEl?.focus());
  }
});

function close() {
  open = false;
}

function handleCancel() {
  close();
}

function handleApply() {
  if (!editor) {
    close();
    return;
  }
  const trimmed = url.trim();
  if (trimmed === '') {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
  } else {
    // Bare domains like "google.com" would otherwise be treated as a
    // relative path. Prepend https:// unless the value already has a
    // scheme, anchor, or path.
    const normalized = /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

    const { from, to } = editor.state.selection;
    if (from === to) {
      // No text selected: insert the URL itself as the link text.
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: normalized,
          marks: [{ type: 'link', attrs: { href: normalized } }],
        })
        .run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run();
    }
  }
  close();
}
</script>

<Dialog bind:open>
	<DialogHeader>
		<DialogTitle>Link</DialogTitle>
	</DialogHeader>
	<div class="link-dialog-body">
		<label for="link-url" class="link-dialog-label">
			URL
		</label>
		<Input
			id="link-url"
			bind:ref={inputEl}
			bind:value={url}
			type="url"
			placeholder="https://example.com"
			onkeydown={(e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); handleApply(); } }}
		/>
	</div>
	<DialogFooter>
		<Button variant="outline" type="button" onclick={handleCancel}>
			Cancel
		</Button>
		<Button type="button" onclick={handleApply}>
			Save
		</Button>
	</DialogFooter>
</Dialog>

<style>
	.link-dialog-body {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0 0 1rem 0;
	}

	.link-dialog-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--foreground);
	}
</style>