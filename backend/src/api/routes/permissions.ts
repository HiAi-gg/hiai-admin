import { Elysia, t } from 'elysia';
import { db } from '../../db/index.js';
import { permissions, rolePermissions } from '../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { rbacMiddleware } from '../middleware/rbac.js';
import * as rbac from '../../modules/rbac/rbac.service.js';

export const permissionsRoutes = new Elysia({ prefix: '/api/permissions' })
  .use(rbacMiddleware)

  .get('/', async () => {
    const allPerms = await db.select().from(permissions);
    return { data: allPerms };
  }, { requirePermission: 'roles:read' })

  .post('/roles/:roleId', async ({ params, body, set }) => {
    try {
      await rbac.assignPermission(params.roleId, body.permissionId);
      set.status = 201;
      return { success: true };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }, {
    requirePermission: 'roles:write',
    params: t.Object({ roleId: t.String() }),
    body: t.Object({ permissionId: t.String() }),
  })

  .delete('/roles/:roleId/:permissionId', async ({ params, set }) => {
    try {
      await rbac.revokePermission(params.roleId, params.permissionId);
      return { success: true };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }, {
    requirePermission: 'roles:delete',
    params: t.Object({ roleId: t.String(), permissionId: t.String() }),
  });
