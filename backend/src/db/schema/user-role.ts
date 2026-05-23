import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core';
import { users } from './user.js';
import { roles } from './role.js';
import { tenants } from './tenant.js';

export const userRoles = pgTable('user_roles', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  grantedBy: text('granted_by'),
  grantedAt: timestamp('granted_at').defaultNow().notNull(),
});
