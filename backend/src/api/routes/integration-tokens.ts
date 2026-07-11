import { createHmac, randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { users, siteAdapters, siteMemberships } from '../../db/schema/index.js';
import { db } from '../../lib/db.js';
import { userService } from '../../modules/user/user.service.js';
import {
  getIntegrationById,
  getIntegrationSecretById,
  ensureIntegrationRegistry,
  type IntegrationIdentityClaims,
} from '../../modules/integrations/integration-registry.js';
import { authMiddleware } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { issueIntegrationTokenParamsSchema, listIntegrationSitesParamsSchema } from '../validation/integration-token.schema.js';

type BetterAuthUser = {
  id?: string;
  email?: string;
  name?: string | null;
  emailVerified?: boolean;
};

type BetterAuthSession = {
  id?: string;
  userId?: string;
  emailVerified?: boolean;
};

interface RouteContext {
  [key: string]: unknown;
}

const INTEGRATION_TOKEN_TTL_SECONDS = 300;

function base64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function parseOrigin(request: Request): string | null {
  const origin = request.headers.get('origin');
  if (origin) return origin;

  const referer = request.headers.get('referer');
  if (!referer) return null;

  try {
    const parsed = new URL(referer);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function signIdentityToken({
  claims,
  secret,
}: {
  claims: IntegrationIdentityClaims;
  secret: string;
}): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify(claims));
  const signingInput = `${header}.${payload}`;
  const signature = createHmac('sha256', secret).update(signingInput).digest('base64url');
  return `${signingInput}.${signature}`;
}

function resolveCurrentUserProfile(user: BetterAuthUser | undefined | null, set: any) {
  if (!user?.email) {
    set.status = 401;
    return null;
  }

  return userService.getByEmail(user.email);
}

function requireVerifiedSession(ctx: any) {
  if (!ctx.user || !ctx.session) {
    ctx.set.status = 401;
    return null;
  }
  const emailVerified =
    ctx.user.emailVerified === true || ctx.session.emailVerified === true;
  if (!emailVerified) {
    ctx.set.status = 403;
    return null;
  }
  return ctx.user;
}

async function resolveProfileByEmail(ctx: any) {
  const user = requireVerifiedSession(ctx);
  if (!user) return null;

  const profile = await resolveCurrentUserProfile(user, ctx.set);
  if (!profile) {
    ctx.set.status = 404;
    return null;
  }
  return profile;
}

async function issueTokenHandler(ctx: any) {
  const { params, request, user, session, set } = ctx;
  const parsedParams = issueIntegrationTokenParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    set.status = 400;
    return { error: 'Validation failed', details: parsedParams.error.flatten() };
  }

  const integration = getIntegrationById(parsedParams.data.integrationId);
  if (!integration) {
    set.status = 404;
    return { error: 'Integration not found' };
  }

  const profile = await resolveProfileByEmail({ params, request, user, session, set });
  if (!profile) return null;
  const origin = parseOrigin(request);
  if (!origin || !integration.allowedOrigins.includes(origin)) {
    set.status = 403;
    return { error: 'Cross-origin request denied: untrusted origin.' };
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + INTEGRATION_TOKEN_TTL_SECONDS;
  const claims = {
    iss: integration.issuer,
    aud: integration.audience,
    sub: profile.id,
    email: profile.email,
    name: profile.name ?? '',
    emailVerified: true as const,
    jti: randomUUID(),
    iat: now,
    exp,
  };

  const token = signIdentityToken({ claims, secret: getIntegrationSecretById(integration.id) });
  set.headers = {
    ...(set.headers ?? {}),
    'Cache-Control': 'no-store',
  };
  return {
    token,
    expiresAt: new Date(claims.exp * 1000).toISOString(),
  };
}

async function listSitesHandler(ctx: any) {
  const { params, request, user, session, set } = ctx;
  const parsedParams = listIntegrationSitesParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    set.status = 400;
    return { error: 'Validation failed', details: parsedParams.error.flatten() };
  }

  const integration = getIntegrationById(parsedParams.data.integrationId);
  if (!integration) {
    set.status = 404;
    return { error: 'Integration not found' };
  }

  const profile = await resolveProfileByEmail({ params, request, user, session, set });
  if (!profile) return null;

  const rows = await db
    .select({
      adapterSlug: siteAdapters.adapterSlug,
      publicSlug: siteAdapters.publicSlug,
      name: siteAdapters.name,
      enabled: siteAdapters.enabled,
      integrationId: sql<string>`${siteAdapters.connectorConfig} ->> 'integrationId'`,
    })
    .from(users)
    .innerJoin(siteMemberships, eq(siteMemberships.userId, users.id))
    .innerJoin(siteAdapters, eq(siteAdapters.id, siteMemberships.siteAdapterId))
    .where(
      and(
        eq(users.id, profile.id),
        eq(siteAdapters.enabled, true),
        sql`${siteAdapters.connectorConfig} ? 'integrationId'`,
      ),
    );

  const adapters = rows
    .filter((row) => row.integrationId === integration.id)
    .map((row) => ({
      adapterSlug: row.adapterSlug ?? undefined,
      publicSlug: row.publicSlug ?? undefined,
      name: row.name,
      enabled: row.enabled,
    }));

  return { adapters };
}

export const integrationTokenRoutes = new Elysia({ prefix: '/api' })
  .use(createRateLimiter('admin'))
  .use(authMiddleware)
  .onBeforeHandle(() => {
    ensureIntegrationRegistry();
  })
  .post('/integration-tokens/:integrationId', issueTokenHandler, { requireAuth: true })
  .get('/integration-sites/:integrationId', listSitesHandler, { requireAuth: true });
