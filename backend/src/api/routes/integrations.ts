import { Elysia } from 'elysia';
import { db } from '../../lib/db.js';
import { integrations } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { encrypt } from '../../lib/encryption.js';

export const integrationsRoutes = new Elysia({ prefix: '/api/integrations' })
  .use(createRateLimiter('admin'))
  .use(authMiddleware)
  .get('/', async () => {
    const all = await db.select().from(integrations);
    return { integrations: all.map(i => ({ ...i, credentialsEncrypted: i.credentialsEncrypted ? '***' : null })) };
  }, { requireSuperAdmin: true })
  .put('/:id', async ({ params, body, set }) => {
    const { credentials, config } = body as { credentials?: Record<string, string>; config?: Record<string, unknown> };
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (credentials) updateData.credentialsEncrypted = encrypt(JSON.stringify(credentials));
    if (config) updateData.config = config;
    const [integration] = await db.update(integrations).set(updateData).where(eq(integrations.id, params.id)).returning();
    if (!integration) { set.status = 404; return { error: 'Integration not found' }; }
    return { integration: { ...integration, credentialsEncrypted: integration.credentialsEncrypted ? '***' : null } };
  }, { requireSuperAdmin: true })
  .post('/:id/test', async ({ params, set }) => {
    const [integration] = await db.select().from(integrations).where(eq(integrations.id, params.id)).limit(1);
    if (!integration) { set.status = 404; return { error: 'Integration not found' }; }
    return { connected: integration.status === 'connected', type: integration.type };
  }, { requireSuperAdmin: true });
