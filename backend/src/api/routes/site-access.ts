import { Elysia } from 'elysia';
import { authMiddleware } from '../middleware/auth.js';
import { siteAccessMiddleware } from '../middleware/site-access.js';

/** Small access probe used by site-admin clients before loading a site module. */
export const siteAccessRoutes = new Elysia({ prefix: '/api/site-access' })
  .use(authMiddleware)
  .use(siteAccessMiddleware)
  .get(
    '/:adapterSlug',
    ({ params, user, siteMembership }: any) => ({
      adapterSlug: params.adapterSlug,
      userId: user.id,
      membership: siteMembership
        ? {
            role: siteMembership.role,
            permissions: siteMembership.permissions,
          }
        : null,
    }),
    { requireSiteAdmin: true },
  );
