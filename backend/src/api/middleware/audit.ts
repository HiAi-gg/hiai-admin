import { Elysia } from 'elysia';
import { auditService } from '../../modules/audit/audit.service.js';
import { logger } from '../../lib/logger.js';

const log = logger.child({ module: 'audit' });
const AUDIT_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const auditMiddleware = new Elysia({ name: 'audit' }).onAfterHandle(async (ctx) => {
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
  try {
    await auditService.record({
      actorId: user.id,
      actorEmail: user.email,
      action: `${resource}:${actionMap[request.method]}`,
      resource,
      resourceId,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || '',
    });
  } catch (err) {
    log.error({ err }, 'Audit log failed');
  }
});
