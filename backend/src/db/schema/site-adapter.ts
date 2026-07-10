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
 * Site adapter metadata used by hiai-admin.
 *
 * W1A introduces a versioned, connector-aware manifest payload that can be
 * consumed by per-site helper tooling before UI wiring (test-site only for now).
 * The legacy fields (`backendUrl`, `apiBase`, `modules`, `pathMap`, etc.) remain
 * in schema while upstream feature work migrates toward manifest-first reads.
 */
export const siteAdapters = pgTable(
  'site_adapters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull().unique(), // = plugin id, e.g. "example-site"
    name: text('name').notNull(),

    // Backward-compatible connector fields
    backendUrl: text('backend_url').notNull(),
    apiBase: text('api_base').notNull().default('/api/v1'),
    auth: text('auth').notNull().default('jwt'), // 'jwt' | 'api-key'
    jwtSecretEncrypted: text('jwt_secret_encrypted'), // AES-256-GCM, never exposed
    modules: jsonb('modules').$type<string[]>().notNull().default([]),

    // Manifest-first metadata
    adapterManifestVersion: text('adapter_manifest_version').notNull().default('1.0.0'),
    connectorType: text('connector_type').notNull().default('http'), // 'http' | 'drizzle'
    connectorConfig: jsonb('connector_config')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    capabilities: jsonb('capabilities').$type<string[]>().notNull().default([]),
    externalSiteReference: text('external_site_reference'),
    secretRefs: jsonb('secret_refs').$type<Record<string, string>>().notNull().default({}),

    // PathMap-driven proxy support (legacy compatibility until route migration).
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
