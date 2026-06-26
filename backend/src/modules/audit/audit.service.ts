import { db } from '../../lib/db.js';
import { auditLogs } from '../../db/schema/index.js';
import { eq, and, gte, lte, count } from 'drizzle-orm';

export const auditService = {
  async record(data: {
    actorId: string;
    actorEmail: string;
    action: string;
    resource: string;
    resourceId?: string;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const [log] = await db
      .insert(auditLogs)
      .values({
        actorId: data.actorId,
        actorEmail: data.actorEmail,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        oldValue: data.oldValue,
        newValue: data.newValue,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      })
      .returning();
    return log;
  },

  async list(
    options: {
      page?: number;
      limit?: number;
      actorId?: string;
      action?: string;
      resource?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ) {
    const { page = 1, limit = 50, actorId, action, resource, startDate, endDate } = options;
    const offset = (page - 1) * limit;

    const baseQuery = db.select().from(auditLogs);
    const baseCountQuery = db.select({ count: count() }).from(auditLogs);

    // Apply filters
    const conditions = [];
    if (actorId) conditions.push(eq(auditLogs.actorId, actorId));
    if (action) conditions.push(eq(auditLogs.action, action));
    if (resource) conditions.push(eq(auditLogs.resource, resource));
    if (startDate) conditions.push(gte(auditLogs.createdAt, startDate));
    if (endDate) conditions.push(lte(auditLogs.createdAt, endDate));

    const filteredQuery = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;
    const filteredCountQuery =
      conditions.length > 0 ? baseCountQuery.where(and(...conditions)) : baseCountQuery;

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

  async export(filters: any) {
    const data = await this.list({ ...filters, limit: 10000 });
    // Convert to CSV format
    const headers = ['ID', 'Actor', 'Action', 'Resource', 'Resource ID', 'IP', 'Timestamp'];
    const rows = data.items.map((log) => [
      log.id,
      log.actorEmail,
      log.action,
      log.resource,
      log.resourceId || '',
      log.ipAddress || '',
      log.createdAt,
    ]);
    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  },
};
