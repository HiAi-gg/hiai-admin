import { Elysia } from 'elysia';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { logger } from '../../lib/logger.js';

const STORE_API = process.env.HIAI_STORE_API_URL || 'http://localhost:50400';
const log = logger.child({ module: 'proxy-store' });

export const proxyStoreRoutes = new Elysia({ prefix: '/api/shop' })
  .use(authMiddleware)
  .use(rbacMiddleware)
  .all(
    '/*',
    async ({ request, set }) => {
    const url = new URL(request.url);
    const targetPath = url.pathname.replace('/api/shop', '');
    const targetUrl = `${STORE_API}/api/v1${targetPath}${url.search}`;

    const headers = new Headers();
    const contentType = request.headers.get('content-type');
    if (contentType) headers.set('content-type', contentType);
    const auth = request.headers.get('authorization');
    if (auth) headers.set('authorization', auth);

    try {
      const res = await fetch(targetUrl, {
        method: request.method,
        headers,
        body:
          request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
      });

      const body = await res.text();
      set.status = res.status;
      return new Response(body, {
        status: res.status,
        headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
      });
    } catch (err) {
      log.error({ error: String(err), target: targetUrl }, 'Proxy to hiai-store failed');
      set.status = 502;
      return { error: 'hiai-store backend unavailable' };
    }
  },
  { requirePermission: 'tenants:read' },
);
