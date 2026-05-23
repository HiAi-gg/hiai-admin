import { pgTable, text } from 'drizzle-orm/pg-core';

export const permissions = pgTable('permissions', {
  id: text('id').primaryKey(),
  name: text('name').unique().notNull(), // e.g. tenants:read
  resource: text('resource').notNull(), // e.g. tenants
  action: text('action').notNull(), // e.g. read
  description: text('description'),
});
