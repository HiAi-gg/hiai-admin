import { z } from 'zod';

export const SITE_MODULES = [
  'articles',
  'homepage',
  'domains',
  'kofi',
  'newsletter',
  'generation',
] as const;

/**
 * PathMap — declarative URL rewrite rules used by the proxy endpoint
 * `/api/site-proxy/:adapterSlug/{key}/...` to turn admin-side URLs into
 * consumer-side URLs without the consumer backend having to add per-prefix
 * routing logic.
 *
 * Shape (flexible — backend validates against `pathMapSchema` for well-known
 * keys but allows extra ones; the consumer backend defines what it accepts):
 *
 *   {
 *     articles: {
 *       list: '/articles/admin/list?site={publicSlug}',
 *       byId: '/articles/admin/{id}',
 *     },
 *     homepageBlocks: {
 *       bySite: '/homepage-blocks/admin/site-by-slug/{publicSlug}',
 *       byId:   '/homepage-blocks/admin/{id}',
 *     },
 *     domains: {
 *       verify: '/domains/{domain}/admin/verify',
 *     },
 *   }
 *
 * Placeholders `{publicSlug}`, `{id}`, `{domain}` are substituted with the
 * path parameters captured by the proxy route. Anything else is passed
 * through as-is (the consumer backend may read it from query / body).
 */
export const pathMapSchema = z.record(z.string(), z.unknown()).default({});

export const createSiteAdapterSchema = z.object({
  tenantId: z.string().uuid('tenantId must be a UUID'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  name: z.string().min(1, 'Name is required').max(200),
  backendUrl: z.string().url('backendUrl must be a valid URL'),
  apiBase: z.string().min(1).max(200).regex(/^\//, 'apiBase must start with /').default('/api/v1'),
  auth: z.enum(['jwt', 'api-key']).default('jwt'),
  jwtSecret: z.string().min(1).max(512).optional(),
  modules: z.array(z.enum(SITE_MODULES)).default([]),
  // Phase 3 pathMap-driven proxy (all optional, all back-compat).
  siteId: z.string().min(1).max(100).optional(),
  publicSlug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'publicSlug must be lowercase letters, numbers, and hyphens')
    .optional(),
  adapterSlug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'adapterSlug must be lowercase letters, numbers, and hyphens')
    .optional(),
  pathMap: pathMapSchema,
});

export const updateSiteAdapterSchema = createSiteAdapterSchema.partial().omit({ tenantId: true });

export const checkHealthSchema = z.object({
  backendUrl: z.string().url('backendUrl must be a valid URL'),
});

/**
 * Placeholder substitution: `/articles/admin/{id}?site={publicSlug}` with
 * `{ id: '42', publicSlug: 'croco' }` -> `/articles/admin/42?site=croco`.
 * Unknown `{key}` placeholders are left in place — they may be intended for
 * downstream consumers.
 */
export function substitutePathPlaceholders(
  pattern: string,
  params: Record<string, string>,
): string {
  return pattern.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, key: string) => {
    if (Object.hasOwn(params, key)) {
      return encodeURIComponent(params[key] as string);
    }
    return match;
  });
}

export type CreateSiteAdapterInput = z.infer<typeof createSiteAdapterSchema>;
export type UpdateSiteAdapterInput = z.infer<typeof updateSiteAdapterSchema>;
export type PathMap = Record<string, unknown>;
