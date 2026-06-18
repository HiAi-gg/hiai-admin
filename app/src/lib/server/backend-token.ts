import { createHmac } from 'node:crypto';

/**
 * Mints a backend JWT for SSO with a consumer site (HIAI_ADMIN_DIFFS §12).
 *
 * The admin proxies an adapter's API by presenting a short-lived HS256 token
 * signed with the per-adapter shared secret — the same format the consumer
 * site's own admin issues (`webs/admin/src/lib/{jwt,backendAuth}.ts`):
 *   header  { alg: 'HS256' }
 *   payload { sub, email, role, iat, exp }   (exp = iat + 1h)
 *
 * Implemented with `node:crypto` HMAC (no `jose` dependency). The output is a
 * standard JWT verifiable by any HS256 verifier holding the shared secret.
 */

/** Admin → site backend role mapping (mirrors webs `createBackendToken`). */
const ROLE_MAPPING: Record<string, string> = {
  site_admin: 'editor',
  admin: 'admin',
  super_admin: 'super_admin',
};

export interface BackendTokenClaims {
  userId: string;
  email: string;
  role: string;
}

export interface MintOptions {
  /** Epoch milliseconds; defaults to `Date.now()`. Injectable for tests. */
  now?: number;
  /** Token lifetime in seconds; defaults to 3600 (1h). */
  expiresInSec?: number;
}

function base64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

export function mintBackendToken(
  claims: BackendTokenClaims,
  secret: string,
  opts: MintOptions = {},
): string {
  if (!secret) throw new Error('mintBackendToken: secret is required');

  const iat = Math.floor((opts.now ?? Date.now()) / 1000);
  const exp = iat + (opts.expiresInSec ?? 3600);
  const role = ROLE_MAPPING[claims.role] ?? claims.role;

  const header = base64url(JSON.stringify({ alg: 'HS256' }));
  const payload = base64url(
    JSON.stringify({ sub: claims.userId, email: claims.email, role, iat, exp }),
  );
  const signingInput = `${header}.${payload}`;
  const signature = createHmac('sha256', secret).update(signingInput).digest('base64url');

  return `${signingInput}.${signature}`;
}
