import { z } from 'zod';

export const subscribeSchema = z.object({
  tenantId: z.string().uuid(),
  plan: z.enum(['free', 'pro', 'enterprise']),
});

export const upgradeSchema = z.object({
  tenantId: z.string().uuid(),
  plan: z.enum(['pro', 'enterprise']),
});

export const downgradeSchema = z.object({
  tenantId: z.string().uuid(),
  plan: z.enum(['free', 'pro']),
});

export const cancelSchema = z.object({
  tenantId: z.string().uuid(),
});

export const portalSchema = z.object({
  tenantId: z.string().uuid(),
  returnUrl: z.string().url().optional(),
});
