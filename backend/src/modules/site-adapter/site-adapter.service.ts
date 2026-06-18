import { db } from '../../lib/db.js';
import { siteAdapters } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from '../../lib/encryption.js';
import type { CreateSiteAdapterInput } from '../../api/validation/site-adapter.schema.js';

/**
 * Client-safe view of a site adapter — NEVER includes the encrypted JWT secret.
 * This is what the admin frontend consumes to build dynamic Site adapter plugins.
 */
export interface SiteAdapterDTO {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  backendUrl: string;
  auth: 'jwt' | 'api-key';
  modules: string[];
  enabled: boolean;
}

type SiteAdapterRow = typeof siteAdapters.$inferSelect;

function toDTO(row: SiteAdapterRow): SiteAdapterDTO {
  return {
    id: row.id,
    tenantId: row.tenantId,
    slug: row.slug,
    name: row.name,
    backendUrl: row.backendUrl,
    auth: row.auth === 'api-key' ? 'api-key' : 'jwt',
    modules: row.modules ?? [],
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

  /** Create an adapter; the per-site JWT secret (SSO, §12) is encrypted at rest. */
  async create(input: CreateSiteAdapterInput): Promise<SiteAdapterDTO> {
    const [row] = await db
      .insert(siteAdapters)
      .values({
        tenantId: input.tenantId,
        slug: input.slug,
        name: input.name,
        backendUrl: input.backendUrl,
        auth: input.auth,
        jwtSecretEncrypted: input.jwtSecret ? encrypt(input.jwtSecret) : null,
        modules: input.modules,
      })
      .returning();
    return toDTO(row);
  },

  /**
   * Server-side only: returns the decrypted per-adapter signing secret used to
   * mint the SSO backend token (§12). NEVER expose this over an HTTP route —
   * it is consumed in-process by the proxy. Returns null when the adapter has
   * no stored secret (caller falls back to env).
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
