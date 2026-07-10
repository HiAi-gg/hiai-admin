import { eq } from 'drizzle-orm';
import type {
  CreateSiteAdapterInput,
  UpdateSiteAdapterInput,
} from '../../api/validation/site-adapter.schema.js';
import { siteAdapters } from '../../db/schema/index.js';
import { db } from '../../lib/db.js';
import { decrypt, encrypt } from '../../lib/encryption.js';

/**
 * Client-safe view of a site adapter — NEVER includes the encrypted JWT secret.
 * This is what the admin frontend consumes to build dynamic Site adapter plugins.
 *
 * Phase 3 additions: `apiBase`, `siteId`, `publicSlug`, `adapterSlug`, `pathMap`
 * are exposed for the proxy + plugin registry to consume.
 */
export interface SiteAdapterDTO {
  id: string;
  tenantId: string;
  slug: string;
  adapterSlug?: string;
  publicSlug?: string;
  siteId?: string;
  name: string;
  backendUrl: string;
  apiBase: string;
  auth: 'jwt' | 'api-key';
  modules: string[];
  pathMap: Record<string, unknown>;
  adapterManifestVersion: string;
  connectorType: 'http' | 'drizzle';
  connectorConfig: Record<string, unknown>;
  capabilities: string[];
  externalSiteReference?: string;
  secretRefs: Record<string, string>;
  enabled: boolean;
}

type SiteAdapterRow = typeof siteAdapters.$inferSelect;

function toDTO(row: SiteAdapterRow): SiteAdapterDTO {
  return {
    id: row.id,
    tenantId: row.tenantId,
    slug: row.slug,
    adapterSlug: row.adapterSlug ?? row.slug,
    publicSlug: row.publicSlug ?? undefined,
    siteId: row.siteId ?? undefined,
    name: row.name,
    backendUrl: row.backendUrl,
    apiBase: row.apiBase ?? '/api/v1',
    auth: row.auth === 'api-key' ? 'api-key' : 'jwt',
    modules: row.modules ?? [],
    pathMap: (row.pathMap ?? {}) as Record<string, unknown>,
    adapterManifestVersion: row.adapterManifestVersion ?? '1.0.0',
    connectorType: row.connectorType === 'drizzle' ? 'drizzle' : 'http',
    connectorConfig: (row.connectorConfig ?? {}) as Record<string, unknown>,
    capabilities: row.capabilities ?? [],
    externalSiteReference: row.externalSiteReference ?? undefined,
    secretRefs: (row.secretRefs ?? {}) as Record<string, string>,
    enabled: row.enabled,
  };
}

export const siteAdapterService = {
  /** List adapters, optionally scoped to a tenant. Secrets are stripped. */
  async list(tenantId?: string): Promise<SiteAdapterDTO[]> {
    const rows = tenantId
      ? await db.select().from(siteAdapters).where(eq(siteAdapters.tenantId, tenantId))
      : await db.select().from(siteAdapters);
    return rows.map(toDTO);
  },

  /** Look up by `slug` (admin-internal plugin id, e.g. `webs-croco`). */
  async getBySlug(slug: string): Promise<SiteAdapterDTO | null> {
    const [row] = await db.select().from(siteAdapters).where(eq(siteAdapters.slug, slug)).limit(1);
    return row ? toDTO(row) : null;
  },

  /** Look up by `publicSlug` (consumer-facing slug, e.g. `croco`). Used by the
   *  pathMap proxy to resolve the backend from a user-supplied publicSlug. */
  async getByPublicSlug(publicSlug: string): Promise<SiteAdapterDTO | null> {
    const [row] = await db
      .select()
      .from(siteAdapters)
      .where(eq(siteAdapters.publicSlug, publicSlug))
      .limit(1);
    return row ? toDTO(row) : null;
  },

  /** Create an adapter; the per-site JWT secret (SSO) is encrypted at rest. */
  async create(input: CreateSiteAdapterInput): Promise<SiteAdapterDTO> {
    const [row] = await db
      .insert(siteAdapters)
      .values({
        tenantId: input.tenantId,
        slug: input.slug,
        adapterSlug: input.adapterSlug ?? input.slug,
        publicSlug: input.publicSlug ?? null,
        siteId: input.siteId ?? null,
        name: input.name,
        backendUrl: input.backendUrl,
        apiBase: input.apiBase ?? '/api/v1',
        auth: input.auth,
        jwtSecretEncrypted: input.jwtSecret ? encrypt(input.jwtSecret) : null,
        modules: input.modules,
        pathMap: input.pathMap ?? {},
        adapterManifestVersion: input.adapterManifestVersion,
        connectorType: input.connectorType,
        connectorConfig: input.connectorConfig ?? {},
        capabilities: input.capabilities ?? [],
        externalSiteReference: input.externalSiteReference ?? null,
        secretRefs: input.secretRefs ?? {},
      })
      .returning();
    return toDTO(row);
  },

  /** Partial update — every create-site-adapter field except tenantId is updatable. */
  async update(id: string, input: UpdateSiteAdapterInput): Promise<SiteAdapterDTO> {
    const [row] = await db
      .update(siteAdapters)
      .set({
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.backendUrl !== undefined ? { backendUrl: input.backendUrl } : {}),
        ...(input.apiBase !== undefined ? { apiBase: input.apiBase } : {}),
        ...(input.auth !== undefined ? { auth: input.auth } : {}),
        ...(input.modules !== undefined ? { modules: input.modules } : {}),
        ...(input.siteId !== undefined ? { siteId: input.siteId } : {}),
        ...(input.publicSlug !== undefined ? { publicSlug: input.publicSlug } : {}),
        ...(input.adapterSlug !== undefined ? { adapterSlug: input.adapterSlug } : {}),
        ...(input.pathMap !== undefined ? { pathMap: input.pathMap } : {}),
        ...(input.adapterManifestVersion !== undefined
          ? { adapterManifestVersion: input.adapterManifestVersion }
          : {}),
        ...(input.connectorType !== undefined ? { connectorType: input.connectorType } : {}),
        ...(input.connectorConfig !== undefined ? { connectorConfig: input.connectorConfig } : {}),
        ...(input.capabilities !== undefined ? { capabilities: input.capabilities } : {}),
        ...(input.externalSiteReference !== undefined
          ? { externalSiteReference: input.externalSiteReference }
          : {}),
        ...(input.secretRefs !== undefined ? { secretRefs: input.secretRefs } : {}),
        ...(input.jwtSecret !== undefined ? { jwtSecretEncrypted: encrypt(input.jwtSecret) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(siteAdapters.id, id))
      .returning();
    return toDTO(row);
  },

  /**
   * Server-side only: returns the decrypted per-adapter signing secret used to
   * mint the SSO backend token. NEVER expose this over an HTTP route — it is
   * consumed in-process by the proxy. Returns null when the adapter has no
   * stored secret (caller falls back to env).
   */
  async getSigningSecret(slug: string): Promise<string | null> {
    const [row] = await db
      .select({ secret: siteAdapters.jwtSecretEncrypted })
      .from(siteAdapters)
      .where(eq(siteAdapters.slug, slug))
      .limit(1);
    if (!row?.secret) return null;
    return decrypt(row.secret);
  },

  /**
   * Resolve the signing secret by `publicSlug` for proxy lookups initiated
   * with a public-side identifier. Mirrors {@link getSigningSecret} but uses
   * the consumer-facing column so the pathMap proxy (which knows the public
   * slug) can authenticate against the consumer backend without knowing the
   * internal plugin id.
   */
  async getSigningSecretByPublicSlug(publicSlug: string): Promise<string | null> {
    const [row] = await db
      .select({ secret: siteAdapters.jwtSecretEncrypted })
      .from(siteAdapters)
      .where(eq(siteAdapters.publicSlug, publicSlug))
      .limit(1);
    if (!row?.secret) return null;
    return decrypt(row.secret);
  },

  /**
   * Probe a candidate backend's `/health` before connecting it. Bounded by a
   * short timeout so a hung or unreachable host fails fast (never hangs the
   * connect wizard). Returns the observed status; never throws.
   */
  async checkHealth(backendUrl: string): Promise<{ ok: boolean; status: number | null }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const base = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
      const res = await fetch(`${base}/health`, { signal: controller.signal });
      return { ok: res.ok, status: res.status };
    } catch {
      return { ok: false, status: null };
    } finally {
      clearTimeout(timer);
    }
  },
};
