import { z } from 'zod';

export const ADAPTER_CONNECTOR_TYPES = ['http', 'drizzle'] as const;
// Connector types are extension points. The built-in values above document the
// adapters shipped with admin, while consumers may register additional types.
export const adapterConnectorTypeSchema = z.string().trim().min(1);

export const siteModuleSchema = z.enum([
  'articles',
  'homepage',
  'domains',
  'kofi',
  'newsletter',
  'generation',
]);

export const adapterManifestSchema = z.object({
  adapterManifestVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  connectorType: adapterConnectorTypeSchema,
  connectorConfig: z.record(z.string(), z.unknown()).default({}),
  capabilities: z.array(z.string()).default([]),
  modules: z.array(siteModuleSchema).default([]),
  externalSiteReference: z.string().min(1).optional(),
  secretRefs: z.record(z.string().min(1), z.string().min(1)).default({}),
});

export type AdapterManifest = z.infer<typeof adapterManifestSchema>;

export const homepageBlockSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  order: z.number().int().nonnegative(),
  data: z.record(z.string(), z.unknown()),
});

export const homepageBlocksSchema = z.array(homepageBlockSchema);
export type HomepageBlockDTO = z.infer<typeof homepageBlockSchema>;
export const homepageBlockInputSchema = homepageBlockSchema.omit({ id: true });
export type HomepageBlockInput = z.infer<typeof homepageBlockInputSchema>;
export const homepageBlockReorderInputSchema = z.array(
  z.object({
    id: z.string().min(1),
    order: z.number().int().nonnegative(),
  }),
);
export type HomepageBlockReorderInput = z.infer<typeof homepageBlockReorderInputSchema>;

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

export type SiteSettingsDTO = z.infer<typeof siteSettingsSchema>;
export type SiteSettingsInput = z.infer<typeof siteSettingsInputSchema>;

export const articleStatusSchema = z.enum(['draft', 'published', 'archived']);
export const articleSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  status: articleStatusSchema,
  language: z.string().min(1),
  slug: z.string(),
  updatedAt: z.string(),
  content: z.string(),
  excerpt: z.string().optional(),
  publishedAt: z.string().nullable().optional(),
});

export const articlesSchema = z.array(articleSchema);
export type ArticleDTO = z.infer<typeof articleSchema>;

export const articleInputSchema = z.object({
  title: z.string().min(1),
  status: articleStatusSchema.optional(),
  language: z.string().min(1).optional(),
  slug: z.string().optional(),
  content: z.string(),
  excerpt: z.string().optional(),
});
export type ArticleInput = z.infer<typeof articleInputSchema>;
