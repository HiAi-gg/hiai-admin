import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { env } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { redis } from '../lib/redis.js';
import { authMiddleware } from './middleware/auth.js';
import { rbacMiddleware } from './middleware/rbac.js';
import { auditMiddleware } from './middleware/audit.js';
import { apiLogger } from './middleware/apiLogger.js';
import { createRateLimiter } from './middleware/rateLimiter.js';
import { healthRoutes } from './routes/health.js';
import { tenantRoutes } from './routes/tenants.js';
import { userRoutes } from './routes/users.js';
import { billingRoutes } from './routes/billing.js';
import { analyticsRoutes } from './routes/analytics.js';
import { settingsRoutes } from './routes/settings.js';
import { auditRoutes } from './routes/audit.js';
import { integrationsRoutes } from './routes/integrations.js';
import { webhooksStripeRoutes } from './routes/webhooks-stripe.js';

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
  .use(apiLogger)
  .use(authMiddleware)
  .use(rbacMiddleware)
  .use(auditMiddleware)
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
  .use(healthRoutes)
  .use(tenantRoutes)
  .use(userRoutes)
  .use(billingRoutes)
  .use(analyticsRoutes)
  .use(settingsRoutes)
  .use(auditRoutes)
  .use(integrationsRoutes)
  .use(webhooksStripeRoutes)
  .listen(env.API_PORT);

log.info({ port: env.API_PORT }, `hiai-admin API running on port ${env.API_PORT}`);

export type App = typeof app;
