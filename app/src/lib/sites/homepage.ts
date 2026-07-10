// Generic "homepage blocks" CMS module for Site adapters (HIAI_ADMIN_INTEGRATION_PLAN Block B / B2.2).
// Pure, framework-agnostic logic for managing an ordered list of content blocks (hero, featured,
// text, image, CTA, newsletter, plus linktree blocks: profile, link-card, social-links).
// The site backend contract is loose; extractBlocks normalizes whatever shape a tenant backend
// returns into a stable HomepageBlock[].

export const BLOCK_TYPES = [
  'hero',
  'featured',
  'text',
  'image',
  'cta',
  'newsletter',
  'profile',
  'link-card',
  'social-links',
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export interface HomepageBlock {
  id: string;
  type: BlockType;
  order: number;
  data: Record<string, unknown>;
}

/** Loosely-typed block as delivered by an arbitrary site backend. */
export type RawBlock = Record<string, unknown>;

function isBlockType(v: unknown): v is BlockType {
  return typeof v === 'string' && (BLOCK_TYPES as readonly string[]).includes(v);
}

/** Map an arbitrary backend block into a stable {@link HomepageBlock}, applying safe fallbacks. */
export function normalizeBlock(raw: RawBlock): HomepageBlock {
  const typeRaw = raw.type;
  // Accept both canonical camelCase and common snake_case transport fields.
  const orderRaw = raw.order ?? raw.order_index;
  const dataRaw = raw.data ?? raw.content;
  const data: Record<string, unknown> =
    dataRaw && typeof dataRaw === 'object' ? { ...(dataRaw as Record<string, unknown>) } : {};
  // Some adapters expose title separately; fold it into data for the editor.
  if (typeof raw.title === 'string' && raw.title !== '' && data.title === undefined) {
    data.title = raw.title;
  }

  return {
    id: String(raw.id ?? raw._id ?? '').trim() || generateId(),
    type: isBlockType(typeRaw) ? typeRaw : 'text',
    order: typeof orderRaw === 'number' ? Math.max(0, Math.floor(orderRaw)) : 0,
    data,
  };
}

const ENVELOPE_KEYS = ['blocks', 'items', 'data', 'results'];

/** Unwrap a list response (array or common envelope) and normalize each block, then sort by order. */
export function extractBlocks(payload: unknown): HomepageBlock[] {
  let rows: unknown;
  if (Array.isArray(payload)) {
    rows = payload;
  } else if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    for (const key of ENVELOPE_KEYS) {
      if (Array.isArray(obj[key])) {
        rows = obj[key];
        break;
      }
    }
  }
  if (!Array.isArray(rows)) return [];

  const blocks = rows
    .filter((r): r is RawBlock => !!r && typeof r === 'object')
    .map(normalizeBlock);

  // Sort by order, then by insertion order (stable sort).
  return blocks.sort((a, b) => a.order - b.order);
}

/** Generate a random UUID for new blocks. */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (e.g. older Node, JSDOM).
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/** Factory: create a new block of a given type with sensible defaults. */
export function newBlock(type: BlockType): HomepageBlock {
  return {
    id: generateId(),
    type,
    order: 0,
    data: {},
  };
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

/**
 * Validate a block before save. Rules:
 * - hero: requires non-empty title
 * - featured: requires non-empty title
 * - text: requires non-empty text
 * - image: requires non-empty url
 * - cta: requires non-empty label
 * - newsletter: requires non-empty title
 * - profile: requires non-empty displayName
 * - link-card: requires non-empty label and url
 * - social-links: requires at least 1 entry with non-empty platform and url
 */
export function validateBlock(block: HomepageBlock): ValidationResult {
  const { type, data } = block;

  const getText = (key: string): string => {
    const v = data[key];
    return typeof v === 'string' ? v.trim() : '';
  };

  switch (type) {
    case 'hero':
      if (!getText('title')) return { ok: false, error: 'Hero requires a title' };
      return { ok: true };
    case 'featured':
      if (!getText('title')) return { ok: false, error: 'Featured requires a title' };
      return { ok: true };
    case 'text':
      if (!getText('text')) return { ok: false, error: 'Text block requires content' };
      return { ok: true };
    case 'image':
      if (!getText('url')) return { ok: false, error: 'Image requires a URL' };
      return { ok: true };
    case 'cta':
      if (!getText('label')) return { ok: false, error: 'CTA requires a label' };
      return { ok: true };
    case 'newsletter':
      if (!getText('title')) return { ok: false, error: 'Newsletter requires a title' };
      return { ok: true };
    case 'profile':
      if (!getText('displayName')) return { ok: false, error: 'Profile requires a display name' };
      return { ok: true };
    case 'link-card': {
      const label = getText('label');
      const url = getText('url');
      if (!label && !url) return { ok: false, error: 'Link card requires a label and URL' };
      if (!label) return { ok: false, error: 'Link card requires a label' };
      if (!url) return { ok: false, error: 'Link card requires a URL' };
      return { ok: true };
    }
    case 'social-links': {
      const links = data.links;
      if (!Array.isArray(links) || links.length === 0)
        return { ok: false, error: 'Social links requires at least one link' };
      const firstInvalid = links.findIndex((entry) => {
        if (!entry || typeof entry !== 'object') return true;
        const r = entry as Record<string, unknown>;
        const platform = typeof r.platform === 'string' ? r.platform.trim() : '';
        const url = typeof r.url === 'string' ? r.url.trim() : '';
        return !platform || !url;
      });
      if (firstInvalid !== -1)
        return {
          ok: false,
          error: `Social link #${firstInvalid + 1} requires a platform and URL`,
        };
      return { ok: true };
    }
    default:
      return { ok: false, error: `Unknown block type: ${type}` };
  }
}

/**
 * Pure reorder: move a block from `fromIndex` to `toIndex` and re-sequence the `order`
 * field of all blocks 0..length-1 in their final positions.
 * Clamps out-of-range indices to valid bounds.
 */
export function reorder(
  blocks: HomepageBlock[],
  fromIndex: number,
  toIndex: number,
): HomepageBlock[] {
  const n = blocks.length;
  if (n === 0) return [];

  // Clamp indices to valid range.
  const from = Math.max(0, Math.min(fromIndex, n - 1));
  const to = Math.max(0, Math.min(toIndex, n - 1));

  if (from === to) return blocks;

  // Move the block from 'from' to 'to' position.
  const result = [...blocks];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);

  // Re-sequence order 0..n-1.
  return result.map((block, idx) => ({ ...block, order: idx }));
}

/**
 * Build the canonical homepage reorder payload.
 */
export function buildReorderBody(blocks: HomepageBlock[]): Array<{ id: string; order: number }> {
  return blocks.map((b) => ({
    id: b.id,
    order: b.order,
  }));
}
