import { Elysia } from 'elysia';
import { redis } from '../../lib/redis.js';
import { createChildLogger } from '../../lib/logger.js';

const log = createChildLogger('rate-limiter');

const LIMITS: Record<string, { windowMs: number; max: number; prefix: string }> = {
  auth: { windowMs: 15 * 60 * 1000, max: 5, prefix: 'rl:auth' },
  public: { windowMs: 60 * 1000, max: 100, prefix: 'rl:pub' },
  admin: { windowMs: 60 * 1000, max: 300, prefix: 'rl:adm' },
  billing: { windowMs: 60 * 1000, max: 30, prefix: 'rl:bill' },
};

function getIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

export function createRateLimiter(tier: keyof typeof LIMITS = 'public') {
  const cfg = LIMITS[tier] ?? LIMITS.public;
  return new Elysia({ name: `rate-limit-${tier}` }).derive({ as: 'scoped' }, async ({ request, set }) => {
    const key = `${cfg.prefix}:${getIp(request)}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.pexpire(key, cfg.windowMs);
      const _remaining = Math.max(0, cfg.max - count);
      if (count > cfg.max) {
        set.status = 429;
        set.headers = {
          'X-RateLimit-Limit': String(cfg.max),
          'X-RateLimit-Remaining': '0',
          'Retry-After': String(Math.ceil(cfg.windowMs / 1000)),
        };
        throw new Error('Rate limit exceeded');
      }
      return {};
    } catch (err: any) {
      if (err?.message === 'Rate limit exceeded') throw err;
      log.warn(
        { tier, err, key, ip: getIp(request) },
        'Rate limiter fail-open: Redis unavailable, allowing request through',
      );
      return {};
    }
  });
}
