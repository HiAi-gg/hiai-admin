import { pgTable, text, boolean, timestamp, primaryKey, index, uuid } from 'drizzle-orm/pg-core';
import { users } from './user.js';
import { tenants } from './tenant.js';

export const roles = pgTable(
  'roles',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    description: text('description'),
    isSystem: boolean('is_system').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('roles_name_idx').on(table.name)],
);

export const permissions = pgTable(
  'permissions',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    resource: text('resource').notNull(),
    action: text('action').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('permissions_resource_idx').on(table.resource)],
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);

export const userRoles = pgTable(
  'user_roles',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    grantedBy: text('granted_by'),
    grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('user_roles_user_idx').on(table.userId),
    index('user_roles_role_idx').on(table.roleId),
  ],
);
