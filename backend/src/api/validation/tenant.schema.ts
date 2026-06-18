import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  email: z.string().email('Invalid email address').max(200),
  plan: z.enum(['free', 'pro', 'enterprise']).default('free'),
});

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens')
    .optional(),
  email: z.string().email().max(200).optional(),
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
  status: z.enum(['active', 'suspended', 'deleted', 'pending']).optional(),
});

export const changePlanSchema = z.object({
  plan: z.enum(['free', 'pro', 'enterprise']),
});

export const suspendTenantSchema = z.object({
  reason: z.string().max(500).optional(),
});
