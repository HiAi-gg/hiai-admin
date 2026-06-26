// editorExtensions.ts — Shared TipTap extension list.
//
// Both the HiAiEditor and the markdown<->JSON helper need the same set of
// node/mark extensions so the parsed ProseMirror JSON round-trips cleanly
// with the editor's schema. Keeping the list here avoids drift between the
// two consumers.
//
// Adapted from hiai-docs (projects/hiai-docs/frontend/src/lib/components/editor).
// Changes vs. source:
//   - No collaboration extensions (we don't use Yjs in hiai-admin).

import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';

// `editorExtensions` is an array of TipTap extensions (Nodes, Marks, and
// Extensions). We declare the array loosely so that minor version-skew
// between `@tiptap/core` (3.26.x) and the extension packages (3.27.x) in
// this project's lockfile doesn't fail type narrowing — the runtime
// values are real extensions and are passed straight into
// `createEditor({ extensions })`, which accepts any TipTap extension
// union.

const lowlight = createLowlight(common);

export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    codeBlock: false,
    link: false,
  }),
  Markdown.configure({}),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { class: 'doc-link' },
  }),
  Image.configure({
    inline: false,
    allowBase64: false,
    HTMLAttributes: { class: 'doc-image' },
  }),
  Highlight.configure({ multicolor: true }),
  CodeBlockLowlight.configure({ lowlight }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  // Tables: TableKit bundles Table + TableRow + TableHeader + TableCell.
  TableKit.configure({ table: { resizable: true } }),
  // Task lists: a checkbox list with nested support.
  TaskList,
  TaskItem.configure({ nested: true }),
];
