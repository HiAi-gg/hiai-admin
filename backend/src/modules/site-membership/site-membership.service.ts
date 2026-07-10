import { and, eq, or } from 'drizzle-orm';
import { siteAdapters, siteMemberships, users } from '../../db/schema/index.js';
import { db } from '../../lib/db.js';

export interface AuthenticatedAdmin {
  id?: string;
  email?: string;
  role?: string;
}

export interface ActiveSiteMembership {
  id: string;
  userId: string;
  siteAdapterId: string;
  globalRole: string;
  role: string;
  permissions: string[];
  adapterSlug: string;
  tenantId: string;
}

/**
 * Resolves the platform user behind a Better Auth session and checks the
 * enabled adapter membership. The Better Auth id and the platform users.id
 * are separate identifiers, so email is the primary bridge between them.
 */
async function findPlatformUser(user: AuthenticatedAdmin) {
  const identity = user.email
    ? user.id
      ? or(eq(users.email, user.email), eq(users.id, user.id))
      : eq(users.email, user.email)
    : user.id
      ? eq(users.id, user.id)
      : undefined;
  if (!identity) return null;

  const [platformUser] = await db.select({ id: users.id }).from(users).where(identity).limit(1);
  return platformUser ?? null;
}

export const siteMembershipService = {
  async getActiveMembership(
    user: AuthenticatedAdmin,
    adapterSlug: string,
  ): Promise<ActiveSiteMembership | null> {
    const platformUser = await findPlatformUser(user);
    if (!platformUser) return null;

    const [row] = await db
      .select({
        id: siteMemberships.id,
        userId: siteMemberships.userId,
        siteAdapterId: siteMemberships.siteAdapterId,
        globalRole: siteMemberships.globalRole,
        role: siteMemberships.role,
        permissions: siteMemberships.permissions,
        adapterSlug: siteAdapters.slug,
        tenantId: siteAdapters.tenantId,
      })
      .from(siteMemberships)
      .innerJoin(siteAdapters, eq(siteAdapters.id, siteMemberships.siteAdapterId))
      .where(
        and(
          eq(siteMemberships.userId, platformUser.id),
          eq(siteAdapters.slug, adapterSlug),
          eq(siteAdapters.enabled, true),
        ),
      )
      .limit(1);

    return row
      ? {
          ...row,
          permissions: row.permissions ?? [],
        }
      : null;
  },
};
