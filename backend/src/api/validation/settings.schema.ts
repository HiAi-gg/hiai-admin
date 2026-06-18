import { z } from 'zod';

export const updateSettingSchema = z.object({
  value: z.unknown(),
  description: z.string().max(500).optional(),
});
