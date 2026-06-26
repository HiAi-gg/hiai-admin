import { pgTable, uuid, text, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';

/**
 * Persistent notification log.
 *
 * Mirrors the Novu feed but lives in our database so the admin UI can:
 *   - List notifications per user
 *   - Mark as read (independent of Novu's per-channel delivery state)
 *   - Audit who-saw-what-when
 *
 * When Novu is configured, `novuMessageId` stores the transactional id
 * returned by /v1/events/trigger so we can call /v1/messages/mark-as.
 * When Novu is NOT configured (no API key), we still write the row locally
 * and the UI shows it from this table — the integrations page remains the
 * source of truth for "is delivery actually wired up?".
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    type: text('type').notNull(), // 'tenant_created' | 'payment_failed' | 'tenant_invite' | ...
    title: text('title').notNull(),
    body: text('body'),
    data: jsonb('data').default({}),
    novuMessageId: text('novu_message_id'),
    read: boolean('read').notNull().default(false),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('notifications_user_idx').on(table.userId),
    index('notifications_user_unread_idx').on(table.userId, table.read),
    index('notifications_created_idx').on(table.createdAt),
  ],
);
