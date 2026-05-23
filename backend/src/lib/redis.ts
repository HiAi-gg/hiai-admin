import Redis from 'ioredis';
import { env } from './config.js';
import { createChildLogger } from './logger.js';

const log = createChildLogger('redis');

export const redis = new Redis(env.REDIS_URL, {
  keyPrefix: 'hiadmin:',
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  log.error({ err }, 'Redis connection error');
});

redis.on('connect', () => {
  log.info('Redis connected');
});

export async function redisHealthCheck(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (err) {
    log.error({ err }, 'Redis health check failed');
    return false;
  }
}
