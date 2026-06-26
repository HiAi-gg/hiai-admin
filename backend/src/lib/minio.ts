import { Client as MinioClient } from 'minio';
import { z } from 'zod';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createChildLogger } from './logger.js';

const log = createChildLogger('minio');

// ---------------------------------------------------------------------------
// Env loading — mirrors the bootstrap in `lib/config.ts` so the Minio client
// can be imported before the global config validates the rest of the env
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
// constructed on first use so the API can boot without Minio configured
// (test/CI scenarios) and still throw a clear error if an upload is
// attempted without credentials.
// ---------------------------------------------------------------------------
const minioConfigSchema = z.object({
  endpoint: z.string().min(1, 'MINIO_ENDPOINT is required'),
  port: z.coerce.number().int().positive().optional(),
  useSSL: z
    .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  accessKey: z.string().min(1, 'MINIO_ACCESS_KEY is required'),
  secretKey: z.string().min(1, 'MINIO_SECRET_KEY is required'),
  region: z.string().optional(),
  publicUrl: z.string().url().optional(),
  bucket: z.string().min(1).default('hiai-admin'),
});

export type MinioConfig = z.infer<typeof minioConfigSchema>;

/** Default bucket for the hiai-admin platform. */
export const HIAI_ADMIN_BUCKET = 'hiai-admin';

/**
 * Parse `MINIO_ENDPOINT` into host:port. The endpoint may be either:
 *   - `host:port` (most common for local dev, e.g. `localhost:9000`)
 *   - `host`      (defaults port to 9000)
 *   - `https://host[:port]` / `http://host[:port]` (full URL)
 */
function parseEndpoint(endpoint: string): { endPoint: string; port: number; useSSL: boolean } {
  // URL form
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    const url = new URL(endpoint);
    return {
      endPoint: url.hostname,
      port: url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80,
      useSSL: url.protocol === 'https:',
    };
  }
  // host:port form
  const [host, portStr] = endpoint.split(':');
  return {
    endPoint: host,
    port: portStr ? Number(portStr) : 9000,
    useSSL: false,
  };
}

function loadMinioConfig(): MinioConfig | null {
  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  if (!endpoint || !accessKey || !secretKey) return null;
  const parsed = minioConfigSchema.safeParse({
    endpoint,
    accessKey,
    secretKey,
    port: process.env.MINIO_PORT,
    useSSL: process.env.MINIO_USE_SSL,
    region: process.env.MINIO_REGION,
    publicUrl: process.env.MINIO_PUBLIC_URL,
    bucket: process.env.MINIO_BUCKET ?? HIAI_ADMIN_BUCKET,
  });
  if (!parsed.success) {
    log.warn(
      { issues: parsed.error.issues },
      'Minio config validation failed; uploads will be disabled',
    );
    return null;
  }
  return parsed.data;
}

// ---------------------------------------------------------------------------
// Client — lazy singleton so tests that never touch Minio don't pay the cost
// of constructing a client.
// ---------------------------------------------------------------------------
let cachedClient: MinioClient | null = null;
let cachedConfig: MinioConfig | null = null;
let bucketEnsured = false;

export function isMinioConfigured(): boolean {
  return loadMinioConfig() !== null;
}

function getClient(): { client: MinioClient; config: MinioConfig } {
  if (cachedClient && cachedConfig) return { client: cachedClient, config: cachedConfig };
  const config = loadMinioConfig();
  if (!config) {
    throw new MinioError(
      'Minio is not configured (set MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY)',
    );
  }
  const { endPoint, port, useSSL } = parseEndpoint(config.endpoint);
  cachedClient = new MinioClient({
    endPoint,
    port,
    useSSL,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    region: config.region,
  });
  cachedConfig = config;
  return { client: cachedClient, config };
}

// `bucketEnsured` is kept as a module-level flag for the default bucket but
// the actual ensure-bucket logic lives in `ensureBucketFor()` below, which
// is shared with `uploadFile()` regardless of the configured default bucket.

// ---------------------------------------------------------------------------
// Public URL — when MINIO_PUBLIC_URL is set (e.g. `https://cdn.example.com`
// behind Caddy) we return that as the asset URL. Otherwise we fall back to
// the path-style URL `http(s)://endpoint:port/bucket/key`.
// ---------------------------------------------------------------------------
function buildPublicUrl(bucket: string, key: string): string {
  const config = loadMinioConfig();
  if (!config) throw new MinioError('Minio not configured');
  if (config.publicUrl) {
    const base = config.publicUrl.replace(/\/+$/, '');
    return `${base}/${bucket}/${key}`;
  }
  const { endPoint, port, useSSL } = parseEndpoint(config.endpoint);
  const scheme = useSSL ? 'https' : 'http';
  return `${scheme}://${endPoint}:${port}/${bucket}/${key}`;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
export class MinioError extends Error {
  readonly code = 'MINIO_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'MinioError';
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Upload a binary buffer to Minio and return its public URL.
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
  if (!bucket) throw new MinioError('bucket is required');
  if (!key || key.startsWith('/')) throw new MinioError('key must be a relative object path');
  if (!buffer || buffer.length === 0) throw new MinioError('buffer is empty');
  if (!contentType) throw new MinioError('contentType is required');

  const { client } = getClient();
  const body = buffer instanceof Uint8Array ? Buffer.from(buffer) : buffer;
  // Ensure target bucket exists; reuse the helper which also caches state.
  await ensureBucketFor(bucket);

  const metaData = {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
  };
  try {
    await client.putObject(bucket, key, body, body.length, metaData);
  } catch (err) {
    log.error({ err, bucket, key }, 'Minio putObject failed');
    throw new MinioError(
      `Minio upload failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return buildPublicUrl(bucket, key);
}

/** Test-only hook to reset the singleton between cases. */
export function __resetMinioForTests(): void {
  cachedClient = null;
  cachedConfig = null;
  bucketEnsured = false;
  ensuredBuckets.clear();
}

// Per-bucket ensureBucket that doesn't depend on the default config bucket.
const ensuredBuckets = new Set<string>();
async function ensureBucketFor(bucket: string): Promise<void> {
  if (ensuredBuckets.has(bucket)) return;
  const { client } = getClient();
  const exists = await client.bucketExists(bucket).catch(() => false);
  if (!exists) {
    await client.makeBucket(bucket);
    log.info({ bucket }, 'Created Minio bucket');
  }
  ensuredBuckets.add(bucket);
  bucketEnsured = bucketEnsured || bucket === (cachedConfig?.bucket ?? '');
}