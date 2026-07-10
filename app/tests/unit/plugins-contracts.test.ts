import { describe, expect, it, vi } from 'vitest';
import {
  articleInputSchema,
  articleSchema,
  DATA_PROVIDER_CAPABILITIES,
  type DataProvider,
  homepageBlockInputSchema,
  homepageBlockSchema,
  siteSettingsInputSchema,
  siteSettingsSchema,
} from '$lib/plugins/contracts/index.js';

describe('generic plugin contracts', () => {
  it('validates the canonical DTOs', () => {
    expect(
      articleSchema.parse({
        id: 'article-1',
        title: 'Hello',
        status: 'draft',
        language: 'en',
        slug: 'hello',
        updatedAt: '2026-07-10T12:00:00Z',
        content: 'Body',
      }),
    ).toMatchObject({ id: 'article-1', status: 'draft' });

    expect(homepageBlockSchema.parse({ id: 'block-1', type: 'hero', order: 0, data: {} })).toEqual({
      id: 'block-1',
      type: 'hero',
      order: 0,
      data: {},
    });

    expect(
      siteSettingsSchema.parse({
        siteId: 'site-1',
        slug: 'example',
        title: 'Example',
        description: '',
        locale: 'en',
        timezone: 'UTC',
        logoUrl: null,
        faviconUrl: null,
        metadata: {},
      }),
    ).toMatchObject({ siteId: 'site-1', locale: 'en' });
  });

  it('rejects invalid DTO and input values', () => {
    expect(articleSchema.safeParse({ id: 'article-1', status: 'draft' }).success).toBe(false);
    expect(articleInputSchema.safeParse({ title: '', content: '' }).success).toBe(false);
    expect(
      homepageBlockSchema.safeParse({ id: 'block-1', type: 'hero', order: -1, data: {} }).success,
    ).toBe(false);
    expect(homepageBlockInputSchema.safeParse({ type: 'hero', order: 0, data: {} }).success).toBe(
      true,
    );
    expect(siteSettingsInputSchema.safeParse({ timezone: '' }).success).toBe(false);
  });

  it('keeps capability declarations independent from module availability', async () => {
    const list = vi.fn().mockResolvedValue([]);
    const provider: DataProvider = {
      capabilities: ['articles'],
      articles: {
        list,
        get: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    expect(DATA_PROVIDER_CAPABILITIES).toEqual(['articles', 'homepage', 'settings']);
    expect(provider.capabilities).toEqual(['articles']);
    expect(provider.homepage).toBeUndefined();
    await provider.articles?.list();
    expect(list).toHaveBeenCalledOnce();
  });
});
