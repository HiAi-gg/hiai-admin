// Server-only: resolves the per-adapter SSO signing secret (§12).
// Imports the backend service in-process (same pattern as hooks.server.ts
// importing the shared Better Auth instance) — the encrypted secret is
// decrypted server-side and never crosses the wire to the client.
import { siteAdapterService } from '../../../../backend/src/modules/site-adapter/site-adapter.service.js';

/**
 * The DB is the source of truth (what the connect wizard stores). Falls back to
 * env for ops/seed deployments where the secret is provisioned out-of-band
 * (e.g. the webs copy's `.env.webs`): `SITE_ADAPTER_JWT_SECRET_<SLUG>` →
 * `WEBS_BACKEND_JWT_SECRET`.
 */
export async function resolveAdapterSecret(pluginId: string): Promise<string | undefined> {
  try {
    const dbSecret = await siteAdapterService.getSigningSecret(pluginId);
    if (dbSecret) return dbSecret;
  } catch {
    // A DB hiccup must not break the proxy — fall through to env.
  }
  const key = `SITE_ADAPTER_JWT_SECRET_${pluginId.replace(/-/g, '_').toUpperCase()}`;
  return process.env[key] ?? process.env.WEBS_BACKEND_JWT_SECRET;
}
