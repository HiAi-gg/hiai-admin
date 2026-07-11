import { cors } from '@elysiajs/cors';
import { Elysia } from 'elysia';
import { auth, getAuthSignupPolicyError } from '../auth/index.js';
import { env } from '../lib/config.js';
import { AppError, ErrorCode, toErrorResponse } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { apiLogger } from './middleware/apiLogger.js';
import { auditMiddleware } from './middleware/audit.js';
import { authMiddleware, loadSession } from './middleware/auth.js';
import { bodyLimitMiddleware } from './middleware/bodyLimit.js';
import { cspMiddleware } from './middleware/csp.js';
import { csrfMiddleware } from './middleware/csrf.js';
import { rbacMiddleware } from './middleware/rbac.js';
import { analyticsRoutes } from './routes/analytics.js';
import { auditRoutes } from './routes/audit.js';
import { billingRoutes } from './routes/billing.js';
import { billingInvoicesRoutes } from './routes/billing-invoices.js';
import { eventsRoutes } from './routes/events.js';
import { healthRoutes } from './routes/health.js';
import { integrationsRoutes } from './routes/integrations.js';
import { notificationsRoutes } from './routes/notifications.js';
import { profileRoutes } from './routes/profile.js';
import { proxyPostRoutes } from './routes/proxy-post.js';
import { proxyStoreRoutes } from './routes/proxy-store.js';
import { rbacRoutes } from './routes/rbac.js';
import { settingsRoutes } from './routes/settings.js';
import { siteAdaptersRoutes } from './routes/site-adapters.js';
import { siteAccessRoutes } from './routes/site-access.js';
import { siteInvitesRoutes } from './routes/site-invites.js';
import { siteProxyRoutes } from './routes/site-proxy.js';
import { integrationTokenRoutes } from './routes/integration-tokens.js';
import { tenantRoutes } from './routes/tenants.js';
import { userRoutes } from './routes/users.js';
import { webhooksStripeRoutes } from './routes/webhooks-stripe.js';
import { ensureIntegrationRegistry } from '../modules/integrations/integration-registry.js';

ensureIntegrationRegistry();

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
  .onBeforeHandle(({ request, set }) => {
    const policy = getAuthSignupPolicyError(
      new URL(request.url).pathname,
      request.method,
      request.headers,
      env.AUTH_SIGNUP_MODE,
    );
    if (!policy) return;

    set.status = policy.status;
    return {
      error: policy.message,
      code: policy.code,
      mode: env.AUTH_SIGNUP_MODE,
    };
  })
  .mount(auth.handler)
  // Auth derive MUST be at the global app level so `user`/`session` is
  // available to every route - including sub-app plugins that don't
  // `.use(authMiddleware)` themselves.
  .derive(async ({ request }) => loadSession(request.headers))
  .use(apiLogger)
  .use(eventsRoutes)
  .onError(({ code, error, set }) => {
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
    const sanitized = toErrorResponse(error);
    log.error({ code, status: sanitized.status, error: String(error) }, 'Unhandled error');
    set.status = sanitized.status;
    return sanitized.body;
  })
  .use(authMiddleware)
  .use(rbacMiddleware)
  .use(siteInvitesRoutes)
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
  .use(siteAccessRoutes)
  .use(siteProxyRoutes)
  .use(integrationTokenRoutes)
  .use(webhooksStripeRoutes)
  .use(proxyPostRoutes)
  .use(proxyStoreRoutes)
  .use(profileRoutes)
  .use(notificationsRoutes)
  .listen(env.API_PORT);

log.info({ port: env.API_PORT }, `hiai-admin API running on port ${env.API_PORT}`);

export type App = typeof app;
