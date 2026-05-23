import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'), // null = platform-level
  url: text('url').notNull(),
  events: jsonb('events').default([]).notNull(),
  secret: text('secret'),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
