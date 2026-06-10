import { z } from 'zod';

export const updateIntegrationSchema = z.object({
  credentials: z.record(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
});

export const kofiConfigSchema = z.object({
  webhookUrl: z.string().url(),
  verificationToken: z.string().min(1),
});

export const webhookPortalSchema = z.object({
  customerId: z.string().min(1),
  returnUrl: z.string().url().optional(),
});
