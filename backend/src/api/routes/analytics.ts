import { Elysia } from 'elysia';
import { db } from '../../lib/db.js';
import { tenants } from '../../db/schema/index.js';
import { eq, sql, gte } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';

export const analyticsRoutes = new Elysia({ prefix: '/api/analytics' })
  .use(createRateLimiter('admin'))
  .use(authMiddleware)
  .get(
    '/overview',
    async () => {
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
    { requireSuperAdmin: true },
  )
  .get(
    '/tenants',
    async () => {
      const distribution = await db
        .select({ plan: tenants.plan, count: sql<number>`count(*)::int` })
        .from(tenants)
        .groupBy(tenants.plan);
      return { distribution };
    },
    { requireSuperAdmin: true },
  );
