import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(), // stripe, shippo, observe, novu
  credentialsEncrypted: text('credentials_encrypted'),
  config: jsonb('config').default({}).notNull(),
  status: text('status').default('disconnected').notNull(), // connected, disconnected, error
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
