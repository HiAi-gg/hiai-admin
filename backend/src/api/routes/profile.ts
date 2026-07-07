import { Elysia, t } from 'elysia';
import { randomUUID } from 'node:crypto';
import { auth } from '../../auth/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { auditMiddleware } from '../middleware/audit.js';
import { userService } from '../../modules/user/user.service.js';
import { joinTenantSchema, updateProfileSchema } from '../validation/user.schema.js';
import { auditService } from '../../modules/audit/audit.service.js';
import { AppError, ErrorCode } from '../../lib/errors.js';
import { HIAI_ADMIN_BUCKET, ObjectStorageError, isObjectStorageConfigured, uploadFile } from '../../lib/object-storage.js';

/** Max avatar size: 1 MB (matches the default MAX_BODY_BYTES). */
const MAX_AVATAR_BYTES = 1024 * 1024;
const AVATAR_PREFIX = 'avatars/';

/** Map common MIME types to safe file extensions. */
function extFromContentType(mime: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
  };
  return map[mime.toLowerCase()] ?? 'bin';
}

/**
 * Resolve the platform user (custom `users` table) for the current session.
 * Better Auth's session is keyed by its own `user.id`, which is not the same
 * as our platform user id. We look up by email — the same keying convention
 * used by `/api/users/me` and the auth middleware.
 */
async function resolvePlatformUser(ctx: any) {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) {
    throw new AppError({ code: ErrorCode.UNAUTHORIZED });
  }
  const profile = await userService.getByEmail(session.user.email);
  if (!profile) {
    throw new AppError({
      code: ErrorCode.NOT_FOUND,
      message: 'Platform profile not provisioned for this account',
    });
  }
  return { session, profile };
}

function handleError(err: unknown, set: { status: number }) {
  if (err instanceof AppError) {
    set.status = err.status;
    return { error: err.message, code: err.code };
  }
  set.status = 500;
  return { error: 'Internal error' };
}

export const profileRoutes = new Elysia({ prefix: '/api/profile' })
  .use(authMiddleware)
  .use(rbacMiddleware)
  .use(auditMiddleware)

  .get(
    '/',
    async (ctx: any) => {
      try {
        const { profile } = await resolvePlatformUser(ctx);
        return { data: profile };
      } catch (err) {
        return handleError(err, ctx.set);
      }
    },
    { requireAuth: true },
  )

  .put(
    '/',
    async (ctx: any) => {
      const parsed = updateProfileSchema.safeParse(ctx.body);
      if (!parsed.success) {
        ctx.set.status = 400;
        return { error: 'Validation failed', details: parsed.error.flatten() };
      }
      try {
        const { profile } = await resolvePlatformUser(ctx);
        const updated = await userService.update(profile.id, parsed.data);
        return { data: updated };
      } catch (err) {
        return handleError(err, ctx.set);
      }
    },
    {
      requireAuth: true,
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
        email: t.Optional(t.String({ format: 'email', maxLength: 200 })),
        avatarUrl: t.Optional(t.Union([t.String({ format: 'url', maxLength: 500 }), t.Null()])),
      }),
    },
  )

  /**
   * POST /api/profile/avatar
   *
   * multipart/form-data with a single `file` field. Uploads the image to
    * object storage (bucket `hiai-admin`, prefix `avatars/`) and persists the public
   * URL on the platform user's `avatar_url` column. The legacy `PUT /`
   * `avatarUrl` field is also kept in sync so the audit trail and any
   * downstream consumers continue to work.
   */
  .post(
    '/avatar',
    async (ctx: any) => {
      if (!isObjectStorageConfigured()) {
        // Missing object storage config is a server-side setup issue, not a
        // downstream outage — surface 503 so the UI can show a clear
        // "uploads disabled" hint.
        ctx.set.status = 503;
        return {
          error: 'File uploads are not configured on this server (OBJECT_STORAGE_* env missing).',
          code: ErrorCode.INTERNAL_ERROR,
        };
      }
      let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
      let profile: Awaited<ReturnType<typeof userService.getByEmail>> | null = null;
      try {
        const resolved = await resolvePlatformUser(ctx);
        session = resolved.session;
        profile = resolved.profile;
      } catch (err) {
        return handleError(err, ctx.set);
      }

      let form: FormData;
      try {
        form = await ctx.request.formData();
      } catch (err) {
        ctx.set.status = 400;
        return {
          error: 'Invalid multipart body',
          details: err instanceof Error ? err.message : String(err),
        };
      }
      const file = form.get('file');
      if (!(file instanceof Blob)) {
        ctx.set.status = 400;
        return { error: 'Missing "file" field in multipart form' };
      }
      if (file.size === 0) {
        ctx.set.status = 400;
        return { error: 'Uploaded file is empty' };
      }
      if (file.size > MAX_AVATAR_BYTES) {
        ctx.set.status = 413;
        return {
          error: `Avatar exceeds maximum size of ${MAX_AVATAR_BYTES} bytes`,
        };
      }
      const contentType = (file.type || 'application/octet-stream').toLowerCase();
      if (!contentType.startsWith('image/')) {
        ctx.set.status = 415;
        return { error: `Unsupported media type: ${contentType} (expected image/*)` };
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = extFromContentType(contentType);
      // Namespace by user id so re-uploads don't collide; UUID prevents
      // trivial enumeration when a bucket is later made readable.
      const key = `${AVATAR_PREFIX}${profile.id}/${randomUUID()}.${ext}`;

      let url: string;
      try {
        url = await uploadFile(HIAI_ADMIN_BUCKET, key, buffer, contentType);
      } catch (err) {
        if (err instanceof ObjectStorageError) {
          ctx.set.status = 502;
          return { error: err.message, code: ErrorCode.UPSTREAM_ERROR };
        }
        throw err;
      }

      try {
        const updated = await userService.update(profile.id, { avatarUrl: url });
        try {
          await auditService.record({
            actorId: profile.id,
            actorEmail: session.user.email,
            action: 'profile:upload-avatar',
            resource: 'profile',
            resourceId: profile.id,
            newValue: { key, contentType, size: file.size, url },
          });
        } catch {
          // Audit is best-effort; the generic middleware also records the CUD.
        }
        return { data: updated };
      } catch (err) {
        return handleError(err, ctx.set);
      }
    },
    { requireAuth: true },
  )

  .get(
    '/tenants',
    async (ctx: any) => {
      try {
        const { profile } = await resolvePlatformUser(ctx);
        const items = await userService.getTenants(profile.id);
        return { data: items };
      } catch (err) {
        return handleError(err, ctx.set);
      }
    },
    { requireAuth: true },
  )

  .post(
    '/tenants/join',
    async (ctx: any) => {
      const parsed = joinTenantSchema.safeParse(ctx.body);
      if (!parsed.success) {
        ctx.set.status = 400;
        return { error: 'Validation failed', details: parsed.error.flatten() };
      }
      try {
        const { profile, session } = await resolvePlatformUser(ctx);
        const result = await userService.joinTenant(profile.id, parsed.data.slug, {
          role: parsed.data.role,
        });
        if (result.status === 'not_found') {
          ctx.set.status = 404;
          return { error: 'Tenant not found' };
        }
        // Audit explicitly — join is a sensitive membership change. The generic
        // CUD middleware records this too, but its action label is derived from
        // the resource path and won't capture which user actually joined.
        try {
          await auditService.record({
            actorId: profile.id,
            actorEmail: session.user.email,
            action: result.status === 'joined' ? 'profile:join-tenant' : 'profile:join-tenant:noop',
            resource: 'user_tenant_access',
            resourceId: result.tenantId,
            newValue: { slug: parsed.data.slug, status: result.status },
          });
        } catch {
          // Audit is best-effort here — the generic middleware also records the CUD.
        }
        return { data: result };
      } catch (err) {
        return handleError(err, ctx.set);
      }
    },
    {
      requireAuth: true,
      body: t.Object({
        slug: t.String({ minLength: 1, maxLength: 100, pattern: '^[a-z0-9-]+$' }),
        inviteCode: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
        role: t.Optional(
          t.Union([
            t.Literal('super_admin'),
            t.Literal('tenant_admin'),
            t.Literal('editor'),
            t.Literal('viewer'),
          ]),
        ),
      }),
    },
  )

  .delete(
    '/tenants/:tenantId',
    async (ctx: any) => {
      try {
        const { profile } = await resolvePlatformUser(ctx);
        const removed = await userService.leaveTenant(profile.id, ctx.params.tenantId);
        if (!removed) {
          ctx.set.status = 404;
          return { error: 'Membership not found' };
        }
        return { data: { tenantId: ctx.params.tenantId, status: 'left' } };
      } catch (err) {
        return handleError(err, ctx.set);
      }
    },
    {
      requireAuth: true,
      params: t.Object({
        tenantId: t.String({ format: 'uuid' }),
      }),
    },
  );
