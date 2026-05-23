import { Elysia } from 'elysia';
import { dbHealthCheck } from '../../lib/db.js';
import { redisHealthCheck } from '../../lib/redis.js';

export const healthRoutes = new Elysia({ prefix: '/api' })
  .get('/health', async () => {
    const db = await dbHealthCheck();
    const redis = await redisHealthCheck();
    const status = db && redis ? 'ok' : 'degraded';
    return { status, db: db ? 'connected' : 'disconnected', redis: redis ? 'connected' : 'disconnected', timestamp: new Date().toISOString() };
  });
