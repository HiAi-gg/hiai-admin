import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { env } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { auth } from '../auth/index.js';
import { authMiddleware, loadSession } from './middleware/auth.js';
import { rbacMiddleware } from './middleware/rbac.js';
import { auditMiddleware } from './middleware/audit.js';
import { apiLogger } from './middleware/apiLogger.js';
import { cspMiddleware } from './middleware/csp.js';
import { healthRoutes } from './routes/health.js';
import { tenantRoutes } from './routes/tenants.js';
import { userRoutes } from './routes/users.js';
import { billingRoutes } from './routes/billing.js';
import { analyticsRoutes } from './routes/analytics.js';
import { settingsRoutes } from './routes/settings.js';
import { auditRoutes } from './routes/audit.js';
import { integrationsRoutes } from './routes/integrations.js';
import { webhooksStripeRoutes } from './routes/webhooks-stripe.js';
import { rbacRoutes } from './routes/rbac.js';
import { billingInvoicesRoutes } from './routes/billing-invoices.js';
import { proxyPostRoutes } from './routes/proxy-post.js';
import { proxyStoreRoutes } from './routes/proxy-store.js';
import { eventsRoutes } from './routes/events.js';

const log = logger.child({ module: 'server' });

const app = new Elysia()
  .use(
    cors({
      origin: env.NODE_ENV === 'production' ? [env.BETTER_AUTH_URL] : '*',
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    }),
  )
  .use(cspMiddleware)
  .mount(auth.handler)
  // Auth derive MUST be at the global app level so `user`/`session` is
  // available to every route — including sub-app plugins that don't
  // `.use(authMiddleware)` themselves.
  .derive(async ({ request }) => loadSession(request.headers))
  .use(apiLogger)
  .use(eventsRoutes)
  .onError(({ code, error, set }) => {
    log.error({ code, error: String(error) }, 'Unhandled error');
    if (code === 'VALIDATION') {
      set.status = 400;
      return { error: 'Validation error', details: String(error) };
    }
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return { error: 'Not found' };
    }
    set.status = 500;
    return { error: 'Internal server error' };
  })
  .use(authMiddleware)
  .use(rbacMiddleware)
  .use(auditMiddleware)
  .use(healthRoutes)
  .use(tenantRoutes)
  .use(userRoutes)
  .use(rbacRoutes)
  .use(billingRoutes)
  .use(billingInvoicesRoutes)
  .use(analyticsRoutes)
  .use(settingsRoutes)
  .use(auditRoutes)
  .use(integrationsRoutes)
  .use(webhooksStripeRoutes)
  .use(proxyPostRoutes)
  .use(proxyStoreRoutes)
  .listen(env.API_PORT);

log.info({ port: env.API_PORT }, `hiai-admin API running on port ${env.API_PORT}`);

export type App = typeof app;
