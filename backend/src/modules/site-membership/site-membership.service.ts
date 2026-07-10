import { and, eq } from 'drizzle-orm';
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
  // Better Auth and platform user ids are separate. When email is present it
  // is the canonical bridge; never OR it with an unrelated session id.
  const identity = user.email
    ? eq(users.email, user.email)
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

  async listForAdapter(adapterSlug: string) {
    return db
      .select({
        id: siteMemberships.id,
        userId: siteMemberships.userId,
        userEmail: users.email,
        userName: users.name,
        siteAdapterId: siteMemberships.siteAdapterId,
        adapterSlug: siteAdapters.slug,
        globalRole: siteMemberships.globalRole,
        role: siteMemberships.role,
        permissions: siteMemberships.permissions,
        createdAt: siteMemberships.createdAt,
      })
      .from(siteMemberships)
      .innerJoin(users, eq(users.id, siteMemberships.userId))
      .innerJoin(siteAdapters, eq(siteAdapters.id, siteMemberships.siteAdapterId))
      .where(eq(siteAdapters.slug, adapterSlug));
  },

  async assign(
    adapterSlug: string,
    input: { userId: string; globalRole: string; role: string; permissions: string[] },
  ) {
    const [adapter] = await db
      .select({ id: siteAdapters.id })
      .from(siteAdapters)
      .where(eq(siteAdapters.slug, adapterSlug))
      .limit(1);
    if (!adapter) return null;

    const [membership] = await db
      .insert(siteMemberships)
      .values({
        userId: input.userId,
        siteAdapterId: adapter.id,
        globalRole: input.globalRole,
        role: input.role,
        permissions: input.permissions,
      })
      .onConflictDoUpdate({
        target: [siteMemberships.userId, siteMemberships.siteAdapterId],
        set: {
          globalRole: input.globalRole,
          role: input.role,
          permissions: input.permissions,
        },
      })
      .returning();
    return membership ?? null;
  },

  async remove(adapterSlug: string, userId: string): Promise<boolean> {
    const [adapter] = await db
      .select({ id: siteAdapters.id })
      .from(siteAdapters)
      .where(eq(siteAdapters.slug, adapterSlug))
      .limit(1);
    if (!adapter) return false;

    const rows = await db
      .delete(siteMemberships)
      .where(and(eq(siteMemberships.siteAdapterId, adapter.id), eq(siteMemberships.userId, userId)))
      .returning({ id: siteMemberships.id });
    return rows.length > 0;
  },
};
