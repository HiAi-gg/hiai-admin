import { jsonb, pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core';

/** Durable idempotency ledger for service-to-service site provisioning. */
export const integrationOperations = pgTable(
  'integration_operations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    operationId: text('operation_id').notNull(),
    payloadHash: text('payload_hash').notNull(),
    tokenJti: text('token_jti').notNull(),
    status: text('status').notNull().default('processing'),
    response: jsonb('response').$type<Record<string, unknown>>(),
    tenantId: uuid('tenant_id'),
    siteAdapterId: uuid('site_adapter_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('integration_operations_operation_id_unique').on(table.operationId),
    uniqueIndex('integration_operations_token_jti_unique').on(table.tokenJti),
  ],
);
