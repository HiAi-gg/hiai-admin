import { describe, it, expect } from 'vitest';
import {
  extractBlocks,
  normalizeBlock,
  BLOCK_TYPES,
  newBlock,
  validateBlock,
  reorder,
  buildReorderBody,
  type RawBlock,
  type HomepageBlock,
} from '$lib/sites/homepage.js';

describe('BLOCK_TYPES constant', () => {
  it('exposes canonical block types', () => {
    expect(BLOCK_TYPES).toEqual([
      'hero',
      'featured',
      'text',
      'image',
      'cta',
      'newsletter',
      'profile',
      'link-card',
      'social-links',
    ]);
  });

  it('includes the linktree block types', () => {
    expect(BLOCK_TYPES).toContain('profile');
    expect(BLOCK_TYPES).toContain('link-card');
    expect(BLOCK_TYPES).toContain('social-links');
  });
});

describe('extractBlocks', () => {
  it('returns a top-level array as-is', () => {
    const blocks = extractBlocks([
      { id: '1', type: 'hero', order: 0 },
      { id: '2', type: 'text', order: 1 },
    ]);
    expect(blocks).toHaveLength(2);
  });

  it('unwraps common envelope keys', () => {
    for (const key of ['blocks', 'items', 'data', 'results']) {
      const result = extractBlocks({ [key]: [{ id: 'x', type: 'text' }] });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('text');
    }
  });

  it('returns [] for null/undefined/unrecognized shapes', () => {
    expect(extractBlocks(null)).toEqual([]);
    expect(extractBlocks(undefined)).toEqual([]);
    expect(extractBlocks({ total: 0 })).toEqual([]);
    expect(extractBlocks('nope')).toEqual([]);
  });

  it('normalizes every extracted block', () => {
    const [block] = extractBlocks([{ id: '1', type: 'unknown' }]);
    expect(block.type).toBe('text'); // unknown → text
    expect(block.data).toEqual({});
  });

  it('sorts blocks by order field', () => {
    const blocks = extractBlocks([
      { id: '3', type: 'text', order: 99 },
      { id: '1', type: 'hero', order: 0 },
      { id: '2', type: 'featured', order: 50 },
    ]);
    expect(blocks.map((b) => b.id)).toEqual(['1', '2', '3']);
    expect(blocks.map((b) => b.order)).toEqual([0, 50, 99]);
  });

  it('handles missing or invalid order values', () => {
    const blocks = extractBlocks([
      { id: '1', type: 'text' }, // no order
      { id: '2', type: 'hero', order: 'not-a-number' }, // invalid
      { id: '3', type: 'featured', order: -5 }, // negative → 0
    ]);
    expect(blocks[0].order).toBe(0);
    expect(blocks[1].order).toBe(0);
    expect(blocks[2].order).toBe(0);
  });

  it('extracts linktree block types with their data intact', () => {
    const blocks = extractBlocks([
      {
        id: '10',
        type: 'profile',
        order: 0,
        data: { displayName: 'Jane Doe', bio: 'Hi there' },
      },
      {
        id: '11',
        type: 'link-card',
        order: 1,
        data: { label: 'My blog', url: 'https://blog.example.com' },
      },
      {
        id: '12',
        type: 'social-links',
        order: 2,
        data: {
          links: [
            { platform: 'Instagram', url: 'https://instagram.com/jane' },
            { platform: 'GitHub', url: 'https://github.com/jane' },
          ],
        },
      },
    ]);
    expect(blocks.map((b) => b.type)).toEqual(['profile', 'link-card', 'social-links']);
    expect(blocks[0].data.displayName).toBe('Jane Doe');
    expect(blocks[1].data.url).toBe('https://blog.example.com');
    expect(blocks[2].data.links).toHaveLength(2);
  });
});

describe('normalizeBlock', () => {
  it('maps known fields', () => {
    const raw: RawBlock = {
      id: 'hero-1',
      type: 'hero',
      order: 0,
      data: { title: 'Welcome', subtitle: 'To my site' },
    };
    const block = normalizeBlock(raw);
    expect(block.id).toBe('hero-1');
    expect(block.type).toBe('hero');
    expect(block.order).toBe(0);
    expect(block.data.title).toBe('Welcome');
  });

  it('coerces numeric id to string and generates UUID for missing id', () => {
    const b1 = normalizeBlock({ id: 42, type: 'text' });
    expect(b1.id).toBe('42');

    const b2 = normalizeBlock({ type: 'text' });
    expect(b2.id).toBeTruthy();
    expect(typeof b2.id).toBe('string');
    expect(b2.id.length > 0).toBe(true);
  });

  it('normalizes unknown type to text', () => {
    const block = normalizeBlock({ id: '1', type: 'weird-type' });
    expect(block.type).toBe('text');
  });

  it('clamps order to non-negative integer', () => {
    expect(normalizeBlock({ id: '1', type: 'text', order: -5 }).order).toBe(0);
    expect(normalizeBlock({ id: '1', type: 'text', order: 3.7 }).order).toBe(3);
    expect(normalizeBlock({ id: '1', type: 'text', order: 'not-a-number' }).order).toBe(0);
  });

  it('extracts data object or defaults to {}', () => {
    const b1 = normalizeBlock({ id: '1', type: 'text', data: { key: 'value' } });
    expect(b1.data).toEqual({ key: 'value' });

    const b2 = normalizeBlock({ id: '1', type: 'text', data: 'not-an-object' });
    expect(b2.data).toEqual({});

    const b3 = normalizeBlock({ id: '1', type: 'text' });
    expect(b3.data).toEqual({});
  });

  it('preserves linktree block types (not fallback to text)', () => {
    const profile = normalizeBlock({ id: '1', type: 'profile', data: { displayName: 'Jane' } });
    expect(profile.type).toBe('profile');
    expect(profile.data.displayName).toBe('Jane');

    const linkCard = normalizeBlock({
      id: '2',
      type: 'link-card',
      data: { label: 'Site', url: 'https://x' },
    });
    expect(linkCard.type).toBe('link-card');
    expect(linkCard.data.label).toBe('Site');

    const social = normalizeBlock({
      id: '3',
      type: 'social-links',
      data: { links: [{ platform: 'GitHub', url: 'https://github.com/me' }] },
    });
    expect(social.type).toBe('social-links');
    expect(social.data.links).toEqual([{ platform: 'GitHub', url: 'https://github.com/me' }]);
  });
});

describe('newBlock', () => {
  it('creates a new block with sensible defaults', () => {
    const block = newBlock('hero');
    expect(block.type).toBe('hero');
    expect(block.order).toBe(0);
    expect(block.data).toEqual({});
    expect(block.id).toBeTruthy();
    expect(typeof block.id).toBe('string');
  });

  it('generates unique IDs for each call', () => {
    const b1 = newBlock('text');
    const b2 = newBlock('text');
    expect(b1.id).not.toBe(b2.id);
  });

  it('works for all block types', () => {
    for (const type of BLOCK_TYPES) {
      const block = newBlock(type);
      expect(block.type).toBe(type);
      expect(block.order).toBe(0);
    }
  });

  it('creates a profile block with empty data', () => {
    const block = newBlock('profile');
    expect(block.type).toBe('profile');
    expect(block.data).toEqual({});
    expect(block.id).toBeTruthy();
  });

  it('creates a link-card block with empty data', () => {
    const block = newBlock('link-card');
    expect(block.type).toBe('link-card');
    expect(block.data).toEqual({});
    expect(block.id).toBeTruthy();
  });

  it('creates a social-links block with empty data', () => {
    const block = newBlock('social-links');
    expect(block.type).toBe('social-links');
    expect(block.data).toEqual({});
    expect(block.id).toBeTruthy();
  });
});

describe('validateBlock', () => {
  it('hero: requires non-empty title', () => {
    expect(validateBlock({ id: '1', type: 'hero', order: 0, data: { title: 'Welcome' } })).toEqual({
      ok: true,
    });
    expect(validateBlock({ id: '1', type: 'hero', order: 0, data: { title: '' } }).ok).toBe(false);
    expect(validateBlock({ id: '1', type: 'hero', order: 0, data: {} }).ok).toBe(false);
  });

  it('featured: requires non-empty title', () => {
    expect(
      validateBlock({ id: '1', type: 'featured', order: 0, data: { title: 'Posts' } }),
    ).toEqual({ ok: true });
    expect(validateBlock({ id: '1', type: 'featured', order: 0, data: { title: '   ' } }).ok).toBe(
      false,
    );
  });

  it('text: requires non-empty text', () => {
    expect(
      validateBlock({ id: '1', type: 'text', order: 0, data: { text: 'Lorem ipsum' } }),
    ).toEqual({ ok: true });
    expect(validateBlock({ id: '1', type: 'text', order: 0, data: { text: '' } }).ok).toBe(false);
  });

  it('image: requires non-empty url', () => {
    expect(
      validateBlock({
        id: '1',
        type: 'image',
        order: 0,
        data: { url: 'https://example.com/img.jpg' },
      }),
    ).toEqual({ ok: true });
    expect(validateBlock({ id: '1', type: 'image', order: 0, data: { url: '' } }).ok).toBe(false);
  });

  it('cta: requires non-empty label', () => {
    expect(
      validateBlock({
        id: '1',
        type: 'cta',
        order: 0,
        data: { label: 'Click me', href: '/contact' },
      }),
    ).toEqual({ ok: true });
    expect(validateBlock({ id: '1', type: 'cta', order: 0, data: { label: '' } }).ok).toBe(false);
  });

  it('newsletter: requires non-empty title', () => {
    expect(
      validateBlock({ id: '1', type: 'newsletter', order: 0, data: { title: 'Subscribe' } }),
    ).toEqual({ ok: true });
    expect(
      validateBlock({ id: '1', type: 'newsletter', order: 0, data: { title: '   ' } }).ok,
    ).toBe(false);
  });

  it('profile: requires non-empty displayName', () => {
    expect(
      validateBlock({
        id: '1',
        type: 'profile',
        order: 0,
        data: { displayName: 'Jane Doe', bio: 'Hello world', avatarUrl: 'https://x/a.jpg' },
      }),
    ).toEqual({ ok: true });
    expect(
      validateBlock({ id: '1', type: 'profile', order: 0, data: { displayName: '' } }).ok,
    ).toBe(false);
    expect(validateBlock({ id: '1', type: 'profile', order: 0, data: {} }).ok).toBe(false);
    expect(
      validateBlock({ id: '1', type: 'profile', order: 0, data: { displayName: '   ' } }).ok,
    ).toBe(false);
  });

  it('link-card: requires non-empty label and url', () => {
    expect(
      validateBlock({
        id: '1',
        type: 'link-card',
        order: 0,
        data: { label: 'My site', url: 'https://example.com' },
      }),
    ).toEqual({ ok: true });
    expect(
      validateBlock({
        id: '1',
        type: 'link-card',
        order: 0,
        data: { label: '', url: 'https://example.com' },
      }).ok,
    ).toBe(false);
    expect(
      validateBlock({ id: '1', type: 'link-card', order: 0, data: { label: 'My site', url: '' } })
        .ok,
    ).toBe(false);
    expect(validateBlock({ id: '1', type: 'link-card', order: 0, data: {} }).ok).toBe(false);
  });

  it('social-links: requires at least 1 entry with non-empty platform and url', () => {
    expect(
      validateBlock({
        id: '1',
        type: 'social-links',
        order: 0,
        data: { links: [{ platform: 'Instagram', url: 'https://instagram.com/me' }] },
      }),
    ).toEqual({ ok: true });
    expect(validateBlock({ id: '1', type: 'social-links', order: 0, data: { links: [] } }).ok).toBe(
      false,
    );
    expect(validateBlock({ id: '1', type: 'social-links', order: 0, data: {} }).ok).toBe(false);
    expect(
      validateBlock({
        id: '1',
        type: 'social-links',
        order: 0,
        data: { links: [{ platform: '', url: '' }] },
      }).ok,
    ).toBe(false);
    expect(
      validateBlock({
        id: '1',
        type: 'social-links',
        order: 0,
        data: {
          links: [
            { platform: 'Instagram', url: 'https://instagram.com/me' },
            { platform: 'YouTube', url: '' },
          ],
        },
      }).ok,
    ).toBe(false);
  });

  it('whitespace-only fields fail validation', () => {
    const block: HomepageBlock = {
      id: '1',
      type: 'hero',
      order: 0,
      data: { title: '   \t\n  ' },
    };
    expect(validateBlock(block).ok).toBe(false);
  });
});

describe('reorder', () => {
  it('moves a block from fromIndex to toIndex', () => {
    const blocks: HomepageBlock[] = [
      { id: 'a', type: 'text', order: 0, data: {} },
      { id: 'b', type: 'text', order: 1, data: {} },
      { id: 'c', type: 'text', order: 2, data: {} },
    ];

    const result = reorder(blocks, 0, 2);
    expect(result.map((b) => b.id)).toEqual(['b', 'c', 'a']);
  });

  it('re-sequences order 0..n-1 after move', () => {
    const blocks: HomepageBlock[] = [
      { id: 'a', type: 'text', order: 100, data: {} },
      { id: 'b', type: 'text', order: 200, data: {} },
      { id: 'c', type: 'text', order: 300, data: {} },
    ];

    const result = reorder(blocks, 2, 0);
    expect(result.map((b) => b.order)).toEqual([0, 1, 2]);
    expect(result[0].id).toBe('c');
  });

  it('clamps fromIndex and toIndex to valid range', () => {
    const blocks: HomepageBlock[] = [
      { id: 'a', type: 'text', order: 0, data: {} },
      { id: 'b', type: 'text', order: 1, data: {} },
    ];

    // Out of range: fromIndex=-10, toIndex=999
    const result = reorder(blocks, -10, 999);
    // from=-10 → 0, to=999 → 1, so move 0 to 1: ['b', 'a']
    expect(result.map((b) => b.id)).toEqual(['b', 'a']);
  });

  it('handles same fromIndex and toIndex (no-op)', () => {
    const blocks: HomepageBlock[] = [
      { id: 'a', type: 'text', order: 0, data: {} },
      { id: 'b', type: 'text', order: 1, data: {} },
    ];

    const result = reorder(blocks, 1, 1);
    expect(result.map((b) => b.id)).toEqual(['a', 'b']);
  });

  it('returns empty array for empty input', () => {
    expect(reorder([], 0, 0)).toEqual([]);
  });

  it('does not mutate the original array', () => {
    const blocks: HomepageBlock[] = [
      { id: 'a', type: 'text', order: 0, data: {} },
      { id: 'b', type: 'text', order: 1, data: {} },
    ];
    const original = JSON.stringify(blocks);

    reorder(blocks, 0, 1);
    expect(JSON.stringify(blocks)).toBe(original);
  });
});

describe('buildReorderBody', () => {
  it('builds the canonical reorder payload', () => {
    const blocks: HomepageBlock[] = [
      { id: 'hero-1', type: 'hero', order: 0, data: {} },
      { id: 'text-2', type: 'text', order: 1, data: {} },
      { id: 'cta-3', type: 'cta', order: 2, data: {} },
    ];

    const body = buildReorderBody(blocks);
    expect(body).toEqual([
      { id: 'hero-1', order: 0 },
      { id: 'text-2', order: 1 },
      { id: 'cta-3', order: 2 },
    ]);
  });

  it('works with empty array', () => {
    expect(buildReorderBody([])).toEqual([]);
  });
});
