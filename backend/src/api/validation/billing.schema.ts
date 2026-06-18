import { z } from 'zod';

export const subscribeSchema = z.object({
  plan: z.enum(['free', 'pro', 'enterprise']),
  tenantId: z.string().uuid(),
});

export const upgradeSchema = z.object({
  tenantId: z.string().uuid(),
  newPlan: z.enum(['free', 'pro', 'enterprise']),
});

export const downgradeSchema = z.object({
  tenantId: z.string().uuid(),
  newPlan: z.enum(['free', 'pro', 'enterprise']),
});

export const cancelSchema = z.object({
  tenantId: z.string().uuid(),
});
