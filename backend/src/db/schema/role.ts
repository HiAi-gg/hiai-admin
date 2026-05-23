import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const roles = pgTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  isSystem: boolean('is_system').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const permissions = pgTable('permissions', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  resource: text('resource').notNull(),
  action: text('action').notNull(),
  description: text('description'),
});

export const rolePermissions = pgTable('role_permissions', {
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
});

export const userRoles = pgTable('user_roles', {
  userId: text('user_id').notNull(),
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  tenantId: text('tenant_id'),
  grantedBy: text('granted_by'),
  grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow(),
});
