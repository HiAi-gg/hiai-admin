import { Elysia, t } from 'elysia';
import { loadSession } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/audit.js';
import { tenantService } from '../../modules/tenant/tenant.service.js';

export const tenantRoutes = new Elysia({ prefix: '/api/tenants' })
  .use(auditMiddleware)

  .get(
    '/',
    async (ctx: any) => {
      const { user } = await loadSession(ctx.request.headers);
      if (!user) {
        ctx.set.status = 401;
        return { error: 'Unauthorized' };
      }
      const { query, set } = ctx;
      try {
        return await tenantService.list({
          page: query.page ?? 1,
          limit: query.limit ?? 20,
          status: query.status,
          search: query.search,
        });
      } catch (error: any) {
        set.status = 500;
        return { error: error.message };
      }
    },
    {
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
    async (ctx: any) => {
      const { user } = await loadSession(ctx.request.headers);
      if (!user) {
        ctx.set.status = 401;
        return { error: 'Unauthorized' };
      }
      const { params, set } = ctx;
      try {
        return { data: await tenantService.getById(params.id) };
      } catch (error: any) {
        set.status = 404;
        return { error: error.message };
      }
    },
  )

  .post(
    '/',
    async (ctx: any) => {
      const { user } = await loadSession(ctx.request.headers);
      if (!user) {
        ctx.set.status = 401;
        return { error: 'Unauthorized' };
      }
      const { body, set } = ctx;
      try {
        const { name, slug, email, plan } = body as any;
        return { data: await tenantService.create({ name, slug, email, plan }) };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    {
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
    async (ctx: any) => {
      const { user } = await loadSession(ctx.request.headers);
      if (!user) {
        ctx.set.status = 401;
        return { error: 'Unauthorized' };
      }
      const { params, body, set } = ctx;
      try {
        return { data: await tenantService.update(params.id, body as any) };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    {
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
    async (ctx: any) => {
      const { user } = await loadSession(ctx.request.headers);
      if (!user) {
        ctx.set.status = 401;
        return { error: 'Unauthorized' };
      }
      const { params, set } = ctx;
      try {
        return { data: await tenantService.softDelete(params.id) };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
  )

  .post(
    '/:id/suspend',
    async (ctx: any) => {
      const { user } = await loadSession(ctx.request.headers);
      if (!user) {
        ctx.set.status = 401;
        return { error: 'Unauthorized' };
      }
      const { params, body, set } = ctx;
      try {
        return { data: await tenantService.suspend(params.id, (body as any)?.reason) };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    {
      body: t.Object({
        reason: t.Optional(t.String({ maxLength: 500 })),
      }),
    },
  )

  .post(
    '/:id/reactivate',
    async (ctx: any) => {
      const { user } = await loadSession(ctx.request.headers);
      if (!user) {
        ctx.set.status = 401;
        return { error: 'Unauthorized' };
      }
      const { params, set } = ctx;
      try {
        return { data: await tenantService.reactivate(params.id) };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
  )

  .post(
    '/:id/change-plan',
    async (ctx: any) => {
      const { user } = await loadSession(ctx.request.headers);
      if (!user) {
        ctx.set.status = 401;
        return { error: 'Unauthorized' };
      }
      const { params, body, set } = ctx;
      try {
        return { data: await tenantService.changePlan(params.id, (body as any).plan) };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    {
      body: t.Object({
        plan: t.String({ minLength: 1 }),
      }),
    },
  );
