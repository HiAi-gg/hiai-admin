import { Elysia } from 'elysia';
import { db } from '../../lib/db.js';
import { tenants } from '../../db/schema/index.js';
import { eq, sql, gte } from 'drizzle-orm';
import { loadSession } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';

export const analyticsRoutes = new Elysia({ prefix: '/api/analytics' })
  .use(createRateLimiter('admin'))
  .get(
    '/overview',
    async (ctx: any) => {
      const { user } = await loadSession(ctx.request.headers);
      if (!user) {
        ctx.set.status = 401;
        return { error: 'Unauthorized' };
      }
      const [{ totalTenants }] = await db
        .select({ totalTenants: sql<number>`count(*)::int` })
        .from(tenants);
      const [{ activeTenants }] = await db
        .select({ activeTenants: sql<number>`count(*)::int` })
        .from(tenants)
        .where(eq(tenants.status, 'active'));
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [{ newTenants }] = await db
        .select({ newTenants: sql<number>`count(*)::int` })
        .from(tenants)
        .where(gte(tenants.createdAt, thirtyDaysAgo));
      return { totalTenants, activeTenants, newTenants, mrr: 0, churnRate: 0 };
    },
  )
  .get(
    '/tenants',
    async (ctx: any) => {
      const { user } = await loadSession(ctx.request.headers);
      if (!user) {
        ctx.set.status = 401;
        return { error: 'Unauthorized' };
      }
      const distribution = await db
        .select({ plan: tenants.plan, count: sql<number>`count(*)::int` })
        .from(tenants)
        .groupBy(tenants.plan);
      return { distribution };
    },
  )
  .get(
    '/mrr',
    async (ctx: any) => {
      const { user } = await loadSession(ctx.request.headers);
      if (!user) {
        ctx.set.status = 401;
        return { error: 'Unauthorized' };
      }
      const months: { month: string; mrr: number }[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = d.toLocaleString('en-US', { month: 'short' });
        months.push({ month, mrr: 0 });
      }
      return { history: months };
    },
  );
