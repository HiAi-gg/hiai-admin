import { z } from 'zod';

export const issueIntegrationTokenParamsSchema = z.object({
  integrationId: z.string().trim().min(1, 'integrationId is required'),
});

export const listIntegrationSitesParamsSchema = z.object({
  integrationId: z.string().trim().min(1, 'integrationId is required'),
});
