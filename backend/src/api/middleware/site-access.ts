import { Elysia } from 'elysia';
import {
  type AuthenticatedAdmin,
  siteMembershipService,
} from '../../modules/site-membership/site-membership.service.js';

export async function authorizeSiteAdmin(
  user: AuthenticatedAdmin | null | undefined,
  adapterSlug: string,
) {
  if (!user) return { status: 401 as const, membership: null };
  if (user.role === 'super_admin') return { status: 200 as const, membership: null };

  const membership = await siteMembershipService.getActiveMembership(user, adapterSlug);
  return membership
    ? { status: 200 as const, membership }
    : { status: 403 as const, membership: null };
}

export const siteAccessMiddleware = new Elysia({ name: 'site-access' }).macro({
  requireSiteAdmin: {
    beforeHandle: async (ctx: any) => {
      const adapterSlug = ctx.params?.adapterSlug ?? ctx.params?.slug;
      if (typeof adapterSlug !== 'string' || adapterSlug.length === 0) {
        ctx.set.status = 400;
        return { error: 'Site adapter is required' };
      }

      const result = await authorizeSiteAdmin(ctx.user, adapterSlug);
      if (result.status === 401) {
        ctx.set.status = 401;
        return { error: 'Unauthorized' };
      }
      if (result.status === 403) {
        ctx.set.status = 403;
        return { error: 'Forbidden' };
      }
      ctx.siteMembership = result.membership;
    },
  },
});
