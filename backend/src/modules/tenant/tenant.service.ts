import { db } from '../../lib/db.js';
import { tenants, userTenantAccess, subscriptions } from '../../db/schema/index.js';
import { eq, and, ilike, sql, desc } from 'drizzle-orm';

export const tenantService = {
  async list({
    page = 1,
    limit = 20,
    status,
    search,
  }: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const conditions = [];
    if (status) conditions.push(eq(tenants.status, status));
    if (search) conditions.push(ilike(tenants.name, `%${search}%`));
    const where = conditions.length ? and(...conditions) : undefined;

    const [total] = await db.select({ count: sql<number>`count(*)` }).from(tenants).where(where);
    const data = await db
      .select()
      .from(tenants)
      .where(where)
      .orderBy(desc(tenants.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total: total.count,
        pages: Math.ceil(total.count / limit),
        hasMore: page * limit < total.count,
      },
    };
  },

  async getById(id: string) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    if (!tenant) throw new Error('Tenant not found');
    const tenantUsers = await db
      .select()
      .from(userTenantAccess)
      .where(eq(userTenantAccess.tenantId, id));
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, id));
    return { ...tenant, users: tenantUsers, subscription: sub || null };
  },

  async create(data: { name: string; slug: string; email?: string; plan?: string }) {
    const [tenant] = await db.insert(tenants).values(data).returning();
    return tenant;
  },

  async update(id: string, data: Partial<typeof tenants.$inferInsert>) {
    const [tenant] = await db
      .update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant;
  },

  async suspend(id: string, _reason?: string) {
    const [tenant] = await db
      .update(tenants)
      .set({ status: 'suspended', updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant;
  },

  async reactivate(id: string) {
    const [tenant] = await db
      .update(tenants)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant;
  },

  async changePlan(id: string, plan: string) {
    const [tenant] = await db
      .update(tenants)
      .set({ plan, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant;
  },

  async softDelete(id: string) {
    const [tenant] = await db
      .update(tenants)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant;
  },
};
