import { Elysia, t } from 'elysia';
import { auth } from '../../auth/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { auditMiddleware } from '../middleware/audit.js';
import { userService } from '../../modules/user/user.service.js';
import { db } from '../../lib/db.js';
import { tenants } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { notificationService } from '../../modules/notifications/notification.service.js';
import { logger } from '../../lib/logger.js';
import {
  createUserSchema,
  updateUserSchema,
  assignRoleSchema,
  revokeRoleSchema,
} from '../validation/user.schema.js';

const log = logger.child({ module: 'users-route' });

export const userRoutes = new Elysia({ prefix: '/api/users' })
  .use(authMiddleware)
  .use(rbacMiddleware)
  .use(auditMiddleware)

  .get('/me', async (ctx: any) => {
    const session = await auth.api.getSession({ headers: ctx.request.headers });
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const u = session.user;
    const profile = await userService.getByEmail(u.email);
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: profile?.role ?? 'viewer',
      image: u.image,
      emailVerified: u.emailVerified,
    };
  })

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
      const parsed = createUserSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: 'Validation failed', details: parsed.error.flatten() };
      }
      try {
        return { data: await userService.create(parsed.data) };
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
      const parsed = updateUserSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: 'Validation failed', details: parsed.error.flatten() };
      }
      try {
        return { data: await userService.update(params.id, parsed.data) };
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
      const parsed = assignRoleSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: 'Validation failed', details: parsed.error.flatten() };
      }
      try {
        const { roleId, tenantId } = parsed.data;
        const result = await userService.assignRole(params.id, roleId, tenantId);

        // When this is a per-tenant assignment, treat it as a tenant invite:
        // notify the user they're now a member of the tenant.
        if (tenantId) {
          try {
            const invited = await userService.getById(params.id);
            const [tenant] = await db
              .select()
              .from(tenants)
              .where(eq(tenants.id, tenantId))
              .limit(1);
            if (invited && tenant) {
              await notificationService.send({
                userId: invited.id,
                type: 'tenant_invite',
                title: `You've been added to ${tenant.name}`,
                body: `You've been invited to the ${tenant.name} tenant on hiai-admin. Sign in to get started.`,
                data: { tenantId: tenant.id, tenantSlug: tenant.slug, roleId },
                subscriber: { email: invited.email, firstName: invited.name ?? undefined },
              });
            }
          } catch (notifyErr: any) {
            log.warn({ err: notifyErr.message }, 'Failed to send tenant_invite notification');
          }
        }

        return { data: result };
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
      const parsed = revokeRoleSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: 'Validation failed', details: parsed.error.flatten() };
      }
      try {
        const { roleId, tenantId } = parsed.data;
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
