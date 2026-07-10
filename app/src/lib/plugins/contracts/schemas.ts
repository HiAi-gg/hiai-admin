import { z } from 'zod';

export const articleStatusSchema = z.enum(['draft', 'published', 'archived']);

export const articleSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  status: articleStatusSchema,
  language: z.string().min(1),
  slug: z.string(),
  updatedAt: z.string().min(1),
  content: z.string(),
  excerpt: z.string().optional(),
  publishedAt: z.string().min(1).nullable().optional(),
});

export const articleInputSchema = z.object({
  title: z.string().min(1),
  status: articleStatusSchema.optional(),
  language: z.string().min(1).optional(),
  slug: z.string().optional(),
  content: z.string(),
  excerpt: z.string().optional(),
});

export const homepageBlockSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  order: z.number().int().nonnegative(),
  data: z.record(z.string(), z.unknown()),
});

export const homepageBlockInputSchema = homepageBlockSchema.omit({ id: true });

export const siteSettingsSchema = z.object({
  siteId: z.string().min(1),
  slug: z.string().min(1),
  title: z.string(),
  description: z.string(),
  locale: z.string().min(1),
  timezone: z.string().min(1),
  logoUrl: z.string().url().nullable(),
  faviconUrl: z.string().url().nullable(),
  metadata: z.record(z.string(), z.unknown()),
});

export const siteSettingsInputSchema = siteSettingsSchema
  .omit({ siteId: true })
  .partial()
  .extend({ siteId: z.string().min(1).optional() });
