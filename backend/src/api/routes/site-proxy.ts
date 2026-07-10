import { Elysia } from 'elysia';
import { mintBackendToken } from '../../lib/backend-token.js';
import { logger } from '../../lib/logger.js';
import { siteAdapterService } from '../../modules/site-adapter/site-adapter.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { authorizeSiteAdmin } from '../middleware/site-access.js';
import { substitutePathPlaceholders } from '../validation/site-adapter.schema.js';

const log = logger.child({ module: 'site-proxy' });

/**
 * pathMap-driven proxy (Phase 3 P1.6).
 *
 * Each registered site adapter carries a JSON `pathMap` describing how to
 * rewrite admin-facing URLs into consumer-side URLs. Example for webs:
 *
 *   {
 *     articles:        { list: '/articles/admin/list?site={publicSlug}' },
 *     homepageBlocks:  { bySite: '/homepage-blocks/admin/site-by-slug/{publicSlug}' },
 *     domains:         { verify: '/domains/{domain}/admin/verify' },
 *   }
 *
 * Routes look like:
 *
 *   GET /api/site-proxy/:adapterSlug/articles
 *     -> pathMapKey='articles', subKey='' -> '/articles/admin/list?site=croco'
 *
 *   GET /api/site-proxy/:adapterSlug/homepage-blocks
 *     -> pathMapKey='homepageBlocks', subKey='' -> '/homepage-blocks/admin/site-by-slug/croco'
 *
 *   GET /api/site-proxy/:adapterSlug/domains/example.com
 *     -> pathMapKey='domains', subKey='example.com' -> '/domains/example.com/admin/verify'
 *
 * Unmatched keys 404. Permissive fall-through is intentionally avoided.
 *
 * SSO: when the adapter`s `auth === 'jwt'`, we sign a HS256 backend token
 * with the per-adapter secret and forward it as `Authorization: Bearer …`.
 */

interface PathMapEntry {
  [template: string]: string;
}

function pickTopLevel(restPath: string): { key: string; subKey: string } | null {
  const segments = restPath.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  return { key: segments[0] as string, subKey: segments.slice(1).join('/') };
}

function buildProxyUrl(
  backendUrl: string,
  apiBase: string,
  template: string,
  params: Record<string, string>,
  forwardSearch: URLSearchParams,
): URL | null {
  const rewritten = substitutePathPlaceholders(template, params);
  const qIdx = rewritten.indexOf('?');
  let pathPart: string;
  let templateQuery: URLSearchParams;
  if (qIdx >= 0) {
    pathPart = rewritten.slice(0, qIdx);
    templateQuery = new URLSearchParams(rewritten.slice(qIdx + 1));
  } else {
    pathPart = rewritten;
    templateQuery = new URLSearchParams();
  }
  const base = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
  const joinPath =
    (apiBase.endsWith('/') ? apiBase : apiBase) +
    (pathPart.startsWith('/') ? pathPart : `/${pathPart}`);
  const url = new URL(`${base}${joinPath}`);
  for (const [k, v] of templateQuery.entries()) url.searchParams.set(k, v);
  for (const [k, v] of forwardSearch.entries()) {
    if (!url.searchParams.has(k)) url.searchParams.set(k, v);
  }
  return url;
}

/**
 * Resolve the SSO signing secret for a given adapter slug. Mirrors
 * app/src/lib/server/adapter-secret.ts but lives in the backend so the Elysia
 * proxy can run without crossing the SSR boundary.
 */
async function resolveAdapterSecret(slug: string): Promise<string | undefined> {
  try {
    const dbSecret = await siteAdapterService.getSigningSecret(slug);
    if (dbSecret) return dbSecret;
  } catch {
    // A DB hiccup must not break the proxy — fall through to env.
  }
  const key = `SITE_ADAPTER_JWT_SECRET_${slug.replace(/-/g, '_').toUpperCase()}`;
  return process.env[key] ?? process.env.WEBS_BACKEND_JWT_SECRET;
}

export const siteProxyRoutes = new Elysia({ prefix: '/api/site-proxy' })
  .use(createRateLimiter('admin'))
  .use(authMiddleware)
  .use(rbacMiddleware)
  .all(
    '/*',
    async ({ request, set, user: rawUser }: any) => {
      const user = rawUser as { id: string; email: string; role?: string } | null;
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      const url = new URL(request.url);
      const rest = url.pathname.replace(/^\/api\/site-proxy\//, '');
      const first = pickTopLevel(rest);
      if (!first) {
        set.status = 400;
        return { error: 'site-proxy path required' };
      }

      const access = await authorizeSiteAdmin(user, first.key);
      if (access.status !== 200) {
        set.status = access.status;
        return { error: access.status === 401 ? 'Unauthorized' : 'Forbidden' };
      }

      const adapter = await siteAdapterService.getBySlug(first.key);
      if (!adapter) {
        set.status = 404;
        return { error: `Unknown site adapter: ${first.key}` };
      }

      const pathMap = (adapter.pathMap ?? {}) as Record<string, unknown>;
      const entry = pathMap[first.key] as PathMapEntry | undefined;
      if (!entry || typeof entry !== 'object') {
        set.status = 404;
        return { error: `pathMap[${first.key}] not configured for adapter ${adapter.slug}` };
      }

      const subKeys = Object.keys(entry);
      let templateValue = (entry as Record<string, string>)[subKeys[0] ?? ''] ?? '';
      if (first.subKey && subKeys.includes(first.subKey)) {
        templateValue = (entry as Record<string, string>)[first.subKey] ?? '';
      } else if (subKeys.length > 1 && first.subKey) {
        set.status = 404;
        return {
          error: `pathMap[${first.key}] has no template '${first.subKey}'; known: ${subKeys.join(', ')}`,
        };
      }

      const params: Record<string, string> = {
        publicSlug: adapter.publicSlug ?? '',
        siteId: adapter.siteId ?? '',
        adapterSlug: adapter.adapterSlug ?? adapter.slug,
        id: first.subKey,
        domain: first.subKey,
      };

      const forwardSearch = new URLSearchParams(url.search);
      const targetUrl = buildProxyUrl(
        adapter.backendUrl,
        adapter.apiBase ?? '/api/v1',
        templateValue,
        params,
        forwardSearch,
      );
      if (!targetUrl) {
        set.status = 500;
        return { error: 'pathMap produced an unparseable URL' };
      }

      const headers = new Headers();
      const contentType = request.headers.get('content-type');
      if (contentType) headers.set('content-type', contentType);
      const tenantHeader = request.headers.get('x-tenant-id');
      if (tenantHeader) headers.set('x-tenant-id', tenantHeader);

      if (adapter.auth === 'jwt') {
        const secret = await resolveAdapterSecret(adapter.slug);
        if (!secret) {
          set.status = 502;
          return { error: `No SSO secret configured for adapter ${adapter.slug}` };
        }
        const token = mintBackendToken(
          { userId: user.id, email: user.email, role: user.role ?? 'admin' },
          secret,
        );
        headers.set('authorization', `Bearer ${token}`);
      } else {
        const auth = request.headers.get('authorization');
        if (auth) headers.set('authorization', auth);
      }

      const init: RequestInit = { method: request.method, headers };
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        init.body = await request.text();
      }

      try {
        const res = await fetch(targetUrl.toString(), init);
        const body = await res.text();
        return new Response(body, {
          status: res.status,
          headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
        });
      } catch (err) {
        log.error({ err, target: targetUrl.toString() }, 'site-proxy fetch failed');
        return { error: err instanceof Error ? err.message : 'site-proxy backend unavailable' };
      }
    },
    { requireAuth: true },
  );
