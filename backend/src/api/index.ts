import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { env } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { AppError, ErrorCode, toErrorResponse } from '../lib/errors.js';
import { auth } from '../auth/index.js';
import { authMiddleware, loadSession } from './middleware/auth.js';
import { rbacMiddleware } from './middleware/rbac.js';
import { auditMiddleware } from './middleware/audit.js';
import { apiLogger } from './middleware/apiLogger.js';
import { cspMiddleware } from './middleware/csp.js';
import { bodyLimitMiddleware } from './middleware/bodyLimit.js';
import { csrfMiddleware } from './middleware/csrf.js';
import { healthRoutes } from './routes/health.js';
import { tenantRoutes } from './routes/tenants.js';
import { userRoutes } from './routes/users.js';
import { billingRoutes } from './routes/billing.js';
import { analyticsRoutes } from './routes/analytics.js';
import { settingsRoutes } from './routes/settings.js';
import { auditRoutes } from './routes/audit.js';
import { integrationsRoutes } from './routes/integrations.js';
import { siteAdaptersRoutes } from './routes/site-adapters.js';
import { webhooksStripeRoutes } from './routes/webhooks-stripe.js';
import { rbacRoutes } from './routes/rbac.js';
import { billingInvoicesRoutes } from './routes/billing-invoices.js';
import { proxyPostRoutes } from './routes/proxy-post.js';
import { proxyStoreRoutes } from './routes/proxy-store.js';
import { eventsRoutes } from './routes/events.js';

const log = logger.child({ module: 'server' });

const devOrigin = env.FRONTEND_URL ?? `http://localhost:${env.FRONTEND_PORT}`;
const app = new Elysia()
  .use(
    cors({
      origin: env.NODE_ENV === 'production' ? [env.BETTER_AUTH_URL] : [devOrigin],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    }),
  )
  .use(cspMiddleware)
  .use(bodyLimitMiddleware)
  .use(csrfMiddleware)
  .mount(auth.handler)
  // Auth derive MUST be at the global app level so `user`/`session` is
  // available to every route — including sub-app plugins that don't
  // `.use(authMiddleware)` themselves.
  .derive(async ({ request }) => loadSession(request.headers))
  .use(apiLogger)
  .use(eventsRoutes)
  .onError(({ code, error, set }) => {
    // Elysia framework-level errors (validation, not found) — sanitise via AppError.
    if (code === 'VALIDATION') {
      log.warn({ code, error: String(error) }, 'Validation error');
      const appErr = new AppError({
        code: ErrorCode.VALIDATION_ERROR,
        details: String(error),
      });
      set.status = appErr.status;
      return { error: appErr.message, code: appErr.code, details: appErr.details };
    }
    if (code === 'NOT_FOUND') {
      const appErr = new AppError({ code: ErrorCode.NOT_FOUND });
      set.status = appErr.status;
      return { error: appErr.message, code: appErr.code };
    }
    // AppError instances keep their code/message; everything else collapses to a generic 500
    // so we never leak DB schema, table names, file paths, or stack traces to clients.
    const sanitized = toErrorResponse(error);
    log.error(
      { code, status: sanitized.status, error: String(error) },
      'Unhandled error',
    );
    set.status = sanitized.status;
    return sanitized.body;
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
  .use(siteAdaptersRoutes)
  .use(webhooksStripeRoutes)
  .use(proxyPostRoutes)
  .use(proxyStoreRoutes)
  .listen(env.API_PORT);

log.info({ port: env.API_PORT }, `hiai-admin API running on port ${env.API_PORT}`);

export type App = typeof app;
