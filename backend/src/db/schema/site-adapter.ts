import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenant.js';

/**
 * A Site adapter is a tenant-scoped plugin whose proxy target and enabled CMS
 * modules come from configuration (DB) rather than a hardcoded manifest. It is
 * how an arbitrary consumer site (e.g. a webs site) registers itself as a
 * source of admin data.
 *
 * Phase 3 pathMap fields:
 *   - apiBase      relative API prefix to prepend on the consumer backend (e.g.
 *                  `/api/v1`). Together with `pathMap`, the admin knows how to
 *                  rewrite admin URLs (`/articles` -> `/articles/admin/list`)
 *                  without forcing the consumer backend to hand-roll prefix
 *                  routing itself.
 *   - siteId       numeric/string id of the site in the consumer backend. Used
 *                  when calling endpoints that need a numeric site id
 *                  (e.g. webs `verify/delete`). Optional — only webs-style
 *                  adapters care.
 *   - publicSlug   the site slug visible to end users (e.g. `croco` for the
 *                  `webs-croco` plugin). Used by the proxy to resolve the
 *                  consumer-side entity from the admin URL.
 *   - adapterSlug  the plugin slug (e.g. `webs-croco`). Usually equals the
 *                  DB `slug`, kept separate for clarity in API responses.
 *   - pathMap      per-module URL rewrite rules. Shape:
 *                  `{ articles: { list: `/articles/admin/list?site={publicSlug}`,
 *                                 byId: `/articles/admin/{id}` },
 *                     homepageBlocks: { bySite: `/homepage-blocks/admin/site-by-slug/{publicSlug}` },
 *                     domains: { verify: `/domains/{domain}/admin/verify` },
 *                     ... }`.
 *                  The proxy endpoint `/api/site-proxy/:adapterSlug/{pathMapKey}/...`
 *                  uses these rules to rewrite into the consumer backend URL.
 *
 * `jwtSecret` is stored encrypted (per-adapter shared secret used to mint the
 * backend JWT for SSO); it is never returned to the client.
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
    apiBase: text('api_base').notNull().default('/api/v1'),
    auth: text('auth').notNull().default('jwt'), // 'jwt' | 'api-key'
    jwtSecretEncrypted: text('jwt_secret_encrypted'), // AES-256-GCM, never exposed
    modules: jsonb('modules').$type<string[]>().notNull().default([]),
    // PathMap-driven proxy support. See schema header.
    siteId: text('site_id'),
    publicSlug: text('public_slug'),
    adapterSlug: text('adapter_slug'),
    pathMap: jsonb('path_map').$type<Record<string, unknown>>().notNull().default({}),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('site_adapters_tenant_idx').on(table.tenantId),
    index('site_adapters_enabled_idx').on(table.enabled),
    index('site_adapters_public_slug_idx').on(table.publicSlug),
    uniqueIndex('site_adapters_public_slug_unique').on(table.publicSlug),
  ],
);
