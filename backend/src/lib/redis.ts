import Redis from 'ioredis';
import { env } from './config.js';
import { createChildLogger } from './logger.js';

const log = createChildLogger('redis');

/**
 * Retry policy.
 *
 * - REDIS_MAX_RETRIES=0 (default)  -> retry forever (recommended behind
 *   compose/kubernetes where Redis is brought up shortly after the API).
 * - REDIS_MAX_RETRIES=N            -> retry up to N attempts before throwing
 *   a permanent 'Redis connection lost' error.
 * - REDIS_RETRY_MAX_DELAY_MS=30000 -> exponential backoff capped at 30s.
 *
 * Without this, ioredis gave up after 3 attempts and the rate limiter fell
 * into fail-open mode permantently (Redis keep-fail-open until restart).
 */
const maxRetries = env.REDIS_MAX_RETRIES ?? 0;
const maxDelayMs = env.REDIS_RETRY_MAX_DELAY_MS ?? 30_000;

export const redis = new Redis(env.REDIS_URL, {
  keyPrefix: 'hiadmin:',
  maxRetriesPerRequest: null, // never fail a single command on retryable err
  retryStrategy(times) {
    if (maxRetries > 0 && times > maxRetries) {
      log.error(
        { times, maxRetries },
        'Redis retry budget exhausted; subsequent calls will throw. Check REDIS_URL / readiness.',
      );
      return null;
    }
    return Math.min(times * 200, maxDelayMs);
  },
  // Auto-connect on construction so we surface failures through `error` events
  // rather than blocking on first command (the old lazyConnect + 3-retry
  // combo left the rate limiter fail-open with no logs).
  lazyConnect: false,
  enableOfflineQueue: true,
});

redis.on('error', (err) => {
  log.warn({ err: String(err) }, 'Redis connection error (will keep retrying)');
});

redis.on('connect', () => {
  log.info('Redis connected');
});

redis.on('ready', () => {
  log.info('Redis ready');
});

redis.on('end', () => {
  log.warn('Redis connection closed');
});

export async function redisHealthCheck(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (err) {
    log.warn({ err }, 'Redis health check failed');
    return false;
  }
}
