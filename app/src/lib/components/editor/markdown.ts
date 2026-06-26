// markdown.ts — Browser-side markdown <-> TipTap JSON helpers.
//
// The markdown view edits raw markdown text. The editor stores both markdown
// and the equivalent ProseMirror JSON (`contentJson`); the JSON is what the
// WYSIWYG editor uses when the user switches back. We can't just save the
// markdown string — the JSON field has to be kept in sync, otherwise the
// next visit to the wysiwyg mode would show stale content.
//
// `@tiptap/markdown` ships a `MarkdownManager` that knows how to parse
// markdown against the same set of TipTap extensions used by the editor.
// We instantiate one with the shared `editorExtensions` list and call
// `.parse()` whenever we need to convert markdown to JSON. The instance is
// lazily created on first use to keep the module side-effect-free in SSR
// contexts (the editor is only mounted in the browser, but Vite's build
// still evaluates this file's imports).

import type { JSONContent } from '@tiptap/core';
import type { AnyExtension } from '@tiptap/core';
import { MarkdownManager } from '@tiptap/markdown';
import { editorExtensions } from './editorExtensions';

let managerSingleton: MarkdownManager | null = null;

function getManager(): MarkdownManager {
  if (managerSingleton) return managerSingleton;
  // The `editorExtensions` array is loosely typed to bridge the
  // `@tiptap/core` 3.26.x / extension 3.27.x version-skew in this
  // project's lockfile. `MarkdownManager` requires `AnyExtension[]`;
  // the runtime values are real extensions and the cast is safe.
  managerSingleton = new MarkdownManager({
    extensions: editorExtensions as unknown as AnyExtension[],
  });
  return managerSingleton;
}

/**
 * Parse a markdown string into a ProseMirror document matching the
 * HiAiEditor schema. Returns `{ type: "doc", content: [...] }`.
 *
 * Browser-only: relies on `window.DOMParser` inside `generateJSON`.
 */
export function markdownToJson(markdown: string): JSONContent {
  return getManager().parse(markdown);
}
