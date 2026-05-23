import { Elysia } from 'elysia';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { auditMiddleware } from '../middleware/audit.js';
import { userService } from '../../modules/user/user.service.js';

export const userRoutes = new Elysia({ prefix: '/api/users' })
  .use(authMiddleware).use(rbacMiddleware).use(auditMiddleware)

  .get('/', async ({ query, set }) => {
    try {
      return await userService.list({ page: Number(query.page) || 1, limit: Number(query.limit) || 20, search: query.search as string, role: query.role as string });
    } catch (error: any) { set.status = 500; return { error: error.message }; }
  }, { requirePermission: 'users:read' })

  .get('/:id', async ({ params, set }) => {
    try { return { data: await userService.getById(params.id) }; }
    catch (error: any) { set.status = 404; return { error: error.message }; }
  }, { requirePermission: 'users:read' })

  .post('/', async ({ body, set }) => {
    try { return { data: await userService.create(body as any) }; }
    catch (error: any) { set.status = 400; return { error: error.message }; }
  }, { requirePermission: 'users:write' })

  .put('/:id', async ({ params, body, set }) => {
    try { return { data: await userService.update(params.id, body as any) }; }
    catch (error: any) { set.status = 400; return { error: error.message }; }
  }, { requirePermission: 'users:write' })

  .delete('/:id', async ({ params, set }) => {
    try { return { data: await userService.remove(params.id) }; }
    catch (error: any) { set.status = 400; return { error: error.message }; }
  }, { requirePermission: 'users:delete' })

  .post('/:id/assign-role', async ({ params, body, set }) => {
    try {
      const { roleId, tenantId } = body as any;
      return { data: await userService.assignRole(params.id, roleId, tenantId) };
    } catch (error: any) { set.status = 400; return { error: error.message }; }
  }, { requirePermission: 'users:write' })

  .post('/:id/revoke-role', async ({ params, body, set }) => {
    try {
      const { roleId, tenantId } = body as any;
      await userService.revokeRole(params.id, roleId, tenantId);
      return { success: true };
    } catch (error: any) { set.status = 400; return { error: error.message }; }
  }, { requirePermission: 'users:write' });
