import { eq } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { siteAdapters } from '../../db/schema/index.js';
import { db } from '../../lib/db.js';
import { AppError, ErrorCode } from '../../lib/errors.js';
import { siteAdapterService } from '../../modules/site-adapter/site-adapter.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import {
  checkHealthSchema,
  createSiteAdapterSchema,
  updateSiteAdapterSchema,
} from '../validation/site-adapter.schema.js';

export const siteAdaptersRoutes = new Elysia({ prefix: '/api/site-adapters' })
  .use(createRateLimiter('admin'))
  .use(authMiddleware)
  .use(rbacMiddleware)
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
  )
  .get(
    '/:slug',
    async ({ params, set }) => {
      const adapter = await siteAdapterService.getBySlug(params.slug);
      if (!adapter) {
        set.status = 404;
        return { error: `No site adapter with slug "${params.slug}"` };
      }
      return { adapter };
    },
    { requireSuperAdmin: true },
  )
  .patch(
    '/:slug',
    async ({ params, body, set }) => {
      const parsed = updateSiteAdapterSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: 'Validation failed', details: parsed.error.flatten() };
      }
      const [row] = await db
        .select({ id: siteAdapters.id })
        .from(siteAdapters)
        .where(eq(siteAdapters.slug, params.slug))
        .limit(1);
      if (!row) {
        set.status = 404;
        throw new AppError({
          code: ErrorCode.NOT_FOUND,
          message: `No site adapter with slug "${params.slug}"`,
        });
      }
      const adapter = await siteAdapterService.update(row.id, parsed.data);
      return { adapter };
    },
    { requireSuperAdmin: true },
  )
  .put(
    '/:slug',
    async ({ params, body, set }) => {
      // PUT behaves identically to PATCH here — accept the partial update
      // for callers that prefer PUT semantics.
      const parsed = updateSiteAdapterSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: 'Validation failed', details: parsed.error.flatten() };
      }
      const [row] = await db
        .select({ id: siteAdapters.id })
        .from(siteAdapters)
        .where(eq(siteAdapters.slug, params.slug))
        .limit(1);
      if (!row) {
        set.status = 404;
        throw new AppError({
          code: ErrorCode.NOT_FOUND,
          message: `No site adapter with slug "${params.slug}"`,
        });
      }
      const adapter = await siteAdapterService.update(row.id, parsed.data);
      return { adapter };
    },
    { requireSuperAdmin: true },
  );
