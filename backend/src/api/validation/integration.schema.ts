import { z } from 'zod';

export const updateIntegrationSchema = z.object({
  credentials: z.record(z.string(), z.string()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const kofiConfigSchema = z.object({
  webhookUrl: z.string().url('Invalid webhook URL'),
  verificationToken: z.string().min(1, 'Verification token is required'),
});

export const webhookPortalSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  returnUrl: z.string().url().optional(),
});
