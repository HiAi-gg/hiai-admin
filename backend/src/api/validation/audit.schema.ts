import { z } from 'zod';

export const auditListSchema = z.object({
  actorId: z.string().max(100).optional(),
  action: z.string().max(100).optional(),
  resource: z.string().max(100).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
