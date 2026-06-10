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

export const paginationResponseSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  pages: z.number().int().min(0),
  hasMore: z.boolean(),
});

export const tenantListQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  search: z.string().max(200).optional(),
});

export const userListQuerySchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
  role: z.enum(['super_admin', 'tenant_admin', 'editor', 'viewer']).optional(),
  tenantId: z.string().uuid().optional(),
});

export const invoiceListQuerySchema = paginationSchema.extend({
  tenantId: z.string().uuid().optional(),
  status: z.enum(['draft', 'open', 'paid', 'uncollectible', 'void']).optional(),
});

export const integrationListQuerySchema = paginationSchema.extend({
  type: z.string().max(50).optional(),
  status: z.enum(['connected', 'disconnected', 'error', 'pending']).optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
export type PaginationResponse = z.infer<typeof paginationResponseSchema>;
export type TenantListQuery = z.infer<typeof tenantListQuerySchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;
export type IntegrationListQuery = z.infer<typeof integrationListQuerySchema>;
