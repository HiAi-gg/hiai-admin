// TipTap type augmentation
//
// The TipTap extensions register additional commands on the editor's
// `ChainedCommands` instance, but the `ChainedCommands` type in
// `@tiptap/core` doesn't include them automatically. Without this
// augmentation, calls like `editor.chain().focus().insertTable(...)`
// fail with "Property 'insertTable' does not exist on type
// 'ChainedCommands'". The augmentation below mirrors the commands
// contributed by the extensions we use.
//
// Reference: https://tiptap.dev/docs/editor/extensions/custom-extensions/extend-existing#typescript-types

import '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    table: {
      insertTable: (options?: {
        rows?: number;
        cols?: number;
        withHeaderRow?: boolean;
      }) => ReturnType;
      addRowBefore: () => ReturnType;
      addRowAfter: () => ReturnType;
      deleteRow: () => ReturnType;
      addColumnBefore: () => ReturnType;
      addColumnAfter: () => ReturnType;
      deleteColumn: () => ReturnType;
      deleteTable: () => ReturnType;
      mergeCells: () => ReturnType;
      splitCell: () => ReturnType;
      toggleHeaderColumn: () => ReturnType;
      toggleHeaderRow: () => ReturnType;
      toggleHeaderCell: () => ReturnType;
      mergeOrSplit: () => ReturnType;
      setCellAttribute: (name: string, value: unknown) => ReturnType;
      goToNextCell: () => ReturnType;
      goToPreviousCell: () => ReturnType;
    };
    textAlign: {
      setTextAlign: (alignment: 'left' | 'center' | 'right' | 'justify') => ReturnType;
    };
    image: {
      setImage: (options: { src: string; alt?: string; title?: string }) => ReturnType;
    };
  }
}
