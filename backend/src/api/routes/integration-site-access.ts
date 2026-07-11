import { createHmac, timingSafeEqual } from 'node:crypto';
import { Elysia } from 'elysia';
import { z } from 'zod';
import { env } from '../../lib/config.js';
import { provisionExternalSiteAccess, compensateExternalSiteAccess } from '../../modules/integrations/site-access-provisioning.service.js';
import { provisionExternalSiteAccessSchema, serviceAccessOperationIdSchema } from '../validation/integration-site-access.schema.js';

type ServiceConfig = { id: string; issuer: string; audience: string; secret: string; scopes: string[] };
const isPlaceholder = (value: string) => /change[-_]?me|placeholder|example|dummy|your[-_]?secret/i.test(value);
const getServiceConfig = (): ServiceConfig[] => {
  const raw = env.SERVICE_INTEGRATIONS_JSON;
  if (!raw) return [];
  try {
    const entries = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(entries)) throw new Error('SERVICE_INTEGRATIONS_JSON must be an array');
    const ids = new Set<string>();
    return entries.map((entry) => {
      const secretRef = String(entry.secretRef ?? '');
      const secret = process.env[secretRef] ?? '';
      const id = String(entry.id ?? '');
      const scopes = Array.isArray(entry.scopes) ? entry.scopes.map(String) : [];
      if (!id || ids.has(id) || !entry.issuer || !entry.audience || !secretRef || secret.length < 32 || isPlaceholder(secret) || !scopes.includes('site-access:provision')) throw new Error('Invalid SERVICE_INTEGRATIONS_JSON configuration');
      ids.add(id);
      return { id, issuer: String(entry.issuer), audience: String(entry.audience), secret, scopes };
    });
  } catch {
    throw new Error('SERVICE_INTEGRATIONS_JSON must be valid JSON');
  }
};

if (env.SERVICE_INTEGRATIONS_JSON !== '[]') getServiceConfig();

const decode = (value: string): Record<string, unknown> | null => {
  try { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Record<string, unknown>; } catch { return null; }
};

type ServiceClaims = { jti: string; operationId: string };
const verifyServiceToken = (request: Request, operationId: string): ServiceClaims | null => {
  const raw = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!raw) return null;
  const [head, body, signature] = raw.split('.');
  if (!head || !body || !signature) return null;
  const header = decode(head);
  const claims = decode(body);
  if (!header || !claims || header.alg !== 'HS256') return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.iss !== 'string' || typeof claims.aud !== 'string' || typeof claims.jti !== 'string' || !claims.jti || typeof claims.exp !== 'number' || typeof claims.iat !== 'number' || !Number.isInteger(claims.exp) || !Number.isInteger(claims.iat) || claims.iat > now || claims.exp <= now || claims.exp <= claims.iat || claims.exp - claims.iat > 60 || claims.operationId !== operationId) return null;
  const config = getServiceConfig().find((entry) => entry.issuer === claims.iss && entry.audience === claims.aud && entry.secret);
  if (!config || !Array.isArray(claims.scope) || !claims.scope.includes('site-access:provision') || !config.scopes.includes('site-access:provision')) return null;
  const expected = createHmac('sha256', config.secret).update(`${head}.${body}`).digest('base64url');
  const actual = Buffer.from(signature, 'base64url');
  const expectedBuffer = Buffer.from(expected, 'base64url');
  if (actual.length !== expectedBuffer.length || !timingSafeEqual(actual, expectedBuffer)) return null;
  return { jti: claims.jti, operationId };
};

export const integrationSiteAccessRoutes = new Elysia({ prefix: '/api/integrations' })
  .post('/site-access', async ({ request, body, set }) => {
    const parsed = provisionExternalSiteAccessSchema.safeParse(body);
    const claims = parsed.success ? verifyServiceToken(request, parsed.data.operationId) : null;
    if (!parsed.success || !claims) { set.status = 401; return { error: 'Unauthorized' }; }
    try { return await provisionExternalSiteAccess(parsed.data, claims.jti); } catch (error) {
      const code = error instanceof Error ? error.message : 'PROVISIONING_FAILED';
      set.status = code === 'OPERATION_PAYLOAD_MISMATCH' || code === 'OPERATION_TOKEN_MISMATCH' ? 409 : 422;
      return { error: code };
    }
  })
  .delete('/site-access/:operationId', async ({ request, params, set }) => {
    const claims = verifyServiceToken(request, params.operationId);
    if (!claims) { set.status = 401; return { error: 'Unauthorized' }; }
    try { await compensateExternalSiteAccess(params.operationId, claims.jti); return { operationId: params.operationId, status: 'compensated' }; } catch (error) {
      const code = error instanceof Error ? error.message : 'COMPENSATION_FAILED';
      set.status = code === 'OPERATION_NOT_FOUND' ? 404 : 409;
      return { error: code };
    }
  }, { params: serviceAccessOperationIdSchema });
