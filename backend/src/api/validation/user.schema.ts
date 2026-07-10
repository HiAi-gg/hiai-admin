import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address').max(200),
  name: z.string().min(1, 'Name is required').max(200),
  role: z.enum(['super_admin', 'tenant_admin', 'editor', 'viewer']).default('viewer'),
  tenantId: z.string().uuid().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().max(200).optional(),
  name: z.string().min(1).max(200).optional(),
  role: z.enum(['super_admin', 'tenant_admin', 'editor', 'viewer']).optional(),
  avatarUrl: z.string().url().max(500).optional(),
});

export const assignRoleSchema = z.object({
  roleId: z.string().min(1, 'Role ID is required'),
  tenantId: z.string().uuid().optional(),
});

export const revokeRoleSchema = z.object({
  roleId: z.string().min(1, 'Role ID is required'),
  tenantId: z.string().uuid().optional(),
});

export const joinTenantSchema = z.object({
  slug: z
    .string()
    .min(1, 'Tenant slug is required')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  inviteCode: z.string().min(1).max(200).optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(200).optional(),
  avatarUrl: z.string().url().max(500).nullable().optional(),
});
