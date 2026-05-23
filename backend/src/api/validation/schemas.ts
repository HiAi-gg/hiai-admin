import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const textIdParamSchema = z.object({
  id: z.string().min(1),
});

export const searchSchema = z.object({
  q: z.string().min(1).max(200).optional(),
  status: z.string().optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
