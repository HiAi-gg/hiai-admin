import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  email: z.string().email().optional(),
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
  email: z.string().email().optional(),
  status: z.enum(['pending', 'active', 'suspended', 'trial']).optional(),
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const changePlanSchema = z.object({
  plan: z.enum(['free', 'pro', 'enterprise']),
});
