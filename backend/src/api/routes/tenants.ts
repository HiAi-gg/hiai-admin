import { Elysia } from 'elysia';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { auditMiddleware } from '../middleware/audit.js';
import { tenantService } from '../../modules/tenant/tenant.service.js';

export const tenantRoutes = new Elysia({ prefix: '/api/tenants' })
  .use(authMiddleware).use(rbacMiddleware).use(auditMiddleware)

  .get('/', async ({ query, set }) => {
    try {
      return await tenantService.list({ page: Number(query.page) || 1, limit: Number(query.limit) || 20, status: query.status as string, search: query.search as string });
    } catch (error: any) { set.status = 500; return { error: error.message }; }
  }, { requirePermission: 'tenants:read' })

  .get('/:id', async ({ params, set }) => {
    try { return { data: await tenantService.getById(params.id) }; }
    catch (error: any) { set.status = 404; return { error: error.message }; }
  }, { requirePermission: 'tenants:read' })

  .post('/', async ({ body, set }) => {
    try {
      const { name, slug, email, plan } = body as any;
      return { data: await tenantService.create({ name, slug, email, plan }) };
    } catch (error: any) { set.status = 400; return { error: error.message }; }
  }, { requirePermission: 'tenants:write' })

  .put('/:id', async ({ params, body, set }) => {
    try { return { data: await tenantService.update(params.id, body as any) }; }
    catch (error: any) { set.status = 400; return { error: error.message }; }
  }, { requirePermission: 'tenants:write' })

  .delete('/:id', async ({ params, set }) => {
    try { return { data: await tenantService.softDelete(params.id) }; }
    catch (error: any) { set.status = 400; return { error: error.message }; }
  }, { requirePermission: 'tenants:delete' })

  .post('/:id/suspend', async ({ params, body, set }) => {
    try { return { data: await tenantService.suspend(params.id, (body as any)?.reason) }; }
    catch (error: any) { set.status = 400; return { error: error.message }; }
  }, { requirePermission: 'tenants:write' })

  .post('/:id/reactivate', async ({ params, set }) => {
    try { return { data: await tenantService.reactivate(params.id) }; }
    catch (error: any) { set.status = 400; return { error: error.message }; }
  }, { requirePermission: 'tenants:write' })

  .post('/:id/change-plan', async ({ params, body, set }) => {
    try { return { data: await tenantService.changePlan(params.id, (body as any).plan) }; }
    catch (error: any) { set.status = 400; return { error: error.message }; }
  }, { requirePermission: 'tenants:write' });
