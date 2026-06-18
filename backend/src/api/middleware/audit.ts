import { Elysia } from 'elysia';
import { auditService } from '../../modules/audit/audit.service.js';
import { logger } from '../../lib/logger.js';
import { env } from '../../lib/config.js';

const log = logger.child({ module: 'audit' });
const AUDIT_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Lightweight in-process metrics counter. No prom-client dependency.
let auditFailures = 0;
let auditFailClosedRejections = 0;
export function getAuditMetrics() {
  return {
    audit_failures_total: auditFailures,
    audit_fail_closed_rejections_total: auditFailClosedRejections,
  };
}

export const auditMiddleware = new Elysia({ name: 'audit' }).onAfterHandle({ as: 'scoped' }, async (ctx) => {
  const { request } = ctx;
  const user = (ctx as any).user;
  if (!AUDIT_METHODS.has(request.method) || !user) return;
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const resource = parts[2] || parts[1] || 'unknown';
  const resourceId = parts[3] || undefined;
  const actionMap: Record<string, string> = {
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete',
  };
  const action = `${resource}:${actionMap[request.method]}`;
  try {
    await auditService.record({
      actorId: user.id,
      actorEmail: user.email,
      action,
      resource,
      resourceId,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || '',
    });
  } catch (err) {
    auditFailures++;
    log.warn(
      { err, method: request.method, path: url.pathname, action, resource, resourceId, actorId: user.id },
      'Audit log write failed: CUD operation succeeded but compliance trail is incomplete',
    );
    if (env.AUDIT_FAIL_CLOSED) {
      auditFailClosedRejections++;
      log.error(
        { err, method: request.method, path: url.pathname, action, resource, resourceId, actorId: user.id },
        'AUDIT_FAIL_CLOSED enabled: rejecting CUD response to preserve audit trail',
      );
      (ctx as any).set.status = 500;
      return { error: 'Audit log unavailable; operation rejected (AUDIT_FAIL_CLOSED)' };
    }
  }
});
