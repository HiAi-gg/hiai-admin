import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const searchSchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
});

export const textIdParamSchema = z.object({
  textId: z.string().min(1),
});
