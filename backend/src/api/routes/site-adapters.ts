import { Elysia } from 'elysia';
import { authMiddleware } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { siteAdapterService } from '../../modules/site-adapter/site-adapter.service.js';
import {
  createSiteAdapterSchema,
  checkHealthSchema,
} from '../validation/site-adapter.schema.js';

export const siteAdaptersRoutes = new Elysia({ prefix: '/api/site-adapters' })
  .use(createRateLimiter('admin'))
  .use(authMiddleware)
  .get(
    '/',
    async ({ query }) => {
      const tenantId = (query as { tenantId?: string }).tenantId;
      return { adapters: await siteAdapterService.list(tenantId) };
    },
    { requireSuperAdmin: true },
  )
  .post(
    '/check-health',
    async ({ body, set }) => {
      const parsed = checkHealthSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: 'Validation failed', details: parsed.error.flatten() };
      }
      return siteAdapterService.checkHealth(parsed.data.backendUrl);
    },
    { requireSuperAdmin: true },
  )
  .post(
    '/',
    async ({ body, set }) => {
      const parsed = createSiteAdapterSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: 'Validation failed', details: parsed.error.flatten() };
      }
      // Gate connection on a successful health probe of the target backend.
      const health = await siteAdapterService.checkHealth(parsed.data.backendUrl);
      if (!health.ok) {
        set.status = 400;
        return {
          error: `Backend health check failed${health.status ? ` (HTTP ${health.status})` : ' (unreachable)'}`,
        };
      }
      const adapter = await siteAdapterService.create(parsed.data);
      set.status = 201;
      return { adapter };
    },
    { requireSuperAdmin: true },
  );
