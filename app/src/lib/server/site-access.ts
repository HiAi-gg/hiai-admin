import { siteMembershipService } from '../../../../backend/src/modules/site-membership/site-membership.service.js';

export interface SiteAccessUser {
  id?: string;
  email?: string;
  role?: string | null;
}

export interface SiteAccessAdapter {
  slug: string;
  enabled?: boolean;
}

export async function canAccessSiteAdapter(
  adapter: SiteAccessAdapter,
  user?: SiteAccessUser | null,
): Promise<boolean> {
  if (!user || adapter.enabled === false) return false;
  if (user.role === 'super_admin') return true;
  if (!user.id && !user.email) return false;

  const membership = await siteMembershipService.getActiveMembership(
    {
      id: user.id,
      email: user.email,
      role: user.role ?? undefined,
    },
    adapter.slug,
  );
  return membership !== null;
}

export async function filterAccessibleSiteAdapters<T extends SiteAccessAdapter>(
  adapters: readonly T[],
  user?: SiteAccessUser | null,
): Promise<T[]> {
  if (!user) return [];
  if (user.role === 'super_admin') return adapters.filter((adapter) => adapter.enabled !== false);

  const access = await Promise.all(
    adapters.map(async (adapter) => ({
      adapter,
      allowed: await canAccessSiteAdapter(adapter, user),
    })),
  );
  return access.filter(({ allowed }) => allowed).map(({ adapter }) => adapter);
}
