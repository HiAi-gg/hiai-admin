import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../src/lib/logger.js', () => ({
  createChildLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-s3', () => {
  function makeCommand(name: string) {
    const ctor = vi.fn(function (this: any, args: unknown) {
      this.args = args;
      this.commandName = name;
    });
    return ctor;
  }
  return {
    S3Client: vi.fn(function () { return { send: mockSend }; }),
    HeadBucketCommand: makeCommand('HeadBucket'),
    CreateBucketCommand: makeCommand('CreateBucket'),
    PutObjectCommand: makeCommand('PutObject'),
  };
});

describe('lib/object-storage', () => {
  const ORIGINAL = { ...process.env };

  beforeEach(() => {
    // Clean OBJECT_STORAGE_* env so each test starts clean
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('OBJECT_STORAGE_')) delete process.env[key];
    }
    vi.clearAllMocks();
    return import('../../src/lib/object-storage.js').then((m) => m.__resetObjectStorageForTests());
  });

  afterEach(() => {
    for (const k of Object.keys(process.env)) {
      if (!(k in ORIGINAL)) delete process.env[k];
    }
    Object.assign(process.env, ORIGINAL);
  });

  describe('isObjectStorageConfigured()', () => {
    it('returns false when OBJECT_STORAGE_* env vars are absent', async () => {
      const { isObjectStorageConfigured } = await import('../../src/lib/object-storage.js');
      expect(isObjectStorageConfigured()).toBe(false);
    });

    it('returns true when endpoint/access/secret are set', async () => {
      process.env.OBJECT_STORAGE_ENDPOINT = 'localhost:8333';
      process.env.OBJECT_STORAGE_ACCESS_KEY = 'seaweedfs';
      process.env.OBJECT_STORAGE_SECRET_KEY = 'seaweedfs';
      const { isObjectStorageConfigured } = await import('../../src/lib/object-storage.js');
      expect(isObjectStorageConfigured()).toBe(true);
    });

    it('returns false when only some vars are set', async () => {
      process.env.OBJECT_STORAGE_ENDPOINT = 'localhost:8333';
      process.env.OBJECT_STORAGE_ACCESS_KEY = 'seaweedfs';
      // SECRET_KEY intentionally missing
      const { isObjectStorageConfigured } = await import('../../src/lib/object-storage.js');
      expect(isObjectStorageConfigured()).toBe(false);
    });
  });

  describe('uploadFile() — validation', () => {
    it('throws ObjectStorageError when not configured', async () => {
      const { uploadFile, ObjectStorageError } = await import('../../src/lib/object-storage.js');
      await expect(
        uploadFile('hiai-admin', 'avatars/x.png', Buffer.from('hello'), 'image/png'),
      ).rejects.toBeInstanceOf(ObjectStorageError);
    });

    it('rejects empty buffers', async () => {
      process.env.OBJECT_STORAGE_ENDPOINT = 'localhost:8333';
      process.env.OBJECT_STORAGE_ACCESS_KEY = 'seaweedfs';
      process.env.OBJECT_STORAGE_SECRET_KEY = 'seaweedfs';
      mockSend.mockResolvedValue({});

      const { uploadFile, ObjectStorageError } = await import('../../src/lib/object-storage.js');
      await expect(
        uploadFile('hiai-admin', 'avatars/x.png', Buffer.alloc(0), 'image/png'),
      ).rejects.toThrow(/buffer is empty/);
      await expect(
        uploadFile('hiai-admin', 'avatars/x.png', Buffer.alloc(0), 'image/png'),
      ).rejects.toBeInstanceOf(ObjectStorageError);
    });

    it('rejects leading-slash keys', async () => {
      process.env.OBJECT_STORAGE_ENDPOINT = 'localhost:8333';
      process.env.OBJECT_STORAGE_ACCESS_KEY = 'seaweedfs';
      process.env.OBJECT_STORAGE_SECRET_KEY = 'seaweedfs';
      mockSend.mockResolvedValue({});

      const { uploadFile, ObjectStorageError } = await import('../../src/lib/object-storage.js');
      await expect(
        uploadFile('hiai-admin', '/avatars/x.png', Buffer.from('hello'), 'image/png'),
      ).rejects.toBeInstanceOf(ObjectStorageError);
    });

    it('rejects empty bucket', async () => {
      process.env.OBJECT_STORAGE_ENDPOINT = 'localhost:8333';
      process.env.OBJECT_STORAGE_ACCESS_KEY = 'seaweedfs';
      process.env.OBJECT_STORAGE_SECRET_KEY = 'seaweedfs';
      mockSend.mockResolvedValue({});

      const { uploadFile, ObjectStorageError } = await import('../../src/lib/object-storage.js');
      await expect(
        uploadFile('', 'avatars/x.png', Buffer.from('hello'), 'image/png'),
      ).rejects.toBeInstanceOf(ObjectStorageError);
    });

    it('rejects missing contentType', async () => {
      process.env.OBJECT_STORAGE_ENDPOINT = 'localhost:8333';
      process.env.OBJECT_STORAGE_ACCESS_KEY = 'seaweedfs';
      process.env.OBJECT_STORAGE_SECRET_KEY = 'seaweedfs';
      mockSend.mockResolvedValue({});

      const { uploadFile, ObjectStorageError } = await import('../../src/lib/object-storage.js');
      await expect(
        uploadFile('hiai-admin', 'avatars/x.png', Buffer.from('hello'), '' as unknown as string),
      ).rejects.toBeInstanceOf(ObjectStorageError);
    });

    it('returns a public URL when the upload succeeds (path-style)', async () => {
      process.env.OBJECT_STORAGE_ENDPOINT = 'localhost:8333';
      process.env.OBJECT_STORAGE_ACCESS_KEY = 'seaweedfs';
      process.env.OBJECT_STORAGE_SECRET_KEY = 'seaweedfs';
      mockSend.mockResolvedValue({}); // HeadBucket + PutObject

      const { uploadFile } = await import('../../src/lib/object-storage.js');
      const url = await uploadFile(
        'hiai-admin',
        'avatars/u1/abc.png',
        Buffer.from('hello'),
        'image/png',
      );

      expect(mockSend).toHaveBeenCalled();
      expect(url).toBe('http://localhost:8333/hiai-admin/avatars/u1/abc.png');
    });

    it('honours OBJECT_STORAGE_PUBLIC_URL when set', async () => {
      process.env.OBJECT_STORAGE_ENDPOINT = 'localhost:8333';
      process.env.OBJECT_STORAGE_ACCESS_KEY = 'seaweedfs';
      process.env.OBJECT_STORAGE_SECRET_KEY = 'seaweedfs';
      process.env.OBJECT_STORAGE_PUBLIC_URL = 'https://cdn.example.com/';
      mockSend.mockResolvedValue({});

      const { uploadFile } = await import('../../src/lib/object-storage.js');
      const url = await uploadFile('hiai-admin', 'logos/site.png', Buffer.from('x'), 'image/png');
      // Trailing slash should be stripped so we don't produce `//logos/...`.
      expect(url).toBe('https://cdn.example.com/hiai-admin/logos/site.png');
    });

    it('creates the bucket if it does not exist', async () => {
      process.env.OBJECT_STORAGE_ENDPOINT = 'localhost:8333';
      process.env.OBJECT_STORAGE_ACCESS_KEY = 'seaweedfs';
      process.env.OBJECT_STORAGE_SECRET_KEY = 'seaweedfs';

      // First call HeadBucket → NotFound, second CreateBucket → ok, third PutObject → ok
      mockSend
        .mockRejectedValueOnce({ name: 'NotFound' })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const { uploadFile } = await import('../../src/lib/object-storage.js');
      const url = await uploadFile('hiai-admin', 'logos/site.png', Buffer.from('x'), 'image/png');

      expect(mockSend).toHaveBeenCalledTimes(3);
      expect(url).toMatch(/^http:\/\/localhost:8333\/hiai-admin\/logos\/site\.png$/);
    });
  });
});
