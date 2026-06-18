import { Elysia } from 'elysia';
import { env } from '../../lib/config.js';
import { ErrorCode } from '../../lib/errors.js';
import { createChildLogger } from '../../lib/logger.js';

const log = createChildLogger('csrf');

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF / cross-origin guard middleware.
 *
 * For state-changing methods (POST/PUT/PATCH/DELETE), verifies the request's
 * origin (or referer fallback) is in the trusted origins list.
 *
 * Exemptions:
 *  - GET/HEAD requests always pass (safe methods)
 *  - Requests with a Bearer token (server-to-server auth) bypass CSRF check
 *  - Requests without a cookie (no session to steal) pass
 *
 * Uses `{ as: 'scoped' }` to enforce across all sibling route plugins.
 */
export const csrfMiddleware = new Elysia({ name: 'csrf' }).onBeforeHandle(
  { as: 'scoped' },
  async ({ request, set }) => {
    // Only check state-changing methods
    if (!STATE_CHANGING_METHODS.has(request.method)) {
      return;
    }

    // If Bearer token is present (server-to-server), bypass CSRF check
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      return;
    }

    // If no cookie is present, there's no session to protect
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) {
      return;
    }

    // Extract origin or fallback to referer
    let origin = request.headers.get('origin');
    if (!origin) {
      const referer = request.headers.get('referer');
      if (referer) {
        try {
          const url = new URL(referer);
          origin = `${url.protocol}//${url.host}`;
        } catch {
          log.warn({ referer }, 'Failed to parse referer header');
          origin = null;
        }
      }
    }

    // If no origin or referer found, reject
    if (!origin) {
      log.warn(
        { method: request.method, path: new URL(request.url).pathname },
        'CSRF: missing origin and referer on cookie-authenticated request',
      );
      set.status = 403;
      return {
        error: 'Cross-origin request denied: missing origin.',
        code: ErrorCode.FORBIDDEN,
      };
    }

    // Check if origin is in the trusted list
    const trustedOrigins = env.BETTER_AUTH_TRUSTED_ORIGINS || [];
    const isOriginTrusted = trustedOrigins.includes(origin);

    if (!isOriginTrusted) {
      log.warn(
        {
          method: request.method,
          path: new URL(request.url).pathname,
          origin,
          trustedOrigins,
        },
        'CSRF: origin not in trusted list',
      );
      set.status = 403;
      return {
        error: 'Cross-origin request denied: untrusted origin.',
        code: ErrorCode.FORBIDDEN,
      };
    }
  },
);
