import { jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { siteAdapters } from './site-adapter.js';
import { users } from './user.js';

/** Exact user-to-site authorization, independent from tenant-level access. */
export const siteMemberships = pgTable(
  'site_memberships',
  {
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
  },
  (table) => [
    uniqueIndex('site_memberships_user_adapter_unique').on(table.userId, table.siteAdapterId),
  ],
);
