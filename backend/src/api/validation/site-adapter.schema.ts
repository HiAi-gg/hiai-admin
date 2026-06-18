import { z } from 'zod';

export const SITE_MODULES = [
  'articles',
  'homepage',
  'domains',
  'kofi',
  'newsletter',
  'generation',
] as const;

export const createSiteAdapterSchema = z.object({
  tenantId: z.string().uuid('tenantId must be a UUID'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  name: z.string().min(1, 'Name is required').max(200),
  backendUrl: z.string().url('backendUrl must be a valid URL'),
  auth: z.enum(['jwt', 'api-key']).default('jwt'),
  jwtSecret: z.string().min(1).max(512).optional(),
  modules: z.array(z.enum(SITE_MODULES)).default([]),
});

export const checkHealthSchema = z.object({
  backendUrl: z.string().url('backendUrl must be a valid URL'),
});

export type CreateSiteAdapterInput = z.infer<typeof createSiteAdapterSchema>;
