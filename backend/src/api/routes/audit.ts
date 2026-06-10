import { Elysia, t } from 'elysia';
import { auditService } from '../../modules/audit/audit.service.js';
import { authMiddleware } from '../middleware/auth.js';

export const auditRoutes = new Elysia({ prefix: '/api/audit' }).use(authMiddleware).get(
  '/',
  async ({ query, set }) => {
    try {
      return await auditService.list({
        actorId: query.actorId,
        action: query.action,
        resource: query.resource,
        startDate: query.from ? new Date(query.from) : undefined,
        endDate: query.to ? new Date(query.to) : undefined,
        page: query.page ?? 1,
        limit: query.limit ?? 50,
      });
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  },
  {
    requireSuperAdmin: true,
    query: t.Object({
      actorId: t.Optional(t.String({ maxLength: 100 })),
      action: t.Optional(t.String({ maxLength: 100 })),
      resource: t.Optional(t.String({ maxLength: 100 })),
      from: t.Optional(t.String({ format: 'date-time' })),
      to: t.Optional(t.String({ format: 'date-time' })),
      page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
      limit: t.Optional(t.Integer({ minimum: 1, maximum: 200, default: 50 })),
    }),
  },
);
