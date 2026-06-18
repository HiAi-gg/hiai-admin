import { Elysia } from 'elysia';
import { env } from '../../lib/config.js';
import { ErrorCode } from '../../lib/errors.js';

/**
 * Body size limit middleware.
 *
 * Rejects requests whose `content-length` header exceeds the configured
 * MAX_BODY_BYTES limit with HTTP 413 Payload Too Large.
 * This check happens before body parsing (cheap, header-only).
 *
 * Uses `{ as: 'scoped' }` to enforce across all sibling route plugins.
 */
export const bodyLimitMiddleware = new Elysia({ name: 'body-limit' }).onBeforeHandle(
  { as: 'scoped' },
  async ({ request, set }) => {
    // Only check state-changing methods; GET/HEAD have no body
    const method = request.method;
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return;
    }

    const contentLength = request.headers.get('content-length');
    const limit = env.MAX_BODY_BYTES;

    if (contentLength) {
      const bytes = parseInt(contentLength, 10);
      if (isNaN(bytes) || bytes > limit) {
        set.status = 413;
        return {
          error: `Request body exceeds maximum size of ${limit} bytes.`,
          code: ErrorCode.BAD_REQUEST,
        };
      }
    }
  },
);
