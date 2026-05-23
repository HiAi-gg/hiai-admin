import { Elysia, t } from 'elysia';
import { rbacMiddleware } from '../middleware/rbac.js';
import { auditMiddleware } from '../middleware/audit.js';
import * as rbac from '../../modules/rbac/rbac.service.js';

export const rolesRoutes = new Elysia({ prefix: '/api/roles' })
  .use(rbacMiddleware)
  .use(auditMiddleware)

  .get('/', async ({ query }) => {
    const allRoles = await rbac.listRoles();
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const start = (page - 1) * limit;
    return { data: allRoles.slice(start, start + limit), total: allRoles.length, page, limit };
  }, { requirePermission: 'roles:read' })

  .post('/', async ({ body, set }) => {
    try {
      const id = await rbac.createRole(body);
      set.status = 201;
      return { id };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }, {
    requirePermission: 'roles:write',
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 100 }),
      description: t.Optional(t.String()),
      permissionIds: t.Optional(t.Array(t.String())),
    }),
  })

  .put('/:id', async ({ params, body, set }) => {
    try {
      await rbac.updateRole(params.id, body);
      return { success: true };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }, {
    requirePermission: 'roles:write',
    params: t.Object({ id: t.String() }),
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
      description: t.Optional(t.String()),
      permissionIds: t.Optional(t.Array(t.String())),
    }),
  })

  .delete('/:id', async ({ params, set }) => {
    try {
      await rbac.deleteRole(params.id);
      return { success: true };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }, {
    requirePermission: 'roles:delete',
    params: t.Object({ id: t.String() }),
  });
