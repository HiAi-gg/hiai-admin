import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { siteAdapters } from './site-adapter.js';
import { users } from './user.js';

/**
 * Schema-ready site membership model for W1A.
 *
 * Not yet wired into route/service logic in this phase. The table is prepared so
 * test-site-only workflows can attach per-site helper identities and roles
 * independently of tenant-level membership logic.
 */
export const siteMemberships = pgTable('site_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  siteAdapterId: uuid('site_adapter_id')
    .notNull()
    .references(() => siteAdapters.id, { onDelete: 'cascade' }),
  globalRole: text('global_role').notNull().default('viewer'),
  role: text('role').notNull().default('member'),
  permissions: jsonb('permissions').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
