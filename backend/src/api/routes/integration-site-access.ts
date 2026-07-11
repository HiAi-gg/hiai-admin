import { createHmac, timingSafeEqual } from 'node:crypto';
import { Elysia } from 'elysia';
import { z } from 'zod';
import { provisionExternalSiteAccess, compensateExternalSiteAccess } from '../../modules/integrations/site-access-provisioning.service.js';
import { provisionExternalSiteAccessSchema, serviceAccessOperationIdSchema } from '../validation/integration-site-access.schema.js';

type ServiceConfig = { id: string; issuer: string; audience: string; secret: string; scopes: string[] };
const getServiceConfig = (): ServiceConfig[] => {
  const raw = process.env.SERVICE_INTEGRATIONS_JSON?.trim();
  if (!raw) return [];
  try {
    const entries = JSON.parse(raw) as Array<Record<string, unknown>>;
    return entries.map((entry) => {
      const secretRef = String(entry.secretRef ?? '');
      const secret = process.env[secretRef] ?? '';
      return { id: String(entry.id), issuer: String(entry.issuer), audience: String(entry.audience), secret, scopes: Array.isArray(entry.scopes) ? entry.scopes.map(String) : [] };
    });
  } catch {
    return [];
  }
};

const decode = (value: string): Record<string, unknown> | null => {
  try { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Record<string, unknown>; } catch { return null; }
};

const verifyServiceToken = (request: Request, operationId: string): boolean => {
  const raw = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!raw) return false;
  const [head, body, signature] = raw.split('.');
  if (!head || !body || !signature) return false;
  const header = decode(head);
  const claims = decode(body);
  if (!header || !claims || header.alg !== 'HS256') return false;
  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.iss !== 'string' || typeof claims.aud !== 'string' || typeof claims.jti !== 'string' || typeof claims.exp !== 'number' || typeof claims.iat !== 'number' || claims.exp <= now || claims.exp - claims.iat > 60 || claims.operationId !== operationId) return false;
  const config = getServiceConfig().find((entry) => entry.issuer === claims.iss && entry.audience === claims.aud && entry.secret);
  if (!config || !Array.isArray(claims.scope) || !claims.scope.includes('site-access:provision') || !config.scopes.includes('site-access:provision')) return false;
  const expected = createHmac('sha256', config.secret).update(`${head}.${body}`).digest('base64url');
  const actual = Buffer.from(signature, 'base64url');
  const expectedBuffer = Buffer.from(expected, 'base64url');
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
};

export const integrationSiteAccessRoutes = new Elysia({ prefix: '/api/integrations' })
  .post('/site-access', async ({ request, body, set }) => {
    const parsed = provisionExternalSiteAccessSchema.safeParse(body);
    if (!parsed.success || !verifyServiceToken(request, parsed.success ? parsed.data.operationId : '')) { set.status = 401; return { error: 'Unauthorized' }; }
    try { return await provisionExternalSiteAccess(parsed.data); } catch (error) {
      const code = error instanceof Error ? error.message : 'PROVISIONING_FAILED';
      set.status = code === 'OPERATION_PAYLOAD_MISMATCH' ? 409 : 422;
      return { error: code };
    }
  })
  .delete('/site-access/:operationId', async ({ request, params, set }) => {
    if (!verifyServiceToken(request, params.operationId)) { set.status = 401; return { error: 'Unauthorized' }; }
    await compensateExternalSiteAccess(params.operationId);
    return { operationId: params.operationId, status: 'compensated' };
  }, { params: serviceAccessOperationIdSchema });
