import { Elysia, t } from 'elysia';
import { db } from '../../lib/db.js';
import { invoices } from '../../db/schema/index.js';
import { and, count, eq } from 'drizzle-orm';
import { rbacMiddleware } from '../middleware/rbac.js';

export const billingInvoicesRoutes = new Elysia({ prefix: '/api/billing/invoices' })
  .use(rbacMiddleware)

  .get(
    '/',
    async ({ query, set }) => {
      try {
        const tenantId = query.tenantId;
        const status = query.status;
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;

        const whereParts = [];
        if (tenantId) whereParts.push(eq(invoices.tenantId, tenantId));
        if (status) whereParts.push(eq(invoices.status, status));
        const where = whereParts.length > 0 ? and(...whereParts) : undefined;

        const [rows, totalRow] = await Promise.all([
          db
            .select()
            .from(invoices)
            .where(where)
            .limit(limit)
            .offset((page - 1) * limit),
          db.select({ count: count() }).from(invoices).where(where),
        ]);

        const total = totalRow[0]?.count ?? 0;
        return {
          data: rows,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasMore: page * limit < total,
          },
        };
      } catch (error: any) {
        set.status = 500;
        return { error: error.message };
      }
    },
    {
      requirePermission: 'billing:read',
      query: t.Object({
        page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Integer({ minimum: 1, maximum: 100, default: 20 })),
        tenantId: t.Optional(t.String({ format: 'uuid' })),
        status: t.Optional(
          t.Union([
            t.Literal('draft'),
            t.Literal('open'),
            t.Literal('paid'),
            t.Literal('uncollectible'),
            t.Literal('void'),
          ]),
        ),
      }),
    },
  )

  .get(
    '/:customerId',
    async ({ params, set }) => {
      const rows = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, params.customerId))
        .limit(1);
      if (!rows[0]) {
        set.status = 404;
        return { error: 'Invoice not found' };
      }
      return { data: rows[0] };
    },
    { requirePermission: 'billing:read', params: t.Object({ customerId: t.String() }) },
  );
