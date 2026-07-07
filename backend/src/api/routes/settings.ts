import { Elysia, t } from 'elysia';
import { db } from '../../lib/db.js';
import { settings } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { authMiddleware } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { updateSettingSchema } from '../validation/settings.schema.js';
import type { PlatformUser } from '../middleware/audit.js';
import { HIAI_ADMIN_BUCKET, ObjectStorageError, isObjectStorageConfigured, uploadFile } from '../../lib/object-storage.js';
import { ErrorCode } from '../../lib/errors.js';

/** Max logo size: 1 MB (matches the default MAX_BODY_BYTES). */
const MAX_LOGO_BYTES = 1024 * 1024;
const LOGO_SETTING_KEY = 'logo_url';
const LOGO_PREFIX = 'logos/';
const LOGO_CONTENT_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
};

export const settingsRoutes = new Elysia({ prefix: '/api/settings' })
  .use(createRateLimiter('admin'))
  .use(authMiddleware)
  .get(
    '/',
    async () => {
      const all = await db.select().from(settings);
      return { settings: all };
    },
    { requireSuperAdmin: true },
  )
  .get(
    '/:key',
    async ({ params, set }) => {
      const [setting] = await db
        .select()
        .from(settings)
        .where(eq(settings.id, params.key))
        .limit(1);
      if (!setting) {
        set.status = 404;
        return { error: 'Setting not found' };
      }
      return { setting };
    },
    { requireSuperAdmin: true },
  )
  .put(
    '/:key',
    async (ctx) => {
      const { params, body } = ctx as { params: { key: string }; body: unknown };
      // `user` is populated by the global `derive` in `api/index.ts`; we
      // cast through `unknown` (not `any`) so TS still validates the shape.
      const user = (ctx as unknown as { user: PlatformUser | null }).user;

      const parsed = updateSettingSchema.safeParse(body);
      if (!parsed.success) {
        ctx.set.status = 400;
        return { error: 'Validation failed', details: parsed.error.flatten() };
      }
      const { value, description } = parsed.data;

      const [setting] = await db
        .insert(settings)
        .values({
          id: params.key,
          value: JSON.parse(JSON.stringify(value)),
          description: description || null,
          updatedBy: user?.id,
        })
        .onConflictDoUpdate({
          target: settings.id,
          set: {
            value: JSON.parse(JSON.stringify(value)),
            updatedAt: new Date(),
            updatedBy: user?.id ?? null,
          },
        })
        .returning();
      return { setting };
    },
    {
      requireSuperAdmin: true,
      body: t.Object({
        value: t.Any(),
        description: t.Optional(t.String({ maxLength: 500 })),
      }),
    },
  )

  /**
   * POST /api/settings/logo
   *
   * multipart/form-data with a single `file` field. Uploads the image to
    * object storage (bucket `hiai-admin`, prefix `logos/`) and persists the resulting
   * public URL into the `settings` table under the `logo_url` key. Restricted
   * to super_admin — the platform logo is global branding.
   */
  .post(
    '/logo',
    async (ctx: any) => {
      if (!isObjectStorageConfigured()) {
        ctx.set.status = 503;
        return {
          error: 'File uploads are not configured on this server (OBJECT_STORAGE_* env missing).',
          code: ErrorCode.INTERNAL_ERROR,
        };
      }
      const user = (ctx as unknown as { user: PlatformUser | null }).user;

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
      if (file.size > MAX_LOGO_BYTES) {
        ctx.set.status = 413;
        return {
          error: `Logo exceeds maximum size of ${MAX_LOGO_BYTES} bytes`,
        };
      }
      const contentType = (file.type || 'application/octet-stream').toLowerCase();
      const ext = LOGO_CONTENT_TYPES[contentType];
      if (!ext) {
        ctx.set.status = 415;
        return {
          error: `Unsupported media type: ${contentType} (expected PNG, JPEG, WebP, SVG, AVIF, or ICO)`,
        };
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const key = `${LOGO_PREFIX}${randomUUID()}.${ext}`;

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

      const [setting] = await db
        .insert(settings)
        .values({
          id: LOGO_SETTING_KEY,
          value: JSON.parse(JSON.stringify(url)),
          description: 'Platform logo URL (uploaded asset)',
          updatedBy: user?.id ?? null,
        })
        .onConflictDoUpdate({
          target: settings.id,
          set: {
            value: JSON.parse(JSON.stringify(url)),
            updatedAt: new Date(),
            updatedBy: user?.id ?? null,
            description: 'Platform logo URL (uploaded asset)',
          },
        })
        .returning();

      return { setting, url };
    },
    { requireSuperAdmin: true },
  );
