import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const settings = pgTable('settings', {
  id: text('id').primaryKey(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  updatedBy: text('updated_by'),
});

export const integrations = pgTable('integrations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  credentialsEncrypted: text('credentials_encrypted'),
  config: jsonb('config').default({}),
  status: text('status').notNull().default('disconnected'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
