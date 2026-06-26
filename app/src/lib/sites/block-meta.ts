// Block metadata used by the homepage editor's block-selector grid.
// Centralized so BlockPreview.svelte and the +page.svelte share a single source
// of truth for labels, descriptions, and lucide icons.
import {
  Heading1,
  Star,
  Type,
  Image as ImageIcon,
  MousePointerClick,
  Mail,
  UserCircle,
  Link as LinkIcon,
  Share2,
} from 'lucide-svelte';
import type { ComponentType, SvelteComponent } from 'svelte';
import { BLOCK_TYPES, type BlockType } from './homepage.js';

/**
 * Icon accepted by {@link BlockMeta}.
 *
 * lucide-svelte ships Svelte 4 class components (extend `SvelteComponent`),
 * so we use `ComponentType<SvelteComponent>` — the Svelte 4 class-component
 * shape — to stay type-safe both at module level (assigning lucide exports
 * to `icon`) and at render time (Svelte 5's component invocation).
 */
export type BlockIcon = ComponentType<SvelteComponent>;

export interface BlockMeta {
  label: string;
  description: string;
  icon: BlockIcon;
}

const META: Record<BlockType, BlockMeta> = {
  hero: {
    label: 'Hero',
    description: 'Large banner with title, subtitle, and CTA',
    icon: Heading1,
  },
  featured: {
    label: 'Featured',
    description: 'Highlighted section title for a list of items',
    icon: Star,
  },
  text: {
    label: 'Text',
    description: 'Plain paragraph or formatted copy block',
    icon: Type,
  },
  image: {
    label: 'Image',
    description: 'Single image with optional caption / alt text',
    icon: ImageIcon,
  },
  cta: {
    label: 'CTA',
    description: 'Standalone call-to-action button linking somewhere',
    icon: MousePointerClick,
  },
  newsletter: {
    label: 'Newsletter',
    description: 'Email signup form with title and subscribe button',
    icon: Mail,
  },
  profile: {
    label: 'Profile',
    description: 'Avatar + display name + bio (linktree header)',
    icon: UserCircle,
  },
  'link-card': {
    label: 'Link card',
    description: 'Tappable card with icon, label, and URL',
    icon: LinkIcon,
  },
  'social-links': {
    label: 'Social links',
    description: 'Row of social platform pills (Instagram, GitHub, …)',
    icon: Share2,
  },
};

/** Get metadata for a single block type. Throws if the type is not registered. */
export function getBlockMeta(type: BlockType): BlockMeta {
  return META[type];
}

/** All block types in canonical order, each with its metadata. */
export const BLOCKS_WITH_META: ReadonlyArray<{ type: BlockType; meta: BlockMeta }> =
  BLOCK_TYPES.map((type) => ({ type, meta: META[type] }));
