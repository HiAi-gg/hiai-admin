import { db } from '../../lib/db.js';
import { users, userRoles, userTenantAccess, tenants } from '../../db/schema/index.js';
import { eq, like, and, count, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

export const userService = {
  /**
   * Ensure a platform profile exists for the authenticated Better Auth identity.
   *
   * The helper is idempotent and must be called from the Better Auth
   * `user.create.after` hook so every auth signup has a matching platform user.
   */
  async ensurePlatformProfile(input: { email: string; name?: string | null }) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const base = {
      id: randomUUID(),
      email: normalizedEmail,
      name: input.name,
      role: 'viewer',
    };

    const [inserted] = await db
      .insert(users)
      .values(base)
      .onConflictDoNothing({ target: users.email })
      .returning();

    if (inserted) return inserted;

    const [existing] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    return existing;
  },

  async create(data: { id?: string; email: string; name: string; role?: string }) {
    const [user] = await db
      .insert(users)
      .values({
        id: data.id || randomUUID(),
        email: data.email,
        name: data.name,
        role: data.role || 'viewer',
      })
      .returning();
    return user;
  },

  async update(id: string, data: Partial<{ name: string; avatarUrl: string | null }>) {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  },

  async list(
    options: {
      page?: number;
      limit?: number;
      search?: string;
      role?: string;
      tenantId?: string;
    } = {},
  ) {
    const { page = 1, limit = 20, search, tenantId } = options;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) conditions.push(like(users.name, `%${search}%`));

    // SECURITY: tenantId filter scopes results to users with a user_tenant_access
    // row for that tenant — prevents cross-tenant enumeration (BLOCKER-2).
    let scopedUserIds: string[] | null = null;
    if (tenantId) {
      const access = await db
        .select({ userId: userTenantAccess.userId })
        .from(userTenantAccess)
        .where(eq(userTenantAccess.tenantId, tenantId));
      scopedUserIds = access.map((row) => row.userId);
      if (scopedUserIds.length === 0) {
        return {
          items: [],
          pagination: { page, limit, total: 0, totalPages: 0, hasMore: false },
        };
      }
      conditions.push(inArray(users.id, scopedUserIds));
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const baseQuery = db.select().from(users);
    const baseCountQuery = db.select({ count: count() }).from(users);

    const filteredQuery = where ? baseQuery.where(where) : baseQuery;
    const filteredCountQuery = where ? baseCountQuery.where(where) : baseCountQuery;

    const [items, total] = await Promise.all([
      filteredQuery.limit(limit).offset(offset),
      filteredCountQuery,
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total: total[0]?.count || 0,
        totalPages: Math.ceil((total[0]?.count || 0) / limit),
        hasMore: page * limit < (total[0]?.count || 0),
      },
    };
  },

  async getById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  },

  async getByEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));
    return user;
  },

  /** Tenant ids this user has explicit access to (via user_tenant_access). Used to
   *  scope a non-super_admin's view of site adapters to their own tenant(s). */
  async getAccessibleTenantIds(userId: string): Promise<string[]> {
    const rows = await db
      .select({ tenantId: userTenantAccess.tenantId })
      .from(userTenantAccess)
      .where(eq(userTenantAccess.userId, userId));
    return rows.map((r) => r.tenantId);
  },

  async assignRole(userId: string, roleId: string, tenantId?: string) {
    const [assignment] = await db
      .insert(userRoles)
      .values({
        userId,
        roleId,
        tenantId: tenantId || null,
        grantedAt: new Date(),
      })
      .returning();
    return assignment;
  },

  async revokeRole(userId: string, roleId: string, tenantId?: string) {
    const conditions = [eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)];
    if (tenantId) conditions.push(eq(userRoles.tenantId, tenantId));
    await db.delete(userRoles).where(and(...conditions));
  },

  async enable2FA(userId: string) {
    const [user] = await db
      .update(users)
      .set({ twoFactorEnabled: true })
      .where(eq(users.id, userId))
      .returning();
    return user;
  },

  async disable2FA(userId: string) {
    const [user] = await db
      .update(users)
      .set({ twoFactorEnabled: false })
      .where(eq(users.id, userId))
      .returning();
    return user;
  },

  async remove(id: string) {
    const [user] = await db.delete(users).where(eq(users.id, id)).returning();
    return user;
  },

  /** Tenants this user has access to (joined with the tenant row for display). */
  async getTenants(userId: string) {
    const rows = await db
      .select({
        tenantId: userTenantAccess.tenantId,
        slug: tenants.slug,
        name: tenants.name,
        status: tenants.status,
        plan: tenants.plan,
        role: userTenantAccess.role,
        joinedAt: userTenantAccess.createdAt,
      })
      .from(userTenantAccess)
      .innerJoin(tenants, eq(tenants.id, userTenantAccess.tenantId))
      .where(eq(userTenantAccess.userId, userId));
    return rows;
  },

  /** Add the user to an existing tenant by slug. Returns null when the tenant
   *  doesn't exist, or a flag when the user is already a member. */
  async joinTenant(
    userId: string,
    slug: string,
    options: { role?: string } = {},
  ): Promise<
    | { status: 'joined'; tenantId: string; slug: string; name: string }
    | { status: 'already_member'; tenantId: string }
    | { status: 'not_found' }
  > {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    if (!tenant) return { status: 'not_found' };

    const [existing] = await db
      .select()
      .from(userTenantAccess)
      .where(and(eq(userTenantAccess.userId, userId), eq(userTenantAccess.tenantId, tenant.id)));
    if (existing) return { status: 'already_member', tenantId: tenant.id };

    const requestedRole = options.role;
    const safeRole =
      requestedRole && (requestedRole === 'super_admin' || requestedRole === 'tenant_admin')
        ? 'viewer'
        : requestedRole ?? 'viewer';

    await db.insert(userTenantAccess).values({
      userId,
      tenantId: tenant.id,
      role: safeRole,
      permissions: [],
    });
    return { status: 'joined', tenantId: tenant.id, slug: tenant.slug, name: tenant.name };
  },

  /** Remove the user's access row for the given tenant. Returns true when a
   *  row was actually deleted. */
  async leaveTenant(userId: string, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(userTenantAccess)
      .where(and(eq(userTenantAccess.userId, userId), eq(userTenantAccess.tenantId, tenantId)))
      .returning();
    return result.length > 0;
  },
};
