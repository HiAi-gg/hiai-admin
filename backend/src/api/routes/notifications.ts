import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.js';
import { notificationService } from '../../modules/notifications/notification.service.js';
import type { PlatformUser } from '../middleware/audit.js';

/**
 * Notifications API.
 *
 * Mounted at /api/notifications. All routes require auth; the list/read
 * routes scope by the authenticated user's id (no cross-user access even
 * for super_admin — these are personal notifications, not platform feeds).
 *
 * Note: `user` is populated by the global `derive` in `api/index.ts`.
 * Elysia's local type inference does not see cross-plugin derives, so we
 * cast the context through `unknown` to access `user` (same pattern as
 * `middleware/audit.ts`).
 */
function getUser(ctx: unknown): PlatformUser | null {
  return (ctx as { user?: PlatformUser | null }).user ?? null;
}

export const notificationsRoutes = new Elysia({ prefix: '/api/notifications' })
  .use(authMiddleware)
  .get(
    '/',
    async (ctx) => {
      const user = getUser(ctx);
      if (!user) {
        ctx.set.status = 401;
        return { error: 'Unauthorized' };
      }
      const query = ctx.query;
      try {
        return await notificationService.list({
          userId: user.id,
          unreadOnly: query.unreadOnly === 'true',
          page: query.page ?? 1,
          limit: query.limit ?? 20,
        });
      } catch (err: any) {
        ctx.set.status = 500;
        return { error: err.message ?? 'Failed to list notifications' };
      }
    },
    {
      query: t.Object({
        unreadOnly: t.Optional(t.String()),
        page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Integer({ minimum: 1, maximum: 100, default: 20 })),
      }),
    },
  )
  .post(
    '/:id/read',
    async (ctx) => {
      const user = getUser(ctx);
      if (!user) {
        ctx.set.status = 401;
        return { error: 'Unauthorized' };
      }
      const updated = await notificationService.markAsRead(ctx.params.id, user.id);
      if (!updated) {
        ctx.set.status = 404;
        return { error: 'Notification not found' };
      }
      return { notification: updated };
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
    },
  )
  .post('/read-all', async (ctx) => {
    const user = getUser(ctx);
    if (!user) {
      ctx.set.status = 401;
      return { error: 'Unauthorized' };
    }
    return await notificationService.markAllAsRead(user.id);
  });
