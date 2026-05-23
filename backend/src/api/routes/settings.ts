import { Elysia } from 'elysia';
import { db } from '../../lib/db.js';
import { settings } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';

export const settingsRoutes = new Elysia({ prefix: '/api/settings' })
  .use(createRateLimiter('admin'))
  .use(authMiddleware)
  .get('/', async () => {
    const all = await db.select().from(settings);
    return { settings: all };
  }, { requireSuperAdmin: true })
  .get('/:key', async ({ params, set }) => {
    const [setting] = await db.select().from(settings).where(eq(settings.id, params.key)).limit(1);
    if (!setting) { set.status = 404; return { error: 'Setting not found' }; }
    return { setting };
  }, { requireSuperAdmin: true })
  .put('/:key', async ({ params, body, user, set }) => {
    const { value, description } = body as { value: unknown; description?: string };
    const [setting] = await db.insert(settings).values({ id: params.key, value: JSON.parse(JSON.stringify(value)), description: description || null, updatedBy: (user as any)?.id })
      .onConflictDoUpdate({ target: settings.id, set: { value: JSON.parse(JSON.stringify(value)), updatedAt: new Date(), updatedBy: (user as any)?.id || null } })
      .returning();
    return { setting };
  }, { requireSuperAdmin: true });
