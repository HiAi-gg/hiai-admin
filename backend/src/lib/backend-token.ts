import { createHmac } from 'node:crypto';

/**
 * Mints a backend JWT for SSO with a consumer site (HIAI_ADMIN_DIFFS §12).
 *
 * The admin proxies an adapter`s API by presenting a short-lived HS256 token
 * signed with the per-adapter shared secret — the same format the consumer
 * site`s own admin issues. Implemented with `node:crypto` HMAC (no `jose`).
 *
 * This is the BACKEND twin of app/src/lib/server/backend-token.ts. Both keep
 * the same role mapping table and TTL policy so the SSO tokens look identical
 * regardless of which layer minted them.
 */

/** Admin -> site-backend role mapping. */
const ROLE_MAPPING: Record<string, string> = {
  site_admin: 'editor',
  tenant_admin: 'admin',
  admin: 'admin',
  super_admin: 'super_admin',
  editor: 'editor',
  viewer: 'viewer',
};

export interface BackendTokenClaims {
  userId: string;
  email: string;
  role: string;
}

export interface MintOptions {
  /** Epoch milliseconds; defaults to `Date.now()`. Injectable for tests. */
  now?: number;
  /** Override the env-derived TTL — useful for tests / short-lived probes. */
  expiresInSec?: number;
}

function base64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

/**
 * Resolve the SSO token TTL.
 *
 *   1. Explicit `opts.expiresInSec` wins (tests / overrides).
 *   2. Otherwise BACKEND_TOKEN_EXPIRES_IN_SEC from the runtime config.
 *   3. Falls back to 3600 (1h) if neither is set.
 */
function resolveExpiresInSec(opts: MintOptions): number {
  if (opts.expiresInSec !== undefined) return opts.expiresInSec;
  const envVal = process.env.BACKEND_TOKEN_EXPIRES_IN_SEC;
  if (envVal && Number.isFinite(Number(envVal)) && Number(envVal) > 0) {
    return Number(envVal);
  }
  return 3600;
}

export function mintBackendToken(
  claims: BackendTokenClaims,
  secret: string,
  opts: MintOptions = {},
): string {
  if (!secret) throw new Error('mintBackendToken: secret is required');

  const iat = Math.floor((opts.now ?? Date.now()) / 1000);
  const exp = iat + resolveExpiresInSec(opts);
  const role = ROLE_MAPPING[claims.role] ?? claims.role;

  const header = base64url(JSON.stringify({ alg: 'HS256' }));
  const payload = base64url(
    JSON.stringify({ sub: claims.userId, email: claims.email, role, iat, exp }),
  );
  const signingInput = `${header}.${payload}`;
  const signature = createHmac('sha256', secret).update(signingInput).digest('base64url');

  return `${signingInput}.${signature}`;
}
