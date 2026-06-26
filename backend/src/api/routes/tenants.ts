import { Elysia, t } from 'elysia';
import { auditMiddleware } from '../middleware/audit.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { tenantService } from '../../modules/tenant/tenant.service.js';
import {
  createTenantSchema,
  updateTenantSchema,
  suspendTenantSchema,
  changePlanSchema,
} from '../validation/tenant.schema.js';

export const tenantRoutes = new Elysia({ prefix: '/api/tenants' })
  .use(authMiddleware)
  .use(rbacMiddleware)
  .use(auditMiddleware)

  .get(
    '/',
    async ({ query, set }) => {
      try {
        return await tenantService.list({
          page: query.page ?? 1,
          limit: query.limit ?? 20,
          status: query.status,
          search: query.search,
        });
      } catch (_error: any) {
        set.status = 500;
        return { error: 'Failed to list tenants' };
      }
    },
    {
      requireSuperAdmin: true,
      query: t.Object({
        page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Integer({ minimum: 1, maximum: 100, default: 20 })),
        status: t.Optional(t.String({ maxLength: 50 })),
        search: t.Optional(t.String({ maxLength: 200 })),
        sortBy: t.Optional(t.String({ maxLength: 50 })),
        sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
      }),
    },
  )

  .get(
    '/:id',
    async ({ params, set }) => {
      try {
        return { data: await tenantService.getById(params.id) };
      } catch (_error: any) {
        set.status = 404;
        return { error: 'Tenant not found' };
      }
    },
    { requireSuperAdmin: true },
  )

  .post(
    '/',
    async ({ body, set }) => {
      const parsed = createTenantSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: 'Validation failed', details: parsed.error.flatten() };
      }
      try {
        return { data: await tenantService.create(parsed.data) };
      } catch (_error: any) {
        set.status = 400;
        return { error: 'Failed to create tenant' };
      }
    },
    {
      requireSuperAdmin: true,
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 200 }),
        slug: t.String({ minLength: 1, maxLength: 100 }),
        email: t.String({ format: 'email' }),
        plan: t.Optional(t.String()),
      }),
    },
  )

  .put(
    '/:id',
    async ({ params, body, set }) => {
      const parsed = updateTenantSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: 'Validation failed', details: parsed.error.flatten() };
      }
      try {
        return { data: await tenantService.update(params.id, parsed.data) };
      } catch (_error: any) {
        set.status = 400;
        return { error: 'Failed to update tenant' };
      }
    },
    {
      requireSuperAdmin: true,
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
        slug: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        email: t.Optional(t.String({ format: 'email' })),
        plan: t.Optional(t.String()),
      }),
    },
  )

  .delete(
    '/:id',
    async ({ params, set }) => {
      try {
        return { data: await tenantService.softDelete(params.id) };
      } catch (_error: any) {
        set.status = 400;
        return { error: 'Failed to delete tenant' };
      }
    },
    { requireSuperAdmin: true },
  )

  .post(
    '/:id/suspend',
    async ({ params, body, set }) => {
      const parsed = suspendTenantSchema.safeParse(body ?? {});
      if (!parsed.success) {
        set.status = 400;
        return { error: 'Validation failed', details: parsed.error.flatten() };
      }
      try {
        return { data: await tenantService.suspend(params.id, parsed.data.reason) };
      } catch (_error: any) {
        set.status = 400;
        return { error: 'Failed to suspend tenant' };
      }
    },
    {
      requireSuperAdmin: true,
      body: t.Object({
        reason: t.Optional(t.String({ maxLength: 500 })),
      }),
    },
  )

  .post(
    '/:id/reactivate',
    async ({ params, set }) => {
      try {
        return { data: await tenantService.reactivate(params.id) };
      } catch (_error: any) {
        set.status = 400;
        return { error: 'Failed to reactivate tenant' };
      }
    },
    { requireSuperAdmin: true },
  )

  .post(
    '/:id/change-plan',
    async ({ params, body, set }) => {
      const parsed = changePlanSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: 'Validation failed', details: parsed.error.flatten() };
      }
      try {
        return { data: await tenantService.changePlan(params.id, parsed.data.plan) };
      } catch (_error: any) {
        set.status = 400;
        return { error: 'Failed to change plan' };
      }
    },
    {
      requireSuperAdmin: true,
      body: t.Object({
        plan: t.String({ minLength: 1 }),
      }),
    },
  );
