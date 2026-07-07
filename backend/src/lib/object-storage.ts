import { S3Client, HeadBucketCommand, CreateBucketCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { z } from 'zod';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createChildLogger } from './logger.js';

const log = createChildLogger('object-storage');

// ---------------------------------------------------------------------------
// Env loading — mirrors the bootstrap in `lib/config.ts` so the client can
// be imported before the global config validates the rest of the env
// (e.g. from test setup that mocks `config.js` entirely).
// ---------------------------------------------------------------------------
const here = dirname(fileURLToPath(import.meta.url));
for (const candidate of [
  resolve(here, '.env'),
  resolve(here, '../../.env'),
  resolve(here, '../../../.env'),
  resolve(here, '../../../../.env'),
]) {
  if (existsSync(candidate)) {
    for (const line of readFileSync(candidate, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
    break;
  }
}

// ---------------------------------------------------------------------------
// Configuration — these are optional at boot time. The client is lazily
// constructed on first use so the API can boot without object storage
// configured (test/CI scenarios) and still throw a clear error if an upload
// is attempted without credentials.
// ---------------------------------------------------------------------------

/** Safe numeric preprocessor — avoids z.coerce.number() NaN bug. */
function num(defaultValue: number) {
  return z.preprocess((v) => {
    if (v === undefined || v === null || v === '') return defaultValue;
    const n = Number(v);
    return Number.isFinite(n) ? n : defaultValue;
  }, z.number());
}

/** Boolean from env string with explicit default. */
function boolOpt(defaultVal: boolean) {
  return z
    .preprocess((v) => {
      if (v === undefined || v === null || v === '') return defaultVal ? 'true' : 'false';
      return v;
    }, z.union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')]))
    .transform((v) => v === 'true' || v === '1');
}

const configSchema = z.object({
  endpoint: z.string().min(1, 'OBJECT_STORAGE_ENDPOINT is required'),
  port: num(8333),
  useSSL: boolOpt(false),
  accessKey: z.string().min(1, 'OBJECT_STORAGE_ACCESS_KEY is required'),
  secretKey: z.string().min(1, 'OBJECT_STORAGE_SECRET_KEY is required'),
  region: z.string().optional(),
  publicUrl: z.string().url().optional(),
  bucket: z.string().min(1).default('hiai-admin'),
  forcePathStyle: boolOpt(true),
});

export type ObjectStorageConfig = z.infer<typeof configSchema>;

/** Default bucket for the hiai-admin platform. */
export const HIAI_ADMIN_BUCKET = 'hiai-admin';

/**
 * Parse `OBJECT_STORAGE_ENDPOINT` into host:port. The endpoint may be either:
 *   - `host:port` (most common for local dev, e.g. `localhost:8333`)
 *   - `host`      (defaults port to 8333)
 *   - `https://host[:port]` / `http://host[:port]` (full URL)
 */
function parseEndpoint(endpoint: string): { host: string; port: number; useSSL: boolean } {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    const url = new URL(endpoint);
    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80,
      useSSL: url.protocol === 'https:',
    };
  }
  const [host, portStr] = endpoint.split(':');
  return {
    host,
    port: portStr ? Number(portStr) : 8333,
    useSSL: false,
  };
}

function loadObjectStorageConfig(): ObjectStorageConfig | null {
  const endpoint = process.env.OBJECT_STORAGE_ENDPOINT;
  const accessKey = process.env.OBJECT_STORAGE_ACCESS_KEY;
  const secretKey = process.env.OBJECT_STORAGE_SECRET_KEY;
  if (!endpoint || !accessKey || !secretKey) return null;

  const parsed = configSchema.safeParse({
    endpoint,
    accessKey,
    secretKey,
    port: process.env.OBJECT_STORAGE_PORT,
    useSSL: process.env.OBJECT_STORAGE_USE_SSL,
    region: process.env.OBJECT_STORAGE_REGION,
    publicUrl: process.env.OBJECT_STORAGE_PUBLIC_URL,
    bucket: process.env.OBJECT_STORAGE_BUCKET ?? HIAI_ADMIN_BUCKET,
    forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE,
  });
  if (!parsed.success) {
    log.warn(
      { issues: parsed.error.issues },
      'Object storage config validation failed; uploads will be disabled',
    );
    return null;
  }
  return parsed.data;
}

// ---------------------------------------------------------------------------
// Client — lazy singleton so tests that never touch object storage don't pay
// the cost of constructing a client.
// ---------------------------------------------------------------------------
let cachedClient: S3Client | null = null;
let cachedConfig: ObjectStorageConfig | null = null;

export function isObjectStorageConfigured(): boolean {
  return loadObjectStorageConfig() !== null;
}

function getClient(): { client: S3Client; config: ObjectStorageConfig } {
  if (cachedClient && cachedConfig) return { client: cachedClient, config: cachedConfig };
  const config = loadObjectStorageConfig();
  if (!config) {
    throw new ObjectStorageError(
      'Object storage is not configured (set OBJECT_STORAGE_ENDPOINT, OBJECT_STORAGE_ACCESS_KEY, OBJECT_STORAGE_SECRET_KEY)',
    );
  }
  const { host, port, useSSL } = parseEndpoint(config.endpoint);
  const endpointUrl = `${useSSL ? 'https' : 'http'}://${host}:${port}`;

  cachedClient = new S3Client({
    endpoint: endpointUrl,
    region: config.region ?? 'us-east-1',
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: config.forcePathStyle,
  });
  cachedConfig = config;
  return { client: cachedClient, config };
}

// ---------------------------------------------------------------------------
// Public URL — when OBJECT_STORAGE_PUBLIC_URL is set (e.g. `https://cdn.example.com`
// behind Caddy) we return that as the asset URL. Otherwise we fall back to
// the path-style URL `http(s)://host:port/bucket/key`.
// ---------------------------------------------------------------------------
function buildPublicUrl(bucket: string, key: string): string {
  const config = loadObjectStorageConfig();
  if (!config) throw new ObjectStorageError('Object storage not configured');
  if (config.publicUrl) {
    const base = config.publicUrl.replace(/\/+$/, '');
    return `${base}/${bucket}/${key}`;
  }
  const { host, port, useSSL } = parseEndpoint(config.endpoint);
  const scheme = useSSL ? 'https' : 'http';
  return `${scheme}://${host}:${port}/${bucket}/${key}`;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
export class ObjectStorageError extends Error {
  readonly code = 'OBJECT_STORAGE_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'ObjectStorageError';
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Upload a binary buffer to object storage and return its public URL.
 *
 * @param bucket   Bucket name (e.g. `hiai-admin`).
 * @param key      Object key inside the bucket (e.g. `avatars/abc.png`).
 *                 Must not start with `/`.
 * @param buffer   File contents.
 * @param contentType  MIME type (e.g. `image/png`). Stored so browsers
 *                 can render the asset directly.
 * @returns        Public URL pointing at the uploaded object.
 */
export async function uploadFile(
  bucket: string,
  key: string,
  buffer: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  if (!bucket) throw new ObjectStorageError('bucket is required');
  if (!key || key.startsWith('/')) throw new ObjectStorageError('key must be a relative object path');
  if (!buffer || buffer.length === 0) throw new ObjectStorageError('buffer is empty');
  if (!contentType) throw new ObjectStorageError('contentType is required');

  const { client } = getClient();
  const body = buffer instanceof Uint8Array ? Buffer.from(buffer) : buffer;
  await ensureBucketFor(bucket);

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  } catch (err) {
    log.error({ err, bucket, key }, 'Object storage PutObject failed');
    throw new ObjectStorageError(
      `Object storage upload failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return buildPublicUrl(bucket, key);
}

/** Test-only hook to reset the singleton between cases. */
export function __resetObjectStorageForTests(): void {
  cachedClient = null;
  cachedConfig = null;
  ensuredBuckets.clear();
}

// Per-bucket existence cache.
const ensuredBuckets = new Set<string>();
async function ensureBucketFor(bucket: string): Promise<void> {
  if (ensuredBuckets.has(bucket)) return;
  const { client } = getClient();
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    // HeadBucket throws NotFound when the bucket does not exist.
    if (e?.name === 'NotFound' || (e?.$metadata as Record<string, unknown>)?.httpStatusCode === 404) {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      log.info({ bucket }, 'Created object storage bucket');
    } else {
      // Re-throw unexpected errors (auth failure, network issue, etc.)
      throw err;
    }
  }
  ensuredBuckets.add(bucket);
}
