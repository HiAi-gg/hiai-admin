import { Elysia, t } from 'elysia';
import { db } from '../../lib/db.js';
import { integrations } from '../../db/schema/index.js';
import { and, count, eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { encrypt } from '../../lib/encryption.js';
import { updateIntegrationSchema, kofiConfigSchema } from '../validation/integration.schema.js';

export const integrationsRoutes = new Elysia({ prefix: '/api/integrations' })
  .use(createRateLimiter('admin'))
  .use(authMiddleware)
  .get(
    '/',
    async ({ query, set }) => {
      try {
        const type = query.type;
        const status = query.status;
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;

        const whereParts = [];
        if (type) whereParts.push(eq(integrations.type, type));
        if (status) whereParts.push(eq(integrations.status, status));
        const where = whereParts.length > 0 ? and(...whereParts) : undefined;

        const [rows, totalRow] = await Promise.all([
          db
            .select()
            .from(integrations)
            .where(where)
            .limit(limit)
            .offset((page - 1) * limit),
          db.select({ count: count() }).from(integrations).where(where),
        ]);

        const total = totalRow[0]?.count ?? 0;
        return {
          integrations: rows.map((i) => ({
            ...i,
            credentialsEncrypted: i.credentialsEncrypted ? '***' : null,
          })),
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
      requireSuperAdmin: true,
      query: t.Object({
        page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Integer({ minimum: 1, maximum: 100, default: 20 })),
        type: t.Optional(t.String({ maxLength: 50 })),
        status: t.Optional(
          t.Union([
            t.Literal('connected'),
            t.Literal('disconnected'),
            t.Literal('error'),
            t.Literal('pending'),
          ]),
        ),
      }),
    },
  )
  .put(
    '/:id',
    async ({ params, body, set }) => {
      const parsed = updateIntegrationSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: 'Validation failed', details: parsed.error.flatten() };
      }
      const { credentials, config } = parsed.data;
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (credentials) updateData.credentialsEncrypted = encrypt(JSON.stringify(credentials));
      if (config) updateData.config = config;
      const [integration] = await db
        .update(integrations)
        .set(updateData)
        .where(eq(integrations.id, params.id))
        .returning();
      if (!integration) {
        set.status = 404;
        return { error: 'Integration not found' };
      }
      return {
        integration: {
          ...integration,
          credentialsEncrypted: integration.credentialsEncrypted ? '***' : null,
        },
      };
    },
    {
      requireSuperAdmin: true,
      body: t.Object({
        credentials: t.Optional(t.Record(t.String(), t.String())),
        config: t.Optional(t.Record(t.String(), t.Unknown())),
      }),
    },
  )
  .post(
    '/:id/test',
    async ({ params, set }) => {
      const [integration] = await db
        .select()
        .from(integrations)
        .where(eq(integrations.id, params.id))
        .limit(1);
      if (!integration) {
        set.status = 404;
        return { error: 'Integration not found' };
      }
      return { connected: integration.status === 'connected', type: integration.type };
    },
    { requireSuperAdmin: true },
  )
  .put(
    '/kofi/config',
    async ({ body, set }) => {
      const parsed = kofiConfigSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { error: 'Validation failed', details: parsed.error.flatten() };
      }
      const { webhookUrl, verificationToken } = parsed.data;
      const [integration] = await db
        .update(integrations)
        .set({
          config: { webhookUrl, verificationToken },
          status: 'connected',
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, 'kofi'))
        .returning();
      if (!integration) {
        set.status = 404;
        return { error: 'Ko-fi integration not found. Run seed first.' };
      }
      return { success: true };
    },
    {
      requireSuperAdmin: true,
      body: t.Object({
        webhookUrl: t.String({ format: 'uri' }),
        verificationToken: t.String({ minLength: 1 }),
      }),
    },
  );
