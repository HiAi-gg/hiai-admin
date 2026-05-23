import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenant.js';

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  stripeInvoiceId: text('stripe_invoice_id'),
  amount: integer('amount').notNull(), // cents
  currency: text('currency').default('USD').notNull(),
  status: text('status').default('open').notNull(), // paid, open, void
  pdfUrl: text('pdf_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
