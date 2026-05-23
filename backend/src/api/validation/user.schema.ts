import { z } from 'zod';

export const createUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
  role: z.enum(['super_admin', 'tenant_admin', 'editor', 'viewer']).optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
  role: z.enum(['super_admin', 'tenant_admin', 'editor', 'viewer']).optional(),
});

export const assignRoleSchema = z.object({
  roleId: z.string().min(1),
  tenantId: z.string().uuid().optional(),
});

export const revokeRoleSchema = z.object({
  roleId: z.string().min(1),
  tenantId: z.string().uuid().optional(),
});
