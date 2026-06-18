import { pgTable, uuid, text, jsonb, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenant.js';

/**
 * A Site adapter is a tenant-scoped plugin whose proxy target and enabled CMS
 * modules come from configuration (DB) rather than a hardcoded manifest. It is
 * how an arbitrary consumer site (e.g. a webs site) registers itself as a
 * source of admin data. See HIAI_ADMIN_DIFFS §3.
 *
 * `jwtSecret` is stored encrypted (per-adapter shared secret used to mint the
 * backend JWT for SSO — see §12); it is never returned to the client.
 */
export const siteAdapters = pgTable(
  'site_adapters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull().unique(), // = plugin id, e.g. "webs-croco"
    name: text('name').notNull(),
    backendUrl: text('backend_url').notNull(), // proxy.target
    auth: text('auth').notNull().default('jwt'), // 'jwt' | 'api-key'
    jwtSecretEncrypted: text('jwt_secret_encrypted'), // AES-256-GCM, never exposed
    modules: jsonb('modules').$type<string[]>().notNull().default([]),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('site_adapters_tenant_idx').on(table.tenantId),
    index('site_adapters_enabled_idx').on(table.enabled),
  ],
);
