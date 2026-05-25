import { Elysia, t } from 'elysia';
import { db } from '../../lib/db.js';
import { invoices } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { rbacMiddleware } from '../middleware/rbac.js';

export const billingInvoicesRoutes = new Elysia({ prefix: '/api/billing/invoices' })
  .use(rbacMiddleware)

  .get('/', async ({ query }) => {
    const tenantId = query.tenantId as string;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    let rows;
    if (tenantId) {
      rows = await db.select().from(invoices).where(eq(invoices.tenantId, tenantId)).limit(limit).offset((page - 1) * limit);
    } else {
      rows = await db.select().from(invoices).limit(limit).offset((page - 1) * limit);
    }

    return { data: rows, page, limit };
  }, { requirePermission: 'billing:read' })

  .get('/:customerId', async ({ params, set }) => {
    const rows = await db.select().from(invoices).where(eq(invoices.id, params.customerId)).limit(1);
    if (!rows[0]) {
      set.status = 404;
      return { error: 'Invoice not found' };
    }
    return { data: rows[0] };
  }, { requirePermission: 'billing:read', params: t.Object({ customerId: t.String() }) });
