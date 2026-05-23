import { pgTable, uuid, text, timestamp, jsonb, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './user.js';
import { tenants } from './tenant.js';

export const userTenantAccess = pgTable('user_tenant_access', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  role: text('role').default('viewer').notNull(),
  permissions: jsonb('permissions').default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.tenantId] }),
}));
