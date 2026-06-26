import { Elysia } from 'elysia';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { logger } from '../../lib/logger.js';

const DOCS_API = process.env.HIAI_DOCS_API || 'http://localhost:50700';
const DOCS_API_KEY = process.env.HIAI_DOCS_API_KEY;
const log = logger.child({ module: 'proxy-docs' });

export const proxyDocsRoutes = new Elysia({ prefix: '/api/documents' })
  .use(authMiddleware)
  .use(rbacMiddleware)
  .all(
    '/*',
    async ({ request, set }) => {
      const url = new URL(request.url);
      const targetPath = url.pathname.replace('/api/documents', '');
      const targetUrl = `${DOCS_API}/api/v1${targetPath}${url.search}`;

      const headers = new Headers();
      const contentType = request.headers.get('content-type');
      if (contentType) headers.set('content-type', contentType);

      // Auth resolution order:
      //   1. Caller-supplied `x-api-key` header — forwarded verbatim.
      //   2. Caller-supplied `Authorization` header — forwarded verbatim
      //      (works for both `Bearer <jwt>` and `ApiKey <key>` schemes).
      //   3. Server-side `HIAI_DOCS_API_KEY` — applied as a fallback so the
      //      admin can still reach the docs backend when the caller didn't
      //      provide credentials (useful for healthchecks / super-admin
      //      smoke-tests). This is the api-key mode advertised in
      //      `app/src/lib/plugins/hiai-docs.ts` (auth: 'api-key').
      const callerApiKey = request.headers.get('x-api-key');
      const callerAuth = request.headers.get('authorization');
      if (callerApiKey) {
        headers.set('x-api-key', callerApiKey);
        if (!callerAuth) headers.set('authorization', `ApiKey ${callerApiKey}`);
      } else if (callerAuth) {
        headers.set('authorization', callerAuth);
      } else if (DOCS_API_KEY) {
        headers.set('x-api-key', DOCS_API_KEY);
        headers.set('authorization', `ApiKey ${DOCS_API_KEY}`);
      }

      try {
        const res = await fetch(targetUrl, {
          method: request.method,
          headers,
          body:
            request.method !== 'GET' && request.method !== 'HEAD'
              ? await request.text()
              : undefined,
        });

        const body = await res.text();
        set.status = res.status;
        return new Response(body, {
          status: res.status,
          headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
        });
      } catch (err) {
        log.error({ error: String(err), target: targetUrl }, 'Proxy to hiai-docs failed');
        set.status = 502;
        return { error: 'hiai-docs backend unavailable' };
      }
    },
    { requireSuperAdmin: true },
  );
