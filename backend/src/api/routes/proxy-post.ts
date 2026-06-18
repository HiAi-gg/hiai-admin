import { Elysia } from 'elysia';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { logger } from '../../lib/logger.js';

const POST_API = process.env.HIAI_POST_API_URL || 'http://localhost:50300';
const log = logger.child({ module: 'proxy-post' });

export const proxyPostRoutes = new Elysia({ prefix: '/api/social' })
  .use(authMiddleware)
  .use(rbacMiddleware)
  .all(
    '/*',
    async ({ request, set }) => {
      const url = new URL(request.url);
      const targetPath = url.pathname.replace('/api/social', '');
      const targetUrl = `${POST_API}/api/v1${targetPath}${url.search}`;

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
        log.error({ error: String(err), target: targetUrl }, 'Proxy to hiai-post failed');
        set.status = 502;
        return { error: 'hiai-post backend unavailable' };
      }
    },
    { requireSuperAdmin: true },
  );
