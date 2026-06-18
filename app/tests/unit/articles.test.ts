import { describe, it, expect } from 'vitest';
import {
  extractArticles,
  normalizeArticle,
  STATUS_OPTIONS,
  statusLabel,
  buildBulkStatusBody,
  validateArticleDraft,
  type RawArticle,
} from '$lib/sites/articles.js';

describe('extractArticles', () => {
  it('returns a top-level array as-is', () => {
    expect(extractArticles([{ id: '1' }, { id: '2' }])).toHaveLength(2);
  });

  it('unwraps the common envelope keys', () => {
    for (const key of ['items', 'data', 'articles', 'results']) {
      expect(extractArticles({ [key]: [{ id: 'x' }] })).toHaveLength(1);
    }
  });

  it('returns [] for null/undefined/unrecognized shapes', () => {
    expect(extractArticles(null)).toEqual([]);
    expect(extractArticles(undefined)).toEqual([]);
    expect(extractArticles({ total: 0 })).toEqual([]);
    expect(extractArticles('nope')).toEqual([]);
  });

  it('normalizes every extracted row', () => {
    const [a] = extractArticles([{ id: '1', title: 'Hi' }]);
    expect(a.status).toBe('draft');
    expect(a.language).toBe('en');
  });
});

describe('normalizeArticle', () => {
  it('maps known fields and applies fallbacks', () => {
    const raw: RawArticle = {
      id: 'a1',
      title: 'My Post',
      status: 'published',
      language: 'de',
      slug: 'my-post',
      updatedAt: '2026-06-16T10:00:00Z',
      content: '# hello',
    };
    expect(normalizeArticle(raw)).toEqual({
      id: 'a1',
      title: 'My Post',
      status: 'published',
      language: 'de',
      slug: 'my-post',
      updatedAt: '2026-06-16T10:00:00Z',
      content: '# hello',
    });
  });

  it('falls back to Untitled / draft / en and tolerates snake_case + alt keys', () => {
    const a = normalizeArticle({ id: '7', updated_at: '2026-01-01', body: 'x', lang: 'fr' });
    expect(a.title).toBe('Untitled');
    expect(a.status).toBe('draft');
    expect(a.language).toBe('fr');
    expect(a.updatedAt).toBe('2026-01-01');
    expect(a.content).toBe('x');
  });

  it('coerces a numeric id to string and tolerates a missing id', () => {
    expect(normalizeArticle({ id: 42 }).id).toBe('42');
    expect(normalizeArticle({ title: 'x' }).id).toBe('');
  });

  it('normalizes an unknown status to draft', () => {
    expect(normalizeArticle({ id: '1', status: 'weird' }).status).toBe('draft');
  });

  it('handles webs backend response with numeric id and snake_case fields', () => {
    const raw: RawArticle = {
      id: 12345, // webs likely uses numeric ids
      title: 'Blog Post',
      status: 'published',
      language: 'en',
      slug: 'blog-post',
      updated_at: '2026-06-15T12:00:00Z',
      content: 'Article body',
    };
    const normalized = normalizeArticle(raw);
    expect(normalized.id).toBe('12345'); // coerced to string
    expect(normalized.title).toBe('Blog Post');
    expect(normalized.status).toBe('published');
    expect(normalized.language).toBe('en');
    expect(normalized.slug).toBe('blog-post');
    expect(normalized.updatedAt).toBe('2026-06-15T12:00:00Z');
    expect(normalized.content).toBe('Article body');
  });
});

describe('statusLabel / STATUS_OPTIONS', () => {
  it('exposes the canonical statuses', () => {
    expect(STATUS_OPTIONS).toEqual(['draft', 'published', 'archived']);
  });

  it('renders a human label', () => {
    expect(statusLabel('draft')).toBe('Draft');
    expect(statusLabel('published')).toBe('Published');
  });
});

describe('buildBulkStatusBody', () => {
  it('builds the bulk-status payload', () => {
    expect(buildBulkStatusBody(['a', 'b'], 'published')).toEqual({
      ids: ['a', 'b'],
      status: 'published',
    });
  });

  it('throws on an empty selection', () => {
    expect(() => buildBulkStatusBody([], 'draft')).toThrow();
  });

  it('throws on an invalid status', () => {
    expect(() => buildBulkStatusBody(['a'], 'nope')).toThrow();
  });
});

describe('validateArticleDraft', () => {
  it('accepts a draft with a non-empty title', () => {
    expect(validateArticleDraft({ title: 'Hi', status: 'draft' })).toEqual({ ok: true });
  });

  it('rejects an empty/whitespace title', () => {
    expect(validateArticleDraft({ title: '   ', status: 'draft' }).ok).toBe(false);
  });

  it('rejects publishing without content', () => {
    const r = validateArticleDraft({ title: 'Hi', status: 'published', content: '   ' });
    expect(r.ok).toBe(false);
  });

  it('allows publishing with content', () => {
    expect(validateArticleDraft({ title: 'Hi', status: 'published', content: 'body' })).toEqual({
      ok: true,
    });
  });
});
