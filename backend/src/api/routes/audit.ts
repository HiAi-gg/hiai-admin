import { Elysia } from 'elysia';
import { auditService } from '../../modules/audit/audit.service.js';
import { authMiddleware } from '../middleware/auth.js';

export const auditRoutes = new Elysia({ prefix: '/api/audit' })
  .use(authMiddleware)
  .get('/', async ({ query }) => {
    return auditService.list({
      actorId: query.actorId as string,
      action: query.action as string,
      resource: query.resource as string,
      startDate: query.from ? new Date(query.from as string) : undefined,
      endDate: query.to ? new Date(query.to as string) : undefined,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 50,
    });
  }, { requireSuperAdmin: true });
