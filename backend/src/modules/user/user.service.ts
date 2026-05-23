import { db } from '../../lib/db.js';
import { users, userTenantAccess, userRoles } from '../../db/schema/index.js';
import { eq, like, and, count } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

export const userService = {
  async create(data: { id?: string; email: string; name: string; role?: string }) {
    const [user] = await db.insert(users).values({
      id: data.id || randomUUID(),
      email: data.email,
      name: data.name,
      role: data.role || 'viewer'
    }).returning();
    return user;
  },

  async update(id: string, data: Partial<{ name: string; avatarUrl: string }>) {
    const [user] = await db.update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  },

  async list(options: { page?: number; limit?: number; search?: string; role?: string; tenantId?: string } = {}) {
    const { page = 1, limit = 20, search, role } = options;
    const offset = (page - 1) * limit;

    let query = db.select().from(users);
    let countQuery = db.select({ count: count() }).from(users);

    if (search) {
      query = query.where(like(users.name, `%${search}%`)) as any;
      countQuery = countQuery.where(like(users.name, `%${search}%`)) as any;
    }

    const [items, total] = await Promise.all([
      query.limit(limit).offset(offset),
      countQuery
    ]);

    return {
      items,
      pagination: { page, limit, total: total[0]?.count || 0, totalPages: Math.ceil((total[0]?.count || 0) / limit) }
    };
  },

  async getById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  },

  async assignRole(userId: string, roleId: string, tenantId?: string) {
    const [assignment] = await db.insert(userRoles).values({
      userId,
      roleId,
      tenantId: tenantId || null,
      grantedAt: new Date()
    }).returning();
    return assignment;
  },

  async revokeRole(userId: string, roleId: string, tenantId?: string) {
    const conditions = [eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)];
    if (tenantId) conditions.push(eq(userRoles.tenantId, tenantId));
    await db.delete(userRoles).where(and(...conditions));
  },

  async enable2FA(userId: string) {
    const [user] = await db.update(users)
      .set({ twoFactorEnabled: true })
      .where(eq(users.id, userId))
      .returning();
    return user;
  },

  async disable2FA(userId: string) {
    const [user] = await db.update(users)
      .set({ twoFactorEnabled: false })
      .where(eq(users.id, userId))
      .returning();
    return user;
  },

  async remove(id: string) {
    const [user] = await db.delete(users)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
};
