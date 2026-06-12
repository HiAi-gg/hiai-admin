import { Elysia, t } from 'elysia';
import { auth } from '../../auth/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { auditMiddleware } from '../middleware/audit.js';
import { userService } from '../../modules/user/user.service.js';

export const userRoutes = new Elysia({ prefix: '/api/users' })
  .use(authMiddleware)
  .use(rbacMiddleware)
  .use(auditMiddleware)

  .get(
    '/me',
    async (ctx: any) => {
      const session = await auth.api.getSession({ headers: ctx.request.headers });
      if (!session) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
      const u = session.user;
      const profile = await userService.getByEmail((u as any).email);
      return {
        id: (u as any).id,
        email: (u as any).email,
        name: (u as any).name,
        role: profile?.role ?? 'viewer',
        image: (u as any).image,
        emailVerified: (u as any).emailVerified,
      };
    },
  )

  .get(
    '/',
    async ({ query, set }) => {
      try {
        return await userService.list({
          page: query.page ?? 1,
          limit: query.limit ?? 20,
          search: query.search,
          role: query.role,
          tenantId: query.tenantId,
        });
      } catch (error: any) {
        set.status = 500;
        return { error: error.message };
      }
    },
    {
      requirePermission: 'users:read',
      query: t.Object({
        page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Integer({ minimum: 1, maximum: 100, default: 20 })),
        search: t.Optional(t.String({ maxLength: 200 })),
        role: t.Optional(
          t.Union([
            t.Literal('super_admin'),
            t.Literal('tenant_admin'),
            t.Literal('editor'),
            t.Literal('viewer'),
          ]),
        ),
        tenantId: t.Optional(t.String({ format: 'uuid' })),
        sortBy: t.Optional(t.String({ maxLength: 50 })),
        sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
      }),
    },
  )

  .get(
    '/:id',
    async ({ params, set }) => {
      try {
        return { data: await userService.getById(params.id) };
      } catch (error: any) {
        set.status = 404;
        return { error: error.message };
      }
    },
    { requirePermission: 'users:read' },
  )

  .post(
    '/',
    async ({ body, set }) => {
      try {
        return { data: await userService.create(body as any) };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    {
      requirePermission: 'users:write',
      body: t.Object({
        email: t.String({ format: 'email' }),
        name: t.String({ minLength: 1, maxLength: 200 }),
        role: t.Optional(
          t.Union([
            t.Literal('super_admin'),
            t.Literal('tenant_admin'),
            t.Literal('editor'),
            t.Literal('viewer'),
          ]),
        ),
        tenantId: t.Optional(t.String({ format: 'uuid' })),
      }),
    },
  )

  .put(
    '/:id',
    async ({ params, body, set }) => {
      try {
        return { data: await userService.update(params.id, body as any) };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    {
      requirePermission: 'users:write',
      body: t.Object({
        email: t.Optional(t.String({ format: 'email' })),
        name: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
        role: t.Optional(
          t.Union([
            t.Literal('super_admin'),
            t.Literal('tenant_admin'),
            t.Literal('editor'),
            t.Literal('viewer'),
          ]),
        ),
      }),
    },
  )

  .delete(
    '/:id',
    async ({ params, set }) => {
      try {
        return { data: await userService.remove(params.id) };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    { requirePermission: 'users:delete' },
  )

  .post(
    '/:id/assign-role',
    async ({ params, body, set }) => {
      try {
        const { roleId, tenantId } = body as any;
        return { data: await userService.assignRole(params.id, roleId, tenantId) };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    {
      requirePermission: 'users:write',
      body: t.Object({
        roleId: t.String(),
        tenantId: t.Optional(t.String({ format: 'uuid' })),
      }),
    },
  )

  .post(
    '/:id/revoke-role',
    async ({ params, body, set }) => {
      try {
        const { roleId, tenantId } = body as any;
        await userService.revokeRole(params.id, roleId, tenantId);
        return { success: true };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    {
      requirePermission: 'users:write',
      body: t.Object({
        roleId: t.String(),
        tenantId: t.Optional(t.String({ format: 'uuid' })),
      }),
    },
  );
