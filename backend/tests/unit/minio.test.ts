import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() },
  createChildLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

describe('lib/minio', () => {
  const ORIGINAL = { ...process.env };

  beforeEach(() => {
    delete process.env.MINIO_ENDPOINT;
    delete process.env.MINIO_ACCESS_KEY;
    delete process.env.MINIO_SECRET_KEY;
    delete process.env.MINIO_PORT;
    delete process.env.MINIO_USE_SSL;
    delete process.env.MINIO_PUBLIC_URL;
    delete process.env.MINIO_BUCKET;
    // Reset the cached client between tests so each scenario is isolated.
    return import('../../src/lib/minio.js').then((m) => m.__resetMinioForTests());
  });

  afterEach(() => {
    for (const k of Object.keys(process.env)) {
      if (!(k in ORIGINAL)) delete process.env[k];
    }
    Object.assign(process.env, ORIGINAL);
  });

  describe('isMinioConfigured()', () => {
    it('returns false when MINIO_* env vars are absent', async () => {
      const { isMinioConfigured } = await import('../../src/lib/minio.js');
      expect(isMinioConfigured()).toBe(false);
    });

    it('returns true when MINIO_ENDPOINT/ACCESS_KEY/SECRET_KEY are set', async () => {
      process.env.MINIO_ENDPOINT = 'localhost:9000';
      process.env.MINIO_ACCESS_KEY = 'minioadmin';
      process.env.MINIO_SECRET_KEY = 'minioadmin';
      const { isMinioConfigured } = await import('../../src/lib/minio.js');
      expect(isMinioConfigured()).toBe(true);
    });

    it('returns false when only some MINIO_* vars are set', async () => {
      process.env.MINIO_ENDPOINT = 'localhost:9000';
      process.env.MINIO_ACCESS_KEY = 'minioadmin';
      // SECRET_KEY intentionally missing
      const { isMinioConfigured } = await import('../../src/lib/minio.js');
      expect(isMinioConfigured()).toBe(false);
    });
  });

  describe('uploadFile() — validation', () => {
    it('throws MinioError when Minio is not configured', async () => {
      const { uploadFile, MinioError } = await import('../../src/lib/minio.js');
      await expect(
        uploadFile('hiai-admin', 'avatars/x.png', Buffer.from('hello'), 'image/png'),
      ).rejects.toBeInstanceOf(MinioError);
    });

    it('rejects empty buffers', async () => {
      process.env.MINIO_ENDPOINT = 'localhost:9000';
      process.env.MINIO_ACCESS_KEY = 'minioadmin';
      process.env.MINIO_SECRET_KEY = 'minioadmin';
      // Stub the minio client so we never reach the network.
      const { Client } = await import('minio');
      vi.spyOn(Client.prototype, 'bucketExists').mockResolvedValue(true);
      vi.spyOn(Client.prototype, 'putObject').mockResolvedValue({} as never);

      const { uploadFile, MinioError } = await import('../../src/lib/minio.js');
      await expect(
        uploadFile('hiai-admin', 'avatars/x.png', Buffer.alloc(0), 'image/png'),
      ).rejects.toThrow(/buffer is empty/);
      await expect(
        uploadFile('hiai-admin', 'avatars/x.png', Buffer.alloc(0), 'image/png'),
      ).rejects.toBeInstanceOf(MinioError);
    });

    it('rejects leading-slash keys', async () => {
      process.env.MINIO_ENDPOINT = 'localhost:9000';
      process.env.MINIO_ACCESS_KEY = 'minioadmin';
      process.env.MINIO_SECRET_KEY = 'minioadmin';
      const { Client } = await import('minio');
      vi.spyOn(Client.prototype, 'bucketExists').mockResolvedValue(true);
      vi.spyOn(Client.prototype, 'putObject').mockResolvedValue({} as never);

      const { uploadFile, MinioError } = await import('../../src/lib/minio.js');
      await expect(
        uploadFile('hiai-admin', '/avatars/x.png', Buffer.from('hello'), 'image/png'),
      ).rejects.toBeInstanceOf(MinioError);
    });

    it('rejects empty bucket', async () => {
      process.env.MINIO_ENDPOINT = 'localhost:9000';
      process.env.MINIO_ACCESS_KEY = 'minioadmin';
      process.env.MINIO_SECRET_KEY = 'minioadmin';
      const { Client } = await import('minio');
      vi.spyOn(Client.prototype, 'bucketExists').mockResolvedValue(true);

      const { uploadFile, MinioError } = await import('../../src/lib/minio.js');
      await expect(
        uploadFile('', 'avatars/x.png', Buffer.from('hello'), 'image/png'),
      ).rejects.toBeInstanceOf(MinioError);
    });

    it('rejects missing contentType', async () => {
      process.env.MINIO_ENDPOINT = 'localhost:9000';
      process.env.MINIO_ACCESS_KEY = 'minioadmin';
      process.env.MINIO_SECRET_KEY = 'minioadmin';
      const { Client } = await import('minio');
      vi.spyOn(Client.prototype, 'bucketExists').mockResolvedValue(true);

      const { uploadFile, MinioError } = await import('../../src/lib/minio.js');
      await expect(
        uploadFile(
          'hiai-admin',
          'avatars/x.png',
          Buffer.from('hello'),
          '' as unknown as string,
        ),
      ).rejects.toBeInstanceOf(MinioError);
    });

    it('returns a public URL when the upload succeeds (path-style)', async () => {
      process.env.MINIO_ENDPOINT = 'localhost:9000';
      process.env.MINIO_ACCESS_KEY = 'minioadmin';
      process.env.MINIO_SECRET_KEY = 'minioadmin';
      const { Client } = await import('minio');
      vi.spyOn(Client.prototype, 'bucketExists').mockResolvedValue(true);
      const putObject = vi.spyOn(Client.prototype, 'putObject').mockResolvedValue({} as never);

      const { uploadFile } = await import('../../src/lib/minio.js');
      const url = await uploadFile(
        'hiai-admin',
        'avatars/u1/abc.png',
        Buffer.from('hello'),
        'image/png',
      );

      expect(putObject).toHaveBeenCalledTimes(1);
      expect(url).toBe('http://localhost:9000/hiai-admin/avatars/u1/abc.png');
    });

    it('honours MINIO_PUBLIC_URL when set', async () => {
      process.env.MINIO_ENDPOINT = 'localhost:9000';
      process.env.MINIO_ACCESS_KEY = 'minioadmin';
      process.env.MINIO_SECRET_KEY = 'minioadmin';
      process.env.MINIO_PUBLIC_URL = 'https://cdn.example.com/';
      const { Client } = await import('minio');
      vi.spyOn(Client.prototype, 'bucketExists').mockResolvedValue(true);
      vi.spyOn(Client.prototype, 'putObject').mockResolvedValue({} as never);

      const { uploadFile } = await import('../../src/lib/minio.js');
      const url = await uploadFile(
        'hiai-admin',
        'logos/site.png',
        Buffer.from('x'),
        'image/png',
      );
      // Trailing slash should be stripped so we don't produce `//logos/...`.
      expect(url).toBe('https://cdn.example.com/hiai-admin/logos/site.png');
    });

    it('creates the bucket if it does not exist', async () => {
      process.env.MINIO_ENDPOINT = 'localhost:9000';
      process.env.MINIO_ACCESS_KEY = 'minioadmin';
      process.env.MINIO_SECRET_KEY = 'minioadmin';
      const { Client } = await import('minio');
      const bucketExists = vi
        .spyOn(Client.prototype, 'bucketExists')
        .mockResolvedValue(false);
      const makeBucket = vi
        .spyOn(Client.prototype, 'makeBucket')
        .mockResolvedValue(undefined as never);
      vi.spyOn(Client.prototype, 'putObject').mockResolvedValue({} as never);

      const { uploadFile } = await import('../../src/lib/minio.js');
      const url = await uploadFile(
        'hiai-admin',
        'logos/site.png',
        Buffer.from('x'),
        'image/png',
      );

      expect(bucketExists).toHaveBeenCalledWith('hiai-admin');
      expect(makeBucket).toHaveBeenCalledWith('hiai-admin');
      expect(url).toMatch(/^http:\/\/localhost:9000\/hiai-admin\/logos\/site\.png$/);
    });
  });
});